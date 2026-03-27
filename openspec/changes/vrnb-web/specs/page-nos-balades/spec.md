## ADDED Requirements

### Requirement: Accès réservé aux adhérents connectés

La page Nos Balades (route `/balades`) DOIT être accessible uniquement aux utilisateurs connectés. Les visiteurs non connectés DOIVENT être redirigés vers `/login`.

#### Scenario: Accès par un adhérent connecté

- **WHEN** un adhérent connecté accède à `/balades`
- **THEN** la page Nos Balades est affichée

#### Scenario: Accès par un visiteur non connecté

- **WHEN** un visiteur non connecté accède à `/balades`
- **THEN** le système redirige vers `/login`

### Requirement: Photo d'en-tête avec texte configurable

Le système DOIT afficher une photo d'en-tête en haut de la page « Nos Balades » avec un texte superposé configurable (par défaut « Nos Balades »). La photo et le texte DOIVENT être modifiables via Payload (global `Home` ou global dédié `NosBalades`).

#### Scenario: Affichage de la photo d'en-tête

- **WHEN** un visiteur accède à la page `/balades`
- **THEN** une photo d'en-tête est affichée avec le texte « Nos Balades » superposé

#### Scenario: Modification du texte d'en-tête via l'admin

- **WHEN** un administrateur modifie le texte d'en-tête dans Payload
- **THEN** le texte superposé sur la photo est mis à jour sur la page publique

### Requirement: Description introductive

Le système DOIT afficher un texte de description sous la photo d'en-tête, configurable via Payload. Ce texte présente la galerie des balades passées de l'association.

#### Scenario: Affichage de la description

- **WHEN** un visiteur accède à la page `/balades`
- **THEN** un texte de description est affiché sous la photo d'en-tête

### Requirement: Cards des activités passées

Le système DOIT afficher les activités passées (date antérieure à aujourd'hui) sous forme de cards triées par date décroissante. Chaque card DOIT afficher : le titre (nom de l'activité), la date, le créateur (organisateur), un extrait de la description (`infos_activite`) et un badge indiquant la catégorie.

#### Scenario: Affichage des cards d'activités passées

- **WHEN** un visiteur accède à la page `/balades`
- **THEN** les activités dont la date est antérieure à aujourd'hui sont affichées sous forme de cards, triées par date décroissante

#### Scenario: Contenu d'une card

- **GIVEN** une activité passée « Balade des marais » du 15/03/2025, organisée par « Jean Dupont », catégorie « Balade du dimanche »
- **WHEN** la page s'affiche
- **THEN** la card affiche le titre « Balade des marais », la date « 15/03/2025 », le créateur « Jean Dupont », un extrait de description et un badge « Balade du dimanche »

#### Scenario: Aucune activité passée

- **WHEN** aucune activité passée n'existe dans la base
- **THEN** un message « Aucune balade passée pour le moment » est affiché

### Requirement: Filtrage par catégorie via composant partagé

Le système DOIT afficher une sidebar de filtres par catégorie dans la partie gauche de la page. Le composant `CategoryFilter` partagé avec la page Programme DOIT être utilisé. Les catégories disponibles sont : **Balade du dimanche**, **Escapade**, **Formations**, **Film documentaire**, **Éco-citoyenneté**, **Longe-côte**, **Réunion**, **Autres**.

#### Scenario: Affichage de la sidebar de filtres

- **WHEN** un visiteur accède à la page `/balades`
- **THEN** une sidebar de filtres par catégorie est affichée à gauche avec les catégories : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres

#### Scenario: Filtrage par une catégorie

- **WHEN** un visiteur sélectionne la catégorie « Escapade »
- **THEN** seules les cards des activités passées de catégorie « Escapade » sont affichées

#### Scenario: Filtrage par plusieurs catégories

- **WHEN** un visiteur sélectionne « Escapade » et « Formations »
- **THEN** les cards des activités passées de catégorie « Escapade » ou « Formations » sont affichées

#### Scenario: Réinitialisation des filtres

- **WHEN** un visiteur désélectionne toutes les catégories
- **THEN** toutes les activités passées sont affichées sans filtrage

### Requirement: Champ de recherche textuelle

Le système DOIT proposer un champ de recherche permettant de filtrer les activités passées par nom ou description côté client.

#### Scenario: Recherche par nom d'activité

- **WHEN** un visiteur saisit « marais » dans le champ de recherche
- **THEN** seules les activités passées dont le nom ou la description contient « marais » sont affichées

### Requirement: Chargement des données côté serveur

Les activités passées DOIVENT être chargées côté serveur (SSR) depuis la collection `Activites` avec un filtre `date_activite < aujourd'hui`, triées par date décroissante. Les relations `organisateur` (Users) et `categories_formation` (CategoriesFormations) DOIVENT être populées (depth).

#### Scenario: Chargement initial des données

- **WHEN** la page `/balades` est chargée
- **THEN** les activités passées sont récupérées côté serveur avec les relations organisateur et catégorie populées
