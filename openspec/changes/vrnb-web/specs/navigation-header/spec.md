## ADDED Requirements

### Requirement: Logo VRNB à gauche du header

Le header DOIT afficher le logo de l'association VRNB à gauche. Le logo DOIT être configurable via le global Home (champ upload logo). Le logo DOIT être cliquable et rediriger vers `/home`.

#### Scenario: Affichage du logo dans le header

- **WHEN** un visiteur accède à n'importe quelle page du site
- **THEN** le logo VRNB est affiché à gauche du header

#### Scenario: Clic sur le logo

- **WHEN** un visiteur clique sur le logo VRNB dans le header
- **THEN** le système navigue vers `/home`

#### Scenario: Logo non configuré

- **WHEN** aucun logo n'est uploadé dans le global Home
- **THEN** un texte « VRNB » est affiché à la place du logo

### Requirement: Header avec navigation principale

Le système DOIT afficher un header persistant sur toutes les pages du site avec les menus de navigation suivants : « Accueil », « Association », « Activités », « Nos Balades », « Programme », « Documentation », « Espace Adhérent » et « Profil ».

#### Scenario: Affichage du header sur chaque page

- **WHEN** un visiteur accède à n'importe quelle page du site
- **THEN** le header avec les menus de navigation est affiché

#### Scenario: Navigation vers l'accueil

- **WHEN** un visiteur clique sur le menu « Accueil »
- **THEN** le système navigue vers la page d'accueil (`/home`)

### Requirement: Sous-menu Association

Le menu « Association » DOIT contenir trois sous-menus : « Présentation », « Organisation » et « Référents ». Le sous-menu DOIT s'afficher au survol ou au clic sur « Association ».

#### Scenario: Affichage du sous-menu Association

- **WHEN** un visiteur survole ou clique sur le menu « Association »
- **THEN** le sous-menu affiche les entrées « Présentation », « Organisation » et « Référents »

#### Scenario: Navigation vers Présentation

- **WHEN** un visiteur clique sur « Présentation » dans le sous-menu
- **THEN** le système navigue vers `/association/presentation`

#### Scenario: Navigation vers Organisation

- **WHEN** un visiteur clique sur « Organisation » dans le sous-menu
- **THEN** le système navigue vers `/association/organisation`

#### Scenario: Navigation vers Référents

- **WHEN** un visiteur clique sur « Référents » dans le sous-menu
- **THEN** le système navigue vers `/association/referents`

### Requirement: Sous-menu Activités

Le menu « Activités » DOIT contenir cinq sous-menus : « Randonnées à vélo », « Formations », « Projections de films », « Éco citoyenneté » et « Autres activités de plein air ». Le sous-menu DOIT s'afficher au survol ou au clic sur « Activités ».

#### Scenario: Affichage du sous-menu Activités

- **WHEN** un visiteur survole ou clique sur le menu « Activités »
- **THEN** le sous-menu affiche les entrées « Randonnées à vélo », « Formations », « Projections de films », « Éco citoyenneté » et « Autres activités de plein air »

#### Scenario: Navigation vers Randonnées à vélo

- **WHEN** un visiteur clique sur « Randonnées à vélo » dans le sous-menu
- **THEN** le système navigue vers `/activites/randonnees-velo`

#### Scenario: Navigation vers Formations

- **WHEN** un visiteur clique sur « Formations » dans le sous-menu
- **THEN** le système navigue vers `/activites/formations`

#### Scenario: Navigation vers Projections de films

- **WHEN** un visiteur clique sur « Projections de films » dans le sous-menu
- **THEN** le système navigue vers `/activites/projections-films`

#### Scenario: Navigation vers Éco citoyenneté

- **WHEN** un visiteur clique sur « Éco citoyenneté » dans le sous-menu
- **THEN** le système navigue vers `/activites/eco-citoyennete`

#### Scenario: Navigation vers Autres activités de plein air

- **WHEN** un visiteur clique sur « Autres activités de plein air » dans le sous-menu
- **THEN** le système navigue vers `/activites/autres-plein-air`

### Requirement: Menu Programme

Le menu « Programme » DOIT naviguer vers la page programme des activités.

#### Scenario: Navigation vers Programme

- **WHEN** un visiteur clique sur le menu « Programme »
- **THEN** le système navigue vers `/programme`

### Requirement: Menu Documentation

Le menu « Documentation » DOIT naviguer vers la page de documentation.

#### Scenario: Navigation vers Documentation

- **WHEN** un visiteur clique sur le menu « Documentation »
- **THEN** le système navigue vers `/documentation`

### Requirement: Menu Nos Balades

Le menu « Nos Balades » DOIT naviguer vers la page galerie des balades passées.

#### Scenario: Navigation vers Nos Balades

- **WHEN** un visiteur clique sur le menu « Nos Balades »
- **THEN** le système navigue vers `/nos-balades`

### Requirement: Sous-menu Espace Adhérent

