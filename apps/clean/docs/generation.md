# Générer les données

Les données des parcours de nettoyage et les fiches PDF sont produites par la pipeline de
génération. Elle est **incrémentale** : un run ne refait que ce qui a changé.

```sh
bun run generate:routes # Régénérer les segments de début/fin (Point de rendez-vous, OSRM/Valhalla)
bun run generate:tours  # Régénérer src/app/tours-data.ts + le GeoJSON précalculé
bun run generate:pdfs   # Régénérer les fiches PDF
bun run generate:all    # Les trois étapes : routes -> données -> fiches
bun run generate:state  # Compléter l'état de génération avec les fiches présentes
```

`bun run generate:all` enchaîne les trois étapes de la pipeline, dans cet ordre :

1. **les segments de début et de fin** — le routage entre le Point de rendez-vous et les
   extrémités du parcours (OSRM et Valhalla, interrogés en parallèle) ;
2. **les données** — le catalogue `src/app/tours-data.ts` et le GeoJSON précalculé ;
3. **les fiches** — la fiche de chaque parcours et la fiche de zone (la carte d'ensemble)
   de chaque zone.

`bun run generate:tours` régénère deux artefacts versionnés : `src/app/tours-data.ts`
(généré, ne pas éditer à la main) **et** un asset GeoJSON précalculé par parcours dans
`public/geojson/<zone>/<parcours>.geojson`, que les cartes fetchent au runtime (avec repli
sur le parsing GPX). `bun run generate:routes` réécrit pour sa part les tracés GPX de
`public/gpx/`.

Les artefacts recalculés à chaque run (catalogue, GeoJSON, segments GPX, état de
génération) ne sont écrits que si leur contenu a changé : un run qui ne change rien laisse
le dépôt intact. Les fiches PDF, elles, ne sont pas ré-écrites du tout quand le plan les
déclare à jour.

## Génération incrémentale

La pipeline s'appuie sur un **état de génération** versionné, `scripts/generation-state.json`
(committé dans le dépôt). Pour chaque parcours, il garde l'empreinte (sha256) de la trace
source, du Point de rendez-vous de la zone, des segments de début et de fin et de la fiche
produite ; pour chaque fiche de zone, l'empreinte de la carte produite. À partir de cet
état et des empreintes trouvées sur le disque, la pipeline décide, pour chaque parcours :

- les **segments de début et de fin** sont re-calculés si la trace source a changé, si le
  Point de rendez-vous de la zone a changé (les segments partent et reviennent du Point de
  rendez-vous), si le parcours est inconnu de l'état, ou si ses segments manquent du
  disque ou de l'état ;
- la **fiche** est re-rendue si les segments viennent d'être re-calculés, si la fiche est
  absente du disque, si l'état ne connaît pas la fiche, ou si son contenu ne correspond
  plus à celui enregistré ;
- la **fiche de zone** (la carte d'ensemble d'une zone, pour un type de parcours) est
  re-rendue dès qu'un parcours de la zone a changé, si elle est absente du disque, si
  l'état ne connaît pas son empreinte (elle n'a jamais été rendue, ou le dernier rendu a
  échoué), ou si son contenu ne correspond plus à celui enregistré.

Sans état (fichier absent), ou avec une constante de version différente de
celle du code, tout est régénéré. Un état présent mais illisible (fichier corrompu) est
signalé dans la sortie du run, et tout est régénéré.

Comme l'état est versionné, une copie fraîche du dépôt se comporte comme une copie de
travail déjà à jour : le premier run ne refait rien. Un parcours en échec (routeur
indisponible) n'est pas marqué comme à jour : le run suivant le rejoue.

L'état porte une **constante de version** (`GENERATION_STATE_VERSION`, dans
`scripts/generation-state.ts`) qui couvre l'algorithme de routage et le template de fiche :
l'augmenter invalide tous les artefacts et impose une régénération complète. Pensez à
l'augmenter quand vous modifiez l'un des deux.

`bun run generate:state` (`scripts/refresh-generation-state.ts`) complète l'état avec
l'empreinte des fiches déjà présentes dans `public/pdf/`, l'empreinte du Point de
rendez-vous de chaque zone et l'empreinte des fiches de zone — pour les artefacts que
l'état connaît mais dont l'empreinte n'y est pas encore enregistrée. Il n'écrase jamais
une empreinte déjà enregistrée. Lancez-le sur une copie fraîche du dépôt (l'état doit déjà
exister), ou après avoir remplacé des fiches à la main.

## Forcer la régénération

```sh
bun run generate:all -- --force            # Tout régénérer, quel que soit l'état
bun run generate:one -- --tour=V1 --force  # Un seul parcours, régénéré quoi qu'il arrive
```

