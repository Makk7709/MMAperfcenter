# AIPD — Contributions à l'analyse du mouvement

Analyse d'impact relative à la protection des données (RGPD, art. 35) du traitement « contributions à l'entraînement des modèles d'analyse du mouvement ». Document de travail rédigé par l'équipe produit : **à faire valider par un juriste ou un DPO avant la mise en production**, puis à reporter dans l'outil PIA de la CNIL si besoin.

| Élément | Valeur |
|---|---|
| Responsable de traitement | KOREV AI (coordonnées : voir mentions légales) |
| Version du texte de consentement | `2026-09-28` (`public.movement_consent_version()`, `MOVEMENT_CONSENT_VERSION`) |
| Implémentation | Migration `20260928100000_movement_contributions.sql`, `src/lib/movement/`, `MovementContributionDialog`, page `/contribution/:token`, rubrique « Mes contributions » du profil |
| Statut | Brouillon, non validé |

## 1. Description du traitement

**Finalité unique :** constituer un jeu de données pour entraîner et évaluer les modèles d'analyse du mouvement de PRISM (détection et qualification des techniques de combat). Aucune autre utilisation : pas de profilage, pas de publicité, pas de revente, pas d'identification des personnes.

**Parcours :**

1. Après une analyse PRISM, l'utilisateur ouvre « Faire progresser PRISM ». Rien n'est calculé ni envoyé avant qu'il ait coché les deux cases (majorité, consentement).
2. Le téléphone extrait le squelette des combattants avec MediaPipe Pose, modèle et moteur servis par l'application (aucun appel à un service tiers). Il travaille à 10 images par seconde, sur 3 minutes au plus.
3. L'utilisateur indique quel squelette est le sien et quel combattant il est dans l'analyse. Il peut valider ou corriger chaque moment et technique repérés par PRISM.
4. Envoi : sa piste, ses verdicts et, s'il invite son partenaire, la piste du partenaire, conservée à part en attente de l'accord de celui-ci.
5. Le partenaire reçoit un lien. Il se connecte ou crée un compte, lit la demande, puis accepte ou refuse. Un refus efface son mouvement immédiatement ; sans réponse sous 14 jours, la purge quotidienne l'efface.

## 2. Données traitées

| Catégorie | Contenu | Personnes |
|---|---|---|
| Squelette | 23 points par image (nez, épaules, coudes, poignets, mains, hanches, genoux, chevilles, pieds) : x, y, z, visibilité, entiers 16 bits. Les points du visage (yeux, oreilles, bouche) sont retirés sur l'appareil. | Contributeur ; partenaire s'il accepte |
| Étiquettes PRISM | Type, horodatage, qualité et personne concernée des moments et techniques, recopiés **côté serveur** depuis l'analyse stockée (jamais fournis par le client) ; sans les descriptions en texte libre. | Contributeur, partenaire |
| Corrections | Verdict « juste / faux / je ne sais pas » par étiquette. | Contributeur |
| Métadonnées | Discipline, cadence, nombre d'images, dates, version du consentement accepté. | Contributeur, partenaire |
| Lien au compte | `user_id` du contributeur, `subject_user_id` de chaque piste. | Contributeur, partenaire |

**Données exclues :** images, vidéo, son, métadonnées de fichier, visage, données de santé du profil (blessures, poids, etc.), texte libre.

**Nature :** ce sont des données personnelles, pseudonymisées au sens de l'art. 4.5 : elles sont rattachées à un compte, et une façon de bouger peut, en théorie, identifier quelqu'un. Il ne s'agit pas de données biométriques au sens de l'art. 9 : aucun traitement ne vise à identifier une personne de manière unique, et le jeu de données ne doit servir à aucun modèle d'identification (engagement repris dans la politique de confidentialité).

## 3. Base légale et conditions

- **Consentement (art. 6.1.a et 7)**, recueilli à chaque contribution :
  - case non précochée, séparée des CGU, texte versionné et horodaté ;
  - refus sans conséquence sur le service ou l'abonnement ;
  - retrait aussi simple que l'accord (un clic dans le profil).
- **Partenaire :** son propre consentement, depuis son compte. Le contributeur ne peut ni l'accepter à sa place ni le refuser pour lui (fonctions `accept_movement_invite` et `decline_movement_invite`, testées).
- **Conservation en attente :** entre l'envoi et la réponse du partenaire, sa piste est conservée sans être utilisée, 14 jours au plus. Base envisagée : intérêt légitime de KOREV AI à permettre au partenaire de décider en connaissance de cause. Mesures : durée courte, effacement immédiat en cas de refus, aucun accès dans l'intervalle. **Point à valider par le juriste.**
- **Mineurs exclus :**
  - le contributeur certifie que lui et toutes les personnes filmées sont majeurs ;
  - le partenaire certifie sa propre majorité ;
  - un profil indiquant un âge inférieur à 18 ans est refusé par le serveur.
- **Licence de droit d'auteur** sur les données partagées : CGU §6, gratuite, non exclusive, limitée à la finalité et à la durée, révocable pour l'avenir.

## 4. Destinataires, hébergement, transferts

