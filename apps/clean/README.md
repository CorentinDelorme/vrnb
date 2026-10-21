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
| `bun scripts/extract-inscriptions.ts` | Extraire les inscriptions de l'Édition en fiches de suivi (voir « Inscriptions des binômes ») |

## Générer les données

Les données des parcours de nettoyage et les fiches PDF peuvent être régénérées avec ces commandes :

```sh
bun run generate:routes # Régénérer les segments de début/fin (Point de rendez-vous, OSRM/Valhalla)
bun run generate:tours  # Régénérer src/app/tours-data.ts + le GeoJSON précalculé
bun run generate:pdfs   # Régénérer les fiches PDF
bun run generate:all    # Tout régénérer (routes + tours + PDFs)
```

`bun run generate:tours` régénère deux artefacts versionnés : `src/app/tours-data.ts`
(généré, ne pas éditer à la main) **et** un asset GeoJSON précalculé par parcours dans
`public/geojson/<zone>/<parcours>.geojson`, que les cartes fetchent au runtime (avec repli
sur le parsing GPX). `bun run generate:routes` réécrit pour sa part les tracés GPX de
`public/gpx/`.

### Tester sur un seul parcours ou une seule zone

Pour éviter de tout régénérer à chaque essai (mise en page PDF, QR code...) :

```sh
bun run generate:one -- --tour=V1 --zone=bruz-sud   # Un seul parcours (routes -> données -> PDF)
bun run generate:one -- --zone=bruz-sud             # Tous les parcours d'une zone
bun run generate:one -- --tour=V1 --zone=bruz-sud --skip-routes --skip-tours  # PDF seul, sans appels réseau
```

Les scripts acceptent aussi les filtres individuellement (`--tour=V1,V2`, `--zone=bruz-sud`) :
`generate:routes`, `generate:tours` et `generate:pdfs`.
Note : un même nom de parcours (ex. `V1`) peut exister dans plusieurs zones,
précisez `--zone` pour lever l'ambiguïté.
Note : `generate:one` écrit `src/app/tours-data.ts` sans le re-formater —
lancez `bun run format` (ou `bun run lint:fix`) juste après, sinon `bun run format:check`
échouera (`bun run generate:all` et `bun run generate:tours` se re-formatent eux-mêmes).

Chaque fiche PDF de parcours affiche en haut un QR code cliquable vers
`https://clean.velorandonaturebruz.fr/tour/<zone>/<parcours>` (logo VRNB au centre,
domaine `clean.velorandonaturebruz.fr` affiché sous le QR code).

## Pack PDF par zone

Pour fusionner les PDF d'une zone en un seul fichier (cartes + fiches parcours),
hors du projet, dans `$HOME/Documents` :

```sh
bun run generate:zone-pdf              # Toutes les zones -> $HOME/Documents/<zoneId>.pdf
bun run generate:zone-pdf -- --zone=bruz-sud          # Une seule zone
bun run generate:zone-pdf -- --out-dir=/tmp/packs     # Dossier de sortie personnalisé
```

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
  couverts ;
- `POST /api/inscriptions` — l'inscription d'un binôme sur un Parcours (les
  deux membres et l'engagement à participer ensemble).

Aucun de ces endpoints ne renvoie de nom : ils exposent uniquement les couples
(Zone, Parcours). Les noms restent dans le KV et ne sont lus que par le script
d'extraction local, décrit plus bas.

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

### Extraire les fiches de suivi (avant l'action)

Les prénoms et les noms ne quittent le KV que par le script d'extraction local,
qui écrit une **Fiche de suivi** par Zone (Parcours inscrits et binômes) :

```sh
# depuis apps/clean/
bun scripts/extract-inscriptions.ts                       # Édition configurée, sortie par défaut
bun scripts/extract-inscriptions.ts --out-dir=/tmp/fiches  # autre dossier de sortie
```

Par défaut, les fiches sont écrites dans `scripts/output/inscriptions/<année>/` :
un dossier gitignoré, **jamais publié ni déployé** (les fiches contiennent des
données personnelles). Le runbook complet — format des fichiers, cas
particuliers, exemple de désistement — est dans
[scripts/README-inscriptions-extract.md](./scripts/README-inscriptions-extract.md).

### Opérations humaines

| Quand | Qui | Quoi |
|---|---|---|
| À l'annonce de l'Édition | Mainteneur | Mettre à jour `year` et `actionDate` dans `src/app/inscriptions/edition.ts` (un seul commit) |
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
