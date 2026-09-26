# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/). La version 1.0.0 correspondra à la première mise en production.

## [Non publié]

### Ajouté

- Vidéo d'introduction KOREV (10 s, sans son, fondu au noir puis ouverture sur l'application), une fois par session, avec bouton « Passer » et touche Échap. Ignorée si l'utilisateur a demandé de réduire les animations, et sur les pages ouvertes depuis un e-mail ou un paiement.

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
