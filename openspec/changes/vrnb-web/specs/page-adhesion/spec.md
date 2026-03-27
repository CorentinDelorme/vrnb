## ADDED Requirements

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
