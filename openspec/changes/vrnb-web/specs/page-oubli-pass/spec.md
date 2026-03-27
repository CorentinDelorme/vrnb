## ADDED Requirements

### Requirement: Page Mot de passe oublié avec formulaire email

Le système DOIT afficher une page de réinitialisation de mot de passe à la route `/oubli-pass`. La page contient un titre « Réinitialisation du mot de passe » (configurable via Payload CMS) et un formulaire avec un champ email. La page est accessible publiquement (sans connexion).

#### Scenario: Affichage de la page Mot de passe oublié

- **WHEN** un visiteur accède à `/oubli-pass`
- **THEN** le titre « Réinitialisation du mot de passe » est affiché
- **AND** un formulaire avec un champ « Email » et un bouton « Envoyer » est affiché

#### Scenario: Titre configurable

- **WHEN** un administrateur modifie le titre de la page dans Payload CMS
- **THEN** le nouveau titre est affiché sur la page `/oubli-pass`

### Requirement: Formulaire de réinitialisation avec champ email

Le formulaire DOIT contenir un champ « Email » (email, required, validation format email) et un bouton « Envoyer ».

#### Scenario: Soumission avec un email valide

- **WHEN** un visiteur saisit une adresse email valide
- **AND** clique sur « Envoyer »
- **THEN** le système appelle `POST /api/users/forgot-password` avec l'email
- **AND** un message de confirmation est affiché (ex : « Si cette adresse existe, un email de réinitialisation a été envoyé »)

#### Scenario: Soumission avec un email invalide

- **WHEN** un visiteur saisit un texte qui n'est pas un format email valide
- **AND** tente de soumettre le formulaire
- **THEN** le formulaire affiche une erreur de validation sur le champ email
- **AND** le formulaire n'est pas soumis

#### Scenario: Soumission avec champ vide

- **WHEN** un visiteur tente de soumettre le formulaire avec le champ email vide
- **THEN** le formulaire affiche une erreur de validation indiquant que le champ est obligatoire
- **AND** le formulaire n'est pas soumis

#### Scenario: Email non trouvé

- **WHEN** un visiteur saisit une adresse email qui n'existe pas dans le système
- **AND** clique sur « Envoyer »
- **THEN** le même message de confirmation est affiché (pour ne pas révéler si l'email existe)

### Requirement: Lien retour vers la connexion

La page DOIT afficher un lien « Retour à la connexion » redirigeant vers `/login`.

#### Scenario: Clic sur Retour à la connexion

- **WHEN** un visiteur clique sur le lien « Retour à la connexion »
- **THEN** le système navigue vers `/login`
