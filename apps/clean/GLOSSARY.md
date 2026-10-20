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

**Étape**:
L'une des trois phases d'un Parcours : Début, Nettoyage, Fin.
_Avoid_: étape du guide, phase

**Parcours en cours**:
Le Parcours démarré par un participant et non encore terminé, mémorisé pour reprise.
_Avoid_: parcours sauvegardé, progression

**Fiche**:
Le document PDF imprimable résumant un Parcours (carte, tracé, QR code).
_Avoid_: PDF, dossier

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
Le guide illustré expliquant comment utiliser l'application pendant un Parcours.
_Avoid_: notice, tutoriel, manuel

**Édition**:
L'événement annuel de ramassage, identifié par une année et une date de l'action.
_Avoid_: l'année seule, campagne

**Inscription**:
L'enregistrement du Binôme qui couvre un Parcours pour une Édition, unique par (Parcours, Édition) et confirmé au premier Binôme arrivé. Les prénoms et noms enregistrés sont effacés automatiquement 90 jours après la date de l'action.
_Avoid_: réservation, résa

**Binôme**:
Les deux bénévoles qui couvrent ensemble un Parcours lors d'une Édition, identifiés par leurs prénoms et noms.
_Avoid_: équipe, participants
