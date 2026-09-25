Cahier des charges — Application "Les Brocanteurs"
Version : 1.0 — MVP Date : Septembre 2026 Statut : Document vivant, à faire évoluer au fil des phases de scale

1. Contexte et vision produit
1.1 Concept
Application mobile combinant deux boucles d'engagement quotidien :

Un feed public avec un Daily Photo Challenge (dimension sociale, acquisition, rétention légère)
Un jeu de groupe privé "Mystery Box" où 3 à 4 joueurs estiment chaque jour le prix d'un objet mystère, cumulent des points, et où le moins bon est exclu en fin de semaine (dimension compétitive, rétention forte)
1.2 Objectif stratégique
Valider une mécanique de jeu social simple et peu coûteuse à développer, avant d'introduire une monétisation native via des partenariats avec des commerçants locaux (réductions offertes au gagnant/groupe), sans jamais faire payer l'utilisateur final dans un premier temps.

1.3 Critères de succès du MVP
Taux de complétion du cycle hebdomadaire Mystery Box (un groupe va jusqu'au bout de la semaine)
Taux de rétention à J7 et J30
Taux de partage des posts viraux de fin de semaine (dans le feed et hors app)
Nombre moyen de groupes rejoués par utilisateur actif
2. Périmètre du MVP
2.1 Fonctionnalités incluses (P0 — indispensables)
#	Fonctionnalité	Description
F1	Authentification	Inscription/connexion par email ou téléphone, choix pseudo + avatar
F2	Feed public	Fil d'actualité affichant les photos du Daily Photo Challenge de tous les utilisateurs
F3	Daily Photo Challenge	Thème du jour envoyé à tous, upload de photo, likes
F4	Formation de groupe	Création/rejoint automatique d'un groupe de 3-4 joueurs (fallback PNJ si pas assez d'inscrits disponibles)
F5	Mystery Box quotidienne	Affichage d'un objet mystère (photo + description), soumission d'une estimation de prix par chaque joueur
F6	Calcul de points	Attribution de points selon l'écart à l'estimation réelle (le plus proche gagne, les autres perdent)
F7	Pouvoir du gagnant du jour	Le joueur le plus proche fixe le prix (ou la nature) du prochain objet
F8	Classement du groupe	Vue des points cumulés sur la semaine en cours
F9	Exclusion hebdomadaire	Calcul automatique du joueur avec le moins de points en fin de semaine, retrait du groupe
F10	Post viral automatique	Génération et publication automatique d'un post résumant le résultat de fin de semaine dans le feed public
F11	Rejouer	Possibilité de rejoindre un nouveau groupe après exclusion ou fin de partie
2.2 Fonctionnalités explicitement exclues du MVP (hors périmètre initial)
Ces éléments sont volontairement reportés pour accélérer la sortie du MVP, mais sont conservés dans ce document pour cadrer les phases de scale ultérieures (voir section 6).

#	Fonctionnalité	Phase prévue
H1	Sponsoring de marques locales / réductions réelles	Phase 2
H2	Système d'affiliation e-commerce (lien Amazon/Vinted)	Phase 2
H3	Abonnement premium (multi-groupes simultanés)	Phase 3
H4	Fonctionnalités de monétisation directe (achats de coins, indices payants)	Phase 3
H5	Commentaires riches / DM entre joueurs	Phase 2
H6	Notifications push avancées et personnalisées	Phase 2
H7	Alliances / mécaniques stratégiques entre joueurs	Phase 3+
H8	Animation soignée de révélation (son, transition premium)	Phase 2
H9	Autres formats de jeu (Tomodachi, Love/Drague) sur la même base technique	Phase 4
H10	Système de badges / gamification du profil	Phase 2
H11	Version web / desktop	Phase 3+
H12	Internationalisation (multi-langue, multi-devise)	Phase 4
3. Parcours utilisateur (User Flow)
Landing → Auth → Feed public
   ├── Daily Photo Challenge (indépendant du groupe)
   │      → Poster une photo → Likes/Commentaires → (Classement optionnel)
   │
   └── "Rejoindre un groupe de brocanteurs"
          → Formation du groupe (3-4 joueurs, PNJ en fallback)
          → Jour 1 à 6 : Mystery Box quotidienne
                → Objet révélé (photo + description)
                → Estimation par chaque joueur
                → Résultat : points gagnés/perdus
                → Le gagnant du jour fixe le prochain objet
          → Fin de semaine : Exclusion
                → Calcul du joueur avec le moins de points
                → Génération du post viral → publication dans le feed public
          → Retour au feed → Rejoindre un nouveau groupe
