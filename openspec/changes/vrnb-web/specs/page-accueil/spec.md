## ADDED Requirements

### Requirement: Logo VRNB en haut de page

Le système DOIT afficher le logo VRNB en haut de la page d'accueil (`/home`). Le logo DOIT être un upload configurable via le global Home dans Payload.

#### Scenario: Affichage du logo

- **WHEN** un visiteur accède à `/home`
- **THEN** le logo VRNB est affiché en haut de la page

#### Scenario: Logo non configuré

- **WHEN** aucun logo n'est uploadé dans le global Home
- **THEN** la section logo n'est pas affichée

### Requirement: Grande carte des prochaines balades

Le système DOIT afficher une grande carte contenant à l'intérieur deux cartes des deux prochaines balades (activités à venir). Chaque carte de balade DOIT afficher : la date, le titre (nom de l'activité), le lieu et l'heure du rendez-vous. Les balades sont chargées dynamiquement depuis la collection `Activites` (date >= aujourd'hui, triées par date croissante, limit 2). Les relations `lieu` (Lieux) DOIVENT être populées.

#### Scenario: Affichage des 2 prochaines balades

- **GIVEN** 3 activités à venir : « Balade des marais » le 05/04/2026 à Bruz, « Escapade Rennes » le 12/04/2026 à Rennes, « Formation sécurité » le 20/04/2026
- **WHEN** un visiteur accède à `/home`
- **THEN** la grande carte affiche deux cartes : « Balade des marais » (date, titre, lieu Bruz, heure RDV) et « Escapade Rennes » (date, titre, lieu Rennes, heure RDV)

#### Scenario: Une seule activité à venir

- **GIVEN** une seule activité à venir
- **WHEN** un visiteur accède à `/home`
- **THEN** la grande carte affiche une seule carte de balade

#### Scenario: Aucune activité à venir

- **GIVEN** aucune activité à venir
- **WHEN** un visiteur accède à `/home`
- **THEN** la grande carte affiche un message indiquant qu'aucune balade n'est prévue

### Requirement: Compteur d'événements à venir avec lien

Dans la grande carte, sous les deux cartes de balades, le système DOIT afficher le texte « À noter sur vos agendas : » suivi du nombre total d'événements à venir. Ce nombre DOIT être un lien cliquable redirigeant vers la page Activités (`/activites`).

#### Scenario: Affichage du compteur d'événements

- **GIVEN** 15 activités à venir dans la base
- **WHEN** un visiteur accède à `/home`
- **THEN** le texte « À noter sur vos agendas : 15 événements à venir » est affiché dans la grande carte, le nombre étant un lien vers `/activites`

#### Scenario: Clic sur le nombre d'événements

- **WHEN** un visiteur clique sur le nombre d'événements
- **THEN** le système navigue vers `/activites`

#### Scenario: Aucun événement à venir

- **GIVEN** aucune activité à venir
- **WHEN** un visiteur accède à `/home`
- **THEN** le texte « À noter sur vos agendas : 0 événement à venir » est affiché

### Requirement: Premier texte configurable

Sous la grande carte, le système DOIT afficher un texte configurable (richText). Ce texte DOIT être modifiable via le global Home dans Payload.

#### Scenario: Affichage du premier texte configurable

- **WHEN** un visiteur accède à `/home`
- **THEN** le premier texte configurable est affiché sous la grande carte

#### Scenario: Texte non configuré

- **WHEN** le champ richText n'est pas rempli dans l'admin
- **THEN** la section texte n'est pas affichée

### Requirement: Carousel de photos auto-scroll

Sous le premier texte configurable, le système DOIT afficher un carousel de photos avec défilement automatique. Les photos DOIVENT être gérées via un tableau d'uploads (relation vers Media) dans le global Home.

#### Scenario: Affichage du carousel de photos

- **WHEN** un visiteur accède à `/home` et que des photos sont configurées
- **THEN** un carousel affiche les photos avec un défilement automatique

#### Scenario: Défilement automatique

- **WHEN** le carousel est affiché
- **THEN** les photos défilent automatiquement sans intervention de l'utilisateur

#### Scenario: Aucune photo configurée

- **WHEN** aucune photo n'est uploadée dans le global Home
- **THEN** le carousel n'est pas affiché

### Requirement: Deuxième texte configurable

Sous le carousel de photos, le système DOIT afficher un deuxième texte configurable (richText) modifiable via le global Home.

#### Scenario: Affichage du deuxième texte configurable

- **WHEN** un visiteur accède à `/home`
- **THEN** le deuxième texte configurable est affiché sous le carousel

### Requirement: Bloc titre et texte modifiables

