## ADDED Requirements

### Requirement: Header avec navigation principale

Le système DOIT afficher un header persistant sur toutes les pages du site avec les menus de navigation suivants : « Accueil », « Association » et « Documentation ».

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
