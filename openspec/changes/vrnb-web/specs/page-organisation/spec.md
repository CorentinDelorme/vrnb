## ADDED Requirements

### Requirement: Affichage des membres du bureau

Le système DOIT afficher sur la page Organisation la liste des postes du bureau de l'association avec les membres associés. Les postes DOIVENT être triés par le champ `ordre` de la collection Bureaux.

#### Scenario: Affichage de l'organisation

- **WHEN** un visiteur accède à la page `/organisation`
- **THEN** le système affiche la liste des postes du bureau (Président, Secrétaire, Trésorier, etc.) avec le nom et prénom des membres associés

#### Scenario: Poste non attribué

- **WHEN** un poste de bureau n'a aucun membre associé
- **THEN** le poste est affiché sans mention de membre

#### Scenario: Données dynamiques depuis l'admin

- **WHEN** un administrateur ajoute ou modifie un poste de bureau ou change l'utilisateur associé
- **THEN** la page Organisation reflète les modifications sans redéploiement

### Requirement: Détail de chaque poste du bureau

Le système DOIT afficher pour chaque poste du bureau : le nom du poste et le nom complet (nom + prénom) du membre occupant ce poste.

#### Scenario: Affichage d'un poste avec membre

- **WHEN** le poste « Président » est attribué à un utilisateur
- **THEN** la page affiche « Président » suivi du nom et prénom de l'utilisateur

#### Scenario: Affichage de multiples postes

- **WHEN** plusieurs postes sont définis dans l'admin
- **THEN** tous les postes sont affichés dans l'ordre défini par le champ `ordre`
