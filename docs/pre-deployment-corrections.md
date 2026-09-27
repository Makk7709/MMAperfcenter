# Corrections de l’audit du 27 septembre 2026

Les couleurs, typographies et formes des boutons sont conservées. Le bandeau peut grandir sur les petits écrans pour garder ses actions visibles. L’introduction utilise un dialogue natif modal : focus contenu, fermeture avec Escape, retour du focus et bouton Passer disponible immédiatement.

Les vidéos privées sont renouvelées pendant l’utilisation de la bibliothèque. Le lecteur conserve la position et l’état de lecture lorsqu’un lien change, renouvelle un lien expiré au démarrage et propose une reprise après un échec réseau. La requête est isolée par utilisateur.

## Paiements : ordre de mise à jour

Appliquer `20260927190000_checkout_attempts.sql` avant de publier la nouvelle fonction `create-checkout`. Cette table et ses deux fonctions RPC sont réservées au rôle de service. Elle conserve le verrou du compte, le payload de création et la clé de tentative ; elle est supprimée avec le compte.

Deux demandes simultanées ne créent pas deux paiements. Une session ouverte est réutilisée ; un changement d’offre expire l’ancienne session avant de créer la suivante. Une réponse Stripe perdue est reprise avec la même clé d’idempotence et le même payload. Les anciens liens ouverts sont également expirés. Un paiement déjà terminé ou un abonnement non terminal bloque la création d’un nouveau Checkout. Si une expiration échoue, aucune session de remplacement n’est créée.

Après le crash d’une fonction, le verrou expire au bout de dix minutes, au-delà de la durée maximale d’un worker. Les sessions durent 23 heures, sous la fenêtre minimale de conservation des clés Stripe. La clé client Stripe est stable par compte et son identifiant est enregistré dès la création. Les boutons d’offres sont indisponibles tant qu’une création est en cours.

Les fichiers `index.ts` des fonctions testées sont de simples points d’entrée ; leur `handler.ts` contient le code exécuté en production et importé par les tests. Déployer le répertoire complet de chaque fonction, avec `_shared`.

## Vérifications reproductibles

Utiliser Node 24 (`.nvmrc`, identique à la CI), puis :

```bash
npm ci
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm run test:coverage
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
DENO_NO_PACKAGE_JSON=1 deno test --allow-env --allow-net=none tests/edge
npm run build
```

Le build exige les variables Supabase publiques du projet cible. Les valeurs factices de la CI servent seulement à vérifier la compilation.

La CI lance également les migrations et règles d’accès dans une base jetable, et les parcours Playwright. Les scénarios navigateur démarrent leur propre serveur strictement sur `127.0.0.1:4177` ; ils refusent de réutiliser une autre application. Les comptes et réponses Supabase sont simulés. Ils vérifient connexion, tableau de bord mobile, panneau d’analyse, nutrition, consentement avant Checkout, page 404 et clavier dans l’introduction. Cela ne remplace pas un paiement Stripe en mode test ni une recette du projet Supabase réellement publié.

Les seuils de couverture existants (80 % lignes, instructions, branches et fonctions sur `src/utils` et `src/components/sparring`) restent actifs et sont maintenant appliqués en CI. Les vrais handlers Stripe et IA sont testés avec dépendances externes simulées, y compris signatures HMAC, demandes concurrentes, erreurs et restitution des quotas.

## Vérifications nécessitant l’environnement cible

Avant ouverture commerciale : tester les e-mails d’authentification, les règles effectivement déployées, le catalogue et les webhooks Stripe en mode test, une analyse IA complète et les en-têtes HTTP de l’hébergeur. Vérifier aussi la supervision, les textes commerciaux définitifs et la procédure de retour arrière. Les informations de société ne sont pas inventées par cette correction.

Le filtre qui supprimait les erreurs réseau de Sentry a été retiré pour que les pannes API puissent être remontées quand le DSN est configuré. Aucune clé privée n’est nécessaire dans le frontend.
