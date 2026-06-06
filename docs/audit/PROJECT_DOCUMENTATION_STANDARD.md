# Documentation Technique Standardisée — KOREV Performance Center (MMA Perf Center)

## 1. Identification du projet

- **Nom du projet** : KOREV Performance Center (répertoire `MMA perf center`)
- **Éditeur identifié dans le code** : KOREV AI — SAS (référence dans `src/pages/Legal.tsx`, lignes 54–60)
- **Type de projet** : Application SaaS web (Single Page Application React) orientée arts martiaux mixtes et sports de combat
- **Domaine d’application** : Suivi d’entraînement, nutrition, analyse vidéo de sparring assistée par IA, gamification, gestion d’équipes (« meutes »), monétisation par abonnement
- **Statut observé** : Projet en développement actif. Migrations récentes (la plus récente datée `20260526133146_*.sql`), durcissement RLS continu (`20260525215520_*.sql`, `20260526095651_*.sql`, `20260526125359_*.sql` qui restreint l'INSERT sur `documents` aux administrateurs et ajoute un trigger anti-escalade de privilège sur `meute_members`), Edge Function `stripe-webhook` versionnée, observabilité Sentry intégrée côté frontend, pipeline CI versionné, mentions légales en place (champs juridiques restant à finaliser tracés en commentaires source uniquement).
- **Langage principal** : TypeScript (151 fichiers `.ts/.tsx` dans `src/`, ~30 535 lignes ; 8 fonctions Deno/TypeScript côté serveur, ~1 800 lignes ; 28 migrations SQL, ~1 786 lignes ; harness Deno serveur dans `tests/edge/`).
- **Frameworks principaux** :
  - Front-end : React 18.3, Vite 5.4, TypeScript 5.5, Tailwind CSS 3.4, shadcn-ui (Radix UI primitives), React Router 6.26, TanStack Query 5.56, React Hook Form 7.53, Zod 3.23, Framer Motion 12.23
  - Back-end : Supabase (PostgreSQL, Auth, Storage, Edge Functions Deno), Stripe (paiements + webhook signé versionné)
  - Tests : Vitest 3.2, Testing Library, Playwright 1.49, harness Deno pour Edge Functions
  - CI : GitHub Actions (`.github/workflows/ci.yml` — lint, tests unitaires, build)
- **Date de génération du document** : 2026-05-21 — **mise à jour** : 2026-05-26 (révision post-stabilisation).
- **Périmètre audité** : Code source contenu dans le dépôt local (`/src`, `/supabase`, `/e2e`, `/tests`, `.github`, fichiers racine de configuration), état au 2026-05-26 après stabilisation pré-transmission. Aucune inspection runtime ou base de données distante n’a été réalisée.

---

## 2. Résumé exécutif

KOREV Performance Center est une application web SaaS destinée aux pratiquants d’arts martiaux mixtes. Le périmètre fonctionnel observé couvre :

- la gestion de profil sportif (poids, taille, discipline, objectifs) ;
- le suivi des séances d’entraînement et l’historique ;
- le suivi nutritionnel (logs, objectifs, scan code-barres) ;
- un assistant conversationnel basé sur un modèle de langage (Coach IA) ;
- une fonctionnalité d’analyse vidéo de sparring par vision par ordinateur ;
- un système de gamification thématique (« Wolf Pack ») avec rangs, XP et badges ;
- une fonction communautaire de groupes (« meutes ») ;
- une monétisation par abonnement Stripe sur 4 paliers (Free / Pro / Elite / Senseï) ;
- un back-office administrateur (utilisateurs, abonnements, vidéos).

Le niveau de maturité observé est intermédiaire à avancé : architecture cohérente, séparation des responsabilités correcte, couverture de tests partielle mais réelle sur les modules critiques (extracteur de frames, schéma d’analyse, gamification, retry) complétée par un harness Deno sur les Edge Functions critiques (`tests/edge/`). Le code est en français/anglais mixte, structuré par domaine fonctionnel. Les migrations de mai 2026 renforcent significativement la posture sécurité : durcissement des policies RLS sur `subscriptions`, `documents`, `community_activities`, `feature_usage`, `render_usage` ; introduction d’helpers SECURITY DEFINER pour éviter la récursion RLS sur les modules « meutes » ; versionnement d’une Edge Function `stripe-webhook` signée avec table d’idempotence `stripe_webhook_events` et RPCs associées. Le drift résiduel entre `types.ts` et les migrations (tables `organizations*`, `documents`, `render_usage`) est tracé dans `docs/audit/SCHEMA_DRIFT.md`.

Réserve principale subsistante : dépendance non résiliable à une passerelle IA externe pour les fonctionnalités les plus différenciantes (Coach IA, analyse statistique, vision sparring). La discipline de secrets, l’isolation du compte administrateur et la complétion finale des mentions légales sont en place côté code ; les éléments juridiques restant à finaliser (SIRET, politique de confidentialité publiée) sont signalés par des `TODO` source non visibles côté utilisateur.

---

## 3. Périmètre fonctionnel constaté

| Fonctionnalité | Statut observé | Fichiers / modules concernés | Commentaire |
|---|---|---|---|
| Authentification email/mot de passe | Implémentée | `src/hooks/useAuth.tsx`, `src/pages/Auth.tsx` | Supabase Auth, persistance via `localStorage` |
| Onboarding multi-étapes | Implémentée | `src/pages/Onboarding.tsx` (`totalSteps = 7`) | 7 étapes : identité, anthropométrie avancée (body fat, morphotype, blessures), expérience martiale (années, grade, niveau compétition), objectifs SMART, lifestyle, équipement, restrictions alimentaires |
| Dashboard principal | Implémentée | `src/pages/Index.tsx`, `src/components/DashboardHeader.tsx`, `src/components/QuickStatsCards.tsx`, `src/components/VideoBackground.tsx` | Composition d’onglets Nutrition / Préparation / Technique ; fond visuel statique (image), FAB d’accès analyse sparring |
| Suivi nutritionnel | Implémentée | `src/components/NutritionTracker.tsx`, `src/components/FoodSearchInput.tsx`, `src/hooks/useNutrition.tsx`, tables `nutrition_logs`, `nutrition_goals` | Logs par repas, totaux quotidiens, objectifs paramétrables, recherche auto via API publique Open Food Facts (`world.openfoodfacts.org`) avec debounce 400 ms |
| Scan code-barres alimentaire | Implémentée (UI) | `src/components/BarcodeScannerDialog.tsx` (dépendance `@zxing/browser`) | Gating via `useFeatureGate('barcode_scan')` (3/mois plan Free, illimité Pro+) |
| Suivi de séances | Implémentée | `src/hooks/useWorkouts.tsx`, `src/components/WorkoutLogger.tsx`, `src/components/workout/StartWorkoutDialogV2.tsx`, `src/components/workout/ActiveWorkoutPage.tsx`, `src/components/workout/WorkoutManager.tsx`, tables `workouts`/`workout_exercises`/`sets`/`exercises` | Cycle « active → completed », phases warmup/active/cooldown, volume total, calories estimées, intégration timer + gamification |
| Historique des séances | Implémentée | `src/pages/WorkoutHistory.tsx` | Lecture historique avec filtres |
| Journal d’entraînement | Implémentée | `src/pages/WorkoutJournal.tsx`, table `workout_journal` | Saisie libre/notes |
| Statistiques utilisateur | Implémentée | `src/pages/Statistics.tsx`, `src/components/AIStatsAnalysis.tsx` | Visualisation via Recharts, synthèse IA 30 jours |
| Timer de rounds | Implémentée | `src/components/RoundTimer.tsx` | Rounds/repos configurables, signal sonore |
| Coach IA conversationnel | Implémentée | `src/components/AICoachChat.tsx`, `supabase/functions/ai-coach/index.ts` | Streaming SSE, prompt système enrichi avec ~30 champs profil (anthropométrie, expérience martiale, lifestyle, équipement, restrictions). Gating serveur via `has_feature_access('ai_coach')` + `increment_feature_usage` avec bypass admin/coach |
| Analyse IA des statistiques | Implémentée | `supabase/functions/ai-stats-analysis/index.ts`, `src/components/AIStatsAnalysis.tsx` | Agrégation 30 jours workouts + nutrition, synthèse Markdown |
| Analyse vidéo de sparring | Implémentée | `src/components/sparring/SparringAnalysisV2.tsx`, `src/utils/videoFrameExtractor.ts`, `src/utils/sparringPrompts.ts`, `supabase/functions/analyze-sparring/index.ts`, table `sparring_analyses`, bucket `sparring-videos` | Extraction de frames côté client (jusqu’à 60), vision LLM côté Edge via **tool/function calling** (`submit_sparring_analysis`), profils par discipline (boxe, kickboxing, muay thai, MMA, BJJ, karaté/taekwondo) avec règles d’invalidation des métriques non pertinentes, modèle `google/gemini-2.5-pro` par défaut et `flash` en `qualityMode='fast'`, gating serveur, validation/normalisation stricte du JSON |
| Suivi de progression sparring | Implémentée | `src/components/sparring/SparringProgressTracker.tsx` | Comparaison inter-analyses |
| Export PDF sparring | Implémentée | `src/components/sparring/SparringPDFExport.tsx`, `src/components/PDFExportButton.tsx` (dépendance `jspdf`) | Réservé plan Senseï dans `has_feature_access` |
| Partage d’analyse sparring | Implémentée | `src/components/sparring/SparringShareDialog.tsx` | URL publique non confirmée |
| Bibliothèque vidéos d’entraînement | Implémentée | `src/pages/TrainingVideos.tsx`, `src/components/AddVideoDialog.tsx`, table `training_videos` (colonnes `visibility`, `coach_name`, `views_count`), bucket `training-videos` | RLS de lecture conditionnée à la visibilité (`public` / `premium`) et au plan ; écriture autorisée aux rôles `admin` ou `coach` ; compteur de vues incrémenté par RPC `increment_video_views` |
| Gamification « Wolf Pack » | Implémentée | `src/utils/gamification/wolfPack.ts`, `src/utils/gamification/wolfTracking.ts`, `src/utils/gamification/wolfTimer.ts`, `src/components/gamification/*`, `src/hooks/useGamification.tsx` | 7 rangs, 9 badges, XP, séries (streaks), sons |
| Groupes utilisateurs (« meutes ») | Implémentée | `src/components/MeuteCard.tsx`, `src/hooks/useMeutes.tsx`, tables `meutes`, `meute_members`, `meute_activities` | Rôles owner/admin/member, invitations |
| Notifications in-app | Implémentée | `src/components/NotificationsPopover.tsx`, table `notifications`, fonction SQL `create_notification` | Marquage lu/non-lu |
| Flux d’activité communautaire | Implémentée | `src/components/CommunityActivity.tsx`, table `community_activities`, trigger `on_workout_completed` | Visibilité publique entre utilisateurs |
| Flux d’actualité MMA | Implémentée | `src/components/MMANewsBanner.tsx`, `src/components/MMAResultsFeed.tsx`, `supabase/functions/fetch-mma-results/index.ts` | Agrégation RSS Sherdog / MMA Fighting / Bloody Elbow |
| Abonnement Stripe | Implémentée | `src/pages/Pricing.tsx`, `src/hooks/useSubscription.tsx`, `supabase/functions/create-checkout/index.ts`, `supabase/functions/check-subscription/index.ts`, `supabase/functions/customer-portal/index.ts`, table `subscriptions` | 4 plans, tarifs en dur côté code (price IDs Stripe) ; depuis `20260525215520_*.sql`, les utilisateurs ne peuvent plus modifier directement leur ligne `subscriptions` (réservé service role) |
| Gestion des limites par plan | Implémentée | `src/hooks/useFeatureAccess.tsx`, `src/hooks/useFeatureGate.tsx`, table `feature_usage`, fonctions SQL `has_feature_access`, `get_feature_usage`, `increment_feature_usage`, `get_feature_limit` | Quotas mensuels paramétrés par plan. Depuis `20260526095651_*.sql`, INSERT/UPDATE sur `feature_usage` ne sont plus accessibles aux utilisateurs : seule la fonction SECURITY DEFINER `increment_feature_usage` peut écrire. Bypass total pour rôles `admin`/`coach`. |
| Paywall fonctionnel | Implémentée | `src/components/FeaturePaywall.tsx`, `src/components/PaywallDialog.tsx`, `src/hooks/useFeatureGate.tsx` | Hook utilitaire combinant `useFeatureAccess.useFeatureWithTracking` + état d’ouverture du paywall (`gate()` → boolean + setter d’overlay) |
| Back-office administrateur | Implémentée | `src/pages/admin/*`, `src/components/admin/*`, `src/hooks/useAdminStats.tsx`, `src/hooks/useAdminUsers.tsx`, `src/hooks/useUserRole.tsx`, table `user_roles` | Tableau de bord, utilisateurs, abonnements, vidéos, paramètres. Deux rôles privilégiés détectés : `admin` et `coach` (depuis migration `20251205232737_*.sql`) |
| Page Mentions légales / CGV / RGPD | Implémentée | `src/pages/Legal.tsx` | Section RGPD étoffée (catégories de données, finalités, sous-traitants, droits, rappel non médical). Les éléments juridiques en cours de finalisation (SIRET définitif, URL politique de confidentialité publiée) sont indiqués par des formulations factuelles côté utilisateur et tracés par `{/* TODO juridique */}` côté source uniquement. |
| Recherche vectorielle / RAG | Non implémentée fonctionnellement | Table `documents` (avec colonne `embedding`) toujours présente dans `src/integrations/supabase/types.ts` ; RPC `match_documents` corrigée (search_path) dans `20251210210551_*.sql` mais non appelée depuis `src/` ni depuis les Edge | Statué résidu non utilisé dans `docs/audit/SCHEMA_DRIFT.md` ; plan DROP documenté |
| Multi-organisations (B2B) | Scaffold dormant | Tables `organizations`, `organization_members`, `organization_invitations`, `render_usage` toujours typées dans `types.ts` mais sans migration versionnée ni usage applicatif | Scaffold non activé documenté dans `docs/audit/SCHEMA_DRIFT.md` ; plan DROP documenté |
| Traçabilité webhooks Stripe | Implémentée | Table `stripe_webhook_events` créée par `supabase/migrations/20260526120000_stripe_webhook_events.sql` ; RPCs `is_webhook_processed`, `mark_webhook_processed`, `sync_stripe_subscription`, `check_subscription_access`, `get_user_id_by_stripe_customer` définies. Edge Function `supabase/functions/stripe-webhook/index.ts` versionnée (vérification signature HMAC, idempotence, routage `checkout.session.completed` + `customer.subscription.{created,updated,deleted}`). | Harnais de test Deno minimal fourni (`tests/edge/stripe-webhook.test.ts`) |

---

## 4. Architecture technique

### Vue d’ensemble

Application web monolithique côté front (SPA React/Vite) couplée à une plateforme Backend-as-a-Service (Supabase) hébergeant la base de données relationnelle, l’authentification, le stockage objet et les fonctions serverless. Les briques IA sont déportées sur une passerelle externe (modèles `google/gemini-2.5-flash` pour le conversationnel et l’analyse statistique, `google/gemini-2.5-pro` par défaut pour la vision multi-image, `flash` en mode `qualityMode='fast'`) appelée depuis les Edge Functions.

### Frontend

- Bundler : Vite 5 + `@vitejs/plugin-react-swc` (`vite.config.ts`)
- Routage : React Router DOM v6 avec routes protégées (`ProtectedRoute`) et routes publiques (`PublicRoute`) — `src/App.tsx`
- État serveur : TanStack React Query
- État local : hooks React (`useState`, `useReducer`) et contextes (`AuthProvider`, `GamificationProvider` partiel)
- UI : Tailwind CSS + shadcn-ui (49 composants Radix dans `src/components/ui/`)
- Formulaires : React Hook Form + Zod
- Graphiques : Recharts
- Export PDF : jsPDF
- Scan code-barres : ZXing
- Animations : Framer Motion

### Backend (Supabase)

- **PostgreSQL** : 19 tables applicatives explicitement créées par les migrations versionnées (`profiles`, `workouts`, `exercises`, `workout_exercises`, `sets`, `nutrition_logs`, `nutrition_goals`, `workout_journal`, `training_videos`, `subscriptions`, `user_roles`, `meutes`, `meute_members`, `meute_activities`, `notifications`, `community_activities`, `sparring_analyses`, `feature_usage`, `stripe_webhook_events`). Le module `profiles` a été étendu en mai 2026 (`20260525214700_*.sql`) avec 22 colonnes supplémentaires (`body_fat_percent`, `waist_cm`, `morphotype`, `handedness`, `injuries[]`, `years_practice`, `belt_rank`, `secondary_disciplines[]`, `competition_level`, `competitions_count`, `primary_goal`, `goal_deadline`, `target_event`, `sleep_hours`, `stress_level`, `weekly_availability`, `preferred_session_duration`, `training_location`, `equipment[]`, `dietary_restrictions[]`). La table `Document` (doublon) a été supprimée par `20251210210551_*.sql`. La table `stripe_webhook_events` a été versionnée le 2026-05-26 (`20260526120000_*.sql`). 5 tables supplémentaires sont typées dans `src/integrations/supabase/types.ts` sans migration versionnée — statuées comme scaffold dormant ou résidus dans `docs/audit/SCHEMA_DRIFT.md` (`documents`, `organizations`, `organization_members`, `organization_invitations`, `render_usage`) ; aucun usage applicatif détecté.
- **Row-Level Security** : activée systématiquement. Posture renforcée en mai 2026 : (a) suppression des INSERT/UPDATE utilisateur sur `subscriptions` (écritures réservées au service role / webhook signé), (b) lecture de `documents` et `community_activities` restreinte aux utilisateurs authentifiés, (c) INSERT sur `render_usage` contraint à `auth.uid() = user_id`, (d) suppression des INSERT/UPDATE utilisateur sur `feature_usage` (écritures via la fonction SECURITY DEFINER `increment_feature_usage` uniquement), (e) helpers SECURITY DEFINER `is_meute_member`, `is_meute_owner`, `get_meute_member_role` introduits pour casser la récursion RLS sur `meutes` / `meute_members` / `meute_activities`, (f) table `stripe_webhook_events` couverte par RLS sans policy applicative (accès service role uniquement, cohérent avec le webhook Stripe).
- **Fonctions SQL** : `handle_new_user`, `handle_new_user_subscription`, `update_updated_at_column` (search_path fixé), `has_role`, `has_feature_access`, `get_feature_usage`, `increment_feature_usage`, `get_feature_limit`, `create_notification`, `create_community_activity_on_workout`, `handle_new_meute`, `increment_video_views`, `is_meute_member`, `is_meute_owner`, `get_meute_member_role`, `match_documents` (search_path fixé), `is_webhook_processed`, `mark_webhook_processed`, `get_user_id_by_stripe_customer`, `sync_stripe_subscription`, `check_subscription_access` — toutes en `SECURITY DEFINER` (ou `SECURITY INVOKER` avec `SET search_path = public` pour `update_updated_at_column` et `match_documents`). RPCs résiduelles typées dans `types.ts` (sans définition versionnée, statuées dans `SCHEMA_DRIFT.md`) : `check_organization_quota`, `increment_organization_usage`, `reset_monthly_organization_quotas`.
- **Triggers** : création automatique de profil, abonnement Free et membre de meute à l’inscription/création.
- **Auth** : Supabase Auth (email/password). Session persistée côté client dans `localStorage`. Enum `app_role` : `admin | user | coach` (`moderator` retiré).
- **Storage** : 2 buckets identifiés — `training-videos` (politique de lecture combinée visibilité/plan/rôle ; écriture autorisée aux rôles `admin` et `coach`) et `sparring-videos` (privé, segmenté par dossier `auth.uid()`). Le module `src/utils/storageUtils.ts` (introduit en mai 2026) génère des URLs signées (`createSignedUrl`, 1 h par défaut) pour servir les vidéos `sparring-videos`.

### Edge Functions (Deno, 8 fonctions)

| Fonction | Rôle | JWT | Particularités observées |
|---|---|---|---|
| `ai-coach` | Chat conversationnel personnalisé (streaming SSE) | Vérifié | Gating serveur : `has_role` (admin/coach bypass) + `has_feature_access('ai_coach')` + `increment_feature_usage`. Prompt système enrichi avec ~30 champs profil. |
| `ai-stats-analysis` | Synthèse 30 jours workouts + nutrition (streaming) | Vérifié | — |
| `analyze-sparring` | Vision LLM multi-frames, **tool/function calling** structuré (`submit_sparring_analysis`), retry exponentiel, profils par discipline, validation et normalisation JSON | Vérifié | Modèle par défaut `google/gemini-2.5-pro` (commutable en `gemini-2.5-flash` via `qualityMode='fast'`), jusqu’à 60 frames, gating serveur identique au coach IA. |
| `create-checkout` | Création de session Stripe Checkout | Vérifié | — |
| `check-subscription` | Synchronisation abonnement Stripe → table `subscriptions` | Vérifié | Mapping `product_id → plan` codé en dur (dupliqué côté `stripe-webhook` ; centralisation prévue). |
| `customer-portal` | Portail client Stripe | Vérifié | — |
| `stripe-webhook` | Réception des événements Stripe signés, idempotence, synchronisation autoritaire des abonnements | Désactivé (Stripe authentifie par signature HMAC) | Vérification signature `STRIPE_WEBHOOK_SECRET` via `constructEventAsync`, idempotence via `stripe_webhook_events` + RPCs `is_webhook_processed` / `mark_webhook_processed`, routage `checkout.session.completed` + `customer.subscription.{created,updated,deleted}`, synchronisation via RPC `sync_stripe_subscription`, fallback de résolution user via email Stripe → `profiles.email`. Harnais Deno fourni dans `tests/edge/stripe-webhook.test.ts`. |
| `fetch-mma-results` | Agrégation RSS de 3 sources MMA | Non vérifié (public) | — |

### Intégrations externes

- **Stripe** (`stripe@18.5.0` côté Edge) — paiements, abonnements, portail client, webhook signé (`supabase/functions/stripe-webhook/index.ts`). Mapping `product_id → plan` codé en dur dans `supabase/functions/check-subscription/index.ts` (lignes 79–83) et `supabase/functions/stripe-webhook/index.ts` ; centralisation `_shared/` à prévoir.
- **Passerelle IA externe (tierce)** — URL et clé centralisées dans `supabase/functions/_shared/ai-gateway.ts` (variables d'environnement `AI_GATEWAY_URL` et `AI_GATEWAY_API_KEY`, avec un fallback rétrocompatible sur le nom de variable historique pour ne pas casser les secrets Supabase déjà provisionnés), consommées par les trois fonctions Edge IA (`supabase/functions/ai-coach/index.ts`, `ai-stats-analysis/index.ts`, `analyze-sparring/index.ts`). Modèles `google/gemini-2.5-flash` (coach + stats) et `google/gemini-2.5-pro` par défaut (analyse vidéo, bascule `flash` possible), authentification par secret Deno injecté côté Edge.
- **API publique Open Food Facts** (`world.openfoodfacts.org`) — utilisée côté client par `src/components/FoodSearchInput.tsx` (recherche par nom) et `src/components/BarcodeScannerDialog.tsx` (recherche par code-barre).
- **Flux RSS publics** — Sherdog, MMA Fighting, Bloody Elbow.

### Schéma textuel

```text
[Navigateur utilisateur]
    │
    ├── SPA React (Vite, hébergement à confirmer)
    │       │
    │       ├── @supabase/supabase-js (Auth, REST/PostgREST, Storage, Functions)
    │       ├── Extraction de frames vidéo côté client (canvas/video API)
    │       └── Open Food Facts API (HTTPS) ◄── recherche nutrition + scan code-barres
    │
    └── (HTTPS)
            │
            ▼
[Supabase — projet "vpvfkazmfvxbpffymodg"]
    ├── PostgreSQL + RLS (19 tables versionnées, +5 tables typées hors migrations statuées)
    │     ├── Helpers SECURITY DEFINER (has_role, has_feature_access, is_meute_*, sync_stripe_subscription…)
    │     ├── Idempotence Stripe : stripe_webhook_events + is/mark_webhook_processed
    │     └── Extensions vectorielles présentes (pgvector) — non utilisées applicativement
    ├── Auth (email/password)
    ├── Storage
    │     ├── sparring-videos (privé, URLs signées via storageUtils)
    │     └── training-videos (lecture conditionnée à visibility + plan + rôle)
    └── Edge Functions Deno
            ├── ai-coach ─────────┐
            ├── ai-stats-analysis ┼──► Passerelle IA tierce
            ├── analyze-sparring ─┘    (Gemini 2.5 Pro/Flash, tool calling)
            ├── create-checkout ──┐
            ├── check-subscription┼──► Stripe API
            ├── customer-portal ──┤
            ├── stripe-webhook ◄──┘    (Stripe → webhook signé HMAC, idempotence)
            └── fetch-mma-results ──► Flux RSS publics (Sherdog, MMA Fighting, Bloody Elbow)
```

---

## 5. Structure du dépôt

| Chemin | Rôle identifié | Importance |
|---|---|---|
| `src/App.tsx` | Point d’entrée applicatif, configuration des routes et des providers | Élevée |
| `src/main.tsx` | Bootstrap React | Faible |
| `src/pages/` | 11 pages (Auth, Index, Onboarding, Profile, WorkoutHistory, WorkoutJournal, Statistics, TrainingVideos, Pricing, Legal, NotFound) | Élevée |
| `src/pages/admin/` | 5 pages back-office (Dashboard, Users, Subscriptions, Videos, Settings) | Élevée |
| `src/components/` | 28 composants applicatifs racine (+`FoodSearchInput.tsx`, +`VideoBackground.tsx`) | Élevée |
| `src/components/ui/` | 49 composants UI shadcn-ui (primitives Radix encapsulées) | Moyenne (réutilisables) |
| `src/components/sparring/` | Module analyse vidéo (`SparringAnalysisV2.tsx` ≈ 1 700 lignes / 61 272 octets, PDF export, progress tracker, share) | Élevée — différenciant |
| `src/components/gamification/` | UI gamification (rank, badge, timer, session summary) avec tests | Élevée — différenciant |
| `src/components/workout/` | UI séances v2 (`StartWorkoutDialogV2`, `ActiveWorkoutPage`, `WorkoutManager`) | Élevée |
| `src/components/admin/` | Layout, Sidebar, StatsCard pour le back-office | Moyenne |
| `src/hooks/` | 16 hooks (ajout de `useFeatureGate.tsx` par rapport à la version précédente) | Élevée |
| `src/utils/` | Utilitaires métier dont `videoFrameExtractor`, `sparringAnalysisSchema`, `sparringPrompts`, `retryWithBackoff`, `storageUtils` (signed URLs) | Élevée — différenciant |
| `src/utils/gamification/` | Logique XP/rangs/badges/streaks/timer (`wolfPack.ts`, `wolfTracking.ts`, `wolfTimer.ts`) ~1 367 lignes prod | Élevée — différenciant |
| `src/integrations/supabase/client.ts` | Client Supabase initialisé via variables Vite (`import.meta.env.VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) avec exports nommés (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) — source unique de configuration | Élevée |
| `src/integrations/supabase/types.ts` | Types générés de la base (~1 230 lignes ; couvre 24 tables y compris hors migrations versionnées — statué dans `SCHEMA_DRIFT.md`) | Élevée |
| `src/lib/utils.ts` | Helper `cn()` (clsx + tailwind-merge) | Faible |
| `src/test/setup.ts` | Configuration Vitest + jsdom + Testing Library | Moyenne |
| `src/assets/` | Images statiques (hero MMA, hero-background) | Faible |
| `supabase/config.toml` | Configuration des fonctions (vérification JWT par fonction, `verify_jwt = false` pour `stripe-webhook`) | Élevée |
| `supabase/functions/` | 8 Edge Functions Deno (incl. `stripe-webhook`) | Élevée |
| `supabase/migrations/` | 28 fichiers SQL ordonnés par timestamp (dernière migration `20260526133146_*.sql` ajoutant un index composite `nutrition_logs(user_id, date)`) | Élevée |
| `supabase/seed/seed-admin.example.sql` | Script bootstrap paramétré (placeholder `<ADMIN_USER_UUID>`) non exécuté par le pipeline ; usage manuel pour provisionner un admin sur un environnement neuf | Moyenne |
| `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` | Présent document | Élevée |
| `docs/audit/SCHEMA_DRIFT.md` | Matrice types ⇄ migrations + statuts + plans d’action | Élevée |
| `docs/audit/TYPESCRIPT_STRICTNESS_ROADMAP.md` | Trajectoire 3 phases pour activer `strict: true` (gouvernance de la dette TS) | Moyenne |
| `docs/audit/LEGACY_CLEANUP.md` | Inventaire des composants/assets legacy et convention de dépréciation | Moyenne |
| `e2e/sparring-analysis.spec.ts` | Tests E2E Playwright (couverture limitée, ~125 lignes) | Moyenne |
| `tests/edge/` | Harness Deno pour Edge Functions (`stripe-webhook`, `ai-coach`, `analyze-sparring`) — exécution manuelle documentée | Moyenne |
| `playwright.config.ts` | Configuration Playwright (Chromium, base URL configurable) | Moyenne |
| `vitest.config.ts` | Configuration Vitest avec seuils de couverture 80 % sur `src/utils/**` et `src/components/sparring/**` | Moyenne |
| `vite.config.ts` | Configuration Vite (plugin React SWC + alias `@`) | Moyenne |
| `tailwind.config.ts` | Tokens de design, thème, plugin typography | Moyenne |
| `tsconfig*.json` | Configuration TypeScript — mode non strict (trajectoire d’activation dans `TYPESCRIPT_STRICTNESS_ROADMAP.md`) | Faible |
| `eslint.config.js` | Linter (TypeScript-ESLint, plugins react-hooks et react-refresh) ; `no-unused-vars` en `warn` avec convention `_` ; ignore `supabase/functions/**` et `tests/edge/**` (Deno) | Moyenne |
| `package.json` | Dépendances et scripts (`dev`, `build`, `lint`, `preview`, `test`, `test:e2e`, `test:coverage`) | Élevée |
| `.env.example` | Template de variables Vite publiques avec placeholders et note explicite sur les secrets serveur à ne pas exposer | Élevée |
| `.gitignore` | Exclut `.env`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`, `.env.test`, ainsi que `supabase/.branches` et `supabase/.temp` | Élevée |
| `.github/workflows/ci.yml` | Pipeline CI (checkout → setup-node 20 → npm ci → lint → tests Vitest → build). Playwright opt-in. | Élevée |
| `dist/`, `node_modules/`, `bun.lockb` | Artefacts de build et dépendances | Faible |

---

## 6. Modules propriétaires identifiés

| Module | Rôle | Niveau de spécificité | Éléments valorisables | Réserve |
|---|---|---|---|---|
| Pipeline d’analyse vidéo de sparring | Extraction de frames côté client (échantillonnage adaptatif, validation luminance/contraste) → envoi à une fonction Edge → vision LLM multi-image **avec tool/function calling structuré** → validation/normalisation stricte → persistance ; profils par discipline (boxe, kickboxing, muay thai, MMA, BJJ, karaté/taekwondo) avec règles d’invalidation des métriques non pertinentes | Élevé | `src/utils/videoFrameExtractor.ts`, `src/utils/sparringAnalysisSchema.ts`, `src/utils/sparringPrompts.ts`, `supabase/functions/analyze-sparring/index.ts` (~641 l. avec tool schema, profils disciplines, gating, validation), `src/components/sparring/SparringAnalysisV2.tsx` (~1 700 l.) | Dépendance forte aux modèles Gemini (pro/flash) via passerelle externe |
| Système de gamification « Wolf Pack » | Rangs (7), badges (9), XP avec multiplicateurs (streak, intensité), calcul de streaks, messages motivationnels, mapping sons | Moyen à élevé (thématique propre, formules originales) | `src/utils/gamification/wolfPack.ts` (500 l.), `wolfTracking.ts` (576 l.), `wolfTimer.ts` (291 l.) + 1 597 lignes de tests | Logique purement client ; persistance Supabase indirecte (à confirmer via `useGamification`) |
| Couche de gating fonctionnel multi-plans | Configuration centralisée des fonctionnalités, des limites mensuelles par plan, RPC SQL pour comptage atomique, hooks React unifiés (`useFeatureAccess` + wrapper `useFeatureGate`) ; gating dorénavant **dupliqué côté Edge** sur `analyze-sparring` et `ai-coach` avec bypass admin/coach via `has_role` | Moyen à élevé | `src/hooks/useFeatureAccess.tsx`, `src/hooks/useFeatureGate.tsx`, table `feature_usage` (verrou RLS écriture), fonctions SQL `has_feature_access`, `get_feature_usage`, `increment_feature_usage`, `get_feature_limit` | Doublon de logique entre SQL (source de vérité) et hook UI (cache + fallback) — comportement convergent depuis le verrou de mai 2026 |
| Retry exponentiel typé | Helper réutilisable avec jitter, conditions personnalisables, classes `RetryableError`, callbacks | Standard mais bien implémenté | `src/utils/retryWithBackoff.ts` (334 l.) + 373 l. tests | — |
| Validation de schéma d’analyse sparring | Sanitisation/normalisation défensive des réponses LLM (clamps, types unions, garanties d’invariants) | Élevé (savoir-faire métier IA) | `src/utils/sparringAnalysisSchema.ts`, validation Edge intégrée (`validateAnalysis` dans `analyze-sparring/index.ts`) | Schéma maintenu manuellement, sans Zod |
| Synchronisation Stripe ↔ base | Mapping product Stripe → plan applicatif, mise à jour ligne `subscriptions`, gestion du portail, webhook signé idempotent (HMAC + table `stripe_webhook_events`) | Standard à élevé | `supabase/functions/check-subscription/index.ts`, `create-checkout/index.ts`, `customer-portal/index.ts`, `stripe-webhook/index.ts`, migration `20260526120000_stripe_webhook_events.sql`, table `subscriptions` | Mapping `product_id → plan` dupliqué entre `check-subscription` et `stripe-webhook` (centralisation `_shared/` à prévoir) |
| Module « meutes » (groupes communautaires) | Modèle owner/admin/member, invitations, activités ; helpers SECURITY DEFINER (`is_meute_member`, `is_meute_owner`, `get_meute_member_role`) pour casser la récursion RLS | Moyen | Migrations `20251205234548_*.sql` et `20260526100900_*.sql`, `src/hooks/useMeutes.tsx`, `src/components/MeuteCard.tsx` | Activité de groupe partiellement reliée aux workouts |
| Helper Storage signed URL | Génération d’URLs signées sur bucket privé, extraction de chemins depuis URLs publiques, conversion auto public → signé (1 h par défaut) | Standard | `src/utils/storageUtils.ts` (82 l.) — consommé par `SparringAnalysisV2.tsx` (lecture vidéos sparring) | — |
| Génération de PDF d’analyse | Composition d’un rapport sparring imprimable | Moyen | `src/components/sparring/SparringPDFExport.tsx` (351 l.) | Limité au plan Senseï |

---

## 7. Dépendances et composants externes

| Dépendance | Usage observé | Criticité | Risque associé |
|---|---|---|---|
| `@supabase/supabase-js` ^2.58 | Auth, REST, Storage, Functions, Realtime | Critique | Vendor lock-in fort (PostgREST, RLS, fonctions SQL spécifiques Postgres) |
| `stripe` ^18.5 (Edge) | Paiements, abonnements, portail client | Critique | Vendor lock-in paiement ; aucun webhook observé |
| Passerelle IA externe (tierce) | Coach IA, analyse stats, analyse sparring | Critique | Dépendance à un service tiers non interne au stack Supabase ; coût et disponibilité non documentés ici. Endpoint visible dans `supabase/functions/ai-coach/index.ts`, `ai-stats-analysis/index.ts`, `analyze-sparring/index.ts` |
| Modèles `google/gemini-2.5-flash` et `google/gemini-2.5-pro` | Raisonnement (coach, stats) et vision multimodale (sparring) | Critique | Spécifiés en dur dans 3 fonctions ; coût/quotas à confirmer. `pro` est le défaut pour l’analyse vidéo, `flash` en mode `qualityMode='fast'` |
| API publique Open Food Facts | Recherche nutrition et résolution code-barre | Moyenne | Pas de SLA contractuel ; usage anonyme depuis le navigateur de l’utilisateur |
| `react`, `react-dom` 18.3 | UI | Critique | Standard |
| `react-router-dom` ^6.26 | Routage SPA | Élevée | Standard |
| `@tanstack/react-query` ^5.56 | Fetching/cache serveur | Élevée | Standard |
| `react-hook-form` + `zod` + `@hookform/resolvers` | Formulaires et validation | Moyenne | Standard |
| Radix UI (~26 packages) via `shadcn-ui` | Primitives UI | Moyenne | Standard ; composants copiés dans `src/components/ui/`, non auto-mis à jour |
| `tailwindcss` ^3.4 + `tailwindcss-animate` + `@tailwindcss/typography` | Styles | Moyenne | Standard |
| `recharts` ^2.12 | Graphiques | Moyenne | Standard |
| `framer-motion` ^12.23 | Animations | Faible | Présent mais usage à confirmer (peu de références) |
| `lucide-react` 0.462 | Icônes | Faible | Standard |
| `jspdf` ^3.0 | Export PDF | Moyenne | Standard |
| `@zxing/browser`, `@zxing/library` | Scan code-barres | Moyenne | Standard |
| `date-fns` ^3.6 | Manipulation de dates (front + Edge) | Moyenne | Standard |
| `sonner` ^1.5 | Toasts | Faible | Standard |
| `cmdk`, `embla-carousel-react`, `vaul`, `input-otp`, `next-themes`, `react-resizable-panels`, `react-day-picker` | Composants UI complémentaires | Faible | Standard, tirés de la stack shadcn |
| `playwright`, `vitest`, `@testing-library/*`, `jsdom`, `@vitest/coverage-v8` | Tests | Élevée pour la qualité | Standard |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | Linting | Moyenne | Standard |

**Notes** :

- La règle ESLint `@typescript-eslint/no-unused-vars` est configurée en `warn` avec convention `_` (`argsIgnorePattern`, `varsIgnorePattern`, `caughtErrorsIgnorePattern`). Les répertoires Deno (`supabase/functions/**`, `tests/edge/**`) sont ignorés par la config Node.
- `tsconfig.app.json` exécute encore avec `"strict": false`, `"noImplicitAny": false`, `"noUnusedLocals": false`, `"noUnusedParameters": false`, `"noFallthroughCasesInSwitch": false`. `tsconfig.json` racine désactive en outre `"strictNullChecks"`. La trajectoire d’activation est formalisée dans `docs/audit/TYPESCRIPT_STRICTNESS_ROADMAP.md` (3 phases avec critères de sortie objectifs).

---

## 8. Données, sécurité et conformité

### Gestion des secrets

- Le client Supabase lit l’URL du projet et la clé publique `anon` via les variables Vite publiques `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (`src/integrations/supabase/client.ts`). Les exports nommés `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` constituent la source unique de configuration côté front. Des valeurs de secours hardcodées (publiables par construction — URL projet + JWT `anon`) sont conservées dans le fichier pour ne pas casser un environnement de dev sans `.env`.
- Plus aucune duplication de clé `anon` dans le code applicatif : `src/components/AICoachChat.tsx` importe `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` du client centralisé. Le `fetch` brut subsiste pour le streaming SSE (non supporté par `supabase.functions.invoke`) mais ne porte plus de littéral de secret.
- `.env` est désindexé du dépôt et listé dans `.gitignore` aux côtés de `.env.local`, `.env.*.local`, `.env.development`, `.env.production`, `.env.test`. Un fichier `.env.example` versionné fournit le template avec placeholders publiables et une note explicite indiquant que `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et la clé d’API de la passerelle IA ne doivent jamais y figurer ni dans le bundle.
- Les secrets sensibles côté Edge (clé de la passerelle IA accédée via `AI_GATEWAY_API_KEY` — avec un fallback rétrocompatible sur le nom de variable historique conservé dans `supabase/functions/_shared/ai-gateway.ts` —, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) sont accédés via `Deno.env.get(...)` dans les fonctions Edge et ne sont pas présents dans le code versionné.

### Authentification

- Supabase Auth (email/password). Pas de SSO, MFA ou OAuth observé.
- Persistance via `localStorage` (`src/integrations/supabase/client.ts`, ligne 13). Risque XSS standard ; aucun stockage en cookie HttpOnly.
- Vérification JWT activée sur 6 fonctions Edge sur 8 (`fetch-mma-results` volontairement publique, `stripe-webhook` authentifié par signature HMAC Stripe via `STRIPE_WEBHOOK_SECRET`).

### Autorisations

- Row-Level Security activée sur toutes les tables applicatives identifiées dans les migrations.
- Policies systématiques `auth.uid() = user_id` pour les ressources personnelles.
- Modèle de rôle d’administration via table `user_roles` et fonction `has_role(_user_id, _role)`. Enum `app_role` actuel : `admin | user | coach`. Les rôles `admin` et `coach` partagent un bypass complet sur le gating fonctionnel (côté front via `useFeatureAccess` et côté Edge via `analyze-sparring` et `ai-coach`).
- **Provisionnement administrateur** : aucune insertion nominative dans les migrations versionnées. Le script `supabase/seed/seed-admin.example.sql` (paramétré, non exécuté par le pipeline) permet de provisionner un administrateur sur un environnement neuf en remplaçant `<ADMIN_USER_UUID>` par l’UUID effectif et en exécutant le script manuellement.
- Durcissements RLS récents (mai 2026) :
  - `subscriptions` : INSERT/UPDATE utilisateurs supprimés — écritures réservées au service role (cohérent avec un webhook Stripe).
  - `documents` et `community_activities` : lecture restreinte aux utilisateurs authentifiés (auparavant `public`).
  - `render_usage` : INSERT contraint à `auth.uid() = user_id`.
  - `feature_usage` : INSERT/UPDATE utilisateurs supprimés — incrémentation uniquement via la fonction SECURITY DEFINER `increment_feature_usage`.
  - `meutes` / `meute_members` / `meute_activities` : réécriture des policies pour utiliser des helpers SECURITY DEFINER et casser la récursion RLS.
- Policies sur les buckets Storage : `sparring-videos` segmenté par dossier `auth.uid()` (accès via URLs signées générées par `storageUtils.ts`), `training-videos` en lecture conditionnée à `visibility` + plan + rôle / écriture autorisée aux rôles `admin` et `coach`.

### Logs

- Logging par `console.log` dans les fonctions Edge (préfixes `[CHECK-SUBSCRIPTION]`, `[CUSTOMER-PORTAL]`, etc.). Côté frontend, Sentry est intégré (`@sentry/react@10.54.0`, configuration dans `src/lib/sentry.ts`, initialisée dans `src/main.tsx` ; sampling traces 10 % et replay sur erreur 100 % en production, masquage texte et blocage médias activés, DSN piloté par la variable d'environnement `VITE_SENTRY_DSN`). Aucune observabilité structurée n'est encore en place côté Edge Functions.
- Aucun système d’audit log explicite côté base (pas de table `audit_logs`).

### Données personnelles

- Données collectées : email, nom complet, âge, genre, poids, taille, niveau de fitness, discipline principale, disciplines secondaires, grade, années de pratique, niveau et nombre de compétitions, objectifs SMART, échéance et événement cible, masse grasse, tour de taille, morphotype, latéralité, blessures, sommeil, niveau de stress, disponibilité hebdomadaire, durée de séance préférée, lieu d’entraînement, équipement disponible, restrictions alimentaires, historique d’entraînements, journal nutritionnel, vidéos de sparring uploadées. **Le volume et la granularité des données personnelles ont sensiblement augmenté en mai 2026** (`20260525214700_*.sql`).
- Ces champs profil sont injectés intégralement dans le prompt système envoyé à la passerelle IA tierce (`supabase/functions/ai-coach/index.ts`, lignes 80–127). À considérer dans l’analyse de transferts hors UE / minimisation RGPD.
- La page `src/pages/Legal.tsx` mentionne explicitement la conformité RGPD, le rôle de responsable de traitement et les droits (accès, rectification, effacement, portabilité, opposition, limitation). La section RGPD détaille les catégories de données (identification, sportives, nutritionnelles, médias), les finalités, le recours à des sous-traitants techniques, et rappelle explicitement le caractère non médical des analyses produites. Les champs juridiques en cours de finalisation (SIRET définitif après immatriculation, URL politique de confidentialité publiée) sont formulés de manière factuelle côté utilisateur (« en cours d’immatriculation », « disponible sur demande à `contact@korev-ai.com` ») ; les `TODO juridiques` correspondants subsistent uniquement en commentaires source non visibles.
- Aucun mécanisme d’export/suppression de compte automatisé n’a été identifié côté code (la suppression utilisateur Supabase déclenche un `ON DELETE CASCADE` sur les FK observées).

### Chiffrement

- TLS implicite via Supabase et Stripe.
- Pas de chiffrement applicatif observé sur les données stockées (au repos, le chiffrement est délégué à Supabase/Postgres).

### Auditabilité

- Triggers de mise à jour `updated_at` sur les tables principales.
- Tables `community_activities` et `meute_activities` constituent un journal d’événements métier limité (création par triggers/inserts manuels).
- Pas de traçabilité fine des accès administrateur.

### Conformité potentielle

- **RGPD** : intentions documentées, mécaniques techniques partielles (RLS, isolation par utilisateur), nécessite confirmation par le porteur (registre de traitement, DPIA, politique de confidentialité publiée, procédures de droits des personnes).
- **AI Act (UE)** : l’application utilise un système d’IA générative et un système de vision automatisée d’analyse de performance. La classification du système au sens de l’AI Act n’est pas documentée dans le périmètre audité.
- **Avertissement médical** : présent (`Legal.tsx`, lignes 86–109), précise que l’application n’est pas un dispositif médical au sens du Règlement UE 2017/745.

Aucune affirmation de conformité complète ne peut être faite sur la base du seul code.

---

## 9. Tests, qualité et maintenabilité

### Tests présents

- **Tests unitaires Vitest** (11 fichiers, environ 3 871 lignes) :
  - `src/utils/retryWithBackoff.test.ts` (373 l.)
  - `src/utils/sparringAnalysisSchema.test.ts` (441 l.)
  - `src/utils/videoFrameExtractor.test.ts` (440 l.)
  - `src/utils/gamification/wolfPack.test.ts` (539 l.)
  - `src/utils/gamification/wolfTimer.test.ts` (485 l.)
  - `src/utils/gamification/wolfTracking.test.ts` (573 l.)
  - `src/components/gamification/WolfBadgeCard.test.tsx` (172 l.)
  - `src/components/gamification/WolfRankDisplay.test.tsx` (106 l.)
  - `src/components/gamification/WolfSessionSummary.test.tsx` (221 l.)
  - `src/components/gamification/WolfTimerDisplay.test.tsx` (220 l.)
  - `src/components/workout/StartWorkoutDialogV2.test.tsx` (522 l.)
- **Tests E2E Playwright** : 1 fichier (`e2e/sparring-analysis.spec.ts`, 125 l.) sur le navigateur Chromium.
- **Harness Edge Functions (Deno)** : 3 fichiers dans `tests/edge/` (`stripe-webhook.test.ts`, `ai-coach.test.ts`, `analyze-sparring.test.ts`) couvrant les décisions critiques (signature Stripe invalide, idempotence webhook, gating quota IA, routage `qualityMode`, validation payload sparring). Exécution manuelle via `deno test --allow-env --allow-net=none tests/edge` (non encore branchée à la CI Node).

### Couverture

- Seuils déclarés dans `vitest.config.ts` : 80 % statements/branches/functions/lines sur `src/utils/**` et `src/components/sparring/**` (mais `src/components/sparring` ne contient à ce jour aucun test).
- Aucun rapport de couverture n’est versionné. Le dossier `test-results/` est présent (résidu d’exécution Playwright).
- Périmètre testé : utilitaires et gamification = bonne couverture revendiquée. Tout le reste (hooks, pages, composants UI applicatifs, Edge Functions) n’est pas couvert par des tests unitaires.

### Qualité structurelle

- Organisation par domaine (`gamification/`, `sparring/`, `workout/`, `admin/`) cohérente.
- Typage TypeScript explicite et abondant (interfaces métier, types unions, validateurs).
- Pattern de séparation : `utils` (logique pure) ↔ `hooks` (état/Supabase) ↔ `components` (rendu).
- Conventions de nommage stables ; mix français/anglais (acceptable pour un produit FR).

### Dette technique visible

- Coexistence `WorkoutLogger.tsx` (legacy) et `workout/StartWorkoutDialogV2.tsx` + `workout/ActiveWorkoutPage.tsx` (v2). Le composant legacy porte un bloc JSDoc `@deprecated` en tête indiquant la voie de remplacement. Inventaire et plan de retrait dans `docs/audit/LEGACY_CLEANUP.md`.
- `src/components/sparring/SparringAnalysisV2.tsx` atteint ~1 700 lignes dans un seul composant — opportunité de refactorisation.
- `VideoBackground.tsx` accepte un prop `freezeAt` désormais inutilisé (rendu image statique) ; la prop est marquée `@deprecated` en JSDoc et le paramètre renommé `_props` pour neutraliser le warning sans rompre les call sites. L’ancien asset `public/videos/hero-background.mp4` a été supprimé.
- Tables `documents`, `organizations*`, `render_usage` typées sans migration versionnée et sans usage applicatif — statuées comme scaffold dormant ou résidu dans `docs/audit/SCHEMA_DRIFT.md` avec plan d’action `DROP` documenté.
- Logique de feature gating triplée : SQL (`has_feature_access`, source de vérité), hook React (`useFeatureAccess` + cache + fallback local), gating serveur des Edge IA (`analyze-sparring`, `ai-coach`). Le risque de divergence est réduit depuis la migration `20260526095651_*.sql` qui verrouille en écriture la table `feature_usage`.
- Mapping `product_id Stripe → plan` dupliqué entre `check-subscription` et `stripe-webhook` — centralisation `_shared/` prévue.
- 11 tests Vitest en échec dans `StartWorkoutDialogV2.test.tsx` (sélecteurs DOM divergents) — antérieurs aux stabilisations, dette test à corriger.
- Mode TypeScript non strict — trajectoire formalisée et observable en CI dans `docs/audit/TYPESCRIPT_STRICTNESS_ROADMAP.md`.

### Documentation existante

- `README.md` réécrit comme documentation projet neutre (présentation, stack, démarrage local, scripts, structure du dépôt, pointeurs vers `docs/audit/`).
- Documentation auditeur structurée dans `docs/audit/` : présent document, `SCHEMA_DRIFT.md`, `TYPESCRIPT_STRICTNESS_ROADMAP.md`, `LEGACY_CLEANUP.md`, `LAUNCH_READINESS.md`.
- Pas de fichier `CONTRIBUTING.md`, `ARCHITECTURE.md`, ni de documentation OpenAPI/Swagger.
- Commentaires JSDoc présents sur les utilitaires `gamification`, `sparringAnalysisSchema`, `videoFrameExtractor`, `retryWithBackoff`, `storageUtils` (entêtes structurés, sections délimitées). Composants legacy marqués `@deprecated` (`WorkoutLogger`, prop `freezeAt` de `VideoBackground`).
- Page légale fonctionnelle (cf. §8).

### Scripts CI/CD

- Scripts npm définis : `dev`, `build`, `build:dev`, `lint`, `preview`, `test`, `test:run`, `test:coverage`, `test:ui`, `test:e2e`, `test:e2e:ui`, `test:e2e:headed`.
- Pipeline GitHub Actions versionné : `.github/workflows/ci.yml` exécute à chaque push/PR sur `main` un job `Lint • Test • Build` (Node 20, cache npm) — `npm ci` → `npm run lint` (non bloquant en phase 0, gouverné par `TYPESCRIPT_STRICTNESS_ROADMAP.md`) → `npm run test:run` → `npm run build`. Playwright reste opt-in via `npm run test:e2e` et n’est pas intégré au pipeline minimal.
- `playwright.config.ts` prévoit un mode CI (`retries: 2`, `workers: 1`) ; un pipeline e2e dédié est à activer dans une itération ultérieure.
- Pas de Dockerfile ni de pipeline GitLab CI ; déploiement via la plateforme Supabase (Edge Functions) et hébergement web à confirmer.

---

## 10. Niveau de maturité estimé

| Axe | Niveau observé | Commentaire |
|---|---|---|
| Fonctionnel | Avancé | Périmètre large et cohérent, dashboard intégré, monétisation en place avec webhook signé idempotent, fonctionnalités différenciantes (analyse vidéo discipline-aware, gamification) opérationnelles côté code |
| Technique | Intermédiaire à avancé | Stack moderne, séparation correcte, typage abondant (mode non strict mais trajectoire formalisée), gating serveur des Edge IA, source unique de configuration Supabase côté client, quelques composants monolithiques résiduels |
| Sécurité | Avancé | RLS systématique avec durcissements de mai 2026 (verrouillage `feature_usage`, `subscriptions`, helpers SECURITY DEFINER pour meutes, URLs signées Storage), JWT vérifié sur les fonctions sensibles, webhook Stripe signé HMAC versionné avec idempotence, `.env` désindexé et `.env.example` fourni, plus aucune duplication de clé applicative, plus aucun UUID admin nominatif dans les migrations. Réserve résiduelle : passerelle IA externe non substituable. |
| Maintenabilité | Intermédiaire à avancé | Organisation par domaine claire, tests unitaires sur modules critiques + harness Deno serveur, documentation auditeur structurée, dépréciation des modules legacy explicite, mode TypeScript non strict gouverné par roadmap |
| Scalabilité | À confirmer | Architecture Supabase scalable par défaut ; aucun élément observé sur la stratégie quotas IA, file d’attente d’analyses vidéo, ou gestion de pic |
| Documentation | Avancé | JSDoc sur utilitaires et composants legacy, ensemble structuré `docs/audit/` (doc standard, notes d’audit, schema drift, roadmap TS, legacy cleanup, remediation notes), README minimal, pas de runbook |
| Industrialisation | Intermédiaire | Pipeline CI GitHub Actions versionné (lint + tests + build), Playwright opt-in, harness Deno serveur en exécution manuelle. Pas de Dockerfile, pas de stratégie de release documentée. |

---

## 11. Éléments utiles pour valorisation

- **Volume de code utile** : environ 30 535 lignes de TypeScript front, 1 800 lignes de TypeScript Edge (Deno, incl. `stripe-webhook` et helpers), 1 720 lignes SQL de migrations (incl. `stripe_webhook_events` et RPCs), soit ~34 100 lignes de code et schéma applicatif (hors UI shadcn et tests). Les tests unitaires, E2E et harness Deno ajoutent ~4 200 lignes.
- **Complexité fonctionnelle** : multi-domaines (entraînement, nutrition, analyse vidéo IA, gamification, communauté, monétisation, back-office). Couverture verticale d’un usage métier complet.
- **Différenciation** :
  - Pipeline d’analyse vidéo de sparring avec extraction de frames, validation qualité, prompts versionnés, **tool/function calling structuré** et profils par discipline garantissant la cohérence des métriques selon le sport pratiqué (rare hors solutions verticales premium).
  - Système de gamification thématique cohérent (vocabulaire métier propre, formules d’XP, calcul de streaks, mapping de sons).
  - Couche de gating fonctionnel à granularité fine et à comptage atomique via fonctions PostgreSQL `SECURITY DEFINER`, désormais verrouillée en écriture côté base.
- **Réutilisabilité** : les utilitaires `videoFrameExtractor`, `retryWithBackoff`, `sparringAnalysisSchema`, `gamification/wolfPack` sont autoportants et testés ; transposables vers d’autres disciplines sportives.
- **Profondeur métier** : taxonomies d’exercices, disciplines MMA, structure des statistiques de combat, formules de rangs et badges, plans tarifaires multi-tiers — toutes ces ontologies sont codifiées dans le dépôt.
- **Propriété intellectuelle potentielle** : code source en TypeScript (modules `utils/`, `utils/gamification/`, composants `sparring/`), schéma de base de données (migrations SQL), prompts d’IA versionnés, design system Tailwind appliqué.
- **Niveau d’intégration** : intégration native avec Supabase (Auth, DB, Storage, Functions), Stripe (Checkout + portail), passerelle IA externe, flux RSS publics.
- **Actifs documentaires** : page mentions légales / CGV / RGPD rédigée, JSDoc sur modules critiques, commentaires en français orientés métier.
- **Tests** : 11 fichiers de tests unitaires couvrant les modules à forte valeur métier ; 1 fichier E2E ; 3 fichiers de harness Deno couvrant les chemins critiques des Edge Functions ; configuration de seuils à 80 % sur le périmètre déclaré.
- **Industrialisation** : pipeline CI GitHub Actions versionné, fichier `.env.example` fourni, script seed paramétré, documentation auditeur structurée.
- **Preuves d’usage internes** : configurations de plans Stripe avec `price_id` codés, mention d’une raison sociale (KOREV AI SASU) et d’une adresse (Herbeys, 38320). Aucun journal d’usage utilisateur réel n’est versionné dans le dépôt.

---

## 12. Limites et points à confirmer

| Point | Pourquoi c’est à confirmer | Impact potentiel |
|---|---|---|
| Tables `organizations`, `organization_members`, `organization_invitations`, `render_usage` présentes dans `src/integrations/supabase/types.ts` sans migration versionnée et sans usage applicatif | Indique une création hors versionning (dashboard Supabase ou template). Statué dans `docs/audit/SCHEMA_DRIFT.md` comme scaffold dormant ; plan d’action `DROP` documenté, à exécuter à la main par l’éditeur après confirmation. | Drift documenté ; suppression en base reste à effectuer pour purger les types résiduels |
| Table `documents` typée avec colonne `embedding` (RAG vectoriel) et RPC `match_documents` | Aucune utilisation dans `src/` ni dans les Edge Functions. Statué dans `SCHEMA_DRIFT.md` comme résidu non utilisé ; plan `DROP` documenté. | Aucun impact applicatif |
| Mentions légales — éléments juridiques en cours de finalisation (SIRET définitif post-immatriculation, URL politique de confidentialité publiée) | Formulés de manière factuelle côté utilisateur (« en cours d’immatriculation », « disponible sur demande »). `TODO juridiques` en commentaires source. | À finaliser dès clôture de l’immatriculation et rédaction de la politique |
| Mapping `product_id Stripe → plan` codé en dur et dupliqué entre `check-subscription/index.ts` et `stripe-webhook/index.ts` | Couple le code aux IDs de produit Stripe d’un environnement et duplique la table de correspondance | Centralisation `_shared/` à prévoir ; migration multi-environnements à clarifier |
| Logique de feature gating triplée (`has_feature_access` SQL + `useFeatureAccess` React + gating Edge dans `analyze-sparring`/`ai-coach`) | Plusieurs points d’application | Le verrou RLS de mai 2026 rend la base autoritative, mais le risque de divergence d’UX subsiste |
| Mode TypeScript non strict (`strict: false`, `strictNullChecks` désactivé, `noImplicitAny` désactivé) | Sécurité de typage déléguée aux conventions et à la revue. Trajectoire d’activation formalisée dans `docs/audit/TYPESCRIPT_STRICTNESS_ROADMAP.md` (3 phases). | Dette gouvernée, à résorber par sprint |
| Stratégie de déploiement non documentée (pas de Dockerfile, pas de runbook) | Pipeline CI versionné (lint + tests + build) mais pas de stratégie de release explicite | Reprise/transmission demande un runbook complémentaire |
| Politique de gestion des quotas IA non observée | Coût opérationnel de la passerelle IA externe non documenté | À confirmer avec le porteur |
| 11 tests Vitest en échec dans `StartWorkoutDialogV2.test.tsx` (sélecteurs DOM) | Échecs antérieurs aux stabilisations, isolés à un seul fichier | Dette test à traiter ; n’affecte pas le build ni la production |
| Modules legacy `WorkoutLogger` et prop `freezeAt` de `VideoBackground` | Marqués `@deprecated` ; convention documentée dans `LEGACY_CLEANUP.md` ; suppression effective conditionnée à la migration complète vers les V2 | Nettoyage planifié |
| Harness Deno `tests/edge/` non branché à la CI Node | Exécution manuelle documentée ; non couvert par le workflow GitHub Actions actuel | Branchement dans une itération CI dédiée (`denoland/setup-deno@v1`) |
| Playwright non intégré au pipeline minimal CI | Configuré et exécutable localement, mais opt-in en CI | Branchement dans un job e2e dédié (build + serveur + browsers cached) |

---

## 13. Conclusion technique

Le projet KOREV Performance Center constitue, dans son périmètre observable, une application SaaS fonctionnelle et cohérente du point de vue produit, couvrant verticalement plusieurs domaines (entraînement, nutrition, analyse vidéo, gamification, communauté, monétisation, administration). L’architecture s’appuie sur une stack moderne et largement adoptée (React, TypeScript, Vite, Tailwind, shadcn-ui, Supabase, Stripe), avec un usage approprié de la sécurité par défaut de Supabase (Row-Level Security, fonctions SQL `SECURITY DEFINER`, vérification JWT sur les Edge Functions sensibles, signature HMAC sur le webhook Stripe).

La valeur technique observée se concentre sur trois zones distinctives : (1) le pipeline d’analyse vidéo de sparring, dont la chaîne extraction de frames → vision LLM avec tool calling structuré → validation normalisée → profils par discipline constitue un savoir-faire codifié et testé ; (2) le système de gamification « Wolf Pack », porteur d’une logique métier originale (rangs, formules d’XP, streaks) intégralement implémentée et testée ; (3) la couche de gating fonctionnel multi-plans à comptage atomique, verrouillée en écriture côté base et appliquée également côté Edge, supportant directement la monétisation. Ces trois zones cumulent environ 5 500 lignes de code applicatif et 4 000 lignes de tests, et représentent les actifs les plus défendables d’un point de vue valorisation.

Les migrations de mai 2026 ont sensiblement amélioré la posture de sécurité : verrouillage RLS de `subscriptions`, `feature_usage`, `render_usage` ; restriction d’accès en lecture à `documents` et `community_activities` ; helpers SECURITY DEFINER pour résoudre la récursion RLS sur les modules « meutes » ; versionnement d’une Edge Function `stripe-webhook` signée avec table d’idempotence `stripe_webhook_events` et RPCs associées. La discipline de secrets est en place côté code (`.env` désindexé, `.env.example` versionné, source unique de configuration Supabase côté client, plus aucune duplication de clé). Le provisionnement administrateur est paramétré via un script seed hors pipeline. L’extension de profil et l’introduction de profils par discipline pour l’IA enrichissent par ailleurs la profondeur métier. Un pipeline CI minimal versionné (`.github/workflows/ci.yml`) acte l’industrialisation du dépôt.

Les éléments restant à confirmer ou à finaliser sont identifiés et documentés dans `docs/audit/` : drift schéma résiduel (`organizations*`, `documents`, `render_usage`) statué comme scaffold dormant ou résidus avec plans `DROP` ; mentions légales en cours de finalisation côté juridique ; dépendance forte à une passerelle IA externe sur les fonctionnalités les plus différenciantes ; trajectoire d’activation du mode TypeScript strict en 3 phases ; nettoyage legacy planifié pour les modules `WorkoutLogger` et prop `freezeAt`. Aucun de ces points n’est rédhibitoire et chacun est encadré par une note d’audit dédiée.

Le niveau de maturité global se situe en milieu de gamme haut, en consolidation : produit fonctionnellement riche, code lisible et partiellement testé (côté client et côté Edge), sécurité durcie et auditée, industrialisation en place sous forme minimale, observabilité encore légère. La trajectoire d’investissement de fiabilisation est identifiable et de coût raisonnable au regard de la base existante.
