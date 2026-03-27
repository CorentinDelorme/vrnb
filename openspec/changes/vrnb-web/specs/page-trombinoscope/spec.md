## ADDED Requirements

### Requirement: Accès réservé aux adhérents connectés

La page Trombinoscope (route `/espace-adherent/trombinoscope`) DOIT être accessible uniquement aux utilisateurs connectés. Les visiteurs non connectés DOIVENT être redirigés vers la page de connexion.

#### Scenario: Accès par un adhérent connecté

- **WHEN** un adhérent connecté accède à `/espace-adherent/trombinoscope`
- **THEN** la page Trombinoscope est affichée

#### Scenario: Accès par un visiteur non connecté

- **WHEN** un visiteur non connecté accède à `/espace-adherent/trombinoscope`
- **THEN** le système redirige vers `/login`

### Requirement: Titre de la page

Le système DOIT afficher un titre « Trombinoscope » en haut de la page.

#### Scenario: Affichage du titre

- **WHEN** un adhérent connecté accède à la page Trombinoscope
- **THEN** le titre « Trombinoscope » est affiché en haut de la page

### Requirement: Cartes des adhérents

Le système DOIT afficher une carte pour chaque adhérent actif. Chaque carte DOIT contenir : le rôle (issu de la relation `bureau` — ex. Président, Secrétaire, Trésorier, Adhérent, etc.), le prénom suivi du NOM en majuscules, et une photo optionnelle.

Les rôles bureau possibles sont : **Président**, **Trésorier**, **Secrétaire**, **Vice-Président**, **Vice-Secrétaire**, **Vice-Trésorier**, **Adhérent**, **Secrétaire-Comptable**, **Logistique**, **Référent des Référents**.

#### Scenario: Affichage d'une carte adhérent avec rôle bureau

- **GIVEN** un adhérent « Jean DUPONT » avec le rôle bureau « Président » et une photo de profil
- **WHEN** la page Trombinoscope est affichée
- **THEN** une carte affiche le rôle « Président », le nom « Jean DUPONT » et sa photo de profil

#### Scenario: Affichage d'une carte adhérent sans photo

- **GIVEN** un adhérent « Marie MARTIN » avec le rôle bureau « Adhérent » sans photo
- **WHEN** la page Trombinoscope est affichée
- **THEN** une carte affiche le rôle « Adhérent », le nom « Marie MARTIN » et un avatar par défaut

#### Scenario: Format du nom — NOM en majuscules

- **GIVEN** un adhérent avec prénom « jean » et nom « dupont »
- **WHEN** la carte est affichée
- **THEN** le nom est affiché sous la forme « Jean DUPONT » (prénom capitalisé, nom en majuscules)

#### Scenario: Adhérent sans rôle bureau

- **GIVEN** un adhérent sans relation `bureau`
- **WHEN** la carte est affichée
- **THEN** le rôle affiché est « Adhérent » par défaut

### Requirement: Tri des cartes par rôle

Le système DOIT trier les cartes en priorisant les membres du bureau (Président en premier, puis les autres rôles du bureau), puis les adhérents simples par ordre alphabétique.

#### Scenario: Ordre d'affichage des cartes

- **GIVEN** des adhérents avec les rôles Président, Secrétaire, Adhérent (x3)
- **WHEN** la page Trombinoscope est affichée
- **THEN** les cartes sont affichées dans l'ordre : Président, Secrétaire, puis les adhérents par ordre alphabétique

### Requirement: Chargement des données côté serveur

Les données des adhérents DOIVENT être chargées côté serveur depuis la collection `Users` avec les relations `bureau` (Bureaux) populées (depth). La photo de profil est un champ upload vers Media.

#### Scenario: Chargement initial

- **WHEN** la page Trombinoscope est chargée
- **THEN** les utilisateurs sont récupérés côté serveur avec la relation bureau populée
