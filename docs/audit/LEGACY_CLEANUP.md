# Legacy cleanup

> Date : 2026-05-26
> Objectif : recenser et statuer les éléments hérités susceptibles d'être perçus comme du désordre par un audit tiers, **sans casser le runtime**.

---

## 1. Inventaire & décisions

| Élément | Localisation | Décision | Action effectuée |
|---|---|---|---|
| `WorkoutLogger.tsx` (legacy v1) | `src/components/WorkoutLogger.tsx` | Marquer `@deprecated`, conserver en place jusqu'à migration complète du dashboard vers V2. | Bloc JSDoc `@deprecated` ajouté en tête du fichier expliquant le chemin de remplacement (`WorkoutManager` + `ActiveWorkoutPage` + `StartWorkoutDialogV2`). |
| Composant `SparringAnalysis.tsx` v1 | Anciennement `src/components/sparring/SparringAnalysis.tsx` | **Déjà supprimé** dans une itération précédente : seul `SparringAnalysisV2.tsx` subsiste. | Aucune action — vérifié absent. |
| `public/videos/hero-background.mp4` (14 Mo, orphelin) | `public/videos/` | **Suppression** : aucune référence dans `src/`, `index.html`, `vite.config.ts`. Le composant `VideoBackground` rend désormais une image statique. | Fichier supprimé. Répertoire `public/videos/` retiré. |
| Prop `freezeAt?: number` (inutilisée) | `src/components/VideoBackground.tsx` | Conserver la signature pour compat des call sites (`<VideoBackground freezeAt={9} />`) ; marquer `@deprecated`. | JSDoc `@deprecated` ajouté + paramètre renommé `_props` pour ignorer la valeur sans warning lint. |
| Devtool `vite-plugin-inspect` (devDependency) | `vite.config.ts`, `package.json`, `package-lock.json` | **Supprimé** lors de la purge KOREV du 2026-05-27. | Import retiré de `vite.config.ts` (plus de plugin `inspectPlugin`), entrée `"vite-plugin-inspect": "^1.1.7"` retirée de `devDependencies`, `package-lock.json` et `bun.lockb` régénérés contre la registry publique `registry.npmjs.org`. |

---

## 2. Convention introduite

- Tout composant non utilisé par le chemin principal mais conservé pour compat doit porter un commentaire JSDoc `@deprecated` indiquant **(a)** le remplacement, **(b)** la raison de la conservation, **(c)** la fenêtre de suppression envisagée.
- Aucun composant legacy n'a été déplacé dans `src/legacy/` à ce stade : la fréquence des modifications est trop faible pour justifier le coût d'un renommage massif de chemins d'import. Cette option reste documentée comme **prochaine étape** si la dette legacy s'étend.
- Les assets binaires inutilisés sont supprimés sans préavis (cas du MP4 orphelin), car ils gonflent le poids du dépôt sans valeur.

---

## 3. Points résiduels suggérés (non bloquants pour transmission)

- `src/components/WorkoutLogger.tsx` peut être supprimé entièrement après confirmation que `Index.tsx` n'a plus besoin du fallback (mesure d'usage côté analytics produit).
- `src/components/StartWorkoutDialog.tsx` (v1) et `src/components/AddExerciseDialog.tsx` consommés uniquement par `WorkoutLogger` doivent suivre le même cycle de retrait.

---

## 4. Résultat

- Aucun composant legacy nominal sans documentation explicite.
- Plus aucun asset binaire orphelin > 1 Mo dans `public/`.
- Les conventions de dépréciation sont posées, traçables, et appliquées de manière homogène.
