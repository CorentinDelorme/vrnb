# Project Guidelines

## Code Style
- TypeScript-first monorepo; `apps/web` is strict and ESM (`"type": "module"`).
- Linting uses shared config from `packages/eslint-config` via `apps/web/eslint.config.js`.
- Formatting is Prettier from root (`bun run format`).
- Prefer Bun commands at repo root; `pnpm` appears in `apps/web` mainly for Playwright `webServer` compatibility.

## Architecture
- Turborepo monorepo (`workspaces: apps/*, packages/*`) with Bun `bun@1.3.10`.
- Main app is `apps/web`: Next.js 16 + Payload 3 + MongoDB adapter.
- MongoDB service is `packages/web-db` (Docker Compose, persisted under `.data/`).
- Shared packages: `packages/eslint-config`, `packages/typescript-config`, `packages/ui`.
- For Payload-specific implementation patterns, follow `apps/web/AGENTS.md` (closest-file instructions win).

## Build and Test
- Install deps: `bun install`
- Start DB (required for web app/tests): `cd packages/web-db && bun start`
- Dev all workspaces: `bun run dev` (alias of `turbo run dev`)
- Build all: `bun run build`
- Lint all (required before handoff): `turbo lint`
- Type-check all (required before handoff): `turbo check-types`
- Web integration tests: `cd apps/web && bun run test:int`
- Web E2E tests: `cd apps/web && bun run test:e2e` (expects dev server)

## Project Conventions
- Use `apps/web/.env.example` as env template; `apps/web/test.env` is only Node options.
- Typical local `DATABASE_URL`: `mongodb://root:rootpassword@127.0.0.1:27017/web?authSource=admin`.
- After Payload schema changes, run `cd apps/web && bun run generate:types`.
- After adding/changing Payload admin components, run `cd apps/web && bun run generate:importmap`.
- Never manually edit generated `apps/web/src/payload-types.ts`.
- Always use Context7 (`ctx7`) when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

## Integration Points
- Payload entrypoint: `apps/web/src/payload.config.ts`.
- Turbo pipeline/env wiring: `turbo.json` (`globalEnv` includes DB/auth vars).
- Mongo service config: `packages/web-db/docker-compose.yml`.
- E2E login + seed helpers: `apps/web/tests/helpers/login.ts`, `apps/web/tests/helpers/seedUser.ts`.

## Security
- Admin access is controlled by referent membership (`site web`) via `apps/web/src/access/canAccessAdmin.ts`, not by role fields.
- In Payload Local API calls that should enforce user permissions, pass `overrideAccess: false`.
- In hooks, pass `req` to nested Payload operations to keep transaction context.

## Key Files
- `apps/web/src/payload.config.ts`
- `apps/web/src/collections/Users.ts`
- `apps/web/src/access/canAccessAdmin.ts`
- `packages/web-db/docker-compose.yml`
- `turbo.json`