- **Stockage :** tables `movement_contributions` et `movement_tracks` chez Supabase (sous-traitant déjà listé). Elles sont fermées à l'API client : tout passe par des fonctions SQL qui vérifient l'identité de l'appelant.
- **Aucun autre destinataire.** Google (Gemini) ne reçoit rien de ces contributions.
- **Tout futur prestataire** d'annotation ou de calcul doit être ajouté à la liste des sous-traitants **avant** tout accès, avec un contrat conforme à l'art. 28, et des clauses contractuelles types s'il est hors UE.
- **Extraction pour entraînement :** à faire uniquement avec le rôle serveur, sans les colonnes `user_id`, `subject_user_id` ni `analysis_id`, en ne gardant que les pistes du contributeur et les pistes de partenaire au statut `consented`.

## 5. Durées de conservation

| Donnée | Durée |
|---|---|
| Contribution et pistes | 3 ans à compter de l'envoi (`expires_at`), puis purge quotidienne `purge_movement_contributions()` |
| Piste d'un partenaire sans réponse | 14 jours (`invite_expires_at`), puis purge |
| Refus ou retrait | Effacement immédiat |
| Suppression de compte | Effacement immédiat (cascade : contributions du compte, et pistes dont il est le sujet) |
| Modèles entraînés | Non ré-entraînés à chaque retrait ; les données retirées sont exclues des entraînements suivants (information donnée aux personnes) |

## 6. Droits des personnes

- **Information :** fenêtre de contribution, page d'invitation, politique de confidentialité §8 (« Contributions à l'analyse du mouvement »).
- **Accès et portabilité :** l'export du profil inclut `movement_contributions` (avec les étiquettes et les corrections) et `movement_tracks` (pistes dont la personne est le sujet).
- **Retrait et effacement :** rubrique « Mes contributions ». Le contributeur retire tout ; le partenaire retire sa piste.
- **Réclamation :** CNIL.

## 7. Risques et mesures

| Risque | Gravité / vraisemblance avant mesures | Mesures | Risque résiduel |
|---|---|---|---|
| Ré-identification d'une personne par son mouvement | Modérée / faible | Pas d'image ni de visage ; aucun modèle d'identification ; extraction sans identifiants ; accès restreint au rôle serveur | Faible |
| Mouvement d'un tiers utilisé sans son accord | Élevée / modérée | Piste du partenaire inutilisée tant qu'il n'a pas accepté depuis son compte ; refus immédiat ; expiration à 14 jours ; lien à usage unique, stocké haché (SHA-256) | Faible |
| Participation d'un mineur | Élevée / faible | Double attestation, refus serveur si le profil indique moins de 18 ans | Faible (attestation déclarative) |
| Consentement non libre ou non éclairé | Modérée / faible | Facultatif, sans effet sur l'offre ; texte court et précis ; version horodatée ; texte modifié = nouvelle version exigée par le serveur | Faible |
| Accès non autorisé aux données | Élevée / faible | Tables fermées au client, fonctions `SECURITY DEFINER` vérifiant l'appelant, contrôles automatisés en CI (`supabase/tests/access_rules.sql`) | Faible |
| Abus (remplissage du stockage) | Faible / modérée | 10 contributions par jour et par compte ; taille exacte des pistes vérifiée (3 000 images au plus par piste) | Faible |
| Détournement de finalité | Élevée / faible | Finalité unique écrite dans les textes et dans ce document ; tout nouvel usage = nouveau consentement | Faible |
| Mauvais suivi des combattants (inversion A/B pendant un corps-à-corps) | Faible (qualité du jeu, pas de risque pour les personnes) | Choix manuel « lequel est toi », taux de détection affiché | Accepté |

## 8. Registre des traitements (entrée à ajouter)

| Rubrique | Contenu |
|---|---|
| Nom | Contributions à l'analyse du mouvement (PRISM) |
| Finalité | Entraînement et évaluation des modèles d'analyse du mouvement |
| Base légale | Consentement (art. 6.1.a) ; intérêt légitime pour la conservation en attente de la réponse du partenaire (14 jours) |
| Personnes | Utilisateurs majeurs contributeurs ; partenaires de sparring majeurs invités |
| Données | Squelettes (23 points, sans visage), étiquettes PRISM, corrections, métadonnées, consentements horodatés |
| Destinataires | KOREV AI ; sous-traitant d'hébergement Supabase |
| Transferts hors UE | Selon la région du projet Supabase, encadrés par les clauses contractuelles types |
| Durées | 3 ans ; 14 jours pour une piste de partenaire sans réponse |
| Sécurité | Tables fermées au client, fonctions contrôlant l'appelant, lien d'invitation haché, purge automatique, tests automatisés |

## 9. Avant la mise en production

- [ ] Validation de ce document et des textes (fenêtre, invitation, politique §8, CGU §6) par un juriste ou un DPO.
- [ ] Entrée ajoutée au registre des traitements.
- [ ] `pg_cron` activé et tâche `purge-movement-contributions` présente (voir `docs/development/DEPLOYMENT.md` §3.1).
- [ ] Région du projet Supabase confirmée et reportée dans la politique de confidentialité.
- [ ] Procédure d'extraction du jeu de données écrite (rôle serveur, sans identifiants, partenaires `consented` uniquement).
