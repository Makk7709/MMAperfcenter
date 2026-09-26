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
- piloter sa préparation avec des indicateurs de performance (constance, charge d'entraînement, records, camp) ;
- rejoindre des groupes (« teams ») ;
- souscrire à un abonnement pour débloquer des fonctionnalités avancées.

L'application est accessible depuis un navigateur web. Aucune installation native n'est requise.

À la première ouverture de chaque session, une courte vidéo d'introduction (10 secondes, sans son) se termine par un fondu au noir puis laisse place à l'application. Le bouton **Passer** ou la touche Échap l'interrompt. Elle n'est pas jouée si votre système demande de réduire les animations, ni sur les pages ouvertes depuis un e-mail ou un paiement.

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
- Accès rapide au profil, à l'historique, au carnet, aux statistiques, aux tarifs ;
- Notifications in-app ;
- Déconnexion.

### 4.2 Section principale

- **Bandeau actualités MMA** : flux d'informations combat (sources RSS externes).
- **Vitrine analyse sparring** : présentation et accès à l'analyse vidéo IA.
- **Cartes statistiques rapides** : indicateurs de la journée/semaine.

### 4.3 Colonne gauche

- **Coach IA** : chat conversationnel (voir § 8).
- **Performance / Semaine** : constance de la semaine, série en cours, zone de charge et compte à rebours du camp (voir § 10).
- **Actions rapides** : démarrer ou reprendre une séance, scanner un produit, vidéos, technique, carnet, historique.
- **Team** : carte du groupe actif (voir § 12).

### 4.4 Onglets centraux

Trois onglets principaux :

| Onglet | Contenu |
|---|---|
| **Nutrition Combat** | Journal nutritionnel du jour, navigation entre les jours, objectifs, scanner |
| **Préparation Physique** | Séance en cours ou nouvelle séance, statistiques de la semaine, camp, constance, charge d'entraînement, records, dernières séances |
| **Technique** | Minuteur de rounds libre (non enregistré) et démarrage d'une séance combat enregistrée |

Un bouton flottant (FAB) permet d'accéder directement à l'**analyse sparring** depuis n'importe quelle page du tableau de bord.

---

## 5. Suivi des entraînements

### 5.1 Démarrer une séance

1. Onglet **Préparation Physique** (ou tuile **Workout** des actions rapides) : **Nouvelle séance**.
2. Choisissez un modèle (boxe, MMA, force, HIIT…) ou composez la séance : type, intensité, mode rounds (nombre, durée du round, repos).
3. La séance s'ouvre en plein écran sur `/seance`. Une seule séance peut être en cours ; si vous quittez l'écran, elle reste ouverte et le tableau de bord propose **Reprendre la séance**.

### 5.2 Pendant la séance

- **Minuteur de rounds** (si la séance comporte des rounds) : sonnerie à chaque changement de phase, bips sur les 3 dernières secondes, phase de repos affichée en bleu. Le chronomètre se base sur l'heure réelle : il reste juste si le téléphone se met en veille ou si la page est rechargée. Chaque round terminé est enregistré.
- **Exercices et séries** : **Ajouter un exercice** ouvre le catalogue (recherche, catégories Force, Puissance, Conditionnement, Gainage…). Pour chaque série, saisissez la charge et les répétitions puis validez-la.
- **Minuteur de repos** : il démarre automatiquement quand une série est validée et enregistrée (+15 s ou **Passer**).
- **Abandonner la séance** la supprime après confirmation ; elle n'apparaît alors ni dans l'historique ni dans les statistiques.

### 5.3 Fin de séance

**Terminer** affiche le bilan réel : durée, séries validées, volume soulevé (kg), rounds. Vous indiquez l'**effort perçu** de la séance (1 à 10, échelle de Borg ; proposé par défaut selon l'intensité choisie), puis, si vous le souhaitez, votre ressenti, votre énergie et une note : ces trois derniers sont ajoutés au carnet et rattachés à la séance. Après enregistrement : charge de la séance (effort × minutes), calories estimées (selon le type, l'intensité, la durée et votre poids de profil, 75 kg par défaut), records battus et résumé de la semaine.

La durée comptée est plafonnée à 4 heures (séance oubliée ouverte).

### 5.4 Historique

Page **Historique** (`/history`) : liste des séances passées avec filtres.

### 5.5 Journal d'entraînement

Page **Carnet** (`/journal`, aussi dans le menu) : une entrée par jour ou par séance avec titre, ressenti (5 niveaux), énergie sur 10, pesée facultative et notes. Les entrées créées en fin de séance affichent la séance liée (type, durée, rounds, volume). Modification et suppression sont accessibles sur chaque entrée, y compris sur mobile ; la suppression demande confirmation et ne supprime pas la séance.

### 5.6 Timer de rounds

Onglet **Technique** : minuteur libre (nombre de rounds, durée, repos), sans enregistrement. Pour que les rounds comptent dans l'historique, la charge et les records, utilisez **Démarrer une séance combat** ou le mode rounds d'une séance.

---

## 6. Nutrition

### 6.1 Journal nutritionnel

Dans l'onglet **Nutrition Combat** :

- Le jour affiché est **Aujourd'hui** par défaut ; les flèches et la bande des **7 derniers jours** (calories par jour, ligne pointillée = objectif) permettent de consulter ou compléter un autre jour. Les jours suivent votre fuseau horaire.
- Calories consommées, restantes et progression des protéines, glucides et lipides.
- Les aliments sont regroupés par repas (petit-déjeuner, déjeuner, collation, dîner) avec le sous-total du repas ; **+** ajoute directement à ce repas, **×** retire un aliment.

### 6.2 Ajouter un aliment

**Ajouter** ouvre la saisie : le repas est présélectionné selon l'heure. Recherchez l'aliment (API publique **Open Food Facts**, appelée depuis votre navigateur) ou saisissez vous-même les valeurs pour 100 g. Indiquez ensuite la quantité consommée en grammes (raccourcis 30 à 250 g, ou la portion déclarée par le produit) : le total est recalculé en direct, décimales comprises.

### 6.3 Scan code-barres

**Scanner** (onglet nutrition ou actions rapides) ouvre la caméra arrière. Le produit reconnu ouvre la même saisie, préremplie pour 100 g : il reste à choisir la quantité et le repas. Un code-barres introuvable ou sans valeurs nutritionnelles ne consomme pas de scan. Quota : 3 scans par mois en plan Free, illimité à partir du plan Pro.

### 6.4 Objectifs nutritionnels

L'icône de réglages ouvre vos objectifs quotidiens (calories, protéines, glucides, lipides), préremplis avec les valeurs actuelles et enregistrés en base.

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
- Le coach connaît votre profil sportif (~30 champs : anthropométrie, expérience martiale, mode de vie, équipement, restrictions) ;
- Il lit aussi vos données réelles de l'application à chaque question : séances des 28 derniers jours (type, durée, effort perçu, rounds, séries, volume) avec votre charge d'entraînement et son ratio, nutrition des 7 derniers jours par rapport à vos objectifs, vos 5 dernières entrées de carnet (ressenti, énergie, pesée, notes) et vos 2 dernières analyses sparring. Les scores sparring ne lui sont transmis que si vous avez été identifié dans la vidéo ;
- Il ne voit que vos propres données et signale ce qui manque plutôt que de l'inventer : plus votre journal est complet, plus ses conseils sont précis ;
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

1. Sélection de la **discipline** (boxe, kickboxing, muay thai, MMA, BJJ, karaté/taekwondo) — les métriques non pertinentes sont invalidées selon le profil discipline.
2. Description facultative de **votre tenue** (« short noir, gants rouges ») : l'IA vous place en coin rouge et vous adresse directement ses conseils.
3. **Dépôt** de la vidéo (glisser-déposer ou sélection). La vidéo reste sur l'appareil.
4. **Extraction de planches de mouvement** côté navigateur : jusqu'à 48 planches de 4 images consécutives (0,25 s d'écart), avec timecode incrusté et validation luminance/contraste.
5. Envoi à l'Edge Function `analyze-sparring` (Gemini 2.5 Pro ; Gemini 2.5 Flash quand l'analyse consomme le quota gratuit) ; résultat structuré JSON validé et normalisé.
6. **Rapport** façon fiche de combat : scores par coin, moments clés datés (cliquables pour revoir l'instant tant que la vidéo est chargée), statistiques, techniques, conseils, et un encadré de fiabilité indiquant la part de la vidéo réellement observée.
7. Persistance dans l'historique (`sparring_analyses`).

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

## 10. Indicateurs de performance

Quatre indicateurs, calculés à partir de vos séances terminées et de votre profil, remplacent tout système de points ou de rangs.

### 10.1 Constance

Nombre de séances de la semaine en cours (du lundi au dimanche) face à votre objectif hebdomadaire, qui est la **disponibilité hebdomadaire** de votre profil (3 séances par défaut si elle n'est pas renseignée). Les quatre dernières semaines sont affichées, ainsi que le nombre de semaines terminées où l'objectif a été atteint (à partir de la semaine de votre première séance).

### 10.2 Charge d'entraînement

Méthode session-RPE utilisée en préparation physique :

- **charge d'une séance** = effort perçu (1 à 10) × durée en minutes. Les séances enregistrées avant l'ajout de l'effort perçu utilisent une valeur déduite de l'intensité (légère 3, modérée 5, intense 8) ;
- **ratio** = charge des 7 derniers jours ÷ moyenne hebdomadaire des 28 derniers jours.

| Ratio | Zone | Lecture |
|---|---|---|
| < 0,8 | Sous-charge | Semaine plus légère que d'habitude (récupération ou baisse de régime) |
| 0,8 à 1,3 | Zone optimale | Charge alignée sur votre habitude |
| 1,3 à 1,5 | Charge élevée | Surveillez sommeil et récupération |
| > 1,5 | Risque de surmenage | Hausse brutale : risque de blessure accru, allégez |

Le ratio n'est affiché qu'après **trois semaines** d'historique (« Calibrage » avant cela). Après une longue interruption, la zone indique une sous-charge.

### 10.3 Records personnels

- Pour chaque exercice : la série validée la plus lourde (plus de répétitions à charge égale), avec sa date ;
- plus grand nombre de rounds et plus gros volume sur une séance ;
- plus longue série de jours consécutifs d'entraînement.

En fin de séance, les records battus sont affichés avec la marque précédente. Une première tentative sur un exercice n'est pas un record : il faut une marque antérieure à battre.

### 10.4 Camp de préparation

Si votre profil contient une **date d'objectif** (et éventuellement un **événement cible**), l'application affiche le compte à rebours (J-24). Les **8 semaines** précédant la date forment le camp : semaine en cours (ex. « Semaine 5 sur 8 ») et nombre de séances depuis son début. Avant le camp, sa date de début est indiquée. Une date passée n'est plus affichée.

### 10.5 Série en cours

Jours consécutifs d'entraînement jusqu'à aujourd'hui ; la série reste valable jusqu'à la fin de la journée suivant la dernière séance.

### 10.6 Persistance

Tous les indicateurs sont recalculés à partir de la base de données : ils sont identiques sur tous vos appareils. Abandonner une séance la retire de la constance, de la charge et des records. Modifier votre disponibilité ou votre date d'objectif dans le profil met les indicateurs à jour.

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

## 12. Teams (groupes)

Les **teams** sont des groupes communautaires d'utilisateurs (tables `meutes` en base de données).

### 12.1 Rôles

| Rôle | Droits |
|---|---|
| **owner** | Propriétaire, gestion complète |
| **admin** | Administration du groupe |
| **member** | Membre standard |

### 12.2 Actions

- Créer une team ;
- Inviter des membres (invitations en attente visibles sur la carte Team) ;
- Consulter le flux d'activités du groupe ;
- Accepter ou refuser une invitation.

### 12.3 Activités

Les activités de team (`meute_activities`) enregistrent les événements du groupe. Certaines activités communautaires globales sont déclenchées automatiquement (ex. séance terminée → `community_activities`).

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
| `/seance` | Authentifié | Séance en cours (rounds, séries, repos) |
| `/journal` | Authentifié | Carnet d'entraînement |
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
