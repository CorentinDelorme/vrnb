# Project Guidelines

## Code Style
- TypeScript-first monorepo; strict mode in all apps.
- `apps/web` is ESM (`"type": "module"`); `apps/clean` is Angular 21 with standalone components.
- Linting uses shared config from `packages/eslint-config`; each app extends it in its own `eslint.config.js`.
- Formatting is Prettier from root (`bun run format`) with `prettier-plugin-organize-imports` and `prettier-plugin-tailwindcss`.
- Prefer Bun at repo root; `pnpm` appears in `apps/web` only for Playwright `webServer` compatibility.

## Architecture
- Turborepo monorepo (`workspaces: apps/*, packages/*`) with Bun `bun@1.3.10`.
- **`apps/web`**: Next.js 16 + Payload 3.80 + MongoDB adapter — association website CMS & frontend.
- **`apps/clean`**: Angular 21 + Leaflet + DaisyUI 5 — outdoor touring app with GPX tracks.
- **`packages/web-db`**: MongoDB 8.2.6 Docker Compose service (persisted under `.data/`).
- **`packages/ui`**: Shared React component library — DaisyUI 5, Storybook 10, Vitest.
- **`packages/eslint-config`**: Shared ESLint configs (base + Next.js).
- **`packages/typescript-config`**: Shared `tsconfig` presets.
- **`openspec/`**: Spec-driven change management workflow (see `.github/skills/openspec-*`).
- Each app has its own `AGENTS.md` with domain-specific rules — closest file to edited code wins.

## Build and Test
- Install deps: `bun install`
- Start DB (required for `apps/web`): `cd packages/web-db && bun start`
- Dev all: `bun run dev` — Turbo auto-starts DB for `web` via task dependency.
- Dev web only: `bun run dev:web`
- Dev clean only: `bun run dev:clean`
- Build all: `bun run build`
- Lint all (required before handoff): `turbo lint`
- Type-check all (required before handoff): `turbo check-types`
- Web integration tests: `cd apps/web && bun run test:int` (needs running DB)
- Web E2E tests: `cd apps/web && bun run test:e2e` (needs running dev server)
- Clean unit tests: `cd apps/clean && bun run test`
- Clean E2E tests: `cd apps/clean && bun run e2e` (starts own dev server)
- UI tests: `cd packages/ui && bun run test`
- Storybook: `cd packages/ui && bun run storybook` (port 6006)

## Project Conventions
- Always use Context7 (`ctx7`) for library/API documentation, code generation, or setup — without being asked.
- Use `apps/web/.env.example` as env template; `apps/web/test.env` is only Node options.
- Typical local `DATABASE_URL`: `mongodb://root:rootpassword@127.0.0.1:27017/web?authSource=admin`.
- After Payload schema changes: `cd apps/web && bun run generate:types`.
- After adding/changing Payload admin components: `cd apps/web && bun run generate:importmap`.
- Never manually edit generated `apps/web/src/payload-types.ts`.
- DaisyUI themes only: `vrnb` (light) and `vrnb-dark` (dark) — no hard-coded colors.
- All code and comments in English; French appears in Payload entity names and URL slugs.

## Integration Points
- Payload entrypoint: `apps/web/src/payload.config.ts`.
- Turbo pipeline/env wiring: `turbo.json` (`globalEnv`: `DATABASE_URL`, `PAYLOAD_SECRET`, auth vars).
- Mongo service config: `packages/web-db/docker-compose.yml` (root/rootpassword, port 27017).
- Web E2E helpers: `apps/web/tests/helpers/login.ts`, `apps/web/tests/helpers/seedUser.ts`.
- Clean data generation: `apps/clean/scripts/generate-tours.ts`, `apps/clean/scripts/generate-pdfs.ts`.

## Security
- Admin access is controlled by referent membership (`site web`) via `apps/web/src/access/canAccessAdmin.ts`, not by role fields.
- In Payload Local API calls that should enforce user permissions, pass `overrideAccess: false`.
- In hooks, pass `req` to nested Payload operations to keep transaction context.

## Key Files
- `apps/web/src/payload.config.ts` — Payload main config
- `apps/web/src/collections/Users.ts` — User collection with auth
- `apps/web/src/access/canAccessAdmin.ts` — Admin access guard
- `apps/web/COLLECTIONS.md` — Full schema documentation
- `apps/clean/src/app/tours-service.ts` — Core business logic
- `apps/clean/src/app/tours-data.ts` — Tour definitions
- `packages/web-db/docker-compose.yml` — MongoDB service
- `turbo.json` — Pipeline + env wiring