`--force` est acceptée par toutes les étapes (`generate:routes`, `generate:tours`,
`generate:pdfs`, `generate:one`, `generate:all`) : tout ce que les filtres (`--tour=`,
`--zone=`) sélectionnent est régénéré, sans consulter l'état de génération.

## Le bloc `[perf]` (chrono)

Chaque script se termine par un bloc `[perf]` : la durée totale, la durée de chaque étape,
les tuiles relues dans le cache et téléchargées, et le récapitulatif de ce que le run a
fait de chaque élément de la pipeline (les segments, les données, les fiches, les cartes
de zone, les packs). Le bloc est en français : c'est le référent qui le lit.

Le récapitulatif liste **ce qui a été refait** — une ligne par élément, avec la raison de
la décision — et **ce qui a été laissé tel quel** — une ligne par groupe d'éléments, avec
le nombre d'éléments du groupe. Le groupe s'accorde en nombre : « 1 Fiche ignorée », « 28
Fiches ignorées ».

```text
[perf] generate-pdfs — durée totale : 1 m 12 s

  Métrique                   Valeur
  ───────────────────────────────────
  Étape « Fiches »           1 m 05 s
  Étape « Cartes de zone »   7.0 s
  Tuiles en cache            120
  Tuiles téléchargées        8
  Fiches regénérées          1
  Fiches ignorées            47
  Cartes de zone regénérées  1
  Cartes de zone ignorées    3

  Sujet          Élément    Zone               Décision   Raison
  ────────────────────────────────────────────────────────────────────────
  Fiche          V1         bruz-sud           regénérée  parcours modifié
  Carte de zone  vélo       bruz-sud           regénérée  parcours modifié
  Fiche          28 Fiches  bruz-sud           ignorées   à jour
  Fiche          13 Fiches  bruz-ker-lann      ignorées   à jour
  Fiche          6 Fiches   bruz-vau-gaillard  ignorées   à jour
  Carte de zone  1 carte    bruz-sud           ignorée    à jour
  Carte de zone  1 carte    bruz-ker-lann      ignorée    à jour
  Carte de zone  1 carte    bruz-vau-gaillard  ignorée    à jour
```

Un run qui ne change rien l'annonce : `rien n'a changé : aucun Parcours régénéré`. Les
compteurs sont exacts, filtres `--tour` / `--zone` compris. Les rapports détaillés sont
écrits en JSON dans `scripts/output/perf/` (dossier gitignoré) et fusionnés par
l'orchestrateur : le bloc d'un `generate:all` montre l'union des étapes qu'il a lancées.

Le script des packs (`generate:zone-pdf`) ne régénère aucun parcours — il fusionne les
documents déjà publiés — mais il écrit des fichiers : son bloc annonce donc les packs
qu'il a écrits, les documents qu'ils contiennent et les fiches qu'il réutilise, et il ne
dit jamais « rien n'a changé ».

```text
[perf] generate-zone-pdf — durée totale : 1.2 s

  Métrique             Valeur
  ───────────────────────────
  Étape « bruz-sud »   1.1 s
  Tuiles en cache      0
  Tuiles téléchargées  0
  Packs écrits         1
  Packs réutilisés     0
  Fiches réutilisées   47
  Documents des packs  49

  Sujet  Élément    Zone      Décision     Raison
  ──────────────────────────────────────────────────────────
  Pack   bruz-sud   bruz-sud  écrit        documents publiés
  Fiche  47 Fiches  bruz-sud  réutilisées  à jour
```

## Politesse envers les serveurs communautaires

La pipeline interroge les serveurs communautaires (tuiles OSM, OSRM, Valhalla) sans jamais
les marteler :

- **une requête toutes les 400 ms par serveur**, et **deux connexions simultanées au
  maximum** par serveur ;
- **deux parcours routés à la fois**, OSRM et Valhalla interrogés en parallèle pour un
  même segment (ils sont sur deux hôtes différents, ils ne se gênent donc pas) ;
- **plusieurs fiches assemblées en parallèle** (trois à la fois), sans jamais dépasser les
  deux connexions du serveur de tuiles ;
- **un cache de tuiles partagé** sur le disque (`scripts/.cache/tiles/`, gitignoré) : une
  tuile déjà téléchargée n'est pas retéléchargée, et une tuile demandée par deux fiches à
  la fois n'est téléchargée qu'une fois.

**Ce que la décision de politesse dit exactement** (les limites sont appliquées par
l'ordonnanceur réseau, `scripts/network-scheduler.ts`, pour _tous_ les hôtes) :

- **le débit par hôte est inchangé** : une requête démarre au plus une fois toutes les
  400 ms sur un même hôte — c'est le débit d'aujourd'hui, et le gain de temps vient du
  recouvrement des attentes, pas d'un débit plus élevé ;
- **la concurrence par hôte est plafonnée à 2** : deux connexions au maximum sur un même
  hôte, la limite de la politique d'usage des tuiles OSM (« bulk downloading is
  prohibited, two connections maximum »). Le ticket #24 parlait de « une requête à la
  fois » : la lecture retenue est « une requête _démarrée_ à la fois par hôte et par
  tranche de 400 ms » — c'est le débit ci-dessus, pas le nombre de connexions ;
- **le nombre de requêtes par Fiche est inchangé** : une Fiche demande toujours les
  mêmes tuiles ; le cache disque et la déduplication des requêtes en vol évitent
  seulement de les retélécharger.

## Vérification manuelle de la pipeline

Quatre vérifications, à faire sur une copie de travail (elles ne doivent rien laisser sur
le disque, hormis l'état de génération inchangé) :

1. **Run idempotent** — `bun run generate:all` sans rien modifier : le bloc `[perf]`
   annonce `rien n'a changé`, les compteurs de tuiles sont à 0 (aucun appel réseau) et
   `git status` ne montre aucune modification.
