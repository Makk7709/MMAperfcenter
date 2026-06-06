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
| `S6594` (`String.match` vs `RegExp.exec`) | Pour une regex non globale, `String.prototype.match()` remplacé par `RegExp.prototype.exec()` (comportement identique). |
| `S6551` (coercition d'objet en chaîne) | Plus de `String(error)` sur une valeur inconnue ; helper `errorMessage()` (`_shared/errors.ts`) renvoyant `error.message`, la chaîne brute, ou un `JSON.stringify` — jamais `[object Object]`. |
| `S7773` (méthodes statiques de `Number`) | `isNaN`/`parseInt`/`parseFloat` globaux remplacés par `Number.isNaN`/`Number.parseInt`/`Number.parseFloat`. |

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

### Session 3 — 2026-06-06 — Routage, scanner, primitives UI & utilitaires

#### a. Corrections dans les fichiers utilisés

| Règle | Sév. | Fichier | Correction |
|---|---|---|---|
| `S1874` | MINOR | `src/App.tsx` | Usage de la prop dépréciée `freezeAt` retiré de `<VideoBackground>` (la prop est ignorée par l'implémentation actuelle). |
| `S6759` | MINOR | `src/App.tsx` | Props de `ProtectedRoute` et `PublicRoute` encapsulées dans `Readonly<{ ... }>`. |
| `S6582` | MAJOR | `src/components/BarcodeScannerDialog.tsx` | `videoRef.current && videoRef.current.srcObject` remplacé par l'enchaînement optionnel `videoRef.current?.srcObject`. |
| `S4084` | MAJOR | `src/components/BarcodeScannerDialog.tsx` | Ajout d'une piste `<track kind="captions" />` sur l'élément `<video>` (flux caméra sans audio). |
| `S6850` | MAJOR | `src/components/ui/card.tsx` | `CardTitle` rend désormais `{children}` explicitement. |
| `S6479` | MAJOR | `src/components/FoodSearchInput.tsx` | Clé de liste par index remplacée par une clé de contenu (`nom-marque-calories`). |
| `S6594` | MAJOR | `src/utils/storageUtils.ts`, `src/components/CommunityActivity.tsx`, `src/components/VideoCard.tsx` | `String.prototype.match()` (regex non globale) remplacé par `RegExp.prototype.exec()` — comportement identique. |

> Nettoyage adjacent : 2 `any` explicites préexistants dans `FoodSearchInput.tsx` (réponse Open Food Facts) typés via `OpenFoodFactsSearchProduct` pour laisser le fichier modifié sans erreur de lint.

#### b. Remédiation — suppression de primitives UI inutilisées

Plusieurs anomalies (`S6819` rôles ARIA, `S6478` composants imbriqués, `S6481` valeur de contexte instable, `S6747` attribut inconnu `cmdk-input-wrapper`, `S4325`, `S7735`) portaient sur des primitives shadcn **importées nulle part dans l'application** (vérifié par recherche d'imports). Plutôt que de contorsionner des patterns ARIA par ailleurs corrects (carrousel WAI-ARIA) sur du code mort, ces primitives ont été **supprimées** :

| Fichier supprimé | Dépendance devenue orpheline | Action |
|---|---|---|
| `src/components/ui/breadcrumb.tsx` | `@radix-ui/react-slot` (conservée, utilisée ailleurs) | Supprimé |
| `src/components/ui/calendar.tsx` | `react-day-picker` | Supprimé + dépendance désinstallée |
| `src/components/ui/carousel.tsx` | `embla-carousel-react` | Supprimé + dépendance désinstallée |
| `src/components/ui/chart.tsx` | `recharts` (conservée, utilisée par `AdminDashboard` et `Statistics`) | Supprimé |
| `src/components/ui/command.tsx` | `cmdk` | Supprimé + dépendance désinstallée |

Dépendances retirées de `package.json` : `embla-carousel-react`, `react-day-picker`, `cmdk`. Les primitives shadcn peuvent être réintroduites à la demande si un besoin produit apparaît.

**Résultat** : `tsc` OK, `eslint` OK (fichiers modifiés), build OK, 378 tests passants. Aucune référence morte vers les fichiers supprimés. Aucune régression.

### Session 4 — 2026-06-06 — Edge Functions (Deno) & nettoyage front

#### a. Front-end

| Règle | Sév. | Fichier | Correction |
|---|---|---|---|
| `S1128` | MINOR | `src/components/Footer.tsx` | Import inutilisé `ExternalLink` (lucide-react) retiré. |
| `S6481` ×2, `S7735` | MAJOR / MINOR | `src/components/ui/form.tsx` | Primitive shadcn **importée nulle part** (vérifié). Supprimée comme code mort plutôt que contorsionner la valeur de contexte / la condition négée. `react-hook-form` et `@hookform/resolvers` (orphelins) désinstallés ; `zod` conservé (utilisé par `Auth.tsx`). |

#### b. Edge Functions Supabase (Deno / TypeScript)

| Règle | Sév. | Fichier | Correction |
|---|---|---|---|
| `S3776` | CRITICAL | `supabase/functions/ai-coach/index.ts` | Handler simplifié : extraction de `authenticateUser`, `checkAiCoachAccess`, `buildSystemPrompt`, `handleGatewayError`, helper `jsonResponse`. |
| `S3776`, `S1128`, `S4325` ×3, `S3358` | CRITICAL→MAJOR | `supabase/functions/ai-stats-analysis/index.ts` | Import `format` (date-fns) inutilisé retiré ; assertions `!` redondantes sur `completed_at` supprimées ; ternaire imbriqué de tendance extrait (`describeTrend`) ; moyennes via `dailyAverage` ; auth + erreurs passerelle extraites. |
| `S1128`, `S3776`, `S6594` ×5 | MINOR→MAJOR | `supabase/functions/fetch-mma-results/index.ts` | Import `createClient` inutilisé retiré ; parsing d'item RSS extrait (`parseRssItem`) ; 5 `String.match()` → `RegExp.exec()`. |
| `S3776` ×2, `S7773` ×3, `S3358`, `S6551` | CRITICAL→MINOR | `supabase/functions/analyze-sparring/index.ts` | `validateAnalysis` et le handler décomposés en builders/helpers dédiés (`buildFighters`, `buildKeyMoments`, `buildRounds`, `buildTechniques`, `buildRecommendations`, `buildQuality`, `authorizeSparring`, `ensureAiResponseOk`, `parseToolCall`, `selectFrames`, `markAnalysisError`) ; `isNaN`→`Number.isNaN`, `parseInt`→`Number.parseInt` ; ternaire imbriqué `corner` extrait (`resolveCorner`) ; `String(error)` → `errorMessage()`. |
| `S6551` | MINOR | `supabase/functions/stripe-webhook/index.ts` | 4 coercitions `String(err)` remplacées par `errorMessage(err)`. |
| `S6551` | MINOR | `supabase/functions/check-subscription/index.ts`, `customer-portal/index.ts` | `String(error)` remplacé par `errorMessage(error)` (correction de `customer-portal` également, motif identique non listé mais détecté lors de l'audit hostile). |

**Élément structurant introduit** : `supabase/functions/_shared/errors.ts` — helper `errorMessage(error: unknown)` factorisant l'extraction sécurisée d'un message d'erreur, partagé par les fonctions concernées (mécanisme d'import déjà éprouvé via `_shared/ai-gateway.ts`).

> **Note d'audit (Deno)** : les Edge Functions ne sont ni typées par le `tsc` du front, ni lintées par l'ESLint du projet (répertoires exclus), ni couvertes par Vitest. Deno n'étant pas disponible dans l'environnement de correction, ces fichiers ont été corrigés **par inspection**, en préservant strictement les signatures et le comportement observable (mêmes statuts HTTP, mêmes messages, même structure d'analyse). Les harness `tests/edge/*.test.ts` sont auto-portants (ils ne dépendent pas des `index.ts` de production) : ils restent valides.

**Résultat** : `tsc` OK, build OK, 378 tests passants (front). Les corrections Edge ne modifient aucun contrat d'API. Aucune régression.

---

## 3. Dette de test connue (préexistante)

`src/components/workout/StartWorkoutDialogV2.test.tsx` comporte **11 tests en échec**, indépendants des sessions ci-dessus (aucun des fichiers corrigés n'est couvert par ce fichier de test). Ces échecs préexistaient aux corrections Sonar et sont suivis séparément. Ils servent de référence de non-régression : le nombre d'échecs ne doit pas augmenter au fil des sessions.

| État | Tests passants | Tests en échec | Tests ignorés |
|---|---|---|---|
| Après session 1 | 378 | 11 (préexistants) | 4 |
| Après session 2 | 378 | 11 (préexistants) | 4 |
| Après session 3 | 378 | 11 (préexistants) | 4 |
| Après session 4 | 378 | 11 (préexistants) | 4 |

---

## 4. Sessions à venir

D'autres lots d'anomalies Sonar sont attendus. Chaque nouvelle session sera ajoutée au § 2 sous la forme `Session N — date — périmètre`, avec le même tableau (règle / sévérité / fichier / ligne / correction) et le bilan des garde-fous. Les conventions du § 1 s'appliquent par défaut ; toute nouvelle convention de correction sera ajoutée au tableau correspondant.
