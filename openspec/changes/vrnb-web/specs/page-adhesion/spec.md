## ADDED Requirements## ADDED Requirements

- **THEN** les modifications sont reflétées sur la page `/adhesion` au prochain chargement- **WHEN** un administrateur modifie le titre ou la description dans le global Adhesion via le panneau admin#### Scenario: Modification du contenu via l'admin- `description` (richText) : contenu principal de la page (statut des adhésions, informations pratiques, etc.).- `titre` (text, défaut « Adhésion ») : titre de la page.Le système DOIT disposer d'un global Payload `Adhesion` avec les champs suivants :### Requirement: Global Payload Adhesion- **THEN** la page s'affiche normalement sans redirection- **WHEN** un visiteur non connecté accède à `/adhesion`#### Scenario: Accès public- **THEN** le titre affiché est « Adhésion »- **WHEN** aucun titre n'est configuré dans le global Adhesion#### Scenario: Titre par défaut- **AND** la description (richText) configurée dans le global Adhesion est affichée en dessous- **THEN** le titre configuré dans le global Adhesion est affiché- **WHEN** un visiteur accède à `/adhesion`#### Scenario: Affichage de la page AdhésionLe système DOIT afficher une page Adhésion à la route `/adhesion`. Le titre et la description DOIVENT être configurables via un global Payload `Adhesion`. Le titre par défaut est « Adhésion ». La description (richText) permet aux administrateurs d'indiquer le statut des adhésions (ouvertes, clôturées, conditions, etc.). La page est accessible publiquement (sans connexion).### Requirement: Page Adhésion avec titre et description configurables

### Requirement: Page Adhésion avec titre et description configurables

Le système DOIT afficher une page Adhésion à la route `/adhesion`. La page DOIT afficher un titre et une description gérés via un nouveau global Payload `Adhesion`. Le titre par défaut est « Adhésion ». La description (richText) indique le statut des adhésions (ouvertes/clôturées) et les informations utiles pour adhérer. Tous les textes sont modifiables par les administrateurs sans redéploiement.

#### Scenario: Affichage de la page Adhésion

- **WHEN** un visiteur accède à `/adhesion`
- **THEN** le système affiche le titre configuré dans le global Adhesion
- **AND** le système affiche la description (richText) configurée dans le global Adhesion

#### Scenario: Titre par défaut

- **WHEN** aucun titre n'est configuré dans le global Adhesion
- **THEN** le système affiche « Adhésion » comme titre par défaut

#### Scenario: Accès public

- **WHEN** un visiteur non connecté accède à `/adhesion`
- **THEN** la page est affichée normalement (aucune authentification requise)

### Requirement: Global Payload Adhesion

Le système DOIT créer un global Payload `Adhesion` avec les champs suivants :

- `titre` : champ texte (défaut : « Adhésion »)
- `description` : champ richText pour le contenu de la page

#### Scenario: Modification du contenu par un administrateur

- **WHEN** un administrateur modifie le titre ou la description dans le global Adhesion via le panneau admin
- **THEN** les modifications sont visibles sur la page `/adhesion` sans redéploiement
