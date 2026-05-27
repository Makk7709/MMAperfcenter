# Checklist de mise en production commerciale

> Date : 2026-05-26
> Périmètre : conditions de passage du dépôt actuel (transmissible et défendable techniquement) à un produit **commercialisable au grand public** avec encaissement Stripe en zone UE.
> Ton : factuel, opérationnel, sans optimisme.
>
> Légende criticité :
> - 🔴 **Bloquant** : pas de lancement commercial sans cela.
> - 🟠 **Important** : tolérable au lancement uniquement si remédiation planifiée à 30 jours.
> - 🟡 **Nice-to-have** : améliore qualité/coût mais ne bloque pas.

---

## A. Juridique & conformité (~6–10 semaines, avocat + fondateur)

| # | Action | Criticité | Porteur | Effort | Dépendances |
|---|---|---|---|---|---|
| A1 | Finaliser l'immatriculation KOREV AI SASU et obtenir le KBIS + SIRET définitif | 🔴 | Fondateur + expert-comptable | 2–4 sem. | — |
| A2 | Compléter le KYC Stripe en tant qu'entité juridique vérifiée (Stripe Atlas / Connect selon le cas) | 🔴 | Fondateur | 1–2 sem. | A1 |
| A3 | Faire rédiger les CGV et CGU par un avocat SaaS (clauses : rétractation, résiliation, juridiction, propriété intellectuelle, données IA, limitation de responsabilité, force majeure) | 🔴 | Avocat | 2–3 sem. | — |
| A4 | Faire rédiger une politique de confidentialité conforme RGPD (responsable de traitement, finalités, bases légales, durées, droits, sous-traitants, transferts internationaux) | 🔴 | Avocat + DPO si désigné | 1–2 sem. | A1 |
| A5 | Publier ces 3 documents sur des URLs stables (`/cgu`, `/cgv`, `/privacy`) et mettre à jour `src/pages/Legal.tsx` (supprimer les `{/* TODO juridique */}`) | 🔴 | Dev | 1 jour | A3, A4 |
| A6 | Mettre en place une bannière de consentement cookies conforme CNIL (Axeptio, Didomi, ou solution custom) si tracking analytics activé | 🔴 | Dev | 2–5 jours | F2 (analytics) |
| A7 | Construire un registre de traitement RGPD (article 30) | 🔴 | Fondateur/DPO + avocat | 1 sem. | — |
| A8 | Réaliser une DPIA (analyse d'impact) — obligatoire vu les données traitées (santé approximée : blessures, sommeil, stress, anthropométrie, profilage, vidéo) | 🔴 | DPO + avocat | 2–4 sem. | — |
| A9 | Signer des DPA (data processing agreement) avec **chaque sous-traitant** : Supabase, Stripe, passerelle IA, Google (si direct), hébergeur frontend, Resend/SendGrid (mailing), Sentry (monitoring), provider analytics | 🔴 | Fondateur + avocat | 1–2 sem. | — |
| A10 | Cadrer juridiquement les transferts hors UE (clauses contractuelles types — SCC — pour Stripe/Google/passerelle IA si serveurs US) | 🔴 | Avocat | 1–2 sem. | A9 |
| A11 | Conformité **AI Act EU** : ajouter une information claire à l'utilisateur indiquant qu'il interagit avec un système d'IA générative (`AICoachChat`, `analyze-sparring`, `ai-stats-analysis`). Mention obligatoire à partir d'août 2026. | 🔴 | Dev | 1–2 jours | — |
| A12 | Documenter le caractère **non médical** de manière encore plus explicite dans le checkout (case à cocher obligatoire avant achat reconnaissant que l'application n'est pas un dispositif médical) | 🔴 | Dev | 2 jours | A3 |
| A13 | Implémenter le droit à l'effacement automatisé (article 17 RGPD) : bouton « Supprimer mon compte » côté front + cascade DELETE côté base + invalidation des sessions Stripe | 🔴 | Dev | 3–5 jours | — |
| A14 | Implémenter le droit à la portabilité (article 20 RGPD) : export JSON/CSV des données utilisateur (profil, workouts, nutrition, sparring, analyses IA) sur demande | 🔴 | Dev | 3–5 jours | — |
| A15 | Mentionner explicitement le sous-traitant IA (Google/Gemini via passerelle) dans la politique de confidentialité, avec finalité et catégories de données transmises | 🔴 | Avocat + Dev | 1 jour | A4 |
| A16 | Désigner un DPO (interne ou externalisé) — non obligatoire en SAS de < 250 salariés mais fortement recommandé vu la nature des données | 🟠 | Fondateur | 1 sem. (recrutement) | — |
| A17 | Souscrire une assurance RCP professionnelle adaptée éditeur de logiciel SaaS (Hiscox, Stoik, ou équivalent) | 🟠 | Fondateur | 1–2 sem. | A1 |

---

## B. Infrastructure & déploiement (~2–3 semaines)

| # | Action | Criticité | Porteur | Effort |
|---|---|---|---|---|
| B1 | Choisir l'hébergeur frontend (Vercel, Cloudflare Pages, Netlify) et déployer en prod sur un domaine custom (`app.korev-ai.com` ou similaire) | 🔴 | Dev | 1 jour |
| B2 | Configurer le DNS et le certificat TLS (Let's Encrypt via l'hébergeur) | 🔴 | Dev | 0.5 jour |
| B3 | Configurer les variables d'environnement de prod sur l'hébergeur (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) — séparer les environnements dev/staging/prod | 🔴 | Dev | 0.5 jour |
| B4 | Configurer les headers de sécurité côté hébergeur : `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` | 🔴 | Dev | 1 jour |
| B5 | Déployer les 8 Edge Functions Supabase en prod (`supabase functions deploy --project-ref vpvfkazmfvxbpffymodg`) y compris la nouvelle `stripe-webhook` | 🔴 | Dev | 1 jour |
| B6 | Configurer les secrets Supabase Edge Functions en prod (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AI_GATEWAY_API_KEY` — passerelle IA, `SUPABASE_SERVICE_ROLE_KEY` est auto-injectée) | 🔴 | Dev | 0.5 jour |
| B7 | Configurer le webhook Stripe dans le dashboard Stripe pointant vers `https://vpvfkazmfvxbpffymodg.supabase.co/functions/v1/stripe-webhook` avec les événements `checkout.session.completed`, `customer.subscription.{created,updated,deleted}` | 🔴 | Dev | 0.5 jour |
| B8 | Tester le webhook en mode `test` Stripe avec `stripe trigger` ou l'outil de webhook tester du dashboard. Vérifier l'idempotence (table `stripe_webhook_events`) et la synchronisation `subscriptions`. | 🔴 | Dev | 1–2 jours |
| B9 | Provisionner le compte administrateur via `supabase/seed/seed-admin.example.sql` (remplacer `<ADMIN_USER_UUID>` et exécuter dans le SQL editor) | 🔴 | Dev | 0.5 jour |
| B10 | Exécuter les opérations de nettoyage base documentées dans `SCHEMA_DRIFT.md` (DROP `organizations*`, `render_usage`, `documents`, `match_documents`) ou décider de les conserver | 🟠 | Dev | 0.5 jour |
| B11 | Configurer un environnement de staging séparé (projet Supabase de staging + déploiement frontend preview) pour valider chaque release avant prod | 🟠 | Dev | 1 jour |
| B12 | Mettre en place un point d'accès `robots.txt` et `sitemap.xml` pour le référencement | 🟡 | Dev | 0.5 jour |

---

## C. Sécurité & observabilité (~1–2 semaines)

| # | Action | Criticité | Porteur | Effort |
|---|---|---|---|---|
| C1 | Intégrer Sentry (ou équivalent) côté frontend : `@sentry/react` + source maps + tagging utilisateur anonymisé | 🔴 | Dev | 1 jour |
| C2 | Intégrer Sentry côté Edge Functions Deno : `@sentry/deno` avec capture des erreurs non gérées dans les 8 fonctions | 🔴 | Dev | 1 jour |
| C3 | Configurer des alertes Sentry sur taux d'erreur > seuil (Slack, email) | 🔴 | Dev | 0.5 jour |
| C4 | Mettre en place un monitoring de la disponibilité (BetterStack, UptimeRobot, ou Cloudflare Health Checks) sur la home + un endpoint santé Edge | 🟠 | Dev | 0.5 jour |
| C5 | Mettre en place un monitoring des coûts API IA (passerelle + Google direct si applicable) avec alerte budget mensuel | 🔴 | Dev | 1 jour |
| C6 | Implémenter un circuit breaker côté `analyze-sparring` et `ai-coach` pour bloquer les appels si quota global dépassé (au-delà des quotas utilisateur) | 🟠 | Dev | 1 jour |
| C7 | Rotation de la clé `anon` Supabase (la version historique est dans Git, hygiène recommandée) | 🟠 | Dev | 0.5 jour |
| C8 | Audit pentest minimal externe (OWASP Top 10, auth flow, RLS bypass) — Vaadata, Synacktiv ou équivalent | 🟠 | Prestataire | 1–2 sem. + 4–8 k€ |
| C9 | Configurer un rate-limiting au niveau de l'Edge ou via Cloudflare devant le frontend (anti-bot, anti-scraping) | 🟠 | Dev | 1 jour |
| C10 | Politique de sauvegarde Supabase validée (PITR activé sur le plan Pro + test de restauration documenté) | 🔴 | Dev | 1 jour |
| C11 | Procédure d'incident documentée (qui réveille qui, comment communiquer, status page) | 🟠 | Fondateur + Dev | 1–2 jours |

---

## D. Paiement & facturation (~1 semaine)

| # | Action | Criticité | Porteur | Effort |
|---|---|---|---|---|
| D1 | Configurer les produits et `price_id` Stripe en mode **live** (différents des `test`) | 🔴 | Fondateur | 0.5 jour |
| D2 | Mettre à jour le mapping `productId → plan` dans `supabase/functions/check-subscription/index.ts` ET `supabase/functions/stripe-webhook/index.ts` avec les `price_id` live | 🔴 | Dev | 0.5 jour |
| D3 | **Centraliser** ce mapping dans un module partagé `supabase/functions/_shared/stripe-products.ts` pour éviter toute divergence future | 🟠 | Dev | 0.5 jour |
| D4 | Configurer la TVA dans Stripe (Stripe Tax) — collecte automatique selon la juridiction de l'acheteur | 🔴 | Fondateur | 1 jour |
| D5 | Configurer la facturation automatique Stripe (envoi PDF facture à chaque paiement, conforme à la facturation électronique 2026) | 🔴 | Fondateur | 0.5 jour |
| D6 | Tester un cycle complet en mode test : checkout → renouvellement → annulation → réactivation → réessai après échec paiement | 🔴 | Dev | 1–2 jours |
| D7 | Configurer le portail client Stripe (Customer Portal) : autorisations de changement de plan, annulation, mise à jour CB, accès aux factures | 🔴 | Fondateur | 0.5 jour |
| D8 | Mettre en place des emails de relance Stripe sur échec de paiement (`Smart Retries` + `Dunning emails`) | 🔴 | Fondateur | 0.5 jour |
| D9 | Définir la politique de rétractation (14 jours en B2C UE) et l'appliquer côté Stripe et CGV | 🔴 | Avocat + Fondateur | inclus dans A3 |

---

## E. Mailing & support client (~1 semaine)

| # | Action | Criticité | Porteur | Effort |
|---|---|---|---|---|
| E1 | Choisir un fournisseur de mailing transactionnel (Resend, Postmark, SendGrid, AWS SES) | 🔴 | Fondateur | 0.5 jour |
| E2 | Configurer le domaine d'envoi avec DKIM, SPF, DMARC pour éviter d'aller en spam | 🔴 | Dev | 1 jour |
| E3 | Templates d'emails transactionnels : bienvenue, confirmation d'abonnement, facture, renouvellement à venir, annulation, échec paiement, réinitialisation mot de passe, suppression de compte | 🔴 | Dev | 2–3 jours |
| E4 | Intégrer le mailing transactionnel dans l'Edge Function `stripe-webhook` (envoi des notifs après synchronisation) | 🔴 | Dev | 1 jour |
| E5 | Mettre en place un helpdesk (Crisp, Intercom, Front, ou simple boîte support@korev-ai.com avec routing) | 🔴 | Fondateur | 1–2 jours |
| E6 | Définir et publier un SLA support (délai de réponse moyen, plages d'ouverture) | 🟠 | Fondateur | 0.5 jour |
| E7 | FAQ produit publiée (au moins 20 questions : abonnement, RGPD, IA, données, désabonnement, données médicales) | 🟠 | Fondateur | 2–3 jours |

---

## F. Produit & UX (~2–3 semaines)

| # | Action | Criticité | Porteur | Effort |
|---|---|---|---|---|
| F1 | Corriger les 11 tests Vitest en échec dans `StartWorkoutDialogV2.test.tsx` (sélecteurs DOM divergents) et valider que le flow de démarrage de séance fonctionne sans régression | 🔴 | Dev | 1–2 jours |
| F2 | Intégrer un analytics produit (PostHog ou Mixpanel) — événements clés : signup, onboarding completion, premier workout, premier sparring upload, premier paywall hit, conversion, churn | 🔴 | Dev | 1–2 jours |
| F3 | Ajouter un mécanisme de sauvegarde de progression de l'onboarding (l'utilisateur peut quitter et reprendre) — 7 étapes sans reprise = abandon massif | 🟠 | Dev | 2 jours |
| F4 | Vérifier le comportement sur mobile (iOS Safari, Android Chrome) — l'app est-elle mobile-first ? Tester en particulier `SparringAnalysisV2` qui upload des vidéos | 🔴 | Dev | 2–3 jours |
| F5 | Implémenter un mécanisme de feedback utilisateur in-app (notation, suggestion, signalement de bug) | 🟠 | Dev | 1–2 jours |
| F6 | Optimiser le bundle (actuellement 2.4 MB minified) — code-splitting des routes (Pricing, Legal, admin/*, sparring/) | 🟠 | Dev | 1–2 jours |
| F7 | Optimiser l'image hero (`hero-background.png` = 2.2 MB) — WebP/AVIF + responsive sizes | 🟠 | Dev | 0.5 jour |
| F8 | Mettre en place une bannière d'indisponibilité (status page) consommée par l'app pour annoncer une maintenance | 🟡 | Dev | 0.5 jour |
| F9 | Page « pricing » : afficher la TVA explicitement (B2C UE = TTC obligatoire) | 🔴 | Dev | 0.5 jour |
| F10 | Bouton « annuler mon abonnement » accessible en 1 clic depuis le compte (pas seulement le portail Stripe) — exigence loi DDADUE / décret 2022 | 🔴 | Dev | 1 jour |

---

## G. Tests & qualité (~1–2 semaines)

| # | Action | Criticité | Porteur | Effort |
|---|---|---|---|---|
| G1 | Écrire des tests E2E Playwright sur les flows critiques : signup → onboarding → premier workout → upgrade Pro via checkout → annulation | 🔴 | Dev | 3–5 jours |
| G2 | Brancher Playwright sur la CI dans un job dédié (build + serveur + browsers cached) | 🟠 | Dev | 1 jour |
| G3 | Brancher les tests Deno `tests/edge/` sur la CI via `denoland/setup-deno@v1` | 🟠 | Dev | 0.5 jour |
| G4 | Activer la phase 1 de la roadmap TS strict (`noUnusedLocals: true`, `noUnusedParameters: true`) et rendre le lint bloquant en CI | 🟠 | Dev | 2–3 jours |
| G5 | Tester manuellement le flow complet en mode test Stripe avec un utilisateur de bout en bout (checklist QA) | 🔴 | Fondateur + Dev | 1 jour |
| G6 | Charger des données de test représentatives pour valider les performances (200+ workouts, 50+ sparring analyses, 100+ logs nutrition) | 🟠 | Dev | 0.5 jour |
| G7 | Audit accessibilité minimum (axe DevTools sur les pages clés) | 🟠 | Dev | 1 jour |

---

## H. Marketing, légal-marketing & analytics (~1–2 semaines)

| # | Action | Criticité | Porteur | Effort |
|---|---|---|---|---|
| H1 | Mettre en place un site marketing distinct ou une landing intégrée si non existant | 🟠 | Fondateur | inclus dans B1 |
| H2 | Documenter une page « À propos » + équipe + valeurs (renforce la confiance B2C) | 🟠 | Fondateur | 1 jour |
| H3 | Mettre en place un canal d'acquisition initial (SEO basique + 1 canal payant ou contenu) | 🟡 | Fondateur | en continu |
| H4 | Définir les KPIs business à tracker (CAC, LTV, churn mensuel, conversion free→paid, NPS) | 🟠 | Fondateur | 0.5 jour |
| H5 | Si tracking marketing (Meta/Google Ads), respecter le consentement RGPD (consent mode v2) | 🔴 si tracking actif | Dev | 1 jour |

---

## I. Pré-launch validation (~1 semaine — phase finale)

| # | Action | Criticité | Porteur |
|---|---|---|---|
| I1 | Beta privée fermée 2–4 semaines avec 30–50 utilisateurs réels avant ouverture publique | 🔴 | Fondateur |
| I2 | Tests de charge légers (k6 ou Artillery) sur les endpoints critiques (`ai-coach`, `analyze-sparring`, `stripe-webhook`) | 🟠 | Dev |
| I3 | Run-book de lancement (qui fait quoi le jour J, plan de rollback) | 🔴 | Fondateur + Dev |
| I4 | Pause des évolutions pendant 48h pré-launch (code freeze) | 🔴 | Fondateur |
| I5 | Brief équipe support sur les 20 cas client les plus probables | 🟠 | Fondateur |
| I6 | Audit final hostile (relire ce document, cocher chaque case) | 🔴 | Fondateur |

---

## Synthèse temporelle

| Phase | Durée incompressible | Coût externe estimé |
|---|---|---|
| Juridique (A) — peut tourner en parallèle | 6–10 semaines | 3 000–6 000 € (avocat + DPO externe) |
| Infrastructure (B) | 2–3 semaines | < 100 €/mois en récurrent |
| Sécurité & observabilité (C) | 1–2 semaines + pentest 1–2 sem. | 4 000–8 000 € (pentest, optionnel court terme) |
| Paiement (D) | 1 semaine | Frais Stripe (variable) |
| Mailing & support (E) | 1 semaine | 50–200 €/mois (Resend + Crisp) |
| Produit & UX (F) | 2–3 semaines | — |
| Tests & qualité (G) | 1–2 semaines | — |
| Marketing & analytics (H) | 1–2 semaines | Variable |
| Pré-launch validation (I) | 1 semaine | — |

**Chemin critique réaliste : 8 à 12 semaines** entre aujourd'hui et un lancement commercial public défendable. Le jalon limitant est la **chaîne juridique** (immatriculation → KYC Stripe → CGV/Privacy → DPIA → DPA).

**Coût externe minimum estimé : 3 000–6 000 €** (avocat + outils + mailing + monitoring annuel). Pentest et assurance RCP en sus si vous voulez une posture solide.

---

## Recommandation d'ordre d'exécution

### Semaine 1–2 (immédiat)
- A1, A2 (immatriculation + KYC Stripe — en parallèle d'un avocat lancé sur A3, A4)
- B1, B2, B3, B4 (hébergement frontend + headers sécurité)
- B5, B6, B7 (déploiement Edge Functions + webhook Stripe)
- F1 (corriger les 11 tests fail)
- C1, C2, C3 (Sentry)

### Semaine 3–4
- B8 (tester webhook Stripe end-to-end)
- B9 (provisionner admin)
- D1 à D8 (configuration paiement live)
- E1 à E4 (mailing transactionnel)
- F2 (analytics produit)
- F4 (validation mobile)
- A11 (bandeau IA Act)

### Semaine 5–6
- Réception A3, A4 (CGV, Privacy) → A5 (publication) → A6 (cookies)
- A13, A14 (suppression compte + portabilité)
- A12 (consent non-médical au checkout)
- F10 (annulation 1 clic)
- G1, G5 (tests E2E + QA manuel)
- E5, E7 (helpdesk + FAQ)

### Semaine 7–8
- A7, A8 (registre + DPIA)
- A9, A10 (DPA + transferts UE)
- C5, C6 (budgets IA)
- C10 (sauvegardes validées)
- I1 (beta privée fermée lancée)

### Semaine 9–12
- Beta privée → corrections → ouverture progressive
- I2, I3, I4, I5, I6 (validation finale)
- Lancement commercial public

---

## Critères GO/NO-GO finaux

Avant d'ouvrir au public payant, vérifier que **chaque case 🔴 ci-dessus est cochée**. Si une seule case rouge reste ouverte, repousser le lancement.

> Aucun lancement commercial ne devrait avoir lieu tant que :
> - SIRET et KBIS ne sont pas reçus ;
> - CGV, CGU et politique de confidentialité ne sont pas publiées et acceptées au signup ;
> - Le webhook Stripe n'a pas été testé en bout en bout en mode `live` ;
> - Le droit à l'effacement et la suppression de compte ne sont pas fonctionnels ;
> - Sentry n'est pas en place et l'alerte fonctionne ;
> - Un canal de support client est opérationnel ;
> - Une beta privée d'au moins 2 semaines sans incident bloquant a été conduite.

Tout écart à cette liste doit être consigné dans un document de décision daté et signé.
