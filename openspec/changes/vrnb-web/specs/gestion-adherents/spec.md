## ADDED Requirements

### Requirement: Inscription des adhérents

Le système DOIT permettre aux utilisateurs de créer un compte adhérent avec les champs obligatoires : email (unique), nom d'utilisateur (unique), nom et prénom. Les champs optionnels sont : téléphone et date de naissance.

#### Scenario: Création d'un compte adhérent

- **WHEN** un visiteur remplit le formulaire d'inscription avec email, nom d'utilisateur, nom, prénom et mot de passe
- **THEN** le système crée un compte utilisateur et l'adhérent peut se connecter

#### Scenario: Email déjà utilisé

- **WHEN** un visiteur tente de s'inscrire avec un email déjà existant
- **THEN** le système refuse l'inscription et affiche un message d'erreur

#### Scenario: Nom d'utilisateur déjà pris

- **WHEN** un visiteur tente de s'inscrire avec un nom d'utilisateur déjà existant
- **THEN** le système refuse l'inscription et affiche un message d'erreur

### Requirement: Connexion des adhérents

Le système DOIT permettre aux adhérents de se connecter avec leur email et mot de passe via l'authentification Payload.

#### Scenario: Connexion réussie

- **WHEN** un adhérent saisit un email et mot de passe valides
- **THEN** le système authentifie l'utilisateur et lui retourne un token JWT

#### Scenario: Identifiants incorrects

- **WHEN** un adhérent saisit un email ou mot de passe invalide
- **THEN** le système refuse la connexion et retourne une erreur

### Requirement: Restriction d'accès au panneau admin

Le système DOIT empêcher les adhérents standard d'accéder au panneau d'administration Payload. Seuls les utilisateurs ayant le référent « site web » DOIVENT pouvoir accéder à l'interface admin.

#### Scenario: Adhérent sans référent « site web » tente d'accéder à l'admin

- **WHEN** un adhérent connecté sans le référent « site web » tente d'accéder à `/admin`
- **THEN** le système refuse l'accès et redirige vers la page de connexion admin

#### Scenario: Utilisateur avec référent « site web » accède à l'admin

- **WHEN** un utilisateur connecté ayant le référent « site web » accède à `/admin`
- **THEN** le système autorise l'accès au panneau d'administration

#### Scenario: Utilisateur sans authentification tente d'accéder à l'admin

- **WHEN** un visiteur non connecté tente d'accéder à `/admin`
- **THEN** le système affiche la page de connexion admin

### Requirement: Profil utilisateur avec associations

Le système DOIT permettre d'associer un utilisateur à un poste de bureau (relation unique) et à plusieurs référents (relation multiple).

#### Scenario: Association d'un utilisateur à un poste de bureau

- **WHEN** un administrateur assigne un poste de bureau à un utilisateur via l'admin
- **THEN** l'utilisateur est associé à ce poste de bureau

#### Scenario: Association d'un utilisateur à des référents

- **WHEN** un administrateur assigne un ou plusieurs référents à un utilisateur via l'admin
- **THEN** l'utilisateur est associé aux référents sélectionnés
