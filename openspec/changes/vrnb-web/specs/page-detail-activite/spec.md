## ADDED Requirements

### Requirement: Affichage du détail d'une activité

Le système DOIT afficher la page de détail d'une activité à la route `/activites/detail/:id`. Les données DOIVENT être chargées côté serveur depuis la collection `Activites` avec les relations `lieu` (Lieux) et `organisateur` (Users) populées.

#### Scenario: Affichage complet du détail

- **GIVEN** une activité « Balade des marais » le 05/04/2026 à 09:30, ville Bruz, organisée par Jean Dupont, durée 120 min, distance 45 km, lieu de rassemblement « Parking de la mairie »
- **WHEN** un visiteur accède à `/activites/detail/:id`
- **THEN** la page affiche la date « 05/04/2026 », l'heure « 09:30 », le nom « Balade des marais », la ville « Bruz »

#### Scenario: Activité inexistante

- **WHEN** un visiteur accède à `/activites/detail/:id` avec un ID invalide
- **THEN** le système affiche une page 404

### Requirement: Carte organisateur avec lien

Le système DOIT afficher une carte contenant le nom de l'organisateur de l'activité (relation `organisateur` → Users). Le nom de l'organisateur DOIT être un lien cliquable redirigeant vers la page profil de l'utilisateur (`/user/:userId`).

#### Scenario: Affichage de l'organisateur

- **GIVEN** une activité organisée par Jean Dupont (ID « user123 »)
- **WHEN** la page détail est affichée
- **THEN** une carte affiche « Organisateur : Jean Dupont » avec un lien vers `/user/user123`

#### Scenario: Clic sur le lien organisateur

- **WHEN** un visiteur clique sur le nom de l'organisateur
- **THEN** le système navigue vers `/user/user123`

#### Scenario: Pas d'organisateur

- **WHEN** l'activité n'a pas d'organisateur assigné
- **THEN** la carte organisateur affiche « Non assigné » sans lien

### Requirement: Informations complémentaires de l'activité

Le système DOIT afficher dans la page détail : la durée en minutes, la distance en kilomètres, le lieu de rassemblement et les informations de l'activité (`infos_activite`).

#### Scenario: Affichage des informations complémentaires

- **GIVEN** une activité avec durée 120 min, distance 45 km, lieu de rassemblement « Parking de la mairie », info « Prévoir un k-way »
- **WHEN** la page détail est affichée
- **THEN** la page affiche « Durée : 120 min », « Distance : 45 km », « Lieu de rassemblement : Parking de la mairie », et le texte d'info « Prévoir un k-way »

#### Scenario: Champs optionnels non renseignés

- **WHEN** la durée ou la distance ne sont pas renseignées
- **THEN** les champs non renseignés ne sont pas affichés

### Requirement: Titre et textes modifiables

Le titre de la page (ex. « Détail de l'activité ») et les libellés des sections DOIVENT être configurables via Payload CMS.

#### Scenario: Modification du titre via l'admin

- **WHEN** un administrateur modifie le titre de la page détail dans Payload
- **THEN** le nouveau titre est affiché sur la page publique
