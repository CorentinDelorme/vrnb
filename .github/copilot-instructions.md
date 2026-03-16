# Project Guidelines

## Code Style

- Primary language is TypeScript across apps and packages.
- Follow shared TS presets in [`packages/typescript-config`](../packages/typescript-config) and root [`tsconfig.json`](../tsconfig.json).
- Keep strict typing in web/packages; note CMS is intentionally less strict (`"strict": false`) in [`apps/cms/tsconfig.json`](../apps/cms/tsconfig.json).
- Use shared ESLint presets from [`packages/eslint-config`](../packages/eslint-config); do not introduce app-local lint rules unless required.
- Formatting uses Prettier with Tailwind plugin from root [`package.json`](../package.json).

## Architecture

- Monorepo managed with Bun workspaces + Turbo (`apps/*`, `packages/*`) in [`package.json`](../package.json) and [`turbo.json`](../turbo.json).
- [`apps/cms`](../apps/cms) is the Strapi backend (content types, routes, controllers, services).
- [`apps/web`](../apps/web) is the Next.js frontend.
- Shared UI components live in [`packages/ui/src/components`](../packages/ui/src/components) and are consumed via `@repo/ui`.
- Key data flow: Strapi OpenAPI JSON -> RTK Query codegen -> typed frontend API hooks.

## Build and Test

- Use Bun as package manager (`bun@1.3.10` in root [`package.json`](../package.json)).
- Root commands:
  - `bun run dev` (Turbo dev)
  - `bun run build`
  - `bun run lint`
  - `bun run typecheck`
  - `bun run format`
- Web app commands (from [`apps/web/package.json`](../apps/web/package.json)):
  - `bun run dev`, `bun run build`, `bun run lint`, `bun run typecheck`
  - `bun run generate:strapi` to regenerate `apps/web/store/strapiApi.ts`
- CMS commands (from [`apps/cms/package.json`](../apps/cms/package.json)):
  - `bun run develop` (or `bun run dev`), `bun run build`, `bun run start`
- No dedicated test scripts are currently defined; validate changes with lint + typecheck + app-specific build/dev.

## Project Conventions

- Keep edits scoped to the target app/package; avoid cross-workspace refactors unless required.
- Prefer existing patterns used by Strapi API modules in [`apps/cms/src/api`](../apps/cms/src/api).
- For frontend data access, extend generated endpoints in [`apps/web/store/strapiApi.ts`](../apps/web/store/strapiApi.ts) via codegen source, not manual edits.
- When changing CMS schemas/routes, regenerate OpenAPI and web API client before finalizing.
- Reuse shared UI primitives from [`packages/ui`](../packages/ui); avoid duplicating components in web.

## Integration Points

- OpenAPI source is [`apps/cms/src/extensions/documentation/documentation/1.0.0/full_documentation.json`](../apps/cms/src/extensions/documentation/documentation/1.0.0/full_documentation.json).
- Codegen config is [`apps/web/openapi-config.ts`](../apps/web/openapi-config.ts).
- Generated client output is [`apps/web/store/strapiApi.ts`](../apps/web/store/strapiApi.ts).
- Example CMS domain slice: `bureau` in [`apps/cms/src/api/bureau`](../apps/cms/src/api/bureau).

## Security

- Never commit secrets from `.env` files (notably under `apps/cms`).
- Auth/token and encryption secrets are configured in [`apps/cms/config/admin.ts`](../apps/cms/config/admin.ts).
- DB credentials/SSL are configured in [`apps/cms/config/database.ts`](../apps/cms/config/database.ts).
- Preserve Strapi security middleware defaults in [`apps/cms/config/middlewares.ts`](../apps/cms/config/middlewares.ts) unless explicitly required.
