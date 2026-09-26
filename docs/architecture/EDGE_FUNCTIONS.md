# Edge Functions — KOREV Performance Center

**Version :** 1.0  
**Runtime :** Deno (Supabase Edge Functions)  
**Emplacement :** `supabase/functions/`  
**Configuration JWT :** `supabase/config.toml`

---

## 1. Catalogue

| Fonction | Rôle | JWT | Auth alternative |
|---|---|---|---|
| [`ai-coach`](#2-ai-coach) | Chat Coach IA (SSE) | ✅ | — |
| [`ai-stats-analysis`](#3-ai-stats-analysis) | Synthèse statistiques 30 jours (SSE) | ✅ | — |
| [`analyze-sparring`](#4-analyze-sparring) | Analyse vidéo sparring (vision LLM) | ✅ | — |
| [`create-checkout`](#5-create-checkout) | Session Stripe Checkout | ✅ | — |
| [`check-subscription`](#6-check-subscription) | Sync abonnement Stripe → DB | ✅ | — |
| [`customer-portal`](#7-customer-portal) | Portail client Stripe | ✅ | — |
| [`stripe-webhook`](#8-stripe-webhook) | Webhooks Stripe signés | ❌ | HMAC `STRIPE_WEBHOOK_SECRET` |
| [`fetch-mma-results`](#9-fetch-mma-results) | Agrégation RSS MMA | ❌ | Public |
| `delete-account` | Effacement du compte (Stripe, fichiers, Auth) | ✅ | Confirmation `SUPPRIMER` |
| `admin-users` | Back-office : utilisateurs, stats, plan, suspension | ✅ | Rôle `admin` vérifié côté serveur |

**Code partagé :** `supabase/functions/_shared/` (`ai-gateway.ts`, `auth.ts`, `http.ts`, `quota.ts`, `coach-context.ts`, `errors.ts`).

---

## 2. `ai-coach`

**Fichier :** `supabase/functions/ai-coach/index.ts`

### Rôle

Assistant conversationnel personnalisé en streaming SSE. Le prompt système intègre ~30 champs du profil utilisateur et ses données réelles, chargées par `_shared/coach-context.ts` :

| Bloc | Source | Fenêtre |
|---|---|---|
| Séances | `workouts` terminées (type, intensité, durée, rounds, séries validées, volume) | 28 jours, 10 lignes détaillées |
| Nutrition | `nutrition_logs` par jour, aliments du jour, moyenne, jours sans saisie ; `nutrition_goals` | 7 jours |
| Carnet | `workout_journal` (ressenti, énergie, pesée, note tronquée à 200 caractères) | 5 dernières entrées |
| Sparring | `sparring_analyses` terminées : résumé ; scores, points forts et faibles, recommandations **uniquement si l'athlète a été identifié** | 2 dernières |

Toutes les requêtes filtrent sur `user_id` (client service role). Chaque bloc est chargé indépendamment : une requête en échec affiche « données momentanément indisponibles » sans bloquer le coach. Sans la migration `20260926030000`, les séances sont chargées sans type, intensité ni rounds. Le texte saisi par l'utilisateur est mis sur une ligne, tronqué et placé entre « » ; le prompt précise qu'il s'agit de données et non d'instructions.

Le « jour » utilisé (aliments d'aujourd'hui, date des séances) est calculé dans le fuseau horaire envoyé par le navigateur, `Europe/Paris` par défaut ou si le fuseau est inconnu.

### Authentification

- JWT Supabase requis (`verify_jwt = true`) ;
- Quota serveur atomique : `consume_feature_quota('ai_coach')` avant l'appel IA, `refund_feature_quota` si l'appel échoue. Le client ne fait qu'une vérification d'affichage (paywall).

### Entrée (corps JSON)

| Champ | Type | Description |
|---|---|---|
| `messages` | array | Historique conversation `{ role, content }` (30 derniers messages, 4 000 caractères max chacun) |
| `timeZone` | string (facultatif) | Fuseau IANA du navigateur, ex. `Europe/Paris` |

### Sortie

Stream SSE (`text/event-stream`) relayé depuis la passerelle IA.

### Modèle

`google/gemini-2.5-flash` via passerelle externe.

### Appel client

`src/components/AICoachChat.tsx` — `fetch` direct (SSE non supporté par `supabase.functions.invoke`).

---

## 3. `ai-stats-analysis`

**Fichier :** `supabase/functions/ai-stats-analysis/index.ts`

### Rôle

Agrégation 30 jours (workouts + nutrition) et synthèse Markdown en streaming.

### Authentification

JWT requis.

### Entrée

Corps minimal (user dérivé du JWT) ; données lues en base via service role.

### Sortie

Stream SSE Markdown.

### Modèle

`google/gemini-2.5-flash`.

### Appel client

`src/components/AIStatsAnalysis.tsx`.

---

## 4. `analyze-sparring`

**Fichier :** `supabase/functions/analyze-sparring/index.ts`

### Rôle

Analyse multi-frames par vision LLM avec **tool/function calling** structuré (`submit_sparring_analysis`), validation et normalisation JSON, profils par discipline.

### Authentification

JWT + gating identique au coach IA (`sparring_analysis`).

### Entrée (corps JSON)

| Champ | Type | Description |
|---|---|---|
| `frames` | `{ base64, timestamps? }[]` | 3 à 60 images JPEG base64 (600 000 caractères max chacune). `timestamps` : jusqu'à 4 instants en secondes par image (l'ancien champ `timestamp` unique reste accepté) |
| `layout` | string? | `sheet_2x2` : chaque image est une planche de mouvement 2×2 (4 instants consécutifs, timecode incrusté par case). Sinon image simple |
| `burstSpacing` | number? | Écart en secondes entre deux cases d'une planche (0,05 à 2, défaut 0,25) |
| `totalDuration` | number | Durée de la vidéo en secondes (obligatoire, 3 600 max) |
| `athlete` | string? | Description visuelle de l'utilisateur (« short noir, gants rouges »), 160 caractères max, nettoyée. Placé en `fighter_1` si reconnu |
| `analysisId` | uuid? | Ligne `sparring_analyses` à mettre à jour |
| `videoName` | string? | Nom du fichier |
| `discipline` | string | boxe, mma, bjj, etc. |
| `qualityMode` | string | `fast` → Gemini Flash, sinon Pro (forcé à `fast` quand l'analyse consomme le quota gratuit) |

Le client (`src/utils/motionSheetExtractor.ts`) produit jusqu'à 48 planches. La couverture réelle de la vidéo est calculée côté serveur et exposée dans `sampling.coverage_percent`.

### Sortie

JSON normalisé conforme au schéma sparring ; persistance `sparring_analyses`. Chaque moment clé et technique porte un `timestamp_seconds` lu sur les timecodes ; `athlete_identified` indique si la description de l'athlète a été retrouvée ; `sampling` décrit l'échantillonnage (disposition, nombre d'images, écart, couverture).

### Modèles

- Défaut : `google/gemini-2.5-pro` ;
- `qualityMode='fast'` : `google/gemini-2.5-flash`.

### Appel client

`src/components/sparring/SparringAnalysisV2.tsx`.

---

## 5. `create-checkout`

**Fichier :** `supabase/functions/create-checkout/index.ts`

### Rôle

Crée une session **Stripe Checkout** pour souscription.

### Authentification

JWT requis. Client Supabase initialisé avec anon key + token utilisateur.

### Entrée

| Champ | Type | Description |
|---|---|---|
| `priceId` | string | ID prix Stripe (ex. `price_1SQSL1DLrTr0qdOpfIx50iSu`) |

### Sortie

```json
{ "url": "https://checkout.stripe.com/..." }
```

### Appel client

`src/pages/Pricing.tsx`.

---

## 6. `check-subscription`

**Fichier :** `supabase/functions/check-subscription/index.ts`

### Rôle

Synchronise l'état d'abonnement Stripe vers la table `subscriptions`.

### Authentification

JWT requis ; opérations Stripe/DB via service role.

### Entrée

Aucune (user dérivé du JWT).

### Sortie

Objet subscription mis à jour.

### Mapping plan

`product_id → plan` codé en dur (free/pro/elite/sensei) — **dupliqué** avec `stripe-webhook` (centralisation `_shared/` prévue).

### Appel client

`src/hooks/useSubscription.tsx` (sync post-paiement).

---

## 7. `customer-portal`

**Fichier :** `supabase/functions/customer-portal/index.ts`

### Rôle

Génère une URL de session **Stripe Customer Portal** (gestion abonnement).

### Authentification

JWT requis.

### Sortie

```json
{ "url": "https://billing.stripe.com/..." }
```

### Appel client

`src/pages/Pricing.tsx` (bouton « Gérer mon abonnement »).

---

## 8. `stripe-webhook`

**Fichier :** `supabase/functions/stripe-webhook/index.ts`

### Rôle

Réception autoritaire des événements Stripe avec idempotence.

### Authentification

- JWT **désactivé** (`verify_jwt = false`) ;
- Vérification signature HMAC via `STRIPE_WEBHOOK_SECRET` et `constructEventAsync`.

### Événements routés

| Événement | Action |
|---|---|
| `checkout.session.completed` | Sync abonnement initial |
| `customer.subscription.created` | Création |
| `customer.subscription.updated` | Mise à jour plan/statut |
| `customer.subscription.deleted` | Résiliation → plan free |

### Idempotence

1. RPC `is_webhook_processed(stripe_event_id)` ;
2. Traitement ;
3. RPC `mark_webhook_processed` ;
4. Sync via RPC `sync_stripe_subscription`.

### Fallback résolution user

`stripe_customer_id` → RPC `get_user_id_by_stripe_customer` ; sinon email Stripe → `profiles.email`.

### Tests

Harness Deno : `tests/edge/stripe-webhook.test.ts`.

---

## 9. `fetch-mma-results`

**Fichier :** `supabase/functions/fetch-mma-results/index.ts`

### Rôle

Agrège et normalise des flux RSS publics (Sherdog, MMA Fighting, Bloody Elbow).

### Authentification

Aucune (`verify_jwt = false`) — endpoint public.

### Sortie

Tableau d'articles normalisés (titre, lien, source, date).

### Appel client

`src/components/MMANewsBanner.tsx`, `src/components/MMAResultsFeed.tsx`.

---

## 10. Variables d'environnement

### 10.1 Communes (fonctions avec accès DB)

| Variable | Description | Fonctions |
|---|---|---|
| `SUPABASE_URL` | URL projet Supabase | Toutes sauf fetch-mma-results (partiel) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role | ai-coach, ai-stats-analysis, analyze-sparring, check-subscription, customer-portal, stripe-webhook |
| `SUPABASE_ANON_KEY` | Clé anon | create-checkout |

### 10.2 Stripe

| Variable | Description | Fonctions |
|---|---|---|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | create-checkout, check-subscription, customer-portal, stripe-webhook |
| `STRIPE_WEBHOOK_SECRET` | Secret signature webhook (`whsec_…`) | stripe-webhook |

### 10.3 Passerelle IA

| Variable | Description | Fonctions |
|---|---|---|
| `AI_GATEWAY_URL` | URL endpoint (obligatoire, pas de valeur par défaut) | ai-coach, ai-stats-analysis, analyze-sparring |
| `AI_GATEWAY_API_KEY` | Bearer token | Idem |
| `LEGACY_AI_GATEWAY_KEY` | Fallback rétrocompatible | Idem |

> **Important :** Ces secrets sont configurés dans le **Dashboard Supabase → Edge Functions → Secrets**, jamais dans `.env` client ni le dépôt.

---

## 11. Déploiement des fonctions

```bash
# Déployer toutes les fonctions
supabase functions deploy

# Déployer une fonction spécifique
supabase functions deploy ai-coach
supabase functions deploy stripe-webhook --no-verify-jwt  # si CLI ne lit pas config.toml
```

La configuration `verify_jwt` est lue depuis `supabase/config.toml` lors du déploiement via CLI Supabase.

### Secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set AI_GATEWAY_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 12. Tests Edge (harness Deno)

Emplacement : `tests/edge/`

| Fichier | Couverture |
|---|---|
| `stripe-webhook.test.ts` | Signature invalide, idempotence, routage événements |
| `ai-coach.test.ts` | Gating quota, bypass admin |
| `analyze-sparring.test.ts` | qualityMode, validation payload |

Exécution manuelle :

```bash
deno test --allow-env --allow-net=none tests/edge
```

> Non intégré au pipeline GitHub Actions actuel.

---

## 13. CORS et en-têtes

Les fonctions exposent les en-têtes CORS standard Supabase. Les appels depuis le client utilisent l'URL :

```text
{VITE_SUPABASE_URL}/functions/v1/{function-name}
```

Avec en-tête `Authorization: Bearer {access_token}` pour les fonctions JWT.

---

## 14. Observabilité

- Logging : `console.log` avec préfixes fonctionnels (`[CHECK-SUBSCRIPTION]`, etc.) ;
- Pas d'intégration Sentry côté Edge dans le périmètre actuel ;
- Logs consultables via Dashboard Supabase → Edge Functions → Logs.

---

© KOREV AI — Edge Functions v1.0
