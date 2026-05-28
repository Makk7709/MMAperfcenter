# KOREV Performance Center

Application SaaS d'optimisation sportive dédiée aux arts martiaux mixtes
et sports de combat : suivi d'entraînement, nutrition, analyse vidéo
de sparring assistée par IA, gamification, gestion d'équipes (« meutes »),
monétisation par abonnement.

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
cd "MMA perf center"
npm install
cp .env.example .env  # remplir les valeurs
npm run dev
```

Application accessible sur http://localhost:8080.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production |
| `npm run lint` | Linter (ESLint + TypeScript-ESLint) |
| `npm run test:run` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright) |

## Structure du dépôt

```
src/                  Application React (pages, composants, hooks, utils)
supabase/
  functions/          Edge Functions Deno (8 fonctions)
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
