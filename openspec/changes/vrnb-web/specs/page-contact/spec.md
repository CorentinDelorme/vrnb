## ADDED Requirements

### Requirement: Carte « Nous contacter »

Le système DOIT afficher sur la page `/contact` une carte avec le titre « Nous contacter ». Le titre DOIT être configurable via Payload CMS (global `Contact`).

#### Scenario: Affichage de la carte

- **WHEN** un visiteur accède à `/contact`
- **THEN** une carte avec le titre « Nous contacter » est affichée

### Requirement: Formulaire de contact

Le système DOIT afficher dans la carte un formulaire avec trois champs obligatoires : « Nom et prénom » (text, required), « Email » (email, required) et « Message » (textarea, required). Le formulaire NE DOIT PAS pouvoir être soumis si un ou plusieurs champs sont vides.

#### Scenario: Affichage du formulaire

- **WHEN** un visiteur accède à `/contact`
- **THEN** le formulaire affiche les champs « Nom et prénom », « Email » et « Message »

#### Scenario: Champs obligatoires

- **WHEN** un visiteur tente d'envoyer le formulaire sans remplir tous les champs
- **THEN** un message d'erreur de validation est affiché pour les champs manquants

#### Scenario: Validation email

- **WHEN** un visiteur saisit une adresse email invalide
- **THEN** un message d'erreur indique que l'email est invalide

### Requirement: Bouton Envoyer

Le formulaire DOIT contenir un bouton « Envoyer » qui soumet le formulaire. En cas de succès, un message de confirmation DOIT être affiché.

#### Scenario: Envoi réussi

- **WHEN** un visiteur remplit correctement le formulaire et clique sur « Envoyer »
- **THEN** le formulaire est soumis et un message « Message envoyé avec succès » est affiché

#### Scenario: Erreur d'envoi

- **WHEN** l'envoi du formulaire échoue
- **THEN** un message d'erreur « Erreur lors de l'envoi du message » est affiché

### Requirement: Bouton Retour

Le formulaire DOIT contenir un bouton « Retour » qui redirige vers la page d'accueil `/home`.

#### Scenario: Clic sur Retour

- **WHEN** un visiteur clique sur le bouton « Retour »
- **THEN** le système navigue vers `/home`

### Requirement: Texte d'introduction configurable

Un texte d'introduction optionnel au-dessus du formulaire DOIT être configurable via le global `Contact` dans Payload.

#### Scenario: Affichage du texte d'introduction

- **WHEN** un texte d'introduction est configuré dans le global Contact
- **THEN** le texte est affiché au-dessus du formulaire

#### Scenario: Texte non configuré

- **WHEN** aucun texte d'introduction n'est configuré
- **THEN** seul le formulaire est affiché sous le titre

### Requirement: Création du global Contact

Un nouveau global Payload `Contact` DOIT être créé avec les champs suivants : titre (text, par défaut « Nous contacter ») et texte d'introduction (richText, optionnel).

#### Scenario: Global Contact dans l'admin

- **WHEN** un administrateur accède au global Contact dans le panneau admin
- **THEN** il peut modifier le titre et le texte d'introduction
