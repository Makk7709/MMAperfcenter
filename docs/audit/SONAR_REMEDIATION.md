# Remédiation qualité — SonarQube / SonarLint

> Démarrage : 2026-06-06
> Objectif : traiter de manière traçable les anomalies de qualité de code remontées par l'analyse statique Sonar, **sans introduire de régression fonctionnelle**.
> Statut : **en cours** — d'autres lots d'anomalies sont attendus et seront documentés à la suite.

---

## 1. Méthodologie

Chaque lot d'anomalies suit le même cycle :

1. **Tri** — chaque anomalie est rattachée à sa règle Sonar (`typescript:Sxxxx`), son fichier et sa ligne.
2. **Correction ciblée** — on corrige le symptôme exact signalé, sans élargir le périmètre (pas de réécriture opportuniste hors anomalie).
3. **Garde-fous systématiques** après corrections :
   - `npx tsc --noEmit` (typage) ;
   - `npx eslint <fichiers modifiés>` (lint) ;
   - `npm run build` (build de production Vite) ;
   - `npm run test:run` (suite de tests unitaires) ;
   - vérification motif par motif que le pattern signalé a bien disparu.
4. **Non-régression** — toute correction est validée contre l'état préexistant de la suite de tests (voir § Dette de test connue).

### Conventions de correction retenues

| Règle | Principe de correction appliqué |
|---|---|
| `S3358` (ternaires imbriqués) | Extraction dans une variable intermédiaire (`if/else if`) ou une fonction de rendu dédiée. |
| `S3776` (complexité cognitive) | Extraction de la logique technique (ex. lecture de flux SSE) dans des fonctions/utilitaires dédiés ; les composants ne conservent que l'orchestration. |
| `S6479` (index de tableau en `key`) | Clé basée sur une donnée stable (identifiant dédié ou contenu), jamais sur l'index ni un gabarit contenant l'index. |
| `S6759` (props non `Readonly`) | Type des props encapsulé dans `Readonly<{ ... }>`. |
| `S6847` (handler sur élément non interactif) | Si l'élément natif n'est pas possible (contenu de type bloc), ajout de `role`, `tabIndex` et gestion clavier (`onKeyDown` Enter/Espace) + `aria-pressed`. |
| `S6850` (heading sans contenu accessible) | Rendu explicite de `{children}` dans l'élément de titre. |
| `S1128` (imports inutilisés) | Suppression après vérification de l'absence d'usage réel dans le fichier. |
| `S1854` (assignation morte) | Suppression de la variable/déstructuration non consommée. |
| `S4165` (réaffectation redondante) | Suppression de la réaffectation qui réécrit la valeur déjà portée. |
| `S4325` (cast / assertion redondant) | Suppression du cast inutile ; si des champs additionnels sont nécessaires, introduction d'un type étendu signifiant plutôt que `as any`. |
| `S5869` (classe de caractères avec doublon) | Remplacement de la classe par une alternation, robuste aux emojis multi-codepoints. |

---

## 2. Sessions de correction

### Session 1 — 2026-06-06 — Pages workout & administration

| Règle | Sév. | Fichier | Ligne(s) | Correction |
|---|---|---|---|---|
| `S3358` | MAJOR | `src/components/workout/ActiveWorkoutPage.tsx` | 55, 130 | `intensityScore` via table `INTENSITY_SCORES` + repli ; classe des indicateurs de phase via `if/else if` (variable `dotClass`). |
| `S6759` | MINOR | `src/components/workout/ActiveWorkoutPage.tsx` | 212, 226, 228 | Props de `TypeBadge` et `StatCard` encapsulées dans `Readonly<{ ... }>`. |
| `S6847` | MAJOR | `src/components/AddExerciseDialog.tsx` | 68 | `<div>` cliquable rendue accessible : `role="button"`, `tabIndex={0}`, `aria-pressed`, `onKeyDown` (Enter/Espace). |
| `S3863` | MINOR | `src/pages/admin/AdminDashboard.tsx` | 5, 6 | Les deux imports `lucide-react` fusionnés en un seul. |
| `S6479` | MINOR | `src/pages/admin/AdminDashboard.tsx` | 111 | Clé `cell-${index}` remplacée par `entry.name` (stable). |
| `S1128` | MINOR | `src/pages/admin/AdminSubscriptions.tsx` | 33 | Imports inutilisés retirés : `CardHeader`, `CardTitle`, `TrendingUp`. |
| `S1854` | MAJOR | `src/pages/admin/AdminUsers.tsx` | 68 | Déstructuration `isSuspending` retirée (non consommée). |
| `S4325` | MINOR | `src/pages/admin/AdminVideos.tsx` | 171 | Casts `(video as any)` remplacés par un type étendu `AdminVideoRow` et un cast unique typé (`coach_name`, `visibility`, `views_count`). |

