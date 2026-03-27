## ADDED Requirements

### Requirement: Accès réservé aux adhérents connectés

La page Documentation (route `/documentation`) DOIT être accessible uniquement aux utilisateurs connectés. Les visiteurs non connectés DOIVENT être redirigés vers `/login`.

#### Scenario: Accès par un adhérent connecté

- **WHEN** un adhérent connecté accède à `/documentation`
- **THEN** la page Documentation est affichée

#### Scenario: Accès par un visiteur non connecté

- **WHEN** un visiteur non connecté accède à `/documentation`
- **THEN** le système redirige vers `/login`

### Requirement: Liste des documentations en cartes

Le système DOIT afficher sur la page Documentation (`/documentation`) les documentations de l'association sous forme de cartes. Chaque carte DOIT contenir : le titre, la description (intro), le nom de la catégorie (relation vers `Categories`), la date de création et l'auteur. Les documentations proviennent de la collection `Documentations`.

#### Scenario: Affichage de la liste des documentations en cartes

- **WHEN** un visiteur accède à la page `/documentation`
- **THEN** le système affiche les documentations sous forme de cartes, chacune contenant le titre, la description, la catégorie, la date de création et l'auteur

#### Scenario: Contenu d'une carte documentation

- **GIVEN** une documentation « Voyager en train avec son vélo » par « Jean Dupont », catégorie « Transport », créée le 01/02/2026
- **WHEN** la page Documentation est affichée
- **THEN** une carte affiche le titre « Voyager en train avec son vélo », l'auteur « Jean Dupont », la catégorie « Transport », la date « 01/02/2026 » et un extrait de la description

#### Scenario: Aucune documentation disponible

- **WHEN** aucune documentation n'est enregistrée dans la collection
- **THEN** la page affiche un message indiquant qu'aucune documentation n'est disponible

### Requirement: Sidebar de filtres par catégorie (composant partagé)

Le système DOIT afficher à gauche des cartes une sidebar de filtres utilisant le composant partagé `CategoryFilter` (commun avec les pages Programme et Nos Balades). Le filtrage des documentations DOIT se faire côté client par catégorie.

#### Scenario: Affichage de la sidebar de filtres

- **WHEN** un visiteur accède à la page `/documentation`
- **THEN** une sidebar de filtres par catégorie est affichée à gauche des cartes

#### Scenario: Filtrage par une catégorie

- **WHEN** un visiteur sélectionne une catégorie dans le filtre
- **THEN** seules les cartes de documentations appartenant à cette catégorie sont affichées

#### Scenario: Filtrage par plusieurs catégories

- **WHEN** un visiteur sélectionne plusieurs catégories
- **THEN** les cartes des documentations appartenant à l'une des catégories sélectionnées sont affichées

#### Scenario: Réinitialisation des filtres

- **WHEN** un visiteur désélectionne toutes les catégories
- **THEN** toutes les documentations sont affichées sans filtrage

### Requirement: Recherche textuelle des documentations

Le système DOIT proposer un champ de recherche dans la sidebar permettant de filtrer les documentations par titre ou auteur côté client. La recherche DOIT être combinable avec le filtre par catégorie.

#### Scenario: Recherche par titre

- **WHEN** un visiteur saisit « vélo » dans le champ de recherche
- **THEN** seules les documentations dont le titre ou l'auteur contient « vélo » sont affichées

#### Scenario: Recherche combinée avec filtre catégorie

- **WHEN** un visiteur saisit un texte et sélectionne une catégorie
- **THEN** seules les documentations correspondant aux deux critères sont affichées

### Requirement: Détail d'une documentation

Le système DOIT permettre de consulter le détail d'une documentation en cliquant sur sa carte. Le détail DOIT afficher : le titre, l'auteur, la date de création, l'introduction, les paragraphes de contenu (richText), les images et les liens PDF le cas échéant.

#### Scenario: Affichage complet d'une documentation

- **WHEN** un visiteur clique sur une carte de documentation
- **THEN** le système affiche le titre, l'auteur, la date, l'introduction, les paragraphes, les images et les liens PDF

#### Scenario: Données dynamiques depuis l'admin

- **WHEN** un administrateur ajoute ou modifie une documentation via le panneau admin
- **THEN** la page Documentation reflète les modifications sans redéploiement

### Requirement: Chargement des données côté serveur

Les documentations DOIVENT être chargées côté serveur (SSR) depuis la collection `Documentations` avec les relations `categorie` (Categories) populées (depth).

#### Scenario: Chargement initial

- **WHEN** la page `/documentation` est chargée
- **THEN** les documentations sont récupérées côté serveur avec la relation catégorie populée
