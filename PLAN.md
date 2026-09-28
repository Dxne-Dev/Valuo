Analyse du MVP.md et des compétences disponibles

  Après avoir analysé le cahier des charges MVP.md et les compétences UI  
  disponibles (better-ui et emil-design-eng), voici mon plan de
  développement structuré pour créer une application qui non seulement    
  fonctionne mais qui "fait vraiment bien".

  Phase Fondamentale : Architecture et Core Gameplay (Sprints 1-2)        

  Objectif: Établir la mécanique de jeu core qui détermine le succès ou   
  l'échec du produit

  Semaine 1: Fondation Technique

  - Setup initial: React + Vite + Supabase (PWA configuration)
  - Authentification basique: Email/téléphone avec pseudo + avatar (F1)   
  - Structure de données: Modélisation des tables Supabase selon le MVP.md  - Service Worker: Configuration PWA de base pour le mode PWA

  Application des compétences UI:
  - Depuis emil-design-eng: Commencer avec des bases solides - pas        
  d'animation sur les actions fréquentes (auth, navigation)
  - Depuis better-ui: Utiliser transition: transform 160ms ease-out pour  
  les états de bouton actifs

  Semaine 2: Core Gameplay Loop (SPRINT LE PLUS CRITIQUE)

  - Formation de groupe: Création/rejoint automatique de groupes 3-4      
  joueurs avec fallback PNJ (F4)
  - Mystery Box quotidienne: Affichage objet mystère + champ estimation   
  (F5)
  - Calcul de points: Attribution selon écart à l'estimation réelle (F6)  
  - Pouvoir du gagnant: Le joueur le plus proche fixe le prochain objet   
  (F7)
  - Classement du groupe: Vue points cumulés hebdomadaire (F8)

  Application des compétences UI:
  - Animation Decision Framework (emil-design-eng):
    - Mystère Box reveal: Occasionnel → peut ajouter du delight
    - Bouton de soumission: Feedback immédiat avec scale(0.97) sur :active    - Transition de résultat: Durée 200-300ms max avec ease-out
    - Jamais d'animation sur les actions fréquentes comme la saisie       
  d'estimation
  - Better-ui principles:
    - Concentric border radius sur les cartes Mystery Box
    - Contextual icon animations pour les likes/validation
    - Image outlines sur les photos d'objets (1px oklch(0 0 0 / 0.1) en   
  light mode)
    - Will-change: transform uniquement sur les éléments qui en ont besoin
  Phase Complétion du Cycle (Sprint 3)

  Objectif: Boucler l'expérience hebdomadaire complète

  Semaine 3: Fin de Semaine et Viralité

  - Exclusion hebdomadaire: Calcul automatique du joueur avec moins de    
  points (F9)
  - Post viral automatique: Génération et publication dans le feed public 
  (F10)
  - Rejouer: Possibilité de rejoindre un nouveau groupe (F11)
  - Feed public: Intégration basique du Daily Photo Challenge (F2, F3)    

  Application des compétences UI:
  - Subtle exit animations (better-ui): Pour l'exclusion du groupe,       
  utiliser translateY petit plutôt que full height
  - Contextual icon animations (better-ui): Pour les icônes de partage du 
  post viral
  - Interruptible animations (better-ui): Transitions CSS pour les états  
  de groupe (rejoindre/quitter)
  - Motion restraint (emil-design-eng): Pas d'animation sur le feed qui se  met à jour fréquemment

  Phase Polish et Rétention (Sprint 4-5)

  Objectif: Raffiner l'expérience pour maximiser l'engagement

  Semaine 4: Feed Social et Photo Challenge

  - Daily Photo Challenge complet: Thème du jour, upload, likes (F2, F3)  
  - Interactions feed: Likes basiques, éventuellement commentaires simples  - Optimisation performance: Lazy loading des images, compression        

  Application des compétences UI:
  - Image outlines (better-ui): Sur toutes les photos du feed
  - Scale on press (better-ui): scale(0.96) sur les boutons like
  - Skip animation on page load (better-ui): initial={false} sur
  AnimatePresence
  - Suppress transitions on theme switch (better-ui): Préparer pour le    
  mode sombre futur

  Semaine 5: Classement, Profil et Transitions

  - Classement du groupe détaillé: Points cumulés, statut joueurs (F7, F8)  - Profil utilisateur: Historique parties, statistiques simples (F14)    
  - Transitions de résultat: Animations de victoire/défaite
  - Optimisations finales: Taille bundle, performance

  Application des compétences UI:
  - Stagger Animations (emil-design-eng): Pour l'affichage du classement  
  (30-80ms entre items)
  - Spring Animations (emil-design-eng): Pour les célébrations de victoire  (rare/first-time → peut ajouter du delight)
  - Gesture and Drag Interactions (emil-design-eng): Pour potentiellement 
  permettre de rejouer par swipe
  - Perfection du timing: Asymmetric enter/exit timing - lent pour les    
  décisions (choisir groupe), rapide pour les réponses système

  Principes Directeurs Tirés des Compétences

  De emil-design-eng:

  1. Taste is trained, not invisible: Chaque décision UI doit être        
  intentionnelle
  2. Unseen details compound: Les bordures concentriques, le matching     
  d'icon stroke au text weight, les transform-origin corrects
  3. Beauty is leverage: Utiliser l'animation comme différenciateur, pas  
  juste comme décor
  4. Animation Decision Framework: Toujours demander "should this animate 
  at all?" avant d'animer
  5. Component Building Principles: Boutons réactifs, pas de scale(0),    
  popovers origin-aware, tooltips intelligents

  De better-ui:

  1. Concentric border radius: Outer = inner + padding partout
  2. Optical over geometric alignment: Ajuster manuellement quand le      
  centrage géométrique semble faux
  3. Shadows for elevation, borders for structure: Éviter les bordures    
  purement décoratives
  4. Interruptible animations: CSS transitions > keyframes pour l'UI      
  interactive
  5. Subtle exit animations: Plus doux que les entrées
  6. Contextual icon animations: Animer avec opacity, scale, blur (pas    
  visibility toggle)
  7. Image outlines: 1px oklch(0 0 0 / 0.1) en light, oklch(1 0 0 / 0.1)  
  en dark
  8. Scale on press: Toujours 0.96 pour le feedback tactile
  9. Skip animation on page load: initial={false} sur AnimatePresence     
  10. Suppress transitions on theme switch: Technique spécifique pour     
  éviter le smearing

  Métriques de Succès à Mesurer

  Conformément au MVP.md, suivre:
  - Taux de complétion du cycle hebdomadaire Mystery Box
  - Taux de rétention à J7 et J30
  - Taux de partage des posts viraux
  - Nombre moyen de groupes rejoués par utilisateur actif

  Approche de Validation Précoce

  Comme recommandé en section 7 du MVP.md: Valider la mécanique de jeu via  un test manuel à coût zéro (Google Form + groupe WhatsApp) avant tout   
  développement pour confirmer l'intérêt réel des utilisateurs pour       
  l'estimation de prix en groupe.

  Stack Technique Conformément au MVP.md

  - Frontend: React + Vite avec Service Worker pour PWA
  - Backend + Base de données: Supabase (Postgres + Auth + Realtime)      
  - Stockage photos: Supabase Storage
  - Accès caméra: <input type="file" capture> ou MediaDevices API
  - Notifications: Web Push API
  - Génération du post viral: Template serveur simple

  Ce plan garantit que nous construirons non seulement une application    
  fonctionnelle, mais une expérience qui utilise les principes de design  
  engineering les plus avancés pour créer quelque chose qui "fait vraiment  bien" dès les premières interactions.