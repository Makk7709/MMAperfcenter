# TypeScript & ESLint strictness roadmap

> Date : 2026-05-26
> Auteur : remédiation interne avant transmission Diag&Grow.
> Objectif : transformer la dette TypeScript actuelle en **trajectoire gouvernée**, sans casser le build ni masquer les écarts.

---

## 1. État actuel (phase 0)

### `tsconfig.json` / `tsconfig.app.json`

| Option | Valeur actuelle | Cible finale |
|---|---|---|
| `strict` | non activé | `true` |
| `noImplicitAny` | `false` | `true` |
| `strictNullChecks` | `false` | `true` |
| `noUnusedLocals` | `false` | `true` |
| `noUnusedParameters` | `false` | `true` |
| `skipLibCheck` | `true` | `true` (acceptable) |
| `allowJs` | `true` | conserver tant que des fichiers `.js` existent |

### ESLint

- `@typescript-eslint/no-unused-vars` : passé de **`off`** à **`warn`** dans cette remédiation, avec `argsIgnorePattern: "^_"` et `varsIgnorePattern: "^_"`.
- Pas d'autres règles désactivées à l'aveugle.

### Raison du compromis actuel

L'activation directe de `"strict": true` produirait une cascade d'erreurs sur la base existante (~360 fichiers TS/TSX, dont des composants legacy `WorkoutLogger.tsx`, `SparringAnalysis.tsx` et plusieurs hooks). Plutôt que de désactiver les règles localement avec des `// @ts-ignore`, on séquence l'effort.

---

## 2. Trajectoire en 3 phases

### Phase 1 — Hygiène (≤ 2 sprints)

Objectif : activer ce qui n'a quasi pas d'impact runtime.

- [ ] `noUnusedLocals: true`
- [ ] `noUnusedParameters: true` (avec convention `_` pour les paramètres volontairement non utilisés).
- [ ] Faire échouer la CI sur `npm run lint` (retirer `continue-on-error: true` dans `.github/workflows/ci.yml`).
- [ ] Nettoyer les imports morts et variables locales inutilisées détectées par ESLint en mode `warn`.

Critère de sortie : zéro warning `no-unused-vars` sur `src/` (hors `src/legacy/` si introduit, cf. `LEGACY_CLEANUP.md`).

### Phase 2 — Typage explicite (≤ 4 sprints)

Objectif : éliminer les `any` implicites.

- [ ] `noImplicitAny: true`
- [ ] Inventorier les usages de `any` explicites (`rg ': any\b'` / `rg '\<any\>'`) et les remplacer par :
  - types existants (`Database` Supabase, types de payload Stripe, …),
  - `unknown` + narrowing,
  - `Record<string, unknown>` ou type local minimal.
- [ ] Activer `noFallthroughCasesInSwitch: true` (déjà conseillé par Vite).

Critère de sortie : `tsc --noEmit` passe avec `noImplicitAny: true`.

### Phase 3 — Strict total (≤ 6 sprints après phase 2)

Objectif : aligner sur les standards d'un actif logiciel transmissible.

- [ ] `strictNullChecks: true`
- [ ] `strict: true` (active aussi `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`).
- [ ] Activer `exactOptionalPropertyTypes: true` si l'analyse d'impact est raisonnable.

Critère de sortie : `tsc --noEmit` passe en `strict: true` sur l'ensemble du projet, CI bloquante.

---

## 3. Garde-fous immédiats

- **CI** : `npm run lint` est exécuté à chaque PR (cf. `.github/workflows/ci.yml`). En phase 0, l'échec lint n'est pas bloquant, mais les warnings sont **visibles dans les logs**.
- **Aucun `// @ts-ignore` / `// @ts-nocheck` introduit pendant la remédiation** : la dette doit rester apparente pour pouvoir être gouvernée.
- **Convention `_` pour les variables intentionnellement inutilisées** (paramètre de callback, déstructuration partielle, etc.).

---

## 4. Indicateurs de suivi suggérés

- Nombre de warnings ESLint par PR (tendance descendante).
- Nombre de `any` (explicite ou via cast) restants dans `src/` à chaque phase.
- Couverture de `tsc --noEmit` sous chaque profil cible avant activation.

---

## 5. Conclusion

La dette TypeScript n'est plus **subie** : elle est documentée, séquencée, et observable via la CI. Cette roadmap se substitue à toute pratique consistant à désactiver silencieusement les règles dans `eslint.config.js` ou `tsconfig.json`.
