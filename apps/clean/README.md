# Appli Nettoyage Citoyen VRNB (Clean)

Application web pour organiser des actions de nettoyage des déchets, construite avec [Next.js](https://nextjs.org/) 16 (React, App Router). Elle permet de consulter les parcours de ramassage sur une carte interactive (Leaflet), de répartir les zones de nettoyage entre les différents groupes, de visualiser les tracés GPX et de télécharger les fiches PDF de chaque parcours.

Le vocabulaire métier (Parcours, Zone, Point de rendez-vous, Étape, Fiche…) est défini dans le [GLOSSARY.md](./GLOSSARY.md) ; les conventions de code sont dans [AGENTS.md](./AGENTS.md).

## Prérequis

- Avoir installé les dépendances depuis la racine du monorepo (`bun install`)

> Cette application n'a pas besoin de base de données, elle fonctionne avec des données embarquées.

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
├── app/              ← Routes Next.js (App Router) : accueil, mode d'emploi, parcours, carte
├── components/       ← Composants React (cartes Leaflet, vues, menu)
├── lib/              ← Helpers purs (titres, liens, téléchargements)
├── src/app/          ← Logique métier (requêtes, stockage, GPX/GeoJSON, carte Leaflet)
├── public/
│   ├── gpx/          ← Fichiers de tracés GPS (un dossier par zone de nettoyage)
│   ├── geojson/      ← GeoJSON précalculé, un fichier par parcours (généré)
│   ├── pdf/          ← Fiches PDF téléchargeables par groupe
│   ├── media/        ← Images et médias
│   └── icons/        ← Icônes
├── e2e/              ← Tests de bout en bout (Playwright) + plan dans tests.md
└── scripts/          ← Scripts de génération de données
```
