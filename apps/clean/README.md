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

Chaque fiche PDF de parcours affiche en haut un QR code cliquable vers
`https://clean.velorandonaturebruz.fr/tour/<zone>/<parcours>` (logo VRNB au centre).

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

## Inscriptions des binômes

Depuis la page d'accueil, chaque parcours peut être réservé par un binôme : un seul binôme
par parcours et par année, premier arrivé premier servi. Les noms ne sont jamais exposés
sur le site public.

- Configuration annuelle (année + date de l'action) :
  `src/app/registration/registration-config.ts`.
- API et stockage KV : voir [`api/README.md`](api/README.md).
- Extraction des inscriptions et fiches de suivi (référent, hors du site) :
  voir [`scripts/README-inscriptions.md`](scripts/README-inscriptions.md).

| Commande | Description |
|---|---|
| `bun scripts/extract-inscriptions.ts` | Génère les fiches de suivi de l'année dans `scripts/output/inscriptions/<année>/` (dossier local, non publié) |