2. **Une trace modifiée** — modifier `public/gpx/<zone>/<parcours>/<parcours>.gpx`, puis
   relancer `bun run generate:all` : seul ce parcours est re-routé et sa fiche re-rendue
   (le récapitulatif annonce `Segments re-routés 1` et `Fiches regénérées 1`), les autres
   tracés et les autres fiches sont intacts. Changer le Point de rendez-vous d'une zone
   (`src/app/zones.ts`) a le même effet : tous les parcours de la zone sont re-routés.
3. **`--force`** — `bun run generate:all -- --force` : tous les segments et toutes les
   fiches sont régénérés, quel que soit l'état.
4. **Routeur indisponible** — rendre le routeur injoignable (couper le réseau, ou
   pointer `scripts/router-client.ts` vers une URL morte) puis lancer un run : le parcours
   en échec est signalé (`fail V1: …`), il n'est **pas** marqué comme à jour dans l'état
   de génération, et le run suivant le rejoue.

## Ce qui est publié sur le site

Les **fiches** de parcours sont versionnées dans `public/pdf/<zone>/<parcours>.pdf`, et
les **fiches de zone** (les cartes d'ensemble) dans
`public/pdf/<zone>/Carte_parcours_a_velo.pdf` (ou `Carte_parcours_a_pied.pdf`). Le Menu ne
propose que la carte de la zone (« Télécharger le PDF de la carte »).

Les **fiches de suivi** ne sont plus publiées : elles sont produites localement par le
script d'extraction des inscriptions (voir « Extraire les feuilles de suivi » dans
[docs/inscriptions.md](./inscriptions.md)), dans un dossier gitignoré, et ne sont jamais
déployées.

## Tester sur un seul parcours ou une seule zone

Pour éviter de tout régénérer à chaque essai (mise en page PDF, QR code...) :

```sh
bun run generate:one -- --tour=V1 --zone=bruz-sud   # Un seul parcours (routes -> données -> PDF)
bun run generate:one -- --zone=bruz-sud             # Tous les parcours d'une zone
bun run generate:one -- --tour=V1 --zone=bruz-sud --skip-routes --skip-tours  # PDF seul, sans appels réseau
```

`generate:one` suit exactement la même logique incrémentale qu'une génération complète :
elle ne refait que ce qui a changé, et `--force` la force à tout régénérer.

Les scripts acceptent aussi les filtres individuellement (`--tour=V1,V2`, `--zone=bruz-sud`) :
`generate:routes`, `generate:tours` et `generate:pdfs`.
Note : un même nom de parcours (ex. `V1`) peut exister dans plusieurs zones,
précisez `--zone` pour lever l'ambiguïté.
Note : le catalogue `src/app/tours-data.ts` est écrit déjà formaté (Prettier) — il n'y a
donc rien à reformater après un run, et `bun run format:check` reste vert.

Chaque fiche PDF de parcours affiche en haut un QR code cliquable vers
`https://clean.velorandonaturebruz.fr/tour/<zone>/<parcours>` (logo VRNB au centre,
domaine `clean.velorandonaturebruz.fr` affiché sous le QR code).

## Pack PDF par zone

Pour fusionner les PDF d'une zone en un seul fichier (cartes + fiches parcours),
dans le dossier local gitignoré `scripts/output/packs/` :

```sh
bun run generate:zone-pdf              # Toutes les zones -> scripts/output/packs/<zoneId>.pdf
bun run generate:zone-pdf -- --zone=bruz-sud          # Une seule zone
bun run generate:zone-pdf -- --out-dir=/tmp/packs     # Dossier de sortie personnalisé
```

Le pack contient les cartes de zone et les fiches des parcours. Il ne contient
plus de feuille de suivi : celles-ci sont générées à partir des
**inscriptions réelles** par le script d'extraction (voir « Extraire les
feuilles de suivi » dans [docs/inscriptions.md](./inscriptions.md)), et ne sont
jamais publiées sur le site.
