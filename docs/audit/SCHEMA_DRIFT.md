# Schema drift report

> Date : 2026-05-26
> Périmètre : comparaison `src/integrations/supabase/types.ts` (types générés depuis l'instance Supabase de production) ⇄ `supabase/migrations/*.sql` (schéma versionné dans le dépôt).
> Objectif : tracer les écarts entre la réalité de la base et l'historique versionné, et statuer pour chaque écart.

---

## 1. Synthèse

| Table / objet | Présence types.ts | Migration versionnée | Référencée par le code applicatif | Statut |
|---|---|---|---|---|
| `stripe_webhook_events` | Oui | **Ajoutée** — `20260526120000_stripe_webhook_events.sql` | Oui (Edge Function `stripe-webhook`) | Réconcilié |
| `is_webhook_processed` / `mark_webhook_processed` / `sync_stripe_subscription` / `get_user_id_by_stripe_customer` / `check_subscription_access` | Oui (RPC) | **Ajoutées** — même migration | Oui (Edge Function `stripe-webhook`) | Réconcilié |
| `documents` (table de chunks vectoriels) | Oui | Aucune | Non | À neutraliser (voir §3) |
| `match_documents` (RPC vector search) | Oui | Aucune | Non | À neutraliser (voir §3) |
| `organizations` | Oui | Aucune | Non | Résidu — voir §4 |
| `organization_members` | Oui | Aucune | Non | Résidu — voir §4 |
| `organization_invitations` | Oui | Aucune | Non | Résidu — voir §4 |
| `render_usage` | Oui | Aucune | Non | Résidu — voir §4 |
| `subscription_tier` / `organization_role` (enums) | Oui | Aucune | Non | Résidus liés aux tables ci-dessus |

---

## 2. Migration ajoutée — Stripe webhook (réconciliation effective)

Fichier : `supabase/migrations/20260526120000_stripe_webhook_events.sql`

Couvre :

- Table `stripe_webhook_events` avec contrainte d'unicité sur `stripe_event_id` (idempotence).
- RPCs `is_webhook_processed`, `mark_webhook_processed` (idempotence Stripe).
- RPC `get_user_id_by_stripe_customer` (résolution customer → user).
- RPC `sync_stripe_subscription` (synchronisation autoritaire de `subscriptions` depuis un événement webhook).
- RPC `check_subscription_access` (lecture rapide consommable côté serveur).

Toutes les définitions sont idempotentes (`IF NOT EXISTS`, `CREATE OR REPLACE`) et sûres à rejouer sur une base où la table existe déjà.

L'Edge Function `supabase/functions/stripe-webhook/index.ts` consomme cette migration. La sécurité Stripe est portée par la vérification HMAC (`STRIPE_WEBHOOK_SECRET`), JWT Supabase désactivé pour cette fonction (`config.toml`).

---

## 3. `documents` + `match_documents` — origine pgvector / RAG

### Constat

- Le type généré décrit une table `documents (id, content, embedding, metadata)` typique d'une intégration `pg_vector` / RAG.
- Aucune migration ne crée cette table dans le dépôt.
- Une migration précédente (`20251210210551_*`) **drop** explicitement une table `Document` (PascalCase) — il est possible que l'ancienne version ait été supprimée mais que la version `lowercase` ait survécu côté serveur, peut-être créée hors migration via un assistant tiers.
- Aucun appel `supabase.from('documents')` ni `supabase.rpc('match_documents')` dans `src/`.

### Décision recommandée

- Marquer comme **résidu non utilisé**.
- **Ne pas créer de migration de création** : ce serait introduire un actif inutilisé.
- **Action proposée côté ops Supabase** (à exécuter manuellement, hors pipeline) :
  ```sql
  DROP FUNCTION IF EXISTS public.match_documents(vector, integer, jsonb);
  DROP TABLE IF EXISTS public.documents;
  ```
- Une fois la suppression effectuée en base, régénérer les types (`supabase gen types typescript`) pour purger les définitions résiduelles dans `src/integrations/supabase/types.ts`.

> Cette opération est volontairement laissée hors du pipeline de migrations applicatives car elle pourrait être destructrice si la table avait été utilisée en dehors du périmètre audité. À confirmer par l'éditeur avant exécution.

---

## 4. `organizations` / `organization_members` / `organization_invitations` / `render_usage`

### Constat

- Les types sont présents (avec relations FK cohérentes entre les 4 tables).
- Aucune migration versionnée ne crée ces tables.
- Aucun appel `supabase.from('organizations'|'organization_members'|…)` dans `src/`.
- Les enums `organization_role` et `subscription_tier` ne sont consommés par aucun code applicatif.
- Conclusion : il s'agit d'un **scaffold multi-tenant non activé** (probablement issu d'un template), inutilisé par le produit KOREV en production.

### Décision recommandée

- Marquer comme **scaffold dormant**.
- **Ne pas versionner de migration de création** : on ne formalise pas un actif inutile.
- **Action proposée côté ops Supabase** (à confirmer avant exécution) :
  ```sql
  DROP TABLE IF EXISTS public.render_usage CASCADE;
  DROP TABLE IF EXISTS public.organization_invitations CASCADE;
  DROP TABLE IF EXISTS public.organization_members CASCADE;
  DROP TABLE IF EXISTS public.organizations CASCADE;
  DROP TYPE IF EXISTS public.organization_role;
  DROP TYPE IF EXISTS public.subscription_tier;
  ```
- Régénérer les types après suppression.

> Alternative défensive si l'éditeur souhaite conserver ces tables pour une feature multi-tenant future : créer une migration `20260601_000000_organizations.sql` reprenant la structure exacte du type généré. Dans ce cas l'auditeur recommande de marquer la feature comme "réservée — non exposée côté front" dans la doc produit.

---

## 5. Validation finale

Après remédiation :

- ✅ Stripe webhook : table + RPCs ajoutées, Edge Function versionnée → cohérence types ⇄ schéma ⇄ code.
- 📄 `documents` / `organizations*` / `render_usage` : statut documenté, plan d'action proposé, **aucune incohérence non expliquée**.
- Aucune migration n'a été modifiée rétroactivement (préservation du chaînage migrations).

Toute action de DROP en base reste à la main de l'éditeur (hors périmètre de remédiation code).
