# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon [SemVer](https://semver.org/lang/fr/). La version 1.0.0 correspondra à la première mise en production.

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

[0.9.0]: https://github.com/Makk7709/MMAperfcenter/releases/tag/v0.9.0
