## ADDED Requirements

### Requirement: Accès réservé aux adhérents connectés

La page Profil (route `/profil`) DOIT être accessible uniquement aux utilisateurs connectés. Les visiteurs non connectés DOIVENT être redirigés vers la page de connexion.

#### Scenario: Accès par un adhérent connecté

- **WHEN** un adhérent connecté accède à `/profil`
- **THEN** la page Profil est affichée

#### Scenario: Accès par un visiteur non connecté

- **WHEN** un visiteur non connecté accède à `/profil`
- **THEN** le système redirige vers la page de connexion

### Requirement: Titre de la page

Le système DOIT afficher le titre « Mon profil » en haut de la page.

#### Scenario: Affichage du titre

- **WHEN** un adhérent connecté accède à la page Profil
- **THEN** le titre « Mon profil » est affiché en haut de la page

### Requirement: Carte d'informations personnelles

Le système DOIT afficher une carte contenant les informations de l'utilisateur connecté :

- **Pseudo** : champ `username`
- **Rôle** : libellé issu de la relation `bureau` (ex. Président, Adhérent)
- **Bureau** : nom du bureau si membre du bureau
- **Référent** : liste des référents associés (relation `referents`)
- **Nom** : champ `nom`
- **Prénom** : champ `prenom`
- **Téléphone** : champ `telephone`
- **Email** : champ `email`
- **Date de naissance** : champ `date_naissance`

#### Scenario: Affichage des informations complètes

- **GIVEN** un adhérent « jdupont » avec nom « Dupont », prénom « Jean », email « jean@example.com », téléphone « 0612345678 », date de naissance « 01/01/1980 », bureau « Président », référent « Site web »
- **WHEN** la page Profil est affichée
- **THEN** la carte affiche : Pseudo « jdupont », Rôle « Président », Bureau « Président », Référent « Site web », Nom « Dupont », Prénom « Jean », Téléphone « 0612345678 », Email « jean@example.com », Date de naissance « 01/01/1980 »

#### Scenario: Adhérent sans rôle bureau ni référent

- **GIVEN** un adhérent sans relation `bureau` ni `referents`
- **WHEN** la page Profil est affichée
- **THEN** les champs Rôle, Bureau et Référent affichent « — » ou sont masqués

### Requirement: Bouton Modifier

Le système DOIT afficher un bouton « Modifier » permettant à l'adhérent de basculer en mode édition pour mettre à jour ses informations personnelles.

#### Scenario: Clic sur le bouton Modifier

- **WHEN** un adhérent clique sur le bouton « Modifier »
- **THEN** les champs éditables (pseudo, nom, prénom, téléphone, date de naissance) passent en mode formulaire

#### Scenario: Champs non éditables

- **WHEN** le formulaire d'édition est affiché
- **THEN** les champs email, rôle bureau et référents ne sont PAS modifiables (lecture seule)

### Requirement: Sauvegarde des modifications

Le système DOIT enregistrer les modifications de profil via l'API REST Payload (`PATCH /api/users/:id`).

#### Scenario: Sauvegarde réussie

- **WHEN** un adhérent modifie son prénom et clique sur « Enregistrer »
- **THEN** le système envoie une requête `PATCH /api/users/:id` avec les champs modifiés
- **AND** un message de confirmation « Profil mis à jour » est affiché
- **AND** la carte repasse en mode lecture avec les nouvelles valeurs

#### Scenario: Erreur de sauvegarde

- **WHEN** la requête de sauvegarde échoue
- **THEN** un message d'erreur « Erreur lors de la mise à jour du profil » est affiché
- **AND** les valeurs du formulaire sont conservées

### Requirement: Chargement des données

Les données du profil DOIVENT être chargées depuis l'utilisateur connecté (session Payload) avec les relations `bureau` (Bureaux) et `referents` (Referents) populées.

#### Scenario: Chargement initial

- **WHEN** la page Profil est chargée
- **THEN** les informations de l'utilisateur connecté sont affichées avec les relations bureau et référents populées
