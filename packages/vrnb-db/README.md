# vrnb-db

MongoDB Docker service for the vrnb monorepo, used by PayloadCMS.

## Usage

Start the database:

```sh
bun dev        # foreground (used by turbo dev)
bun start      # detached / background
bun stop       # stop and remove containers
bun reset      # wipe local persisted data and restart
bun logs       # follow mongo logs
```

Mongo data is persisted on disk in `packages/vrnb-db/.data/`.
This means data survives container shutdowns and `docker compose down`.

From the monorepo root, `turbo dev` automatically starts this service alongside the web app.

## Environment variables

Copy `.env.example` to `.env` to override defaults:

| Variable                     | Default        | Description           |
| ---------------------------- | -------------- | --------------------- |
| `MONGO_INITDB_ROOT_USERNAME` | `root`         | MongoDB root user     |
| `MONGO_INITDB_ROOT_PASSWORD` | `rootpassword` | MongoDB root password |
| `MONGO_INITDB_DATABASE`      | `vrnb`         | Initial database name |

## Connecting from apps/web

Set the following in `apps/web/.env`:

```env
DATABASE_URL=mongodb://root:rootpassword@localhost:27017/vrnb?authSource=admin
```
