# Notes d’audit — Éléments d’instrumentation

Document complémentaire à `PROJECT_DOCUMENTATION_STANDARD.md`. Sert de traçabilité interne entre les affirmations du document principal et les artefacts du dépôt. Ne se substitue pas au document standardisé.

## 1. Périmètre audité

- Inspection statique du dépôt local (état initial 2026-05-21 ; mise à jour post-`git pull origin/main` au 2026-05-26).
- Pas de connexion à la base de données distante, pas d’exécution des fonctions Edge, pas d’inspection des logs de production.
- Pas d’audit dynamique de sécurité (SAST/DAST), pas de scan de dépendances type `npm audit` ou Snyk dans le cadre de cet exercice.

## 2. Décomptes de référence (au 2026-05-26)

- 151 fichiers `.ts/.tsx` sous `src/` (~30 535 lignes)
- 11 fichiers `.test.ts(x)` sous `src/`
- 25 fichiers `.sql` sous `supabase/migrations/` (~1 575 lignes)
- 7 fonctions Edge sous `supabase/functions/` (~1 484 lignes)
- 1 fichier `.spec.ts` sous `e2e/`
- 49 composants UI shadcn dans `src/components/ui/`

## 3. Tables PostgreSQL identifiées

### Présentes dans les migrations (`supabase/migrations/`)

| Table | Migration créatrice | RLS / évolutions notables |
|---|---|---|
| `profiles` | `20250925225543_*.sql` | Activée ; extension majeure en `20260525214700_*.sql` (22 colonnes : `body_fat_percent`, `waist_cm`, `morphotype`, `handedness`, `injuries[]`, `years_practice`, `belt_rank`, `secondary_disciplines[]`, `competition_level`, `competitions_count`, `primary_goal`, `goal_deadline`, `target_event`, `sleep_hours`, `stress_level`, `weekly_availability`, `preferred_session_duration`, `training_location`, `equipment[]`, `dietary_restrictions[]`) ; `age` ajoutée en `20251206001305_*.sql` |
| `workouts` | `20250926074506_*.sql` | Activée |
| `exercises` | `20250926074506_*.sql` | Activée (lecture publique) ; jeu d’exercices MMA inséré par `20251002071905_*.sql` |
| `workout_exercises` | `20250926074506_*.sql` | Activée |
| `sets` | `20250926074506_*.sql` | Activée |
| `nutrition_logs` | `20250930060055_*.sql` | Activée |
| `nutrition_goals` | `20250930060055_*.sql` | Activée |
| `workout_journal` | `20251010080939_*.sql` | Activée |
| `notifications` | `20251011134112_*.sql` | Activée |
| `community_activities` | `20251011134112_*.sql` | Activée ; SELECT restreint aux utilisateurs authentifiés en `20260525215520_*.sql` |
| `training_videos` | `20251013093201_*.sql` | Activée ; colonnes `visibility`, `coach_name`, `views_count` ajoutées en `20251205232801_*.sql`, policies réécrites pour combiner visibilité + plan + rôle (admin/coach) |
| `user_roles` | `20251013093610_*.sql` | Activée ; enum `app_role` étendu avec `coach` (`20251205232737_*.sql`) ; admin nominal inséré par `20251013093610_*.sql` et `20251205232013_*.sql` |
| `subscriptions` | `20251104090103_*.sql` | Activée ; INSERT/UPDATE utilisateur supprimés en `20260525215520_*.sql` |
| `meutes` | `20251205234548_*.sql` | Activée ; policies réécrites en `20260526100900_*.sql` via helpers SECURITY DEFINER |
| `meute_members` | `20251205234548_*.sql` | Activée ; idem ci-dessus (récursion RLS supprimée) |
| `meute_activities` | `20251205234548_*.sql` | Activée ; idem ci-dessus |
| `sparring_analyses` | `20251206002054_*.sql` | Activée |
| `feature_usage` | `20251206004851_*.sql` | Activée ; INSERT/UPDATE utilisateur supprimés en `20260526095651_*.sql` (écritures via `increment_feature_usage` uniquement) |