4. Spécifications des écrans
Écran	Contenu	Priorité
Onboarding / Auth	Inscription, choix pseudo et avatar	P0
Feed public	Liste des photos du challenge du jour, interactions (likes)	P0
Publication photo (challenge)	Accès caméra/galerie, upload, validation	P0
Rejoindre un groupe	Mise en relation automatique ou création de groupe	P0
Mystery Box (jour)	Photo de l'objet + champ de saisie de l'estimation	P0
Résultat du jour	Classement des estimations, points attribués	P0
Classement du groupe (semaine)	Points cumulés, statut de chaque joueur	P1
Résultat de fin de semaine	Annonce de l'exclusion, bouton de partage	P0
Profil utilisateur	Historique des parties, statistiques simples	P1
5. Modèle de données (MVP)
User
 - id, pseudo, avatar_url, created_at

FeedPost (Daily Photo Challenge)
 - id, user_id, photo_url, theme_of_day, likes_count, created_at

Group (Brocanteurs)
 - id, status (active / ended), week_number, created_at

GroupMember
 - group_id, user_id, points, is_npc (bool)

MysteryBox
 - id, group_id, day_number, photo_url, description, real_price, revealed_at

Estimation
 - id, mystery_box_id, user_id, estimated_price, points_earned

WeeklyResult
 - group_id, excluded_user_id, feed_post_id (lien vers le post viral généré)
Note pour le scale (Phase 2) : ce schéma est conçu pour accueillir facilement une table Sponsor (liée à MysteryBox) sans refonte structurelle, afin d'intégrer les partenariats de marques locales.

-- Prévu en Phase 2, à ne pas développer dans le MVP
Sponsor
 - id, nom, logo_url, ville, contact
SponsoredMysteryBox
 - mystery_box_id, sponsor_id, reduction_offerte, code_promo
6. Stack technique recommandée
Choix de plateforme : PWA (Progressive Web App), et non une application mobile native. Ce choix élimine la distribution via App Store/Play Store (pas de délai de validation, itération instantanée) et réduit la friction d'onboarding (accès via simple lien), au prix d'un support notifications/caméra un peu moins abouti sur iOS.

