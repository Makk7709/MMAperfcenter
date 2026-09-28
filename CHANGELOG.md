# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/). La version 1.0.0 correspondra à la première mise en production.

## [Non publié]

**Nécessite Node 24 pour le build, les migrations `20260925220000` à `20260927190000` (après le pré-vol `supabase/preflight/20260927_preflight.sql`), le redéploiement de toutes les Edge Functions et les nouveaux secrets `STRIPE_PRICE_*`, `STRIPE_PRODUCT_*` (live). Voir `docs/development/DEPLOYMENT.md` §3.1.**

### Modifié

- Offres : seule Pro est en vente. Elite et Senseï sont affichées « Bientôt disponible » et refusées par `create-checkout` (`PLAN_NOT_ON_SALE`) tant que leurs fonctionnalités n'existent pas. Les listes Free et Pro décrivent exactement ce que l'app fournit ; l'usage raisonnable des mentions « illimité » (200 messages au coach IA et 20 analyses PRISM par jour) figure sur la page Tarifs, dans la fenêtre d'upgrade et dans les CGV (§7.1). En live, seuls les secrets Stripe des offres en vente sont requis.

### Ajouté

- PRISM, « Faire progresser PRISM » (facultatif) : après une analyse, l'utilisateur peut partager le **mouvement** du sparring pour entraîner nos modèles d'analyse.
  - Le téléphone en extrait le squelette (23 points par personne, sans le visage, 10 fois par seconde, 3 minutes au plus) ; aucune image, vidéo ni son n'est envoyé.
  - Sont joints les moments et techniques repérés par PRISM, et les corrections éventuelles de l'utilisateur.
  - Le consentement est horodaté ; les contributions sont réservées aux majeurs.
  - Le partenaire filmé donne son propre accord via un lien, depuis son compte ; sans réponse sous 14 jours, son mouvement est effacé.
  - Le profil gagne une rubrique « Mes contributions » (retrait en un clic), et l'export des données inclut les contributions.
  - Conservation : 3 ans, avec purge quotidienne.
  - Politique de confidentialité (§8) et CGU (§6) mises à jour ; [AIPD](docs/legal/AIPD_ANALYSE_MOUVEMENT.md) à faire valider.
  - Nécessite la migration `20260928100000` et l'extension `pg_cron`.
- Vidéo d'introduction KOREV (10 s, sans son, fondu au noir puis ouverture sur l'application), une fois par session, avec bouton « Passer » et touche Échap. Ignorée si l'utilisateur a demandé de réduire les animations, en mode économie de données ou sur connexion lente, et sur les pages ouvertes depuis un e-mail (confirmation d'inscription comprise) ou un paiement.
- Team : invitation par e-mail qui fonctionne (la recherche de profil était bloquée par la sécurité), noms des membres et des activités, invitations reçues avec le nom de l'invitant, notification « Invitation Team », confirmation avant de supprimer ou de quitter une team.
- Paiement : case de renonciation au droit de rétractation avant le paiement, horodatée chez Stripe. Page de paiement réussi qui vérifie réellement l'activation.
- Icônes de l'application, carte de partage (réseaux sociaux), manifeste, page 404 en français.
- CI : tests des Edge Functions, rejeu des migrations et tests des règles d'accès de la base ; lint bloquant.

### Sécurité

- Le rôle, le plan et les teams d'un autre compte ne peuvent plus être sondés via l'API.
- Plafond quotidien d'usage de l'IA pour tous les plans (200 messages Coach IA, 20 analyses PRISM par jour).
- Le fil communautaire n'est plus lisible par les autres membres, et ne contient plus d'e-mail ni de nom de séance.
- Suppression de compte : la session en cours doit avoir été ouverte il y a moins de 15 minutes.
- Team : les invitations ne permettent plus de savoir quelles adresses ont un compte (réponse uniforme, invitations en attente invisibles, 20 par jour, notification sans le nom de la team).
- Stripe : IDs de prix et produits live en secrets serveur (clés `sk_live_` et restreintes `rk_live_`) ; un produit inconnu n'enregistre plus un abonné payant en plan gratuit. Événements Stripe conservés sans données personnelles. Corps du webhook limité en taille.
- Longueurs maximales des textes libres, tables héritées fermées au client, plus de dépôt dans l'ancien bucket de sparring.
- CGU §6 : la licence vague « à des fins d'amélioration du service » est remplacée par une licence limitée aux contributions volontaires, révocable. Politique de sécurité (mode rapport) : `'wasm-unsafe-eval'` autorisé pour l'extraction du mouvement.

