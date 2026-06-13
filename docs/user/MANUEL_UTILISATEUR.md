# Manuel utilisateur — KOREV Performance Center

**Version :** 1.0  
**Public :** Utilisateurs finaux (pratiquants MMA et sports de combat)  
**Langue :** Français

---

## 1. Présentation

KOREV Performance Center est une application web de suivi sportif dédiée aux arts martiaux mixtes et sports de combat. Elle permet de :

- suivre entraînements et nutrition ;
- consulter un Coach IA personnalisé ;
- analyser des vidéos de sparring par intelligence artificielle ;
- progresser via un système de gamification « Wolf Pack » ;
- rejoindre des groupes (« meutes ») ;
- souscrire à un abonnement pour débloquer des fonctionnalités avancées.

L'application est accessible depuis un navigateur web. Aucune installation native n'est requise.

> **Avertissement :** KOREV Performance Center n'est pas un dispositif médical. Les conseils et analyses produits ne remplacent pas l'avis d'un professionnel de santé. Voir la page [Mentions légales](/legal).

---

## 2. Création de compte et connexion

### 2.1 Inscription

1. Accédez à la page **Connexion** (`/auth`).
2. Onglet **Inscription**.
3. Renseignez :
   - **Email** (format valide requis) ;
   - **Mot de passe** (minimum 6 caractères) ;
   - **Nom complet** (optionnel, utilisé comme nom d'affichage).
4. Cochez l'acceptation des conditions d'utilisation.
5. Validez. Un email de confirmation peut être envoyé selon la configuration Supabase du projet.

### 2.2 Connexion

1. Page **Connexion** (`/auth`), onglet **Connexion**.
2. Saisissez email et mot de passe.
3. Après authentification, vous êtes redirigé vers le tableau de bord (`/`).

### 2.3 Déconnexion

Depuis l'en-tête du tableau de bord, utilisez le bouton de déconnexion.

---

## 3. Onboarding (première utilisation)

Après la première connexion, si votre profil ne contient pas les champs obligatoires (poids, taille, niveau, discipline, objectifs), l'application vous redirige vers l'**onboarding** (`/onboarding`).

L'onboarding comporte **7 étapes** :

| Étape | Titre | Contenu | Obligatoire |
|---|---|---|---|
| 1 | Qui es-tu ? | Nom, genre, âge | Oui |
| 2 | Tes mensurations | Poids (kg), taille (cm) | Oui |
| 3 | Ton niveau | Niveau global (débutant → expert), discipline principale | Oui |
| 4 | Tes objectifs | Objectifs sportifs (perte de poids, compétition, technique, etc.) | Oui |
| 5 | Expérience martiale | Années de pratique, grade, disciplines secondaires, niveau compétition | Non |
| 6 | Profil physique avancé | Masse grasse, morphotype, blessures, latéralité | Non |
| 7 | Lifestyle & récupération | Sommeil, stress, disponibilité, équipement, restrictions alimentaires | Non |

Les étapes 5 à 7 sont **optionnelles** : vous pouvez les passer via le bouton dédié. Les données collectées alimentent le profil sportif et le contexte du Coach IA.

À la fin, vous accédez au tableau de bord principal.

---

## 4. Tableau de bord

Le tableau de bord (`/`) est organisé en plusieurs zones :

### 4.1 En-tête

- Nom d'utilisateur ;
- Accès rapide au profil, à l'historique, aux statistiques, aux tarifs ;
- Notifications in-app ;
- Déconnexion.

### 4.2 Section principale

- **Bandeau actualités MMA** : flux d'informations combat (sources RSS externes).
- **Vitrine analyse sparring** : présentation et accès à l'analyse vidéo IA.
- **Cartes statistiques rapides** : indicateurs de la journée/semaine.

### 4.3 Colonne gauche

- **Coach IA** : chat conversationnel (voir § 8).
- **Rang Wolf Pack** : affichage du rang et de l'XP (voir § 10).
- **Actions rapides** : raccourcis vers nutrition, entraînement, timer.
- **Meute** : carte du groupe actif (voir § 12).

### 4.4 Onglets centraux

Trois onglets principaux :

| Onglet | Contenu |
|---|---|
| **Nutrition Combat** | Journal nutritionnel, objectifs, recherche alimentaire |
| **Préparation Physique** | Démarrage et suivi de séances d'entraînement |
| **Technique** | Timer de rounds, journal d'entraînement libre |

Un bouton flottant (FAB) permet d'accéder directement à l'**analyse sparring** depuis n'importe quelle page du tableau de bord.

---

## 5. Suivi des entraînements

### 5.1 Démarrer une séance

1. Onglet **Préparation Physique**.
2. Cliquez sur **Démarrer une séance** (dialogue de démarrage v2).
3. Choisissez le type de séance et les exercices.
4. La séance passe en statut **active** avec phases warmup / active / cooldown.

### 5.2 Pendant la séance

- Enregistrement des séries (poids, répétitions) ;
- Timer intégré ;
- Calcul du volume total et estimation calorique ;
- Attribution d'XP Wolf Pack à la fin de séance.

### 5.3 Fin de séance

La séance est marquée **completed**. Un résumé gamifié peut s'afficher (XP gagné, badges potentiels).

### 5.4 Historique

Page **Historique** (`/history`) : liste des séances passées avec filtres.

### 5.5 Journal d'entraînement

Page **Journal** (`/journal`) : saisie libre de notes et observations (`/journal`).

### 5.6 Timer de rounds

Onglet **Technique** : configuration du nombre de rounds, durée des rounds et temps de repos. Signal sonore en fin de round (sons Wolf Pack ou classiques selon préférence).

---

## 6. Nutrition

### 6.1 Journal nutritionnel

Dans l'onglet **Nutrition Combat** :

- Ajout de repas par type (petit-déjeuner, déjeuner, dîner, collation) ;
- Saisie manuelle ou recherche par nom ;
- Totaux quotidiens (calories, macros selon plan).

### 6.2 Recherche alimentaire

La recherche utilise l'API publique **Open Food Facts** (`world.openfoodfacts.org`), appelée depuis votre navigateur.

### 6.3 Scan code-barres

Fonctionnalité accessible via le dialogue de scan (caméra). Soumise au **quota mensuel** du plan Free (3 scans/mois) ; illimité à partir du plan Pro.

### 6.4 Objectifs nutritionnels

Paramétrables depuis le module nutrition (objectifs caloriques et macros stockés en base).

---

## 7. Statistiques

Page **Statistiques** (`/statistics`) :

- Graphiques de progression (Recharts) : entraînements, nutrition ;
- **Analyse IA des statistiques** : synthèse sur 30 jours (workouts + nutrition), générée en streaming Markdown.

---

## 8. Coach IA

### 8.1 Accès

Disponible depuis le tableau de bord (colonne gauche) ou via le bouton **Coach IA MMA** dans la section hero.

### 8.2 Fonctionnement

- Conversation en **streaming** (réponses progressives) ;
- Le prompt système intègre votre profil sportif (~30 champs : anthropométrie, expérience martiale, lifestyle, équipement, restrictions) ;
- Modèle utilisé : Gemini 2.5 Flash via passerelle IA externe.

### 8.3 Quotas

| Plan | Quota Coach IA |
|---|---|
| Free (Découverte) | 3 utilisations / mois |
| Pro, Elite, Senseï | Illimité |

Les rôles **admin** et **coach** bénéficient d'un accès complet sans quota.

Lorsque le quota est atteint, un **paywall** s'affiche avec proposition de mise à niveau.

---

## 9. Analyse vidéo de sparring

### 9.1 Accès

- FAB d'analyse sparring sur le tableau de bord ;
- Section vitrine sparring.

### 9.2 Processus

1. **Upload** d'une vidéo de sparring (bucket privé `sparring-videos`).
2. **Extraction de frames** côté navigateur (jusqu'à 60 images, validation luminance/contraste).
3. Sélection de la **discipline** (boxe, kickboxing, muay thai, MMA, BJJ, karaté/taekwondo) — les métriques non pertinentes sont invalidées selon le profil discipline.
4. Choix du **mode qualité** :
   - Standard : Gemini 2.5 Pro ;
   - Rapide (`qualityMode='fast'`) : Gemini 2.5 Flash.
5. Envoi à l'Edge Function `analyze-sparring` ; résultat structuré JSON validé et normalisé.
6. Persistance dans l'historique (`sparring_analyses`).

### 9.3 Fonctions complémentaires

- **Suivi de progression** : comparaison entre analyses (`SparringProgressTracker`) ;
- **Export PDF** : réservé au plan **Senseï** ;
- **Partage** : dialogue de partage d'analyse (URL publique non garantie).

### 9.4 Quotas

| Plan | Quota analyse sparring |
|---|---|
| Free | 3 / mois |
| Pro, Elite, Senseï | Illimité |

---

## 10. Gamification « Wolf Pack »

Système thématique « meute de loups » intégré aux séances et à l'analyse sparring.

### 10.1 Rangs (7 niveaux)

| Niveau | Rang | XP requis |
|---|---|---|
| 1 | Louveteau | 0 |
| 2 | Loup Solitaire | 500 |
| 3 | Chasseur de Meute | 1 500 |
| 4 | Loup de Guerre | 4 000 |
| 5 | Beta | 8 000 |
| 6 | Alpha | 15 000 |
| 7 | Loup Garou | 30 000 |

L'XP est attribuée lors des actions : séance terminée, série complétée, record personnel, analyse sparring, maintien de streak.

### 10.2 Badges (9)

Exemples : Première Lune (1er entraînement), Feu de Meute (7 jours consécutifs), Crocs Acérés (100 coups), Prédateur (50 entraînements), Regard du Loup (10 analyses sparring), Pleine Lune (rang Loup Garou).

### 10.3 Streaks

Jours consécutifs d'entraînement calculés à partir de l'historique des séances.

### 10.4 Persistance

- Le **nombre de séances** provient de la base de données ;
- L'**XP total** et les **badges débloqués** sont stockés localement (`localStorage`) par navigateur/appareil — ils ne se synchronisent pas automatiquement entre appareils.

---

## 11. Abonnements et paywall

### 11.1 Plans disponibles

| Plan | Nom commercial | Prix mensuel | Prix annuel |
|---|---|---|---|
| `free` | Découverte | Gratuit | — |
| `pro` | Guerrier | 14,90 € | 119 € |
| `elite` | Compétiteur | 29,90 € | 239 € |
| `sensei` | Senseï (Coach) | 69 € | 699 € |

Page tarifs : `/pricing`.

### 11.2 Fonctionnalités par palier (résumé)

| Fonctionnalité | Free | Pro | Elite | Senseï |
|---|---|---|---|---|
| Coach IA | 3/mois | Illimité | Illimité | Illimité |
| Scan code-barres | 3/mois | Illimité | Illimité | Illimité |
| Analyse sparring | 3/mois | Illimité | Illimité | Illimité |
| Macros complets | Non | Oui | Oui | Oui |
| Vidéos premium (bibliothèque) | Non | Non | Oui | Oui |
| Export PDF sparring | Non | Non | Non | Oui |
| Multi-athlètes / tableau équipe | Non | Non | Non | Oui |

### 11.3 Souscription

1. Page **Tarifs** → choisir un plan payant.
2. Redirection vers **Stripe Checkout** (nouvel onglet).
3. Après paiement, retour via `/payment-success`.
4. L'abonnement est synchronisé via webhook Stripe et la fonction `check-subscription`.

### 11.4 Gestion de l'abonnement

Depuis `/pricing`, bouton **Gérer mon abonnement** → **Stripe Customer Portal** (modification, résiliation).

### 11.5 Paywall

Lorsqu'une fonctionnalité quota est épuisée ou réservée à un plan supérieur, un dialogue paywall propose la mise à niveau.

---

## 12. Meutes (groupes)

Les **meutes** sont des groupes communautaires d'utilisateurs.

### 12.1 Rôles

| Rôle | Droits |
|---|---|
| **owner** | Propriétaire, gestion complète |
| **admin** | Administration du groupe |
| **member** | Membre standard |

### 12.2 Actions

- Créer une meute ;
- Inviter des membres (invitations en attente visibles sur la carte meute) ;
- Consulter le flux d'activités du groupe ;
- Accepter ou refuser une invitation.

### 12.3 Activités

Les activités de meute (`meute_activities`) enregistrent les événements du groupe. Certaines activités communautaires globales sont déclenchées automatiquement (ex. séance terminée → `community_activities`).

---

## 13. Profil utilisateur

Page **Profil** (`/profile`) :

- Consultation et modification des informations sportives ;
- Mise à jour des champs complétés à l'onboarding (discipline, objectifs, mensurations, etc.) ;
- Ces données alimentent le Coach IA et les recommandations.

---

## 14. Bibliothèque vidéos d'entraînement

Page **Vidéos** (`/training-videos`) :

- Catalogue de vidéos d'entraînement ;
- Visibilité `public` ou `premium` (accès conditionné au plan et au rôle) ;
- Compteur de vues ;
- Ajout/modification réservé aux rôles **admin** et **coach**.

---

## 15. Notifications

Cloche de notifications dans l'en-tête :

- Liste des notifications in-app ;
- Marquage lu / non lu ;
- Création automatique via la fonction SQL `create_notification`.

---

## 16. Espace administration (admin / coach)

Accessible aux utilisateurs disposant du rôle `admin` ou `coach` dans la table `user_roles`.

| Route | Fonction |
|---|---|
| `/admin` | Tableau de bord : utilisateurs, abonnements, vidéos, activité récente |
| `/admin/users` | Gestion des utilisateurs |
| `/admin/subscriptions` | Gestion des abonnements |
| `/admin/videos` | Gestion de la bibliothèque vidéo |
| `/admin/settings` | Paramètres plateforme |

Les utilisateurs sans rôle privilégié sont redirigés vers le tableau de bord.

> **Distinction :** Le rôle **coach** partage l'accès au back-office et le bypass des quotas fonctionnels, mais les capacités métier (publication vidéo) sont alignées sur ce rôle plutôt que sur `admin` selon les policies RLS.

---

## 17. Pages légales

Page **Mentions légales** (`/legal`) : CGU, CGV, informations RGPD, avertissement non médical, coordonnées KOREV AI.

---

## 18. Routes de l'application

| Route | Accès | Description |
|---|---|---|
| `/` | Authentifié | Tableau de bord |
| `/auth` | Public | Connexion / inscription |
| `/onboarding` | Authentifié | Configuration profil initial |
| `/profile` | Authentifié | Profil utilisateur |
| `/history` | Authentifié | Historique séances |
| `/journal` | Authentifié | Journal d'entraînement |
| `/statistics` | Authentifié | Statistiques et analyse IA |
| `/training-videos` | Authentifié | Bibliothèque vidéo |
| `/pricing` | Authentifié | Tarifs et abonnement |
| `/payment-success` | Authentifié | Confirmation paiement |
| `/legal` | Public | Mentions légales |
| `/admin/*` | Admin / coach | Back-office |

---

## 19. Support

Pour toute question relative aux données personnelles ou aux conditions d'utilisation, consultez la page `/legal` ou contactez **[contact@korev-ai.com](mailto:contact@korev-ai.com)** (adresse indiquée dans les mentions légales).

---

© KOREV AI — Manuel utilisateur v1.0
