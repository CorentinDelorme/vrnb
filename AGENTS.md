# vrnb – Monorepo Agent Instructions

## Architecture

Turborepo monorepo managed with **Bun** (`bun@1.3.10`). Tasks run via `turbo`.

| Package / App                | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `apps/web`                   | Next.js 16 + Payload CMS 3 (MongoDB adapter)     |
| `packages/vrnb-db`           | MongoDB 8 Docker service (persisted in `.data/`) |
| `packages/ui`                | Shared React component library (Storybook)       |
| `packages/eslint-config`     | Shared ESLint configs                            |
| `packages/typescript-config` | Shared `tsconfig.json` bases                     |

See [apps/web/AGENTS.md](apps/web/AGENTS.md) for Payload CMS–specific patterns.

## Build & Test

```sh
# Install deps (from root)
bun install

# Start MongoDB (required before running web)
cd packages/vrnb-db && bun start   # detached; data persists in .data/

# Dev (all apps in parallel)
turbo dev

# Build all
turbo build

# Type-check all
turbo check-types

# Lint all
turbo lint

# Format
bun run format
```

### apps/web tests

```sh
cd apps/web

# Integration tests (Vitest, jsdom, hits real MongoDB)
bun run test:int

# E2E tests (Playwright, Chromium – requires running dev server)
bun run test:e2e
```

## Environment Setup

Copy `apps/web/.env.example` → `apps/web/.env` (or use `apps/web/test.env` as reference):

```env
DATABASE_URL=mongodb://root:rootpassword@localhost:27017/vrnb?authSource=admin
PAYLOAD_SECRET=<any-random-string>
PAYLOAD_USER_EMAIL=test@example.com
PAYLOAD_USER_PASSWORD=password
```

## Project Conventions

- **Package manager**: Bun at the root; `pnpm` engine declared in `apps/web` (legacy). Use `bun` at the root.
- **TypeScript**: strict, `"type": "module"` in `apps/web`. Run `tsc --noEmit` to validate.
- **After schema changes**: run `bun run generate:types` inside `apps/web` to regenerate `src/payload-types.ts`.
- **After adding components** to Payload config: run `bun run generate:importmap` inside `apps/web`.
- **Integration tests** bootstrap a real Payload instance against MongoDB – keep the DB running.
- **E2E tests** (`playwright.config.ts`) use `pnpm dev` as `webServer`; change to `bun dev` if using Bun directly.

## Key Files

- [apps/web/src/payload.config.ts](apps/web/src/payload.config.ts) – Payload entry point
- [apps/web/src/payload-types.ts](apps/web/src/payload-types.ts) – auto-generated, never edit manually
- [packages/vrnb-db/docker-compose.yml](packages/vrnb-db/docker-compose.yml) – MongoDB service definition
- [turbo.json](turbo.json) – task pipeline
