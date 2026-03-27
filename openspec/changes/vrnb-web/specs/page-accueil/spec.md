## ADDED Requirements

### Requirement: Section présentation de l'association

Le système DOIT afficher sur la page d'accueil un titre « Présentation » et une description de l'association Vélo Rando Nature Bruz. Le titre et la description DOIVENT être modifiables via le panneau admin (global Home).

#### Scenario: Affichage de la présentation

- **WHEN** un visiteur accède à la page d'accueil
- **THEN** le système affiche le titre de présentation et la description de l'association

#### Scenario: Modification de la présentation via l'admin

- **WHEN** un administrateur modifie le titre ou la description dans le global Home
- **THEN** les modifications sont immédiatement visibles sur la page d'accueil

### Requirement: Carte Google Maps de localisation

Le système DOIT afficher une carte Google Maps intégrée (iframe) sur la page d'accueil pour montrer la localisation de l'association. L'URL de la carte DOIT être configurable via le panneau admin.

#### Scenario: Affichage de la carte Google Maps

- **WHEN** un visiteur accède à la page d'accueil
- **THEN** le système affiche une carte Google Maps avec la localisation de l'association

#### Scenario: Carte non configurée

- **WHEN** l'URL Google Maps n'est pas renseignée dans l'admin
- **THEN** la section carte n'est pas affichée

### Requirement: Cards activités et devises

Le système DOIT afficher des cards sur la page d'accueil présentant ce que propose l'association et ses devises. Chaque card DOIT contenir un titre et une description. Les cards DOIVENT être gérables via le panneau admin (tableau répétable dans le global Home).

#### Scenario: Affichage des cards

- **WHEN** un visiteur accède à la page d'accueil
- **THEN** le système affiche les cards avec les activités et devises de l'association

#### Scenario: Aucune card configurée

- **WHEN** aucune card n'est définie dans l'admin
- **THEN** la section cards n'est pas affichée

#### Scenario: Ajout d'une card via l'admin

- **WHEN** un administrateur ajoute une card avec un titre et une description dans le global Home
- **THEN** la nouvelle card apparaît sur la page d'accueil

### Requirement: Documents PDF statut et charte

Le système DOIT permettre d'afficher sur la page d'accueil des liens vers le statut de l'association et la charte de l'association au format PDF. Les fichiers PDF DOIVENT être uploadés via le panneau admin (champs upload dans le global Home).

#### Scenario: Téléchargement du statut PDF

- **WHEN** un visiteur clique sur le lien « Statut de l'association »
- **THEN** le navigateur télécharge ou ouvre le fichier PDF du statut

#### Scenario: Téléchargement de la charte PDF

- **WHEN** un visiteur clique sur le lien « Charte de l'association »
- **THEN** le navigateur télécharge ou ouvre le fichier PDF de la charte

#### Scenario: PDF non uploadé

- **WHEN** un des PDFs n'est pas uploadé dans l'admin
- **THEN** le lien correspondant n'est pas affiché

### Requirement: Carousel des partenaires dans le footer

Le système DOIT afficher un carousel dans le footer de la page d'accueil avec la liste des partenaires. Chaque partenaire DOIT afficher une image (logo), le nom et un lien vers le site du partenaire. Les partenaires DOIVENT être triés par le champ `ordre`.

#### Scenario: Affichage du carousel partenaires

- **WHEN** un visiteur accède à la page d'accueil
- **THEN** le footer affiche un carousel défilant avec les logos, noms et liens des partenaires

#### Scenario: Clic sur un partenaire

- **WHEN** un visiteur clique sur un partenaire dans le carousel
- **THEN** le navigateur ouvre le site du partenaire dans un nouvel onglet

#### Scenario: Aucun partenaire

- **WHEN** aucun partenaire n'est enregistré
- **THEN** le carousel n'est pas affiché
