# Ramassage des déchets à Bruz (VRNB)

Actions collectives de ramassage de déchets organisées par Vélo Rando Nature Bruz (VRNB), pratiquées dans des zones de la commune de Bruz, à pied ou à vélo.

## Language

**Vélo Rando Nature Bruz (VRNB)**:
L'association qui organise les actions de ramassage de déchets à Bruz.
_Avoid_: Vélo & Randonnée Nature Bruz

**Parcours**:
Un itinéraire de ramassage de déchets défini au sein d'une Zone, comportant un début, une section de nettoyage et une fin.
_Avoid_: Tour, route, itinéraire de vélo

**Type de parcours**:
Le mode de pratique d'un Parcours : à pied (P) ou à vélo (V).
_Avoid_: catégorie, mode

**Zone**:
Un secteur géographique de la commune où se déroulent les Parcours, identifié par un lieu de rendez-vous. Trois zones existent à Bruz.
_Avoid_: secteur, quartier

**Point de rendez-vous**:
Le lieu, propre à chaque Zone, où les participants se retrouvent avant et après un Parcours.
_Avoid_: départ, terminus

**Trace GPX**:
L'enregistrement GPS d'une portion d'un Parcours sous forme de fichier GPX.
_Avoid_: track, tracé, ligne

**Segments de début et de fin**:
Les traces reliant le Point de rendez-vous au début du Parcours, et la fin du Parcours au Point de rendez-vous.
_Avoid_: liaisons, accès

**GeoJSON précalculé**:
L'asset émis par la pipeline (`public/geojson/<zone>/<parcours>.geojson`) regroupant le tracé du Parcours et ses segments de début et de fin, fetché au runtime par les cartes à la place du parsing GPX.
_Avoid_: geojson, fichier cartographique

**État de génération**:
La description versionnée de ce que la pipeline de génération a déjà produit, conservée dans le fichier `scripts/generation-state.json` (committé dans le dépôt) : pour chaque Parcours, l'empreinte de sa trace source, du Point de rendez-vous de sa Zone et des artefacts produits (segments, Fiche), pour chaque Zone l'empreinte de sa Fiche de zone, plus une constante de version couvrant l'algorithme de routage et le template de Fiche.
_Avoid_: cache, plan de génération, état de l'application

**Plan de génération**:
La décision pure de ce qu'un run doit régénérer (segments de début et de fin, fiche d'un Parcours, fiche de zone), déduite de l'état de génération, des empreintes des fichiers présents sur le disque et des filtres du run. Chaque décision porte sa raison.
_Avoid_: état de génération, liste de tâches

**Étape**:
L'une des trois phases d'un Parcours : Début, Nettoyage, Fin.
_Avoid_: étape du guide, phase

**Distance de nettoyage**:
La longueur de l'Étape Nettoyage d'un Parcours, celle où le ramassage a lieu.
_Avoid_: distance (seule), longueur de tracé

**Distance totale**:
La longueur cumulée des trois Étapes d'un Parcours, du Point de rendez-vous jusqu'au retour.
_Avoid_: kilométrage, total de mètres

**Parcours en cours**:
Le Parcours démarré par un participant et non encore terminé, mémorisé pour reprise.
_Avoid_: parcours sauvegardé, progression

**Fiche**:
Le document PDF imprimable résumant un Parcours (carte, tracé, QR code).
_Avoid_: PDF, dossier

**Fiche de zone**:
Le document PDF publié sur le site qui dessine l'ensemble des Parcours d'une Zone pour un type de parcours (à vélo ou à pied) : la carte d'ensemble de la Zone. Il est régénéré dès qu'un Parcours de la Zone a changé, ou que sa carte n'est plus à jour.
_Avoid_: pack PDF, Fiche

**Fiche de suivi**:
Le document imprimable par Zone, destiné aux organisateurs, récapitulant les Inscriptions d'une Édition (Binôme, Parcours) pour le suivi pendant l'action. Il est produit avant l'action, hors du site public.
_Avoid_: liste des inscrits, Fiche (le PDF de Parcours)

**Menu**:
Le tiroir ouvert depuis l'en-tête par le bouton « Menu », qui regroupe les documents et les itinéraires d'un Parcours : Fiche, traces GPX et liens GeoVelo.
_Avoid_: tiroir, drawer, barre latérale

**GeoVelo**:
Le service externe qui fournit les liens d'itinéraire à vélo (depuis ma position ou vers le Point de rendez-vous), proposés dans le Menu.
_Avoid_: carte GPS, planificateur

**Mode d'emploi**:
Le guide illustré expliquant comment utiliser l'application pendant un Parcours et comment inscrire un Binôme pour une Édition. Il s'ouvre sur un sommaire qui renvoie à chaque partie : la navigation porte le label « Sommaire », et chaque entrée saute à sa section numérotée — cinq parties, la dernière étant « S'inscrire en binôme » (le mode d'emploi raconte d'abord le jour de l'action, l'inscription vient ensuite).
_Avoid_: notice, tutoriel, manuel

**Édition**:
L'événement annuel de ramassage, identifié par une année et une date de l'action.
_Avoid_: l'année seule, campagne

**Inscription**:
L'enregistrement du Binôme qui couvre un Parcours pour une Édition, unique par (Parcours, Édition) et confirmé au premier Binôme arrivé. La fenêtre d'inscription a deux bornes : elle n'est pas ouverte depuis le déploiement — elle ouvre à la date configurée dans l'Édition (`inscriptionsOpenDate`) — et elle se ferme 3 jours avant la date de l'action. Les prénoms et noms enregistrés sont effacés automatiquement 90 jours après la date de l'action.
_Avoid_: réservation, résa

**Binôme**:
Les deux bénévoles qui couvrent ensemble un Parcours lors d'une Édition, identifiés par leurs prénoms et noms.
_Avoid_: équipe, participants
