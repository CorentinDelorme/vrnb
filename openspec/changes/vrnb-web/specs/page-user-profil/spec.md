## ADDED Requirements

### Requirement: Page profil public d'un utilisateur

Le système DOIT afficher le profil public d'un utilisateur à la route `/user/:id`. Les données DOIVENT être chargées côté serveur depuis la collection `Users` avec les relations `bureau` (Bureaux) et `referents` (Referents) populées.

#### Scenario: Affichage du profil public

- **GIVEN** un utilisateur « Jean Dupont » avec le rôle bureau « Président » et une photo de profil
- **WHEN** un visiteur accède à `/user/:id`
- **THEN** la page affiche le prénom « Jean », le nom « DUPONT » (en majuscules), le rôle « Président » et la photo de profil

#### Scenario: Utilisateur sans photo

- **GIVEN** un utilisateur sans photo de profil
- **WHEN** la page profil est affichée
- **THEN** un avatar par défaut est affiché

#### Scenario: Utilisateur inexistant

- **WHEN** un visiteur accède à `/user/:id` avec un ID invalide
- **THEN** le système affiche une page 404

### Requirement: Informations affichées

Le profil public DOIT afficher : prénom, NOM (en majuscules), rôle bureau (si disponible), photo optionnelle et liste des référents (si disponibles).

#### Scenario: Utilisateur avec référents

- **GIVEN** un utilisateur avec les référents « Site web » et « Mécanique »
- **WHEN** la page profil est affichée
- **THEN** les référents « Site web » et « Mécanique » sont affichés

#### Scenario: Utilisateur sans rôle bureau ni référent

- **GIVEN** un utilisateur simple sans bureau ni référent
- **WHEN** la page profil est affichée
- **THEN** le rôle affiché est « Adhérent » et la section référents n'est pas affichée
