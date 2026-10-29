# Appli Nettoyage Citoyen VRNB (Clean)

Application web pour organiser des actions de nettoyage des déchets, construite avec [Next.js](https://nextjs.org/) 16 (React, App Router). Elle permet de consulter les parcours de ramassage sur une carte interactive (Leaflet), de répartir les zones de nettoyage entre les différents groupes, de visualiser les tracés GPX et de télécharger les fiches PDF de chaque parcours.

Le vocabulaire métier (Parcours, Zone, Point de rendez-vous, Étape, Fiche…) est défini dans le [GLOSSARY.md](./GLOSSARY.md) ; les conventions de code sont dans [AGENTS.md](./AGENTS.md).

## Prérequis

- Avoir installé les dépendances depuis la racine du monorepo (`bun install`)
- Pour tester les inscriptions en local, disposer des variables d'environnement du KV (`UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`) — voir la section « Inscriptions des binômes » dans [docs/inscriptions.md](./docs/inscriptions.md)

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

## Documentation détaillée

Le README a été découpé en plusieurs fichiers dans [`docs/`](./docs/) car il était devenu trop volumineux :

| Sujet | Fichier |
|---|---|
| Pipeline de génération (état de génération, bloc `[perf]`, politesse, vérifications, `generate:one`, pack PDF) | [docs/generation.md](./docs/generation.md) |
| Tracer un parcours (GPX Studio), ajouter un Parcours à une Zone (page d'import `/admin/import-parcours` ou méthode manuelle), ajouter une Zone | [docs/parcours-import.md](./docs/parcours-import.md) |
| Inscriptions des binômes (API, KV, extraction des feuilles de suivi, opérations humaines, expiration, rotation annuelle) | [docs/inscriptions.md](./docs/inscriptions.md) |

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

#### Capturer les screenshots du mode d'emploi

Les 9 screenshots du mode d'emploi (`/manual`) sont stockés dans `public/manual/` et référencés par `app/manual/page.tsx`. Ils sont capturés en mode **mobile (360×780)**, contre un serveur en **mode production** (`next build && next start`), avec Chromium uniquement.

Script : [`scripts/capture-manual.sh`](./scripts/capture-manual.sh), aussi disponible via `bun run capture:manual` :

```sh
bun run capture:manual
# ou
./scripts/capture-manual.sh
```

Ce script :
1. Construit l'application en production (`next build`)
2. Lance le serveur Next.js en production sur le port 4200
3. Lance le spec Playwright `scripts/capture-manual.spec.ts` (Chromium uniquement — **ce spec n'est PAS dans `e2e/`, donc il n'est pas exécuté par `bun run e2e`**)
4. Écrit les screenshots dans `public/manual/`

Le spec mock l'API `/api/inscriptions` : `registrationOpen = false` pour les screens 1 à 7 (pas de bouton « S'inscrire »), puis `registrationOpen = true` pour les screens 8 et 9 (modal d'inscription et confirmation).

## Structure principale

```
apps/clean/
├── app/              ← Routes Next.js (App Router) : accueil, mode d'emploi, parcours, carte, API inscriptions
├── components/       ← Composants React (cartes Leaflet, vues, menu, modal d'inscription)
├── docs/             ← Documentation détaillée (génération, parcours/import, inscriptions)
├── lib/              ← Helpers purs (titres, liens, téléchargements)
├── src/app/          ← Logique métier (requêtes, stockage, GPX/GeoJSON, carte Leaflet, inscriptions)
├── public/
│   ├── gpx/          ← Fichiers de tracés GPS (un dossier par zone de nettoyage)
│   ├── geojson/      ← GeoJSON précalculé, un fichier par parcours (généré)
│   ├── pdf/          ← Fiches PDF téléchargeables par groupe
│   ├── media/        ← Images et médias
│   └── icons/        ← Icônes
├── e2e/              ← Tests de bout en bout (Playwright) + plan dans tests.md
├── scripts/          ← Scripts de génération de données + extraction des inscriptions
└── docs/             ← Documentation détaillée
```
