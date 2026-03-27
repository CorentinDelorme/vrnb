## ADDED Requirements

### Requirement: Affichage de la liste des référents

Le système DOIT afficher sur la page Référents la liste de tous les référents de l'association avec les membres associés à chaque référent. Les référents DOIVENT être triés par le champ `ordre` de la collection Referents.

#### Scenario: Affichage des référents

- **WHEN** un visiteur accède à la page `/referents`
- **THEN** le système affiche la liste des référents (Site Web, Logistique, Mécanique, Navigation GPS, etc.) avec les noms des membres associés

#### Scenario: Référent sans membre associé

- **WHEN** un référent n'a aucun membre associé
- **THEN** le référent est affiché sans mention de membre

#### Scenario: Données dynamiques depuis l'admin

- **WHEN** un administrateur ajoute ou modifie un référent ou change les utilisateurs associés
- **THEN** la page Référents reflète les modifications sans redéploiement

### Requirement: Détail de chaque référent

Le système DOIT afficher pour chaque référent : le nom du référent et la liste des membres (nom + prénom) associés à ce référent.

#### Scenario: Référent avec un seul membre

- **WHEN** le référent « Site Web » est associé à un seul utilisateur
- **THEN** la page affiche « Site Web » suivi du nom et prénom de l'utilisateur

#### Scenario: Référent avec plusieurs membres

- **WHEN** le référent « Logistique » est associé à plusieurs utilisateurs
- **THEN** la page affiche « Logistique » suivi de la liste des noms et prénoms des utilisateurs
