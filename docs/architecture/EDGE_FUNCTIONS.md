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

**Code partagé :** `supabase/functions/_shared/` (`ai-gateway.ts`, `errors.ts`).

---

## 2. `ai-coach`

**Fichier :** `supabase/functions/ai-coach/index.ts`

### Rôle

Assistant conversationnel personnalisé en streaming SSE. Le prompt système intègre ~30 champs du profil utilisateur.

### Authentification

- JWT Supabase requis (`verify_jwt = true`) ;
- Gating serveur :
  1. `has_role` → bypass admin/coach ;
  2. `has_feature_access('ai_coach')` ;
  3. `increment_feature_usage` si quota applicable.

### Entrée (corps JSON)

| Champ | Type | Description |
|---|---|---|
| `messages` | array | Historique conversation `{ role, content }` |

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
| `frames` | string[] | Images base64 |
| `discipline` | string | boxe, mma, bjj, etc. |
| `qualityMode` | string | `fast` → Gemini Flash, sinon Pro |
| `videoUrl` | string? | Référence storage |
| `metadata` | object? | Contexte additionnel |

### Sortie

JSON normalisé conforme au schéma sparring ; persistance `sparring_analyses`.

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
| `AI_GATEWAY_URL` | URL endpoint (défaut dans `_shared/ai-gateway.ts`) | ai-coach, ai-stats-analysis, analyze-sparring |
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
