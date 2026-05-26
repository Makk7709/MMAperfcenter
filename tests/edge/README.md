# Edge Functions — test harness

> Statut : harnais minimal mis en place pour la transmission Diag&Grow.
> Les tests ici sont des **tests Deno** légers (mocks d'`Stripe` / `Supabase` /
> `fetch`) qui valident les chemins critiques sans dépendre de l'infrastructure
> Supabase live.
>
> Ces tests ne sont pas encore intégrés à la CI GitHub (CI Node uniquement à ce
> stade). Ils sont exécutables manuellement via le runtime Deno et documentent
> la couverture cible.

---

## Exécution locale

Pré-requis : [Deno ≥ 1.45](https://deno.com/).

```bash
# depuis la racine du dépôt
deno test --allow-env --allow-net=none tests/edge
```

Le flag `--allow-net=none` est volontaire : les harnais ne doivent **jamais**
toucher au réseau (mocks uniquement). Ajouter des permissions plus larges est
le signe que le test fuit hors du périmètre.

---

## Couverture cible

| Fonction Edge | Fichier de test | Chemins couverts |
|---|---|---|
| `analyze-sparring` | `analyze-sparring.test.ts` | payload invalide rejeté ; payload minimal accepté ; mode `qualityMode: "fast"` route vers le bon modèle. |
| `ai-coach` | `ai-coach.test.ts` | gating refuse les quotas dépassés ; profil minimal accepté ; refus en l'absence d'auth. |
| `stripe-webhook` | `stripe-webhook.test.ts` | signature invalide → 400 ; événement déjà traité → 200 dédupliqué ; `customer.subscription.updated` route vers `sync_stripe_subscription`. |

Les tests sont volontairement **petits et isolés** : ils ne remplacent pas une
suite d'intégration (à venir lors d'une itération CI dédiée à Deno). Ils
constituent un filet de sécurité minimal vérifiable par un cabinet d'audit.
