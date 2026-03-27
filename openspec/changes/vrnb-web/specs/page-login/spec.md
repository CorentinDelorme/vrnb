## ADDED Requirements

### Requirement: Page Connexion avec formulaire d'authentification

Le système DOIT afficher une page de connexion à la route `/login`. La page contient une carte avec le titre « Connectez-vous » et un formulaire d'authentification. La page est accessible publiquement (sans connexion). Si l'utilisateur est déjà connecté, il est redirigé vers `/home`.

#### Scenario: Affichage de la page Connexion

- **WHEN** un visiteur non connecté accède à `/login`
- **THEN** une carte avec le titre « Connectez-vous » est affichée
- **AND** un formulaire avec les champs « Pseudo » et « Mot de passe » est affiché

#### Scenario: Utilisateur déjà connecté

- **WHEN** un utilisateur connecté accède à `/login`
- **THEN** le système redirige vers `/home`

### Requirement: Formulaire de connexion avec pseudo et mot de passe

Le formulaire DOIT contenir un champ « Pseudo » (text, required) et un champ « Mot de passe » (password, required). Le bouton « Se connecter » soumet le formulaire.

#### Scenario: Soumission du formulaire avec des champs valides

- **WHEN** un visiteur saisit un pseudo et un mot de passe valides
- **AND** clique sur « Se connecter »
- **THEN** le système appelle `POST /api/users/login` avec les identifiants
- **AND** l'utilisateur est connecté et redirigé vers `/home`

#### Scenario: Soumission avec des identifiants incorrects

- **WHEN** un visiteur saisit un pseudo ou un mot de passe incorrect
- **AND** clique sur « Se connecter »
- **THEN** un message d'erreur est affiché (ex : « Identifiants incorrects »)
- **AND** l'utilisateur reste sur la page `/login`

#### Scenario: Soumission avec champs vides

- **WHEN** un visiteur tente de soumettre le formulaire avec un champ vide
- **THEN** le formulaire affiche une erreur de validation sur le(s) champ(s) manquant(s)
- **AND** le formulaire n'est pas soumis

### Requirement: Lien Mot de passe oublié

Le formulaire DOIT afficher un lien « Mot de passe oublié » sous les champs du formulaire, redirigeant vers `/oubli-pass`.

#### Scenario: Clic sur Mot de passe oublié

- **WHEN** un visiteur clique sur le lien « Mot de passe oublié »
- **THEN** le système navigue vers `/oubli-pass`

### Requirement: Section Nouveau sur le site

Sous le formulaire de connexion, le système DOIT afficher une section avec le titre « Nouveau sur le site ? » et un bouton « Adhérer à l'association » redirigeant vers `/adhesion`.

#### Scenario: Affichage de la section Nouveau sur le site

- **WHEN** un visiteur non connecté consulte la page `/login`
- **THEN** le titre « Nouveau sur le site ? » est affiché sous le formulaire
- **AND** un bouton « Adhérer à l'association » est affiché

#### Scenario: Clic sur Adhérer à l'association

- **WHEN** un visiteur clique sur le bouton « Adhérer à l'association »
- **THEN** le système navigue vers `/adhesion`

### Requirement: Titre Connectez-vous configurable

Le titre « Connectez-vous » DOIT être configurable via Payload CMS (ex : champ dans un global ou configuration admin). Le titre par défaut est « Connectez-vous ».

#### Scenario: Modification du titre via l'admin

- **WHEN** un administrateur modifie le titre de la page connexion dans Payload
- **THEN** le nouveau titre est affiché sur la page `/login`
