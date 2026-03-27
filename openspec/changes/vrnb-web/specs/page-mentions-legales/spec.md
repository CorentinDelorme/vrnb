## ADDED Requirements

### Requirement: Titre « Mentions légales »

Le système DOIT afficher le titre « Mentions légales » en haut de la page `/mentionslegales`. Le titre DOIT être configurable via Payload CMS (global `MentionsLegales`).

#### Scenario: Affichage du titre

- **WHEN** un visiteur accède à `/mentionslegales`
- **THEN** le titre « Mentions légales » est affiché en haut de la page

### Requirement: Paragraphes configurables

Le système DOIT afficher plusieurs paragraphes avec titres sous le titre principal. Chaque paragraphe comprend un titre de section et un contenu (richText). Les paragraphes typiques incluent : dénomination, siège social, hébergement, collecte et traitement des données personnelles, etc. Les paragraphes DOIVENT être gérés via un tableau répétable dans le global `MentionsLegales` de Payload (champ titre text + champ contenu richText).

#### Scenario: Affichage des paragraphes

- **GIVEN** 4 paragraphes configurés : « Dénomination », « Siège social », « Hébergement », « Données personnelles »
- **WHEN** un visiteur accède à `/mentionslegales`
- **THEN** les 4 paragraphes sont affichés dans l'ordre avec leur titre et contenu

#### Scenario: Modification d'un paragraphe via l'admin

- **WHEN** un administrateur modifie le contenu du paragraphe « Hébergement » dans Payload
- **THEN** le nouveau contenu est affiché sur la page publique sans redéploiement

#### Scenario: Ajout d'un nouveau paragraphe

- **WHEN** un administrateur ajoute un nouveau paragraphe « Cookies » dans le global MentionsLegales
- **THEN** le nouveau paragraphe apparaît sur la page publique

#### Scenario: Aucun paragraphe configuré

- **WHEN** aucun paragraphe n'est configuré dans le global MentionsLegales
- **THEN** seul le titre « Mentions légales » est affiché

### Requirement: Chargement des données côté serveur

Les données des mentions légales DOIVENT être chargées côté serveur depuis le global Payload `MentionsLegales`.

#### Scenario: Chargement initial

- **WHEN** la page `/mentionslegales` est chargée
- **THEN** le titre et les paragraphes sont récupérés côté serveur depuis le global MentionsLegales

### Requirement: Création du global MentionsLegales

Un nouveau global Payload `MentionsLegales` DOIT être créé avec les champs suivants : titre (text, par défaut « Mentions légales ») et paragraphes (tableau répétable avec titre text + contenu richText).

#### Scenario: Global MentionsLegales dans l'admin

- **WHEN** un administrateur accède au global MentionsLegales dans le panneau admin
- **THEN** il peut modifier le titre et gérer les paragraphes (ajouter, modifier, supprimer, réordonner)