### Présentes uniquement dans `src/integrations/supabase/types.ts`

| Table | Observation |
|---|---|
| `documents` | Colonne `embedding` (RAG vectoriel), aucune utilisation côté `src/` ni Edge ; SELECT restreint aux utilisateurs authentifiés par `20260525215520_*.sql` (donc la table existe en base) |
| `organizations` | Multi-tenant B2B, aucune migration trouvée |
| `organization_members` | Aucune migration trouvée |
| `organization_invitations` | Aucune migration trouvée |
| `render_usage` | Quota mensuel par organisation, aucune migration trouvée ; ciblée par une policy en `20260525215520_*.sql` (donc la table existe en base) |
| `stripe_webhook_events` | Journal d’événements Stripe (idempotence). Aucune migration trouvée. RPCs associées (`is_webhook_processed`, `mark_webhook_processed`) typées sans définition versionnée |

> Table `Document` (doublon historique) **supprimée** en `20251210210551_*.sql`.

Hypothèse : ces structures proviennent soit de migrations appliquées hors du dépôt (dashboard Supabase, scripts externes), soit d’un template antérieur. **À confirmer avec le porteur.** Le fait que des policies RLS récentes (mai 2026) référencent `documents` et `render_usage` indique qu’elles existent dans la base vivante.

## 4. Fonctions SQL identifiées

### Définies dans les migrations versionnées

`handle_new_user`, `handle_new_user_subscription`, `update_updated_at_column` (search_path fixé en `20251210210551_*.sql`), `has_role`, `has_feature_access`, `get_feature_usage`, `increment_feature_usage`, `get_feature_limit`, `create_notification`, `create_community_activity_on_workout`, `handle_new_meute`, `increment_video_views`, `is_meute_member`, `is_meute_owner`, `get_meute_member_role`, `match_documents` (search_path fixé en `20251210210551_*.sql`).

### Typées dans `types.ts` sans définition retrouvée dans les migrations versionnées

`check_organization_quota`, `increment_organization_usage`, `reset_monthly_organization_quotas`, `check_subscription_access`, `sync_stripe_subscription`, `get_user_id_by_stripe_customer`, `is_webhook_processed`, `mark_webhook_processed` — toutes en lien avec les tables non versionnées (`organizations*`, `render_usage`, `stripe_webhook_events`).

## 5. Points de sécurité à corriger ou confirmer

- `.env` versionné, non listé dans `.gitignore`. Bien que ne contenant que des valeurs publiques (`VITE_SUPABASE_URL`, clé `anon`), à isoler.
- Clé `anon` dupliquée en dur dans `src/integrations/supabase/client.ts` lignes 5–6 et **également dans `src/components/AICoachChat.tsx` ligne 73** (fetch direct vers la fonction Edge au lieu d’utiliser le client `supabase`).
- UUID admin en dur dans `supabase/migrations/20251013093610_*.sql` et `supabase/migrations/20251205232013_*.sql` (à nettoyer avant transmission).
- **Indice d’un webhook Stripe en production hors dépôt** : présence de la table `stripe_webhook_events` et des RPCs `is_webhook_processed`, `mark_webhook_processed`, `sync_stripe_subscription` dans `types.ts`, sans définition versionnée ni Edge Function `stripe-webhook` dans `supabase/functions/`.
- Modèle d’authentification : email/password uniquement. Pas de MFA. Persistance en `localStorage`.
- Logging : `console.log` uniquement, aucun client APM/log structuré côté code.
- Mode TypeScript non strict (`strict: false`, `strictNullChecks` désactivé) — sécurité de typage déléguée aux conventions.
- **Améliorations sécurité observées (mai 2026)** : verrouillage écriture `feature_usage`, `subscriptions`, contrôle d’insertion `render_usage`, restriction lecture `documents`/`community_activities`, helpers SECURITY DEFINER pour la récursion RLS meutes, génération d’URLs signées pour `sparring-videos` via `storageUtils.ts`.