### Corrigé

- Coach IA : la conversation ne se bloque plus après une longue réponse (programme, plan de repas). Les anciennes réponses sont raccourcies au lieu d'être refusées par le serveur. **Nécessite de redéployer la fonction `ai-coach`.**
- Coach IA : une réponse vide (blocage de sécurité, erreur de la passerelle) ne casse plus la suite de la conversation ; la question est remise dans le champ de saisie.
- Coach IA : un double clic sur Envoyer n'envoie plus deux requêtes et ne consomme plus deux crédits.
- Coach IA : une requête échouée ne fait plus disparaître la question ; une réponse interrompue est conservée.
- Flux IA : une ligne malformée n'interrompt plus silencieusement la réponse, et une erreur envoyée en cours de flux est affichée.
- Nutrition : le scanner de code-barres (et la caméra) ne se rouvre plus à chaque retour sur l'onglet Nutrition.
- Séance : après avoir saisi une charge ou des répétitions, le tap suivant sur ✓ (ou dans le champ suivant) n'est plus perdu. L'enregistrement des séries se fait en arrière-plan sans bloquer l'écran.
- Séance : une seule séance ouverte par utilisateur (**migration `20260926060000_single_active_workout.sql`**). Une erreur réseau n'affiche plus « aucune séance » mais un écran « Réessayer », et démarrer une séance alors qu'une autre est ouverte la reprend.
- Séance : terminer ou abandonner depuis un onglet périmé ne réécrit plus une séance déjà terminée et ne crée plus de doublon au carnet.
- Séance : une séance restée ouverte plus de 4 h demande sa durée réelle au lieu d'être enregistrée à 4 h (ce qui faussait la charge d'entraînement pendant 4 semaines).
- Séance : le signal de fin de repos sonne aussi après un rechargement ou un verrouillage de l'iPhone ; retirer un exercice qui a des séries validées demande confirmation.
- Camp de préparation : la date de début était annoncée un jour trop tôt.
- Historique : la réinitialisation ne supprime plus la séance en cours et met à jour les indicateurs.
- Accessibilité : bouton « Terminer la séance » nommé sur mobile, minuteur de repos qui n'est plus lu chaque seconde, curseurs nommés.
- Textes : « Séance » au lieu de « Workout », intensités accordées (« Légère », « Modérée »), « Jours consécutifs » et « Plus long enchaînement » au lieu de « Série », qui désigne déjà les séries d'exercices.
- Performance : l'historique d'entraînement est mis en cache 5 minutes et chargé au-delà de 1000 séances.
- Coach IA : une réponse vide (blocage de sécurité du modèle) ne consomme plus de crédit. Les champs texte du profil sont transmis au modèle comme des données entre « », jamais comme des instructions. Boutons et zone de saisie nommés pour les lecteurs d'écran, réponses annoncées.
- Nutrition : les aliments à 0 kcal (eau, café noir, boissons zéro) peuvent être enregistrés ; si Open Food Facts n'indique pas l'énergie, elle est estimée à partir des macronutriments. Saisir « 0,5 » ne s'efface plus. Un objectif de 0 g n'est plus remplacé par la valeur par défaut.
- Nutrition : la recherche d'aliments n'affiche plus de résultats périmés ; un produit scanné n'ouvre plus de liste de recherche. Fermer le scanner pendant une recherche ne compte plus de scan. Le journal passe au nouveau jour à minuit si l'application reste ouverte.
- Tableau de bord : les cartes « Vue d'ensemble » se mettent à jour dès qu'un aliment est ajouté ou une séance terminée, et le volume total ne concatène plus les valeurs au lieu de les additionner.
- Séance : la durée visée choisie au démarrage est enregistrée et affichée pendant la séance (**migration `20260926070000_session_details_and_feed.sql`**).
- Fil communautaire : seul le type de séance est publié (« a terminé une séance de boxe »), plus le nom saisi, qui reste privé. Initiales correctes pour les prénoms contenant un « a ».
- Base : supprimer un exercice du catalogue qui figure dans des séances est refusé au lieu d'effacer l'historique de tous les utilisateurs ; une activité de team ne peut viser que ses propres séances.
- Tableau de bord : une actualité MMA sans date valide ne fait plus planter la page ; chaque widget a sa propre protection d'erreur. La tuile Combat fait défiler jusqu'aux onglets.
- Nutrition : la recherche d'aliments se lance sur Entrée ou « Chercher » (Open Food Facts bloque la recherche au fil de la frappe), avec cache et message clair en cas de limite atteinte.
- IA : délai de 30 s sur la passerelle au lieu d'une attente infinie ; modèles configurables (`AI_MODEL_FAST`, `AI_MODEL_PRO`).
- Abonnement : un échec de lecture ne fait plus passer un abonné payant pour gratuit (réessais, écran « Réessayer » sur la page Tarifs et dans les paywalls).
- Onboarding : formulaire pré-rempli, plus de boucle ni d'écrasement du profil ; déconnexion possible.
- Connexion : retour à la page demandée après authentification ; messages d'erreur Supabase en français ; échec de « mot de passe oublié » signalé.
- Minuteur de rounds : plus de dérive quand l'onglet est en arrière-plan ; sons de fin de phase.
- Coach IA : défilement automatique pendant la réponse ; le bouton d'analyse sparring ne masque plus « Envoyer ».
- PRISM : le kickboxing et la boxe thaï ne sont plus analysés avec les règles de la boxe anglaise.
- Carnet : plus de coupure silencieuse à 1000 entrées.
- Notifications en temps réel, limitées aux siennes.
- Team : quitter une team fonctionne (la suppression était refusée sans message). Une invitation déclinée ne peut plus être acceptée plus tard.
- Inscription : un nom de plus de 100 caractères est tronqué au lieu de faire échouer la création du compte.
- Paiement : impossible d'ouvrir un second abonnement quand le premier est en retard de paiement.
- Navigateur avec stockage bloqué : l'app ne s'affiche plus en erreur à chaque page.
- Catalogue : les exercices ajoutés ne créent plus de doublons de casse (« Tirage Vertical », « Box Jumps »…).