Sous le deuxième texte configurable, le système DOIT afficher un bloc contenant un titre modifiable et un texte modifiable en dessous. Les deux champs DOIVENT être configurables via le global Home (champ titre text + champ contenu richText).

#### Scenario: Affichage du bloc titre + texte

- **WHEN** un visiteur accède à `/home` et que le bloc est configuré
- **THEN** le titre est affiché suivi du texte en dessous

#### Scenario: Bloc non configuré

- **WHEN** ni le titre ni le texte ne sont remplis dans l'admin
- **THEN** la section bloc n'est pas affichée

### Requirement: Photos des 4 activités cliquables avec hover overlay

Sous le bloc titre/texte, le système DOIT afficher 4 photos avec au milieu de chaque photo un titre superposé. Les photos DOIVENT être cliquables et rediriger vers la page de l'activité correspondante. Les 4 activités correspondent aux quatre premières entrées du sous-menu Activités dans le header : **Randonnées à vélo** (`/randosvelo`), **Formations** (`/formations`), **Projections de films** (`/projections`), **Éco citoyenneté** (`/ecocitoyennete`). Au survol (hover), un overlay semi-transparent (fond sombre légèrement opaque) DOIT apparaître sur la photo avec la description de l'activité affichée en haut de la photo. Le titre reste visible au centre. La transition DOIT être fluide (CSS).

#### Scenario: Affichage des 4 photos activités

- **WHEN** un visiteur accède à `/home`
- **THEN** 4 photos sont affichées avec les titres « Randonnées à vélo », « Formations », « Projections de films » et « Éco citoyenneté » superposés au centre de chaque photo

#### Scenario: Hover sur une photo activité

- **WHEN** un visiteur survole la photo « Formations »
- **THEN** un overlay semi-transparent apparaît sur la photo avec la description de l'activité « Formations » affichée en haut de la photo, et le titre reste visible au centre

#### Scenario: Clic sur une photo activité

- **WHEN** un visiteur clique sur la photo « Formations »
- **THEN** le système navigue vers `/formations`

#### Scenario: Photos configurables

- **WHEN** un administrateur modifie les photos des activités dans le global Home ou ActivitesContent
- **THEN** les nouvelles photos sont affichées sur la page d'accueil

### Requirement: Deux textes configurables en bas de page

En bas de la page, avant le footer, le système DOIT afficher deux textes configurables (richText) modifiables via le global Home.

#### Scenario: Affichage des deux textes en bas de page

- **WHEN** un visiteur accède à `/home`
- **THEN** les deux textes configurables sont affichés en bas de page

#### Scenario: Un texte non configuré

- **WHEN** un des deux textes n'est pas rempli dans l'admin
- **THEN** seul le texte rempli est affiché

### Requirement: Carousel des partenaires dans le footer

Le système DOIT afficher un carousel dans le footer de la page avec la liste des partenaires. Chaque partenaire DOIT afficher une image (logo), le nom et un lien vers le site du partenaire. Les partenaires DOIVENT être triés par le champ `ordre`.

#### Scenario: Affichage du carousel partenaires

- **WHEN** un visiteur accède à `/home`
- **THEN** le footer affiche un carousel défilant avec les logos, noms et liens des partenaires

#### Scenario: Clic sur un partenaire

- **WHEN** un visiteur clique sur un partenaire dans le carousel
- **THEN** le navigateur ouvre le site du partenaire dans un nouvel onglet

#### Scenario: Aucun partenaire

- **WHEN** aucun partenaire n'est enregistré
- **THEN** le carousel n'est pas affiché

### Requirement: PDFs Statut et Charte de l'association téléchargeables

Le système DOIT afficher deux liens de téléchargement pour les documents PDF « Statut de l'association » et « Charte de l'association ». Les PDFs DOIVENT être uploadés et configurables via le global Home (deux champs upload de type `DocsPdf` ou `Media`). Les liens DOIVENT être affichés sur la page d'accueil, par exemple dans la section des textes en bas de page ou dans une section dédiée.

#### Scenario: Affichage des liens PDF

- **WHEN** un visiteur accède à `/home` et que les deux PDFs sont configurés dans le global Home
- **THEN** deux liens de téléchargement sont affichés : « Statut de l'association » et « Charte de l'association »

#### Scenario: Téléchargement d'un PDF

- **WHEN** un visiteur clique sur le lien « Statut de l'association »
- **THEN** le fichier PDF est téléchargé ou ouvert dans un nouvel onglet

#### Scenario: Un seul PDF configuré

- **WHEN** seul le PDF « Charte de l'association » est uploadé dans le global Home
- **THEN** seul le lien « Charte de l'association » est affiché

#### Scenario: Aucun PDF configuré

- **WHEN** aucun PDF n'est uploadé dans le global Home
- **THEN** la section téléchargement n'est pas affichée
