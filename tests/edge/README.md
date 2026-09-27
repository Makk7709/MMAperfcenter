# Tests des fonctions Edge

Les tests Deno importent les handlers utilisés en production. Seules leurs dépendances externes (base, services distants, transport IA) sont remplacées. Le webhook est testé avec de véritables signatures HMAC Stripe. La CI exécute ces tests ainsi que le contrôle de types.

```bash
DENO_NO_PACKAGE_JSON=1 deno test --allow-env --allow-net=none tests/edge
```

La création de paiement couvre les requêtes répétées et concurrentes, le changement d’offre, la reprise après une réponse Stripe perdue, les échecs de persistance et les abonnements encore actifs. Les tests SQL vérifient séparément le verrou et ses permissions. Les tests IA vérifient la validation, les quotas et leur restitution en cas d’échec.

Aucun test ne doit contacter un projet Supabase ou un compte Stripe réel. Le mode réseau interdit reste actif pendant l’exécution ; les imports Deno sont résolus avant celle-ci.
