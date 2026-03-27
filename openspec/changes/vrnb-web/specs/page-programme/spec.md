## ADDED Requirements

### Requirement: Photo d'en-tête du programme

Le système DOIT afficher une photo d'en-tête en haut de la page Programme. Cette photo DOIT être configurable via le panneau admin.

#### Scenario: Affichage de la photo d'en-tête

- **WHEN** un visiteur accède à la page `/programme`
- **THEN** le système affiche la photo d'en-tête du programme

#### Scenario: Photo non configurée

- **WHEN** aucune photo d'en-tête n'est configurée
- **THEN** la section photo n'est pas affichée

### Requirement: Tableau des activités à venir

Le système DOIT afficher un tableau des activités à venir triées par date croissante. Le tableau DOIT contenir les colonnes : date, nom, catégorie, ville et actions. Seules les activités avec une date future ou égale à aujourd'hui DOIVENT être affichées.

#### Scenario: Affichage du tableau des activités à venir

- **WHEN** un visiteur accède à la page Programme
- **THEN** le système affiche un tableau avec les activités à venir triées par date croissante

#### Scenario: Colonnes du tableau

- **WHEN** le tableau des activités est affiché
- **THEN** il contient les colonnes date, nom, catégorie (depuis `categories_formation.libelle`), ville (depuis `lieu.nom_ville`) et actions

#### Scenario: Aucune activité à venir

- **WHEN** aucune activité n'a de date future
- **THEN** le tableau affiche un message indiquant qu'aucune activité n'est programmée

### Requirement: Sidebar de filtres avec catégories (composant partagé)

Le système DOIT afficher à gauche du tableau une sidebar de filtres utilisant le composant partagé `CategoryFilter` (commun avec la page Nos Balades). Ce composant affiche des checkboxes pour les catégories, un champ de recherche textuel et un bouton « Filtrer ». Les catégories fixes sont : **Balade du dimanche**, **Escapade**, **Formations**, **Film documentaire**, **Éco-citoyenneté**, **Longe-côte**, **Réunion**, **Autres**.

#### Scenario: Affichage des filtres par catégorie

- **WHEN** un visiteur accède à la page Programme
- **THEN** la sidebar affiche les catégories suivantes avec des cases à cocher : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres

#### Scenario: Affichage du champ de recherche

- **WHEN** un visiteur accède à la page Programme
- **THEN** la sidebar affiche un champ de recherche textuel

#### Scenario: Affichage du bouton Filtrer

- **WHEN** un visiteur accède à la page Programme
- **THEN** la sidebar affiche un bouton « Filtrer »

### Requirement: Filtrage des activités par catégorie

Le système DOIT permettre de filtrer les activités affichées dans le tableau en cochant une ou plusieurs catégories et en cliquant sur le bouton « Filtrer ».

#### Scenario: Filtrage par une catégorie

- **WHEN** un visiteur coche une catégorie et clique sur « Filtrer »
- **THEN** le tableau affiche uniquement les activités de cette catégorie

#### Scenario: Filtrage par plusieurs catégories

- **WHEN** un visiteur coche plusieurs catégories et clique sur « Filtrer »
- **THEN** le tableau affiche les activités appartenant à l'une des catégories sélectionnées

#### Scenario: Aucun filtre sélectionné

- **WHEN** un visiteur clique sur « Filtrer » sans cocher de catégorie
- **THEN** le tableau affiche toutes les activités à venir

### Requirement: Recherche textuelle des activités

Le système DOIT permettre de filtrer les activités par recherche textuelle sur le nom de l'activité. La recherche DOIT être combinable avec les filtres par catégorie.

#### Scenario: Recherche par nom

- **WHEN** un visiteur saisit un texte dans le champ de recherche et clique sur « Filtrer »
- **THEN** le tableau affiche uniquement les activités dont le nom contient le texte saisi (insensible à la casse)

#### Scenario: Recherche combinée avec filtre catégorie

- **WHEN** un visiteur saisit un texte et coche une catégorie puis clique sur « Filtrer »
- **THEN** le tableau affiche les activités correspondant aux deux critères
