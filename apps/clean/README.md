# Appli Nettoyage Citoyen VRNB (Clean)

Application web pour organiser des actions de nettoyage des déchets, construite avec [Angular](https://angular.dev/). Elle permet de consulter les parcours de ramassage sur une carte interactive (Leaflet), de répartir les zones de nettoyage entre les différents groupes, de visualiser les tracés GPX et de télécharger les fiches PDF de chaque parcours.

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
| `bun run dev` | Lancer le serveur de développement |
| `bun run build` | Construire l'application pour la production |
| `bun run lint` | Vérifier la qualité du code |
| `bun run lint:fix` | Corriger automatiquement les problèmes de qualité |
| `bun run check-types` | Vérifier les types TypeScript |
| `bun run test` | Lancer les tests unitaires |
| `bun run e2e` | Lancer les tests de bout en bout (E2E) |

## Générer les données

Les données des parcours de nettoyage et les fiches PDF peuvent être régénérées avec ces commandes :

```sh
bun run generate:tours    # Régénérer les données des parcours
bun run generate:pdfs     # Régénérer les fiches PDF
bun run generate:all      # Tout régénérer
```

## Tests

### Tests unitaires

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
├── src/app/          ← Code source de l'application
├── public/
│   ├── gpx/          ← Fichiers de tracés GPS (un dossier par zone de nettoyage)
│   ├── pdf/          ← Fiches PDF téléchargeables par groupe
│   ├── media/        ← Images et médias
│   └── icons/        ← Icônes
├── e2e/              ← Tests de bout en bout
└── scripts/          ← Scripts de génération de données
```