### Performance

- Pages chargées à la demande ; scanner de code-barres et export PDF chargés au premier usage. Bibliothèques séparées en fichiers mis en cache entre deux versions.
- Vidéo d'introduction réduite à 1,4 Mo.
- Index ajoutés (clés étrangères, analyses sparring, teams, fil).
- `www` redirigé vers le domaine nu ; le build échoue si la configuration Supabase manque.

### Retiré

- `framer-motion`, `bun.lockb` et des composants inutilisés (`MMAResultsFeed`, `CommunityActivity`, `PricingCard`).

## [0.11.0] - 2026-09-26

**Nécessite la migration `20260926050000_session_effort.sql` (en plus de celles de 0.10.x) et le redéploiement de la fonction `ai-coach`.**

### Indicateurs de performance (remplacent la gamification Wolf Pack)

- Les rangs (Louveteau → Loup Garou), l'XP et les badges thématiques sont supprimés.
- **Constance** : séances de la semaine face à la disponibilité hebdomadaire du profil, sur 4 semaines.
- **Charge d'entraînement** : effort perçu (1 à 10) × minutes, ratio 7 jours / moyenne 28 jours et zone (sous-charge, optimale, élevée, risque de surmenage), après 3 semaines d'historique.
- **Records personnels** : charge maximale par exercice, rounds et volume sur une séance, plus longue série ; les records battus s'affichent en fin de séance.
- **Camp de préparation** : compte à rebours vers la date d'objectif du profil et suivi des 8 semaines qui la précèdent.
- Le bilan de fin de séance demande l'effort perçu ; l'écran final affiche la charge de la séance au lieu de l'XP.
- Le coach IA reçoit l'effort de chaque séance et la charge d'entraînement avec son ratio.

### Divers

- Les groupes « Meute » s'appellent désormais « Team » dans l'application.
- Modifier la disponibilité ou la date d'objectif du profil recalcule immédiatement les indicateurs.

## [0.10.1] - 2026-09-26

**Nécessite la migration `20260926040000_nutrition_journal_limits.sql` et le redéploiement de la fonction `ai-coach`.**

### Coach IA

- Le coach lit désormais vos données réelles, et plus seulement votre profil : séances des 28 derniers jours, nutrition des 7 derniers jours par rapport aux objectifs, 5 dernières entrées du carnet, 2 dernières analyses sparring.
- Les scores sparring ne lui sont transmis que si l'athlète a été identifié dans la vidéo ; le texte saisi par l'utilisateur lui est présenté comme donnée, jamais comme instruction.
- Le « jour » suit le fuseau horaire du navigateur ; une source indisponible n'empêche pas le coach de répondre.

### Robustesse des données

