## ADDED Requirements

### Requirement: Gestion des référents

Le système DOIT fournir une interface CRUD dans le panneau admin pour gérer les référents de l'association. Chaque référent possède un nom et un ordre d'affichage.

#### Scenario: Création d'un référent

- **WHEN** un administrateur crée un nouveau référent avec un nom et un ordre
- **THEN** le référent est enregistré et apparaît dans la liste des référents

#### Scenario: Modification d'un référent

- **WHEN** un administrateur modifie le nom ou l'ordre d'un référent existant
- **THEN** les modifications sont enregistrées

#### Scenario: Suppression d'un référent

- **WHEN** un administrateur supprime un référent
- **THEN** le référent est supprimé de la base de données

### Requirement: Gestion du bureau

Le système DOIT fournir une interface CRUD dans le panneau admin pour gérer les postes du bureau (Président, Trésorier, Secrétaire, etc.). Chaque poste possède un nom et un ordre d'affichage.

#### Scenario: Création d'un poste de bureau

- **WHEN** un administrateur crée un nouveau poste de bureau avec un nom et un ordre
- **THEN** le poste est enregistré et apparaît dans la liste

#### Scenario: Modification d'un poste de bureau

- **WHEN** un administrateur modifie le nom ou l'ordre d'un poste de bureau
- **THEN** les modifications sont enregistrées

#### Scenario: Suppression d'un poste de bureau

- **WHEN** un administrateur supprime un poste de bureau
- **THEN** le poste est retiré de la base de données

### Requirement: Gestion des activités

Le système DOIT fournir une interface CRUD dans le panneau admin pour gérer les activités. Chaque activité possède : nom, date, durée, distance, dénivelé, difficulté, informations complémentaires, nombre total de participants, un état (ouverte, finie, annulée, modifiée), un lieu, un organisateur et des participants.

#### Scenario: Création d'une activité

- **WHEN** un administrateur crée une activité avec les champs requis (nom, date, état, lieu, organisateur)
- **THEN** l'activité est enregistrée et visible dans le panneau admin

#### Scenario: Modification d'une activité

- **WHEN** un administrateur modifie les informations d'une activité existante
- **THEN** les modifications sont enregistrées

#### Scenario: Ajout de participants à une activité

- **WHEN** un administrateur ajoute des adhérents comme participants d'une activité
- **THEN** les adhérents sont associés à l'activité via la relation many-to-many

#### Scenario: Suppression d'une activité

- **WHEN** un administrateur supprime une activité
- **THEN** l'activité est retirée de la base de données

### Requirement: Gestion des partenaires

Le système DOIT fournir une interface CRUD dans le panneau admin pour gérer les partenaires de l'association. Chaque partenaire possède : un ordre d'affichage, un nom, un lien (URL du site web) et un logo (upload d'image).

#### Scenario: Création d'un partenaire

- **WHEN** un administrateur crée un partenaire avec nom, lien et logo
- **THEN** le partenaire est enregistré avec son logo uploadé

#### Scenario: Modification d'un partenaire

- **WHEN** un administrateur modifie les informations d'un partenaire
- **THEN** les modifications sont enregistrées

#### Scenario: Suppression d'un partenaire

- **WHEN** un administrateur supprime un partenaire
- **THEN** le partenaire et son logo sont retirés

### Requirement: Gestion des actualités

Le système DOIT fournir une interface CRUD dans le panneau admin pour gérer les actualités. Chaque actualité possède : un texte, une date de publication, un indicateur d'affichage et une URL optionnelle.

#### Scenario: Création d'une actualité

- **WHEN** un administrateur crée une actualité avec un texte et une date
- **THEN** l'actualité est enregistrée et affichable sur le site

#### Scenario: Modification d'une actualité

- **WHEN** un administrateur modifie le texte ou la date d'une actualité
- **THEN** les modifications sont enregistrées

#### Scenario: Masquer une actualité

- **WHEN** un administrateur désactive l'indicateur d'affichage d'une actualité
- **THEN** l'actualité n'est plus visible sur le site public

#### Scenario: Suppression d'une actualité

- **WHEN** un administrateur supprime une actualité
- **THEN** l'actualité est retirée de la base de données

### Requirement: Gestion du contenu sans redéploiement

Le système DOIT permettre aux administrateurs de modifier tout le contenu (référents, bureau, activités, partenaires, actualités, adhérents) directement via le panneau Payload sans nécessiter de redéploiement de l'application.

#### Scenario: Modification de contenu en production

- **WHEN** un administrateur modifie du contenu via le panneau admin en production
- **THEN** les modifications sont immédiatement visibles sur le site public sans redéploiement
