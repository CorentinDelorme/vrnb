## ADDED Requirements

### Requirement: Liste des documentations

Le système DOIT afficher sur la page Documentation la liste des documentations de l'association provenant de la collection Documentations. Les documentations couvrent des sujets comme voyager en train avec son vélo, livres sur le vélo, équipements et sécurité, comment circuler à vélo, etc.

#### Scenario: Affichage de la liste des documentations

- **WHEN** un visiteur accède à la page `/documentation`
- **THEN** le système affiche la liste des documentations avec le titre, l'auteur et l'introduction de chaque documentation

#### Scenario: Aucune documentation disponible

- **WHEN** aucune documentation n'est enregistrée dans la collection
- **THEN** la page affiche un message indiquant qu'aucune documentation n'est disponible

### Requirement: Documentations groupées par catégorie

Le système DOIT afficher les documentations groupées par leur catégorie (relation vers la collection Categories). Chaque groupe DOIT afficher le nom de la catégorie en titre de section.

#### Scenario: Affichage par catégorie

- **WHEN** un visiteur accède à la page Documentation et des documentations ont des catégories assignées
- **THEN** les documentations sont regroupées sous le libellé de leur catégorie

#### Scenario: Documentation sans catégorie

- **WHEN** une documentation n'a pas de catégorie assignée
- **THEN** elle est affichée dans un groupe « Divers » ou « Non classé »

### Requirement: Détail d'une documentation

Le système DOIT afficher pour chaque documentation : le titre, l'auteur, la date de création, l'introduction, les paragraphes de contenu (richText), les images et les liens PDF le cas échéant.

#### Scenario: Affichage complet d'une documentation

- **WHEN** un visiteur consulte une documentation
- **THEN** le système affiche le titre, l'auteur, la date, l'introduction, les paragraphes, les images et les liens PDF

#### Scenario: Données dynamiques depuis l'admin

- **WHEN** un administrateur ajoute ou modifie une documentation via le panneau admin
- **THEN** la page Documentation reflète les modifications sans redéploiement