## 6. Risques techniques identifiés

| Risque | Probabilité | Impact | Mitigation observée |
|---|---|---|---|
| Désynchronisation `subscriptions` ↔ Stripe en cas d’annulation hors session | Faible à moyenne | Moyen | Indice d’un webhook Stripe en production via `stripe_webhook_events` + RPCs typées (non versionné) ; appels `check-subscription` opportunistes en complément |
| Drift schéma/code (tables `organizations*`, `documents`, `render_usage`, `stripe_webhook_events` ; RPCs `*_webhook_*`, `*_organization_*`, `*_stripe_*`) | Avérée | Moyen | À reconstituer via export DB distante |
| Dépendance forte à passerelle IA externe et modèles Gemini | Avérée | Élevé | Retry exponentiel implémenté côté `analyze-sparring`, bascule `pro`/`flash` paramétrable côté requête, mais pas de plan de fallback inter-fournisseurs |
| Coût IA non maîtrisé | Inconnue | Élevé | Quotas applicatifs `feature_usage` côté plan Free + gating serveur dans `ai-coach` et `analyze-sparring` |
| Évolution des règles de feature gating (SQL vs front vs Edge) | Avérée | Moyen | Triple application, source de vérité = base depuis le verrou de mai 2026 |
| Régressions sur Edge Functions | Avérée | Élevé | Aucun test automatisé |
| Composants monolithiques (>1 000 lignes, p. ex. `SparringAnalysisV2.tsx` ≈ 1 700 l.) | Avérée | Faible | À refactoriser progressivement |
| Données personnelles étendues transmises à passerelle IA tierce (lifestyle, blessures, niveau compétition) | Avérée | Moyen | Aucun mécanisme de minimisation observé ; à analyser sous RGPD |

## 7. Liste des fichiers Edge Functions

| Chemin | Lignes (approx.) | Modèle / Service | Vérif. JWT | Gating métier |
|---|---|---|---|---|
| `supabase/functions/ai-coach/index.ts` | 198 | Gemini 2.5 Flash via passerelle IA tierce | Oui | `has_role` (admin/coach bypass) + `has_feature_access('ai_coach')` + `increment_feature_usage` |
| `supabase/functions/ai-stats-analysis/index.ts` | ≈ 236 | Gemini 2.5 Flash via passerelle IA tierce | Oui | Non observé |
| `supabase/functions/analyze-sparring/index.ts` | 641 | Gemini 2.5 Pro (défaut) / Flash (qualityMode='fast'), vision multi-image, tool calling | Oui | `has_role` (admin/coach bypass) + `has_feature_access('sparring_analysis')` + `increment_feature_usage` |
| `supabase/functions/create-checkout/index.ts` | ≈ 78 | Stripe API | Oui | — |
| `supabase/functions/check-subscription/index.ts` | ≈ 137 | Stripe API + Supabase DB | Oui | — |
| `supabase/functions/customer-portal/index.ts` | ≈ 70 | Stripe API | Oui | — |
| `supabase/functions/fetch-mma-results/index.ts` | ≈ 118 | Flux RSS publics (Sherdog, MMA Fighting, Bloody Elbow) | Non (volontairement public) | — |

## 7bis. Évolutions clés observées depuis le précédent audit

- 5 nouvelles migrations SQL (10 décembre 2025 → 26 mai 2026) : nettoyage `Document`, durcissement search_path des fonctions, extension `profiles` (22 colonnes), durcissement RLS de `subscriptions`/`documents`/`community_activities`/`render_usage`, verrouillage `feature_usage`, helpers SECURITY DEFINER meutes.
- Nouveaux modules front : `src/hooks/useFeatureGate.tsx` (wrapper paywall), `src/utils/storageUtils.ts` (URLs signées), `src/components/FoodSearchInput.tsx` (autocomplete Open Food Facts), `src/components/VideoBackground.tsx` (fond statique).
- Refonte `supabase/functions/analyze-sparring/index.ts` : passage au tool/function calling structuré, modèle `gemini-2.5-pro` par défaut, profils par discipline (boxe, kickboxing, muay thai, MMA, BJJ, karaté/taekwondo), gating serveur.
- Refonte `supabase/functions/ai-coach/index.ts` : gating serveur, enrichissement du prompt par les nouveaux champs profil.
- Documentation tierce ajoutée : `docs/DOCUMENTATION.md`, `docs/PRE_DEPLOYMENT_AUDIT.md` (non auditées ici).

