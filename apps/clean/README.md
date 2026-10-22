# Appli Nettoyage Citoyen VRNB (Clean)

Application web pour organiser des actions de nettoyage des déchets, construite avec [Next.js](https://nextjs.org/) 16 (React, App Router). Elle permet de consulter les parcours de ramassage sur une carte interactive (Leaflet), de répartir les zones de nettoyage entre les différents groupes, de visualiser les tracés GPX et de télécharger les fiches PDF de chaque parcours.

Le vocabulaire métier (Parcours, Zone, Point de rendez-vous, Étape, Fiche…) est défini dans le [GLOSSARY.md](./GLOSSARY.md) ; les conventions de code sont dans [AGENTS.md](./AGENTS.md).

## Prérequis

- Avoir installé les dépendances depuis la racine du monorepo (`bun install`)
- Pour tester les inscriptions en local, disposer des variables d'environnement du KV (`UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`) — voir la section « Inscriptions des binômes »

> Cette application n'a pas besoin de base de données métier : elle fonctionne avec des données embarquées. Seules les inscriptions de l'Édition sont stockées dans un KV distant (Upstash).

## Lancer en développement

### Depuis la racine du projet (recommandé)

```sh
bun run dev:clean
```

### Depuis ce dossier

```sh
bun run dev
```

L'application sera accessible sur [http://localhost:4200](http://localhost:4200).

Les modifications du code source sont prises en compte automatiquement (rechargement en direct).

## Commandes utiles

| Commande | Description |
|---|---|
| `bun run dev` | Lancer le serveur de développement Next.js (port 4200) |
| `bun run build` | Construire l'application pour la production (pages pré-rendues) |
| `bun run lint` | Vérifier la qualité du code (ESLint, zéro warning) |
| `bun run lint:fix` | Corriger automatiquement les problèmes de qualité + formatage |
| `bun run format` / `bun run format:check` | Formater / vérifier le formatage (Prettier) |
| `bun run check-types` | Vérifier les types TypeScript (`tsc --noEmit`) |
| `bun run test` | Lancer les tests unitaires (Vitest) — `bun run test:watch` en mode watch |
| `bun run e2e` | Lancer les tests de bout en bout (Playwright, chromium + firefox) |
| `bun run generate:all` | Régénérer les données (incrémental) — voir « Générer les données » |
| `bun scripts/extract-inscriptions.ts` | Extraire les inscriptions de l'Édition en fiches de suivi (voir « Inscriptions des binômes ») |

## Générer les données

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

### Génération incrémentale

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

### Forcer la régénération

```sh
bun run generate:all -- --force            # Tout régénérer, quel que soit l'état
bun run generate:one -- --tour=V1 --force  # Un seul parcours, régénéré quoi qu'il arrive
```

`--force` est acceptée par toutes les étapes (`generate:routes`, `generate:tours`,
`generate:pdfs`, `generate:one`, `generate:all`) : tout ce que les filtres (`--tour=`,
`--zone=`) sélectionnent est régénéré, sans consulter l'état de génération.

### Le bloc `[perf]` (chrono)

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

### Politesse envers les serveurs communautaires

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
l'ordonnanceur réseau, `scripts/network-scheduler.ts`, pour *tous* les hôtes) :

- **le débit par hôte est inchangé** : une requête démarre au plus une fois toutes les
  400 ms sur un même hôte — c'est le débit d'aujourd'hui, et le gain de temps vient du
  recouvrement des attentes, pas d'un débit plus élevé ;
- **la concurrence par hôte est plafonnée à 2** : deux connexions au maximum sur un même
  hôte, la limite de la politique d'usage des tuiles OSM (« bulk downloading is
  prohibited, two connections maximum »). Le ticket #24 parlait de « une requête à la
  fois » : la lecture retenue est « une requête *démarrée* à la fois par hôte et par
  tranche de 400 ms » — c'est le débit ci-dessus, pas le nombre de connexions ;
- **le nombre de requêtes par Fiche est inchangé** : une Fiche demande toujours les
  mêmes tuiles ; le cache disque et la déduplication des requêtes en vol évitent
  seulement de les retélécharger.

### Vérification manuelle de la pipeline

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

### Ce qui est publié sur le site

