# Project Guidelines

## Code Style
- TypeScript-first monorepo; strict mode in all apps.
- `apps/web` and `apps/clean` are ESM (`"type": "module"`); `apps/clean` is Next.js 16 (App Router) + React 19.
- Linting uses shared config from `packages/eslint-config`; each app extends it in its own `eslint.config.js`.
- Formatting is Prettier from root (`bun run format`); each app carries its own Prettier config (`apps/web/.prettierrc.json`, `apps/clean/package.json` with `prettier-plugin-organize-imports`, `prettier-plugin-tailwindcss`, `prettier-plugin-organize-attributes`).
- Prefer Bun at repo root; `pnpm` appears in `apps/web` only for Playwright `webServer` compatibility.

## Architecture
- Turborepo monorepo (`workspaces: apps/*, packages/*`) with Bun `bun@1.3.10`.
- **`apps/web`**: Next.js 16 + Payload 3.80 + MongoDB adapter — association website CMS & frontend.
- **`apps/clean`**: Next.js 16 (App Router) + Leaflet + shadcn/ui — waste clean-up actions app with GPX tracks and precomputed GeoJSON maps.
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
- Clean unit tests: `cd apps/clean && bun run test` (Vitest)
- Clean E2E tests: `cd apps/clean && bun run e2e` (Playwright, starts own dev server on port 4200)
- Clean formatting check: `cd apps/clean && bun run format:check` (Prettier)
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
- Clean data generation: `apps/clean/scripts/generate-all.ts` (orchestrator: routes -> data -> Fiches), `apps/clean/scripts/generate-tours.ts` (tour data + precomputed GeoJSON), `apps/clean/scripts/generate-start-end-gpx.ts` (OSRM/Valhalla), `apps/clean/scripts/generate-pdfs.ts`; the versioned generation state: `apps/clean/scripts/generation-state.json`.

## Security
- Admin access is controlled by referent membership (`site web`) via `apps/web/src/access/canAccessAdmin.ts`, not by role fields.
- In Payload Local API calls that should enforce user permissions, pass `overrideAccess: false`.
- In hooks, pass `req` to nested Payload operations to keep transaction context.

## Key Files
- `apps/web/src/payload.config.ts` — Payload main config
- `apps/web/src/collections/Users.ts` — User collection with auth
- `apps/web/src/access/canAccessAdmin.ts` — Admin access guard
- `apps/web/COLLECTIONS.md` — Full schema documentation
- `apps/clean/src/app/tours-queries.ts` — Core tour queries (list, filtering)
- `apps/clean/src/app/tours-data.ts` — Generated tour definitions (never edit by hand)
- `apps/clean/scripts/generation-state.json` — Versioned generation state (fingerprints of the produced artefacts)
- `apps/clean/GLOSSARY.md` — Domain vocabulary for the clean-up app
- `packages/web-db/docker-compose.yml` — MongoDB service
- `turbo.json` — Pipeline + env wiring

## Agent skills

### Issue tracker

Issues live as GitHub issues in this repo's GitHub Issues, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

multi-context: root `GLOSSARY-MAP.md` pointing at one `GLOSSARY.md` per context (currently only `apps/clean` has one), plus context-scoped `docs/adr/`. See `docs/agents/domain.md`.
