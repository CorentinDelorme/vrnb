## ADDED Requirements

### Requirement: Pages activités par type

Le système DOIT fournir une page dédiée pour chaque type d'activité : Randonnées à vélo, Formations, Projections de films, Éco citoyenneté et Autres activités de plein air. Chaque page DOIT afficher un titre et une description provenant de la collection ActivitesContent.

#### Scenario: Affichage de la page Randonnées à vélo

- **WHEN** un visiteur accède à `/activites/randonnees-velo`
- **THEN** le système affiche le titre et la description des randonnées à vélo depuis ActivitesContent

#### Scenario: Affichage de la page Formations

- **WHEN** un visiteur accède à `/activites/formations`
- **THEN** le système affiche le titre et la description des formations depuis ActivitesContent

#### Scenario: Affichage de la page Projections de films

- **WHEN** un visiteur accède à `/activites/projections-films`
- **THEN** le système affiche le titre et la description des projections de films depuis ActivitesContent

#### Scenario: Affichage de la page Éco citoyenneté

- **WHEN** un visiteur accède à `/activites/eco-citoyennete`
- **THEN** le système affiche le titre et la description de l'éco citoyenneté depuis ActivitesContent

#### Scenario: Affichage de la page Autres activités de plein air

- **WHEN** un visiteur accède à `/activites/autres-plein-air`
- **THEN** le système affiche le titre et la description des autres activités depuis ActivitesContent

### Requirement: Cards d'activités avec layout trois colonnes

Chaque page activité DOIT afficher des cards avec un layout en trois colonnes : le nom de la card à gauche, la description au milieu, et une photo optionnelle à droite. Les données des cards proviennent des champs `*_title`, `*_text` et `*_photo` de la collection ActivitesContent.

#### Scenario: Affichage d'une card avec photo

- **WHEN** une card d'activité a un titre, une description et une photo renseignés
- **THEN** la card affiche le nom à gauche, la description au milieu et la photo à droite

#### Scenario: Affichage d'une card sans photo

- **WHEN** une card d'activité a un titre et une description mais pas de photo
- **THEN** la card affiche le nom à gauche et la description au milieu, sans espace photo

#### Scenario: Aucune card configurée

- **WHEN** les champs de la collection ActivitesContent sont vides pour un type d'activité
- **THEN** la page affiche uniquement le titre et la description introductive sans cards

### Requirement: Contenu dynamique depuis l'admin

Le contenu des pages activités DOIT être modifiable via le panneau admin Payload en éditant la collection ActivitesContent, sans nécessiter de redéploiement.

#### Scenario: Modification du contenu d'une activité

- **WHEN** un administrateur modifie le titre, la description ou la photo d'un type d'activité dans ActivitesContent
- **THEN** les modifications sont immédiatement visibles sur la page activité correspondante
