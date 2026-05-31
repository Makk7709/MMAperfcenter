# KOREV Performance Center

Application SaaS d'optimisation sportive dédiée aux arts martiaux mixtes
et sports de combat : suivi d'entraînement, nutrition, analyse vidéo
de sparring assistée par IA, gamification, gestion d'équipes (« meutes »),
monétisation par abonnement.

## Fonctionnalités

- **Suivi d'entraînement** : séances, exercices, séries, historique et journal d'entraînement.
- **Nutrition** : objectifs et journaux nutritionnels avec historique indexé.
- **Analyse de sparring par IA** : extraction de frames vidéo et analyse assistée (modèles Gemini 2.5 Pro) avec profils par discipline.
- **Coach IA** : assistant conversationnel en streaming (modèle Gemini 2.5 Flash).
- **Statistiques** : tableaux de bord et analyse statistique assistée par IA.
- **Bibliothèque vidéo** : contenus d'entraînement avec visibilité par plan et rôle (admin/coach).
- **Gamification « meutes »** : équipes, rôles, activités communautaires.
- **Abonnements** : Stripe Checkout, portail client, webhook signé, et contrôle d'accès par plan (feature gating) appliqué côté serveur via RLS et fonctions PostgreSQL `SECURITY DEFINER`.
- **Espace d'administration** : gestion réservée aux rôles `admin`.

## Stack technique

- Frontend : React 18, Vite 5, TypeScript 5, Tailwind CSS 3, shadcn-ui
- Backend : Supabase (PostgreSQL avec RLS, Auth, Storage, Edge Functions Deno)
- Paiement : Stripe (Checkout, Customer Portal, webhook signé)
- IA : passerelle externe avec modèles Gemini 2.5 Pro/Flash
- Observabilité : Sentry (`@sentry/react`, DSN piloté par `VITE_SENTRY_DSN`)
- Tests : Vitest, Testing Library, Playwright, harness Deno
- CI : GitHub Actions

## Démarrage local

Pré-requis : Node.js 20+ et npm.

```bash
git clone <repository-url>
cd MMAperfcenter
npm install
cp .env.example .env  # remplir les valeurs
npm run dev
```

Application accessible sur http://localhost:8080.

## Variables d'environnement

Le détail figure dans `.env.example`. Les variables exposées au bundle client
sont préfixées `VITE_` et ne doivent contenir que des valeurs publiables :

| Variable | Portée | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | client | URL publique du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Clé anon publiable (RLS appliquée) |
| `VITE_SUPABASE_PROJECT_ID` | client | Identifiant de projet (outillage) |
| `VITE_SENTRY_DSN` | client | DSN Sentry (vide = télémétrie désactivée) |

Les secrets serveur (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `AI_GATEWAY_API_KEY`, `AI_GATEWAY_URL`, `SENTRY_DSN`)
sont configurés uniquement côté Supabase (Edge Functions secrets) et ne doivent
jamais figurer dans le dépôt ni dans le bundle.

## Edge Functions

8 fonctions Deno sous `supabase/functions/` :

| Fonction | Rôle | `verify_jwt` |
|---|---|---|
| `ai-coach` | Coach IA conversationnel (streaming) | true |
| `ai-stats-analysis` | Analyse statistique assistée par IA | true |
| `analyze-sparring` | Analyse vidéo de sparring par IA | true |
| `check-subscription` | Vérification d'abonnement | true |
| `create-checkout` | Création de session Stripe Checkout | true |
| `customer-portal` | Accès au portail client Stripe | true |
| `fetch-mma-results` | Récupération de résultats MMA | false |
| `stripe-webhook` | Réception des webhooks Stripe (signature HMAC) | false |

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm run lint` | Linter (ESLint + TypeScript-ESLint) |
| `npm run test` / `npm run test:run` | Tests unitaires (Vitest) |
| `npm run test:coverage` | Tests unitaires avec couverture |
| `npm run test:e2e` | Tests end-to-end (Playwright) |

## Structure du dépôt

```
src/                  Application React (pages, composants, hooks, utils)
supabase/
  functions/          Edge Functions Deno (8 fonctions + _shared)
  migrations/         Migrations SQL versionnées (28 fichiers)
  seed/               Scripts seed paramétrés (non automatiques)
tests/edge/           Harness Deno pour Edge Functions
e2e/                  Tests Playwright
docs/audit/           Documentation d'audit et de gouvernance
.github/workflows/    CI GitHub Actions
```

## Documentation

- `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` — documentation technique standardisée
- `docs/audit/SCHEMA_DRIFT.md` — matrice types/migrations
- `docs/audit/TYPESCRIPT_STRICTNESS_ROADMAP.md` — trajectoire mode strict
- `docs/audit/LEGACY_CLEANUP.md` — inventaire et plan de retrait des modules legacy
- `docs/audit/LAUNCH_READINESS.md` — checklist de mise en production commerciale

## Licence

© KOREV AI — Tous droits réservés.