- Bornes en base sur le journal alimentaire (calories, macros, nom), les objectifs et le carnet (titre, notes, pesée, ressenti) : un appel direct à l'API ne peut plus enregistrer de valeurs absurdes.
- Valeurs pour 100 g plafonnées côté application (900 kcal, 100 g par nutriment), y compris pour les fiches Open Food Facts erronées.

## [0.10.0] - 2026-09-26

Entraînement, carnet et nutrition refondus. **Nécessite la migration `20260926030000_training_sessions.sql`**, à appliquer avant ou avec ce frontend.

### Séances d'entraînement

- Une seule séance, enregistrée en base, sur un écran dédié (`/seance`) : minuteur de rounds avec sonnerie, exercices et séries (charge, répétitions, validation), minuteur de repos lancé à chaque série validée.
- Les minuteurs se basent sur l'heure réelle : justes en veille ou après rechargement ; la séance se reprend depuis le tableau de bord.
- Bilan réel en fin de séance (durée, séries, volume, rounds, calories estimées selon le poids du profil) et note rattachée au carnet.
- 24 exercices orientés combat ajoutés au catalogue (force, puissance, conditionnement, gainage).
- Ancien système supprimé (enregistreur, dialogues et gestionnaire de séance en double, XP en `localStorage`).

### Rang Wolf Pack

- XP et rang calculés à partir des séances réellement enregistrées et des analyses sparring terminées, identiques sur tous les appareils (l'affichage était figé à 1 250 XP).

### Carnet d'entraînement

- Refonte KOREV : ressenti en 5 niveaux sans emojis, actions visibles sur mobile, suppression confirmée, séance liée affichée ; accessible depuis le menu.

### Nutrition

- Navigation par jour et bande des 7 derniers jours ; aliments groupés par repas, repas présélectionné selon l'heure.
- Le scanner ouvre la saisie préremplie pour 100 g avec choix de la quantité (portion du produit si déclarée) ; un produit introuvable ne consomme plus de scan ; caméra arrière.
- Décimales conservées ; objectifs préremplis avec les valeurs actuelles.

### Corrections

- Dates calculées dans le fuseau de l'utilisateur (nutrition, carnet, statistiques, exports) : un repas noté après minuit n'est plus rangé la veille.
- Recherche d'aliments : la liste ne se rouvre plus après une sélection ; valeurs pour 100 g uniquement.
- Bouton « Démarrer une séance combat » fonctionnel.

## [0.9.0] - 2026-09-26

Version de pré-lancement : fonctionnellement complète, auditée, non encore déployée.

### Design

- Système de design aligné sur la marque KOREV : polices Barlow Semi Condensed et IBM Plex auto-hébergées, or champagne sur fond sombre, composants angulaires à coin chanfreiné, profondeur (dégradés, ombres, grille, particules).
- Logo KOREV, écran de connexion immersif, en-tête avec navigation réelle.

### Analyse vidéo IA (PRISM)

- Planches de mouvement 2×2 horodatées (jusqu'à 48 planches, 4 instants à 0,25 s) : moments clés et techniques datés.
- Identification facultative de l'athlète par sa tenue ; conseils adressés directement.
- Encadré de fiabilité : part de la vidéo observée, avertissements d'extrapolation.
- Nouvel écran : glisser-déposer, progression réelle, rapport façon fiche de combat.
- Cadrages portrait, plafond de taille des requêtes, statut d'échec, modèle rapide pour le quota gratuit.

### Administration et abonnements

- API d'administration côté serveur avec suspension réelle des comptes ; les coachs n'accèdent qu'aux vidéos.
- Badge PREMIUM fidèle au plan réel ; écran d'erreur avec réessai.

### Sécurité et conformité

- Audits hostiles : RPC durcies, quotas IA atomiques, webhook Stripe idempotent, corps de requête plafonnés, vidéos d'entraînement privées.
- RGPD : export des données et suppression du compte dans l'application, politique de confidentialité factuelle.
- Réinitialisation du mot de passe, 8 caractères minimum.

### Déploiement

- `.htaccess` SPA, en-têtes de sécurité, CSP en mode rapport, compression, procédures de sauvegarde et de retour arrière.

[0.11.0]: https://github.com/Makk7709/MMAperfcenter/releases/tag/v0.11.0
[0.10.1]: https://github.com/Makk7709/MMAperfcenter/releases/tag/v0.10.1
[0.10.0]: https://github.com/Makk7709/MMAperfcenter/releases/tag/v0.10.0
[0.9.0]: https://github.com/Makk7709/MMAperfcenter/releases/tag/v0.9.0