Composant	Choix suggéré	Justification
Frontend	React (ou Vue) + Vite, avec Service Worker pour le mode PWA	Un seul codebase web, installable sans store
Backend + Base de données	Supabase (Postgres + Auth + Realtime)	Auth et temps réel gérés nativement, réduit le temps d'infra
Stockage photos	Supabase Storage ou Cloudinary	Gestion simple des uploads et compression d'images
Accès caméra	<input type="file" capture> ou MediaDevices API	Fonctionne sur la majorité des navigateurs mobiles, UX légèrement moins fluide qu'en natif
Notifications	Web Push API	Fonctionne bien sur Android/Chrome ; support partiel sur iOS Safari (depuis iOS 16.4, nécessite l'ajout à l'écran d'accueil)
Génération du post viral	Template serveur simple	Pas besoin d'IA générative à ce stade
Point de vigilance PWA : guider explicitement l'utilisateur iOS vers l'ajout à l'écran d'accueil dès l'onboarding, afin de fiabiliser la réception des notifications et donc la rétention.

7. Séquence de développement (sprints)
Sprint 1 — Squelette : Authentification + formation de groupe (structure sans logique de jeu avancée)
Sprint 2 — Cœur du jeu : Mystery Box, estimation, calcul de points (sprint le plus critique à valider en priorité)
Sprint 3 — Cycle complet : Exclusion hebdomadaire, génération et publication du post viral
Sprint 4 — Feed public : Daily Photo Challenge (développable en parallèle des sprints 2/3)
Sprint 5 — Polish minimal : Classement, profil, transitions de résultat
Recommandation : valider la mécanique de jeu (Sprint 2) via un test manuel à coût zéro (Google Form + groupe WhatsApp) avant tout développement, afin de confirmer l'intérêt réel des utilisateurs pour l'estimation de prix en groupe.

8. Feuille de route post-MVP (phases de scale)
Cette section sert de socle pour les évolutions futures, afin de réutiliser ce même document au fil de la croissance du produit.

Phase 2 — Monétisation native par les marques locales
Intégration de la table Sponsor et SponsoredMysteryBox
Démarchage de commerçants locaux pour sponsoriser une Mystery Box hebdomadaire
Réduction réelle offerte au gagnant ou au groupe (code promo ou présentation en magasin)
Ajout de commentaires riches et de notifications push ciblées
Système de badges pour renforcer la rétention
Phase 3 — Monétisation directe et rétention avancée
Abonnement premium (rejoindre plusieurs groupes simultanément)
Achats optionnels (indices, estimations supplémentaires) — à concevoir avec prudence pour ne pas casser l'équité du jeu
Version web/desktop complémentaire
Mécaniques d'alliances entre joueurs
Phase 4 — Extension du portefeuille de jeux
Introduction des formats alternatifs déjà envisagés (Tomodachi Game, Love/Drague) sur la même base technique (feed, auth, groupes)
Internationalisation (multi-langue, multi-devise) si expansion hors marché initial
9. Modèle économique
Cette section pose un cadre de réflexion à partir d'hypothèses raisonnables, pas une prévision garantie. Ni revenu ni conversion ne peuvent être confirmés avant test réel avec des utilisateurs actifs.

9.1 Leviers de revenus, par ordre d'activation
Réductions sponsorisées par des commerçants locaux (Phase 2) : le commerçant offre lui-même la réduction au gagnant/groupe ; le revenu pour l'app vient d'un frais de mise en avant payé par le commerçant pour que sa Mystery Box soit sponsorisée une semaine donnée. Ne devient intéressant qu'à partir d'une masse critique de groupes actifs dans une même ville.
Affiliation e-commerce : lien vers Amazon/Vinted/Leboncoin sur l'objet révélé, commission de 3 à 8%. Revenu complémentaire, pas un pilier à lui seul.
Abonnement premium (Phase 3) : ex. 2,99€/mois pour rejoindre plusieurs groupes en simultané. Seul modèle qui scale directement avec la base d'utilisateurs, sans démarchage manuel.
9.2 Simulation à trois échelles (hypothèses prudentes)
Utilisateurs actifs/mois	Sponsoring local	Affiliation	Abonnement (~3% conversion à 2,99€)	Total/mois estimé
500	~0€ (base insuffisante pour convaincre un sponsor)	~20€	~45€	~65€
5 000	~500€ (5-10 sponsors actifs)	~150€	~450€	~1 100€
50 000	~5 000€ (multi-villes)	~1 200€	~4 500€	~10 700€
9.3 Facteurs déterminants
Rétention hebdomadaire : condition nécessaire à tout modèle de revenu, quel qu'il soit
Densité géographique : le sponsoring local exige une concentration d'utilisateurs par ville, pas une base diluée
Coût d'acquisition : une croissance organique (feed viral) maintient la rentabilité même à faible revenu unitaire
9.4 Recommandation
À moins de 5 000 utilisateurs actifs, ce produit doit être considéré comme une validation de concept plutôt qu'une source de revenu significative. Le potentiel financier réel apparaît en combinant volume d'utilisateurs et abonnement ; le sponsoring local reste un revenu d'appoint nécessitant un travail commercial manuel, non un levier scalable à lui seul.

10. Risques identifiés
Risque	Impact	Mitigation
Mécanique de jeu jugée peu engageante	Élevé	Test manuel low-cost avant développement (Sprint 0)
Manque de joueurs réels pour former des groupes	Moyen	Fallback PNJ dès le MVP
Difficulté à obtenir des sponsors locaux en Phase 2	Moyen	Ne démarcher qu'après avoir une base d'utilisateurs identifiable dans une zone géographique donnée
Charge de modération du feed public	Faible à moyen	Prévoir un système de signalement simple dès le MVP
11. Glossaire
Mystery Box : objet mystère quotidien à estimer par les joueurs d'un même groupe
PNJ : joueur non humain généré par le système, utilisé en fallback pour compléter un groupe
Post viral : publication automatique générée par le système à la fin d'un cycle de jeu, destinée à être partagée
Daily Photo Challenge : défi photo quotidien public, indépendant du jeu Mystery Box