**Résultat** : `tsc` OK, `eslint` OK, build OK, 378 tests passants. Aucune régression.

### Session 2 — 2026-06-06 — Composants IA & primitive UI

| Règle | Sév. | Fichier | Ligne(s) | Correction |
|---|---|---|---|---|
| `S4325` | MINOR | `src/pages/admin/AdminVideos.tsx` | 171, 172, 192, 193, 201 | Déjà résolu en session 1 (élimination des `(video as any)`). Revérifié : 0 occurrence. |
| `S3776` | CRITICAL | `src/components/AICoachChat.tsx` | 33 | `sendMessage` simplifiée : extraction de `openCoachStream` (requête + erreurs) et de la lecture de flux dans l'utilitaire partagé `src/lib/sse.ts` ; helper `updateLastAssistantContent`. Complexité ramenée sous le seuil. |
| `S6479` | MAJOR | `src/components/AICoachChat.tsx` | 202, 219 | Clés `key={i}` remplacées : `key={prompt}` ; `key={msg.id}` (champ `id` ajouté à `Message`). |
| `S3776` | CRITICAL | `src/components/AIStatsAnalysis.tsx` | 14 | `generateAnalysis` simplifiée : extraction de `openAnalysisStream` + même utilitaire SSE partagé. |
| `S4165` | MAJOR | `src/components/AIStatsAnalysis.tsx` | 112, 121 | Réaffectations redondantes `iconColor = "text-primary"` supprimées (valeur déjà portée par l'initialisation). |
| `S6479` | MAJOR | `src/components/AIStatsAnalysis.tsx` | 125, 142 | Clés par index remplacées par des clés de contenu (`section`, `line`). |
| `S5869` | MAJOR | `src/components/AIStatsAnalysis.tsx` | 129 | Classe de caractères emoji remplacée par une alternation `/🎯|💪|🍽️|📈/gu`. |
| `S3358` | MAJOR | `src/components/AIStatsAnalysis.tsx` | 181 | Ternaire imbriqué du bouton extrait dans `renderButtonLabel()`. |
| `S6850` | MAJOR | `src/components/ui/alert.tsx` | 39 | `AlertTitle` rend désormais `{children}` explicitement. |

**Élément structurant introduit** : `src/lib/sse.ts` — utilitaire de lecture de flux SSE (`consumeSSEStream`) factorisant la logique de streaming auparavant dupliquée entre le Coach IA et l'analyse de statistiques. C'est ce qui fait chuter la complexité cognitive des deux fonctions concernées.

**Résultat** : `tsc` OK, `eslint` OK (après bascule de la classe regex en alternation pour éviter `no-misleading-character-class`), build OK, 378 tests passants. Aucune régression.

---

## 3. Dette de test connue (préexistante)

`src/components/workout/StartWorkoutDialogV2.test.tsx` comporte **11 tests en échec**, indépendants des sessions ci-dessus (aucun des fichiers corrigés n'est couvert par ce fichier de test). Ces échecs préexistaient aux corrections Sonar et sont suivis séparément. Ils servent de référence de non-régression : le nombre d'échecs ne doit pas augmenter au fil des sessions.

| État | Tests passants | Tests en échec | Tests ignorés |
|---|---|---|---|
| Après session 1 | 378 | 11 (préexistants) | 4 |
| Après session 2 | 378 | 11 (préexistants) | 4 |

---

## 4. Sessions à venir

D'autres lots d'anomalies Sonar sont attendus. Chaque nouvelle session sera ajoutée au § 2 sous la forme `Session N — date — périmètre`, avec le même tableau (règle / sévérité / fichier / ligne / correction) et le bilan des garde-fous. Les conventions du § 1 s'appliquent par défaut ; toute nouvelle convention de correction sera ajoutée au tableau correspondant.
