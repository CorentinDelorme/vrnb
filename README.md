# VRNB

Dépôt principal du projet VRNB — un monorepo qui regroupe toutes les applications et les packages partagés de l'association Vélo Rando Nature Bruz.

## Contenu du projet

| Dossier | Description |
|---|---|
| `apps/web` | Site web de l'association (CMS Payload + Next.js + MongoDB) |
| `apps/clean` | Application pour organiser des actions de nettoyage des déchets (Angular + Leaflet + cartes GPX) |
| `packages/ui` | Bibliothèque de composants visuels partagés (React + Storybook) |
| `packages/web-db` | Service de base de données MongoDB (Docker) |
| `packages/eslint-config` | Configuration partagée pour la qualité du code |
| `packages/typescript-config` | Configuration TypeScript partagée |

## Prérequis

Avant de commencer, assurez-vous d'avoir installé sur votre machine :

- **[Bun](https://bun.sh)** (version 1.3.10 ou plus récente) — gestionnaire de paquets et d'exécution JavaScript
- **[Docker](https://www.docker.com)** — nécessaire uniquement pour le site web (base de données MongoDB)

## Installation

Ouvrez un terminal à la racine du projet et lancez :

```sh
bun install
```

Cela télécharge toutes les dépendances nécessaires pour l'ensemble des applications.

## Lancer le projet en développement

### Tout lancer (site web + appli pour organiser des actions de nettoyage des déchets)

```sh
bun run dev
```

> La base de données MongoDB se lance automatiquement avec le site web.

### Lancer uniquement le site web

```sh
bun run dev:web
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000).

### Lancer uniquement l'appli pour organiser des actions de nettoyage des déchets

```sh
bun run dev:clean
```

L'application sera accessible sur [http://localhost:4200](http://localhost:4200).

## Construire le projet pour la production

```sh
bun run build
```

## Vérifier la qualité du code

Ces commandes vérifient que le code est propre et sans erreurs :

```sh
bun run lint
bun run check-types
```

## Formater le code

Pour uniformiser la mise en forme de tous les fichiers :

```sh
bun run format
```

## Lancer les tests

Chaque application a ses propres tests. Consultez le README de chaque application pour plus de détails :

- [apps/web/README.md](apps/web/README.md) — Tests du site web
- [apps/clean/README.md](apps/clean/README.md) — Tests de l'appli pour organiser des actions de nettoyage des déchets
- [packages/ui/README.md](packages/ui/README.md) — Tests des composants partagés

## Structure du projet

```
vrnb/
├── apps/
│   ├── web/          ← Site web de l'association
│   └── clean/        ← Appli pour organiser des actions de nettoyage des déchets
├── packages/
│   ├── ui/           ← Composants visuels partagés
│   ├── web-db/       ← Base de données MongoDB
│   ├── eslint-config/    ← Règles de qualité du code
│   └── typescript-config/ ← Configuration TypeScript
├── openspec/         ← Gestion des changements
└── package.json
```

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
turbo login
```

Without global `turbo`, use your package manager:

```sh
bunx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
bunx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