## 8. Questions à poser au porteur du projet

1. Les tables `organizations`, `organization_members`, `organization_invitations`, `render_usage`, `stripe_webhook_events` existent-elles en production ? Quelle migration ou quel script les a créées ? Pourquoi ne sont-elles pas versionnées alors qu’elles sont référencées par des policies RLS récentes ?
2. La fonctionnalité RAG (`documents.embedding`, `match_documents`) est-elle planifiée, abandonnée, ou résiduelle ?
3. Existe-t-il une Edge Function `stripe-webhook` (ou équivalent) hors dépôt qui exploite `stripe_webhook_events`, `is_webhook_processed`, `mark_webhook_processed`, `sync_stripe_subscription` ? Si oui, pouvez-vous la fournir et la verser au dépôt ?
4. Quel est le pipeline de déploiement effectif (front et Edge Functions) ?
5. Y a-t-il un environnement de pré-production distinct du projet Supabase `vpvfkazmfvxbpffymodg` ?
6. Les `price_id` Stripe codés en dur sont-ils ceux de production ?
7. Le compte administrateur `3000d380-…` (inséré dans deux migrations) est-il un compte de test, un compte fondateur, ou un compte à transmettre ?
8. Existe-t-il une politique de confidentialité publiée (URL à intégrer dans `Legal.tsx`) ?
9. Quel est le SLA/coût pratiqué auprès du fournisseur de passerelle IA, et quelle politique de minimisation des données est appliquée pour le profil enrichi envoyé au prompt de `ai-coach` ?
10. Les rôles `admin` et `coach` partagent un bypass total du gating IA. Quelle gouvernance d’attribution de ces rôles est en place ?
11. Le mode TypeScript non strict (`strict: false`) est-il un choix structurant ou un héritage à corriger ?
12. Les documents `docs/DOCUMENTATION.md` et `docs/PRE_DEPLOYMENT_AUDIT.md` versionnés à la racine `docs/` sont-ils maintenus à jour et engageants pour le projet, ou des résidus à retirer ?

## 9. Recommandations pour transmission à un tiers

- Reconstituer un schéma de base authoritatif (migrations versionnées + dump distant + ajout des migrations manquantes pour `organizations*`, `render_usage`, `stripe_webhook_events`).
- Sortir les secrets et IDs personnels des fichiers versionnés ; éliminer le duplicata de clé `anon` dans `src/components/AICoachChat.tsx`.
- Compléter `Legal.tsx` (SIRET, hébergeur, directeur de publication, URL politique de confidentialité).
- Verser au dépôt l’Edge Function de webhook Stripe et un pipeline CI exécutant `lint`, `test:run` et `test:e2e`.
- Documenter dans un fichier dédié (`ARCHITECTURE.md`) les choix structurants : RLS, gating multi-couches, pipeline IA (tool calling + profils discipline), gamification.
- Supprimer le plugin Vite de tagging de composants (devDependency, références en `vite.config.ts` lignes 4 et 15) ou justifier son maintien.
- Décider du sort des modules legacy (`SparringAnalysis.tsx`, `WorkoutLogger.tsx`), de l’asset orphelin `public/videos/hero-background.mp4`, du prop inutilisé `freezeAt` dans `VideoBackground.tsx`, et des tables non utilisées.
- Activer progressivement les options strict TypeScript pour réduire la dette de typage.
- Auditer ou retirer `docs/DOCUMENTATION.md` et `docs/PRE_DEPLOYMENT_AUDIT.md` selon leur engagement réel pour le projet.
