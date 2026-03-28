# Base de Données MongoDB (web-db)

Service Docker qui fait tourner la base de données MongoDB, utilisée par le site web (Payload CMS).

## Prérequis

- Avoir [Docker](https://www.docker.com) lancé sur votre machine

## Utilisation

| Commande | Description |
|---|---|
| `bun start` | Démarrer la base de données en arrière-plan |
| `bun stop` | Arrêter la base de données |
| `bun dev` | Démarrer au premier plan (utilisé automatiquement par `turbo dev`) |
| `bun reset` | Supprimer toutes les données locales et redémarrer à zéro |
| `bun logs` | Voir les journaux de MongoDB en temps réel |

## Où sont stockées les données ?

Les données sont sauvegardées sur votre disque dans le dossier `packages/web-db/.data/`.

Cela signifie que vos données sont conservées même si vous arrêtez Docker ou redémarrez votre ordinateur.

> Pour tout effacer et repartir de zéro, utilisez `bun reset`.

## Lancement automatique

Quand vous lancez `bun run dev` ou `bun run dev:web` depuis la racine du projet, la base de données démarre automatiquement — pas besoin de la lancer manuellement.

## Configuration

Les identifiants par défaut fonctionnent en local. Vous pouvez les modifier en créant un fichier `.env` dans ce dossier :

| Variable | Valeur par défaut | Description |
|---|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | `root` | Nom d'utilisateur MongoDB |
| `MONGO_INITDB_ROOT_PASSWORD` | `rootpassword` | Mot de passe MongoDB |
| `MONGO_INITDB_DATABASE` | `vrnb` | Nom de la base de données |

## Connexion depuis le site web

Dans le fichier `apps/web/.env`, utilisez cette URL de connexion :

```env
DATABASE_URL=mongodb://root:rootpassword@localhost:27017/vrnb?authSource=admin
```
