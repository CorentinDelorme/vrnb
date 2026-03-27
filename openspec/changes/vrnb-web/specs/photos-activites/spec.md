## ADDED Requirements

### Requirement: Upload de photos pour les activités

Le système DOIT permettre aux administrateurs d'uploader des photos et de les associer à des activités via des albums photo. Chaque album photo contient une image, une URL optionnelle et une relation vers une activité.

#### Scenario: Upload d'une photo dans un album d'activité

- **WHEN** un administrateur uploade une image et l'associe à une activité via un album photo
- **THEN** la photo est stockée sur le serveur et liée à l'activité

#### Scenario: Consultation des photos d'une activité

- **WHEN** un visiteur consulte la page d'une activité ayant des photos
- **THEN** le système affiche les photos associées via les albums photo

#### Scenario: Suppression d'une photo d'album

- **WHEN** un administrateur supprime un album photo
- **THEN** la référence entre la photo et l'activité est supprimée

### Requirement: Gestion des photos utilisateur

Le système DOIT permettre de gérer des photos associées aux adhérents. Chaque photo possède un nom et une relation vers un utilisateur.

#### Scenario: Ajout d'une photo utilisateur

- **WHEN** un administrateur ajoute une photo associée à un adhérent
- **THEN** la photo est enregistrée avec la relation vers l'utilisateur

#### Scenario: Suppression d'une photo utilisateur

- **WHEN** un administrateur supprime une photo utilisateur
- **THEN** la photo est retirée de la base de données

### Requirement: Traitement des images uploadées

Le système DOIT traiter les images uploadées avec sharp pour le redimensionnement et l'optimisation. Les images DOIVENT être stockées dans le dossier `media/` de l'application.

#### Scenario: Upload d'une image avec redimensionnement

- **WHEN** un administrateur uploade une image de grande taille
- **THEN** le système redimensionne l'image via sharp et stocke les différentes tailles

#### Scenario: Stockage persistant des images

- **WHEN** une image est uploadée
- **THEN** le fichier est stocké dans le dossier `media/` et reste accessible après un redémarrage de l'application
