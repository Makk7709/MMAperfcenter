# Guide de développement — KOREV Performance Center

**Version :** 1.0

---

## 1. Prérequis

| Outil | Version minimale | Usage |
|---|---|---|
| Node.js | 20+ | Frontend, tests, build |
| npm | 9+ | Gestion des dépendances |
| Git | — | Versionnement |
| Supabase CLI | Dernière stable | Migrations, Edge Functions (optionnel en local) |
| Deno | 1.x | Tests harness Edge Functions (optionnel) |

---

## 2. Installation

```bash
git clone <repository-url>
cd "MMA perf center"
npm install
```

---

## 3. Configuration environnement

### 3.1 Fichier `.env`

```bash
cp .env.example .env
```

Renseigner les variables **publiables** :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon (JWT public, RLS appliquée) |
| `VITE_SUPABASE_PROJECT_ID` | Référence projet (optionnel, outillage) |
| `VITE_SENTRY_DSN` | DSN Sentry frontend (vide = désactivé) |

> **Ne jamais** placer dans `.env` : `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AI_GATEWAY_API_KEY`. Ces secrets vivent dans les **Secrets Supabase Edge Functions**.

### 3.2 Fallback développement

`src/integrations/supabase/client.ts` contient des valeurs de secours (URL + anon key publiables) pour éviter un crash sans `.env`. En production, toujours injecter les variables via l'environnement de build.

---

## 4. Serveur de développement

```bash
npm run dev
```

- URL : **<http://localhost:8080>** (configuré dans `vite.config.ts`)
- Hot reload activé (Vite + SWC)

---

## 5. Structure du dépôt (rappel)

```text
src/                    Application React
supabase/
  functions/            8 Edge Functions Deno + _shared
  migrations/           28 migrations SQL
  seed/                 Scripts seed paramétrés
tests/edge/             Harness Deno
e2e/                    Tests Playwright
docs/                   Documentation (ce dossier)
.github/workflows/      CI GitHub Actions
```

Alias TypeScript : `@/` → `src/` (configuré dans `vite.config.ts` et `tsconfig`).

---

## 6. Scripts npm

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build production (`dist/`) |
| `npm run build:dev` | Build mode development |
| `npm run preview` | Prévisualisation du build local |
| `npm run lint` | ESLint (TypeScript-ESLint, react-hooks) |
| `npm run test` | Vitest en mode watch |
| `npm run test:run` | Vitest une exécution (CI) |
| `npm run test:coverage` | Couverture (seuils 80 % sur `src/utils/**`) |
| `npm run test:ui` | Interface Vitest |
| `npm run test:e2e` | Playwright |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:headed` | Playwright avec navigateur visible |

---

## 7. Tests

### 7.1 Tests unitaires (Vitest)

Configuration : `vitest.config.ts`

- Environnement : jsdom ;
- Setup : `src/test/setup.ts` ;
- Seuils de couverture : 80 % statements/branches/functions/lines sur :
  - `src/utils/**`
  - `src/components/sparring/**`

```bash
npm run test:run
npm run test:coverage
```

**Périmètre testé :** utilitaires (retry, sparring schema, videoFrameExtractor, gamification wolfPack), quelques composants gamification et workout.

**Dette connue :** 11 tests en échec dans `StartWorkoutDialogV2.test.tsx` (sélecteurs DOM) — n'affecte pas le build CI.

### 7.2 Tests E2E (Playwright)

Configuration : `playwright.config.ts`

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
```

Couverture actuelle : `e2e/sparring-analysis.spec.ts` (limitée).

### 7.3 Harness Edge Functions (Deno)

```bash
deno test --allow-env --allow-net=none tests/edge
```

Non branché à la CI GitHub Actions.

---

## 8. Linting

Configuration : `eslint.config.js`

- Plugins : TypeScript-ESLint, react-hooks, react-refresh ;
- `@typescript-eslint/no-unused-vars` : `warn` (convention préfixe `_`) ;
- Ignore : `supabase/functions/**`, `tests/edge/**` (runtime Deno).

```bash
npm run lint
```

En CI, le lint est exécuté avec `continue-on-error: true` (phase 0 — voir [`TYPESCRIPT_STRICTNESS_ROADMAP.md`](../audit/TYPESCRIPT_STRICTNESS_ROADMAP.md)).

---

## 9. TypeScript

- Mode **non strict** (`strict: false`, `strictNullChecks: false`) ;
- Trajectoire d'activation documentée : [`TYPESCRIPT_STRICTNESS_ROADMAP.md`](../audit/TYPESCRIPT_STRICTNESS_ROADMAP.md).

Fichiers de config :

- `tsconfig.json` (racine)
- `tsconfig.app.json` (application)
- `tsconfig.node.json` (Vite)

---

## 10. Supabase local (optionnel)

### 10.1 Migrations

```bash
supabase start          # Stack locale Docker
supabase db reset       # Appliquer migrations + seed
supabase db push        # Pousser vers projet distant
```

Migrations : `supabase/migrations/` — ordre chronologique par timestamp.

### 10.2 Types générés

Après modification du schéma :

```bash
supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
```

Vérifier cohérence avec [`SCHEMA_DRIFT.md`](../audit/SCHEMA_DRIFT.md).

### 10.3 Edge Functions locales

```bash
supabase functions serve
```

Secrets locaux via `supabase secrets set` ou fichier `.env` dans `supabase/functions/.env` (gitignored).

### 10.4 Provisionnement admin

1. Créer un compte via l'UI ;
2. Récupérer l'UUID utilisateur ;
3. Exécuter `supabase/seed/seed-admin.example.sql` en remplaçant `<ADMIN_USER_UUID>`.

---

## 11. CI (GitHub Actions)

Fichier : `.github/workflows/ci.yml`

Déclencheurs : push/PR sur `main`.

Pipeline :

1. `npm ci`
2. `npm run lint` (non bloquant)
3. `npm run test:run`
4. `npm run build`

Variables CI (placeholders si secrets absents) :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Playwright **exclu** du pipeline minimal.

---

## 12. Conventions de code

| Domaine | Convention |
|---|---|
| Organisation | Par domaine fonctionnel (`sparring/`, `gamification/`, `workout/`, `admin/`) |
| Hooks | Préfixe `use`, accès Supabase centralisé |
| UI | shadcn-ui dans `components/ui/` (copié, non auto-update) |
| Logique pure | `utils/` avec tests unitaires |
| Legacy | Composants `@deprecated` — voir [`LEGACY_CLEANUP.md`](../audit/LEGACY_CLEANUP.md) |
| Langue | Mix FR/EN acceptable (UI en français) |

---

## 13. Modules legacy

| Module | Remplacement | Statut |
|---|---|---|
| `WorkoutLogger.tsx` | `workout/StartWorkoutDialogV2` + `ActiveWorkoutPage` | `@deprecated` |
| `VideoBackground` prop `freezeAt` | Image statique | `@deprecated` |

Inventaire complet : [`LEGACY_CLEANUP.md`](../audit/LEGACY_CLEANUP.md).

---

## 14. Ressources

| Document | Sujet |
|---|---|
| [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) | Vue d'ensemble technique |
| [`DATABASE.md`](../architecture/DATABASE.md) | Schéma et RLS |
| [`EDGE_FUNCTIONS.md`](../architecture/EDGE_FUNCTIONS.md) | API serverless |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Mise en production |
| [`PROJECT_DOCUMENTATION_STANDARD.md`](../audit/PROJECT_DOCUMENTATION_STANDARD.md) | Référence audit |

---

© KOREV AI — Guide de développement v1.0