Le menu « Espace Adhérent » DOIT contenir un sous-menu « Trombinoscope ». Le sous-menu DOIT s'afficher au survol ou au clic sur « Espace Adhérent ». Ce menu n'est visible que pour les utilisateurs connectés.

#### Scenario: Affichage du sous-menu Espace Adhérent

- **WHEN** un adhérent connecté survole ou clique sur le menu « Espace Adhérent »
- **THEN** le sous-menu affiche l'entrée « Trombinoscope »

#### Scenario: Navigation vers Trombinoscope

- **WHEN** un adhérent connecté clique sur « Trombinoscope » dans le sous-menu
- **THEN** le système navigue vers `/espace-adherent/trombinoscope`

#### Scenario: Menu Espace Adhérent non visible pour les visiteurs non connectés

- **WHEN** un visiteur non connecté consulte le header
- **THEN** le menu « Espace Adhérent » n'est pas affiché

### Requirement: Menu Profil

Le menu « Profil » DOIT naviguer vers la page de profil de l'adhérent connecté. Ce menu n'est visible que pour les utilisateurs connectés.

#### Scenario: Navigation vers Profil

- **WHEN** un adhérent connecté clique sur le menu « Profil »
- **THEN** le système navigue vers `/profil`

#### Scenario: Menu Profil non visible pour les visiteurs non connectés

- **WHEN** un visiteur non connecté consulte le header
- **THEN** le menu « Profil » n'est pas affiché

### Requirement: Indicateur de page active

Le système DOIT indiquer visuellement le menu ou sous-menu correspondant à la page actuellement visitée.

#### Scenario: Menu actif sur la page d'accueil

- **WHEN** un visiteur est sur la page d'accueil
- **THEN** le menu « Accueil » est visuellement mis en évidence

#### Scenario: Sous-menu actif sur une page association

- **WHEN** un visiteur est sur la page Organisation
- **THEN** le menu « Association » et le sous-menu « Organisation » sont visuellement mis en évidence

#### Scenario: Sous-menu actif sur une page activités

- **WHEN** un visiteur est sur la page Formations
- **THEN** le menu « Activités » et le sous-menu « Formations » sont visuellement mis en évidence

#### Scenario: Menu actif sur la page Nos Balades

- **WHEN** un visiteur est sur la page Nos Balades
- **THEN** le menu « Nos Balades » est visuellement mis en évidence

#### Scenario: Sous-menu actif sur la page Trombinoscope

- **WHEN** un adhérent connecté est sur la page Trombinoscope
- **THEN** le menu « Espace Adhérent » et le sous-menu « Trombinoscope » sont visuellement mis en évidence

#### Scenario: Menu actif sur la page Profil

- **WHEN** un adhérent connecté est sur la page Profil
- **THEN** le menu « Profil » est visuellement mis en évidence

### Requirement: Bouton Déconnexion à droite du header

Le header DOIT afficher un bouton « Déconnexion » à droite, visible uniquement pour les utilisateurs connectés. Le bouton DOIT appeler `POST /api/users/logout` et rediriger vers `/home`.

#### Scenario: Affichage du bouton Déconnexion

- **WHEN** un adhérent connecté consulte le header
- **THEN** un bouton « Déconnexion » est affiché à droite du header

#### Scenario: Clic sur Déconnexion

- **WHEN** un adhérent connecté clique sur le bouton « Déconnexion »
- **THEN** le système appelle `POST /api/users/logout`, déconnecte l'utilisateur et redirige vers `/home`

#### Scenario: Bouton Déconnexion non visible pour les visiteurs non connectés

- **WHEN** un visiteur non connecté consulte le header
- **THEN** le bouton « Déconnexion » n'est pas affiché

### Requirement: Footer avec liens de navigation et copyright

Le système DOIT afficher un footer persistant sous le carousel des partenaires avec trois liens de navigation et un copyright. Les liens DOIVENT être : « Qui sommes-nous ? » (`/association/presentation`), « Mentions légales » (`/mentionslegales`), « Contact » (`/contact`). Le copyright « ©2026 VRNB » DOIT être affiché à droite.

#### Scenario: Affichage des liens du footer

- **WHEN** un visiteur accède à n'importe quelle page du site
- **THEN** le footer affiche les liens « Qui sommes-nous ? », « Mentions légales » et « Contact »

#### Scenario: Navigation vers Qui sommes-nous

- **WHEN** un visiteur clique sur « Qui sommes-nous ? » dans le footer
- **THEN** le système navigue vers `/association/presentation`

#### Scenario: Navigation vers Mentions légales

- **WHEN** un visiteur clique sur « Mentions légales » dans le footer
- **THEN** le système navigue vers `/mentionslegales`

#### Scenario: Navigation vers Contact

- **WHEN** un visiteur clique sur « Contact » dans le footer
- **THEN** le système navigue vers `/contact`

#### Scenario: Affichage du copyright

- **WHEN** un visiteur accède à n'importe quelle page du site
- **THEN** le texte « ©2026 VRNB » est affiché à droite dans le footer
