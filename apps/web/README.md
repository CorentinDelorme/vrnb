# Site Web VRNB

Site web de l'association, construit avec [Payload CMS](https://payloadcms.com/) (système de gestion de contenu) et [Next.js](https://nextjs.org/) (framework web). Les données sont stockées dans une base MongoDB.

## Prérequis

- Avoir installé les dépendances depuis la racine du monorepo (`bun install`)
- Avoir Docker lancé sur votre machine (nécessaire pour la base de données)

## Configuration

Avant le premier lancement, copiez le fichier de configuration d'exemple :

```sh
cp .env.example .env
```

Les valeurs par défaut fonctionnent en local, pas besoin de les modifier.

## Lancer en développement

### Depuis la racine du projet (recommandé)

```sh
bun run dev:web
```

> La base de données MongoDB démarre automatiquement.

### Depuis ce dossier uniquement

Si vous êtes déjà dans le dossier `apps/web`, lancez d'abord la base de données puis le serveur :

```sh
cd ../../packages/web-db && bun start && cd ../../apps/web
bun run dev
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000).

Au premier lancement, suivez les instructions à l'écran pour créer votre compte administrateur.

## Panneau d'administration

Une fois le serveur lancé, le panneau d'administration est accessible sur :

[http://localhost:3000/admin](http://localhost:3000/admin)

C'est ici que vous pouvez gérer le contenu du site (pages, médias, utilisateurs, etc.).

## Collections de données

La documentation complète du schéma de données se trouve dans [COLLECTIONS.md](COLLECTIONS.md).

## Commandes utiles

| Commande | Description |
|---|---|
| `bun run dev` | Lancer le serveur de développement |
| `bun run build` | Construire le site pour la production |
| `bun run start` | Démarrer le site en mode production |
| `bun run lint` | Vérifier la qualité du code |
| `bun run check-types` | Vérifier les types TypeScript |
| `bun run generate:types` | Régénérer les types après modification du schéma Payload |
| `bun run generate:importmap` | Régénérer l'import map après ajout de composants admin |

## Tests

### Tests d'intégration

Nécessitent que la base de données soit lancée :

```sh
bun run test:int
```

### Tests de bout en bout (E2E)

Nécessitent que le serveur de développement soit lancé :

```sh
bun run test:e2e
```

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion à MongoDB |
| `PAYLOAD_SECRET` | Clé secrète pour Payload (chiffrement des sessions) |
| `PAYLOAD_USER_EMAIL` | Email du compte administrateur initial |
| `PAYLOAD_USER_PASSWORD` | Mot de passe du compte administrateur initial |
| `NEXT_PUBLIC_SERVER_URL` | URL publique du site |