Les **fiches** de parcours sont versionnées dans `public/pdf/<zone>/<parcours>.pdf`, et
les **fiches de zone** (les cartes d'ensemble) dans
`public/pdf/<zone>/Carte_parcours_a_velo.pdf` (ou `Carte_parcours_a_pied.pdf`). Le Menu ne
propose que la carte de la zone (« Télécharger le PDF de la carte »).

Les **fiches de suivi** ne sont plus publiées : elles sont produites localement par le
script d'extraction des inscriptions (voir « Extraire les feuilles de suivi »), dans un
dossier gitignoré, et ne sont jamais déployées.

### Tester sur un seul parcours ou une seule zone

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

## Tracer les parcours et ajouter une Zone ou un Parcours

Les traces GPX des Parcours sont dessinées à la main dans
[GPX Studio](https://gpx.studio/fr/app#14.65/48.02528/-1.74699), puis déposées
dans `public/gpx/<zone>/<parcours>/<parcours>.gpx`. Tout le reste — segments de
début et de fin, catalogue des Parcours, GeoJSON précalculé, Fiches et Fiches
de zone — est produit par la pipeline de génération.

### Tracer un parcours avec GPX Studio

[GPX Studio](https://gpx.studio/fr/app#14.65/48.02528/-1.74699) est un éditeur
de fichiers GPX en ligne : sans compte, sans installation, tout se passe dans
le navigateur. Le lien ci-dessus ouvre la carte déjà centrée sur Bruz, il suffit de déplacer la carte
pour centrer la vue sur un autre endroit.

1. **Créer un GPX** — premier bouton « Planifier ou modifier un itinéraire » (`crayon`) dans le menu de gauche, 
   ou cliquez directement sur la carte pour commencer un tracé.
2. **Placer les points** — cliquez sur la carte pour poser les points du
   parcours. Le mode « routage » (magnétisme) colle les points sur les
   chemins ; `F5` bascule en mode « vol d'oiseau » (segments en ligne droite),
   pour les portions hors-piste (sentiers, chemins agricoles).
3. **Ajuster le tracé** — glissez un point pour le déplacer, cliquez-droit
   dessus pour le supprimer ou le scinder ; `Ctrl+Z` annule la dernière action.
4. **Exporter** — bouton « Exporter » (`Ctrl+S`), format GPX : le fichier
   `.gpx` est téléchargé.

Le fichier exporté contient une trace (`<trk>`) : c'est elle que la pipeline
lit. Les points d'intérêt (`<wpt>`) sont ignorés.

### Ajouter un Parcours à une Zone existante

Le nom d'un Parcours est son type de pratique suivi d'un numéro : `P` pour à
pied, `V` à vélo (`P2`, `V16`). Le numéro doit être unique.

1. **Tracer et exporter** le parcours dans GPX Studio (voir ci-dessus).
2. **Déposer la trace** dans `public/gpx/<zone>/<parcours>/<parcours>.gpx` : le
   dossier porte le nom du Parcours, le fichier porte le même nom.

   ```text
   public/gpx/bruz-sud/V16/V16.gpx
   ```

   Seul le fichier `<parcours>.gpx` est à poser : les segments de début et de
   fin (`<parcours>_start.gpx`, `<parcours>_end.gpx`) sont calculés par la
   pipeline, depuis le Point de rendez-vous de la Zone.
3. **Régénérer** :

   ```sh
   bun run generate:one -- --tour=V16 --zone=bruz-sud
   ```

   La commande route les segments de début et de fin, met à jour le catalogue
   `src/app/tours-data.ts` et le GeoJSON précalculé
   (`public/geojson/bruz-sud/V16.geojson`), puis rend la Fiche du Parcours
   (`public/pdf/bruz-sud/V16.pdf`) et la Fiche de zone.

Le Parcours apparaît alors sur l'accueil, dans l'accordéon de sa Zone. Un
Parcours absent de l'état de génération est toujours re-routé : c'est le
premier run qui décide de son sort.

### Ajouter une nouvelle Zone

1. **Tracer et exporter** les Parcours de la Zone dans GPX Studio.
2. **Déclarer la Zone** dans `src/app/zones.ts` : un identifiant (slug en
   minuscules, séparé par des tirets), un nom affiché et le Point de
   rendez-vous de la Zone — les coordonnées sont au format
   `[longitude, latitude]`.

   ```ts
   {
     id: 'bruz-nord',
     name: 'Bruz Nord',
     meetingPoint: {
       name: 'Place du Dr Joly',
       coordinates: [-1.747083, 48.024417],
     },
   }
   ```

   L'identifiant ne doit pas ressembler à un nom de Parcours (`^[VP]\d+$`) :
   un tel dossier serait pris pour un Parcours de la Zone par défaut. Sans
   cette déclaration, la Zone n'apparaît pas sur l'accueil et ses Parcours
   seraient routés depuis le Point de rendez-vous de la Zone par défaut.
3. **Déposer les traces** dans `public/gpx/<zone>/<parcours>/<parcours>.gpx`,
   une par Parcours de la Zone.
4. **Régénérer** :

   ```sh
   bun run generate:all
   ```

   `bun run generate:one -- --zone=bruz-nord` ne touche qu'à la Zone et suffit
   quand elle ne contient que des Parcours neufs.

La Zone apparaît alors sur l'accueil, avec ses Parcours à vélo et à pied, et
sa Fiche de zone (`public/pdf/bruz-nord/Carte_parcours_a_velo.pdf`) est
publiée comme les autres.

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
feuilles de suivi »), et ne sont jamais publiées sur le site.

## Inscriptions des binômes

Pour chaque **Édition** (voir [GLOSSARY.md](./GLOSSARY.md)), un **Binôme**
couvre un **Parcours** : une seule inscription par (Parcours, Édition),
attribuée au premier arrivé. Les prénoms et les noms ne sont jamais publics —
le site n'expose que les couples (Zone, Parcours) déjà couverts, sous forme de
badge « Binôme inscrit » placé là où se trouvait le bouton d'inscription.

L'inscription se fait depuis la page d'accueil (bouton « S'inscrire » à côté du
bouton de lecture du parcours), via les deux endpoints de l'API :

- `GET /api/inscriptions` — l'état public de l'Édition : l'année, la date de
  l'action, l'ouverture de la fenêtre d'inscription et la liste des Parcours
  couverts (**200**) ; si le KV est injoignable, la réponse est un **502**
  `{"error":"inscriptions-unavailable"}` ;
- `POST /api/inscriptions` — l'inscription d'un binôme sur un Parcours (les
  deux membres et l'engagement à participer ensemble).

Aucun de ces endpoints ne renvoie de nom : ils exposent uniquement les couples
(Zone, Parcours). Les noms restent dans le KV et ne sont lus que par le script
d'extraction local, décrit plus bas.

C'est la **clé** du KV qui couvre un Parcours, pas la valeur stockée : une clé
créée manuellement dans la console Upstash compte donc aussi, et le Parcours
correspondant apparaît sur le site sous forme de badge « Binôme inscrit ».

### Variables d'environnement du KV

Les inscriptions ne sont pas dans une base de données : elles sont stockées dans
un KV distant (Upstash, API REST). Deux variables d'environnement sont
nécessaires — **les noms seulement, les valeurs ne sont jamais versionnées** :

| Variable | Rôle |
|---|---|
| `UPSTASH_REDIS_REST_URL` | URL de l'API REST du KV |
| `UPSTASH_REDIS_REST_TOKEN` | Jeton d'authentification du KV |

Elles doivent être renseignées à deux endroits :

- **sur Vercel**, dans les variables d'environnement du projet, pour que l'API
  déployée puisse lire et écrire les inscriptions ;
- **en local**, dans `apps/clean/.env.local` — ce fichier est chargé
  automatiquement, par Bun pour le script d'extraction (lancé depuis
  `apps/clean/`) et par Next.js pour le serveur de développement. Il n'est
  jamais committé.

Le jeton doit être un **jeton standard** Upstash : les jetons en lecture seule
ne peuvent pas exécuter le `SCAN` nécessaire à l'extraction.

### Extraire les feuilles de suivi (avant l'action)

Les prénoms et les noms ne quittent le KV que par le script d'extraction local,
qui écrit les **feuilles de suivi** en PDF : une par Zone et par type de
parcours, avec les deux colonnes « Prénom NOM » renseignées par les Binômes
inscrits (les colonnes de pesée se remplissent le jour de l'action).

```sh
# depuis apps/clean/
bun scripts/extract-inscriptions.ts                       # Édition configurée, sortie par défaut
bun scripts/extract-inscriptions.ts --out-dir=/tmp/fiches  # autre dossier de sortie
```

Par défaut, les feuilles sont écrites dans
`scripts/output/inscriptions/<année>/<zoneId>/` : un dossier gitignoré,
**jamais commité, publié ni déployé** (elles contiennent des données
personnelles). C'est la seule source des feuilles de suivi : les anciennes
feuilles blanches `Suivi_parcours_a_*.pdf` de `public/pdf/` ont été retirées,
et le lien « Télécharger le PDF de suivi » a été retiré du menu.

Le runbook complet — format des fichiers, cas particuliers, exemple de
désistement — est dans
[scripts/README-inscriptions-extract.md](./scripts/README-inscriptions-extract.md).

### Opérations humaines

| Quand | Qui | Quoi |
|---|---|---|
| À l'annonce de l'Édition | Mainteneur | Mettre à jour `year` et `actionDate` dans `src/app/inscriptions/edition.ts` (un seul commit) |
| 3 jours avant la date de l'action | — | Rien : la fenêtre d'inscription se ferme d'elle-même (`REGISTRATION_CLOSURE_DAYS = 3`) et le bouton « S'inscrire » disparaît de l'accueil, le temps d'imprimer les fiches et d'organiser la journée |
| Avant l'action, à chaque vague d'inscriptions | Référent | Régénérer et imprimer les fiches de suivi (`bun scripts/extract-inscriptions.ts`) |
| À tout moment (désistement) | Référent | Supprimer la clé `inscriptions:<année>:<zoneId>:<parcours>` dans la console Upstash : le parcours redevient disponible |
| 90 jours après la date de l'action | — | Rien : les clés expirent automatiquement du KV |

Il n'existe aucun outil d'administration sur le site : un désistement se traite
directement dans la console Upstash (onglet **Data Browser** de la base REST,
rechercher la clé, **Delete**).

### Expiration automatique

Chaque clé d'inscription est créée avec une durée de vie (TTL) calculée **au
moment de l'inscription** : la date de l'action + 90 jours
(`INSCRIPTIONS_RETENTION_DAYS = 90`), fuseau Europe/Paris. Les prénoms et les
noms sont donc effacés d'eux-mêmes : **rien à lancer**, ni cron ni purge
manuelle. C'est également ce que rappelle la notice RGPD du formulaire
d'inscription.

### Rotation annuelle de l'Édition

`src/app/inscriptions/edition.ts` (`CURRENT_EDITION`) est le **point de bascule
unique** de l'année : `year` (le nom de l'Édition) et `actionDate` (le jour de
l'action). Les clés du KV sont indexées par année (`inscriptions:<année>:…`) :
la nouvelle Édition repart donc d'une liste de Parcours couverts vide, sans
aucune autre opération.

## Tests

### Tests unitaires

Les tests unitaires tournent sous [Vitest](https://vitest.dev/) (environnement jsdom, Testing Library pour les pages) :

```sh
bun run test
```

### Tests de bout en bout (E2E)

Les tests E2E utilisent Playwright. Ils démarrent automatiquement le serveur de développement :

```sh
bun run e2e
```

## Structure principale

```
apps/clean/
├── app/              ← Routes Next.js (App Router) : accueil, mode d'emploi, parcours, carte, API inscriptions
├── components/       ← Composants React (cartes Leaflet, vues, menu, modal d'inscription)
├── lib/              ← Helpers purs (titres, liens, téléchargements)
├── src/app/          ← Logique métier (requêtes, stockage, GPX/GeoJSON, carte Leaflet, inscriptions)
├── public/
│   ├── gpx/          ← Fichiers de tracés GPS (un dossier par zone de nettoyage)
│   ├── geojson/      ← GeoJSON précalculé, un fichier par parcours (généré)
│   ├── pdf/          ← Fiches PDF téléchargeables par groupe
│   ├── media/        ← Images et médias
│   └── icons/        ← Icônes
├── e2e/              ← Tests de bout en bout (Playwright) + plan dans tests.md
└── scripts/          ← Scripts de génération de données + extraction des inscriptions
```
