## ADDED Requirements

### Requirement: Header avec navigation principale

Le système DOIT afficher un header persistant sur toutes les pages du site avec les menus de navigation suivants : « Accueil », « Association », « Activités », « Programme » et « Documentation ».

#### Scenario: Affichage du header sur chaque page

- **WHEN** un visiteur accède à n'importe quelle page du site
- **THEN** le header avec les menus de navigation est affiché

#### Scenario: Navigation vers l'accueil

- **WHEN** un visiteur clique sur le menu « Accueil »
- **THEN** le système navigue vers la page d'accueil (`/`)

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
