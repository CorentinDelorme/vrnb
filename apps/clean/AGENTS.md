# apps/clean — Waste Clean-up Actions App

> Part of the **vrnb** monorepo. See the [root AGENTS.md](../../AGENTS.md) for monorepo build/test commands and environment setup.
> Domain vocabulary lives in [GLOSSARY.md](./GLOSSARY.md) — use its terms (Parcours, Zone, Point de rendez-vous, Étape, Fiche…) in code, docs and UI copy.

## Project Overview

Next.js 16 (App Router) + React 19 application, prerendered statically on build (SSG), with Vitest for unit testing, Playwright for E2E, ESLint on the shared `@repo/eslint-config` Next.js preset, Tailwind CSS 4 with DaisyUI 5 for styling, and Leaflet for interactive maps with GPX track rendering.

No business database: all data is embedded (generated `src/app/tours-data.ts` and static assets under `public/`). The only exception is the Édition inscriptions, which live in a remote KV store (Upstash REST) behind the Inscriptions API. The dev server listens on **port 4200** (`next dev -p 4200`, parity with the former Angular dev server and the production URLs).

Routes (anything else renders the 404 page, spec #3 US 25):

| Route                  | Page                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `/`                    | Home — zone and Parcours list                                 |
| `/manual`              | Mode d'emploi                                                 |
| `/tours/<zone>/<P\|V>` | Zone map (Type de parcours: `P` à pied, `V` vélo)             |
| `/tour/<zone>/<id>`    | Parcours page — the three Étapes                              |
| `/api/inscriptions`    | Inscriptions API — GET public state, POST binôme registration |

### Inscriptions (Édition)

The Inscriptions feature lets a **Binôme** cover a Parcours for the current Édition, first come first served. The core lives in `src/app/inscriptions/` (pure modules), the Next adapters in `app/api/inscriptions/route.ts` and the UI in `components/register-binome-modal.tsx`, `components/tour-register-button.tsx` and `components/inscriptions-status-provider.tsx`.

- **Annual pivot** — `src/app/inscriptions/edition.ts` holds `CURRENT_EDITION` (`{ year, actionDate }`) and `EDITION_TIME_ZONE` (`Europe/Paris`). Bumping those values is the whole yearly rotation; `isRegistrationOpen(edition, now)` keeps the window open until `actionDate - REGISTRATION_CLOSURE_DAYS` (3 days: the organizers need that time to print the tracking sheets and organize the day) and closes it after; the register button disappears from the home list with the window.
- **Action slot** — the home list shows the « Binôme inscrit » badge on a covered Parcours and the register button on a free one, but only once the public state answered: while it loads, and when it fails, the slot stays empty (the site never offers a registration it cannot honor).
- **KV contract** — one key per covered Parcours, `inscriptions:<year>:<zoneId>:<tourId>`, holding only the four identity fields. The reservation is atomic (`SET … NX EX`), so the first Binôme wins and a loser gets 409 without anything stored. Names never leave the store: the public state only exposes (zoneId, tourId) pairs. The coverage comes from the KEY alone: a key seeded by hand in the Upstash console covers its Parcours, whatever its value holds.
- **API contract** — `GET /api/inscriptions` answers **200** with the public state (Édition, `registrationOpen`, the covered (Zone, Parcours) pairs) and **502** `{"error":"inscriptions-unavailable"}` when the KV store is unreachable; `POST /api/inscriptions` answers **201** (created), **409** (the Parcours was covered meanwhile), **400** (`invalid-inscription` or `registration-closed`) and **500** (`inscriptions-unavailable`).
- **Retention** — every key is created with a TTL reaching `actionDate + INSCRIPTIONS_RETENTION_DAYS` (90) days in `EDITION_TIME_ZONE`, so the personal data expires with no cron and no manual purge.
- **Environment** — `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` feed the Upstash REST adapter (names only, never values in the repo).
- **Anti-bot** — the modal carries a hidden honeypot field (`website`); a filled one is refused with the same 400 as any other invalid input (`invalid-inscription`), silently, and nothing is stored.
- **Human operations** — `bun scripts/extract-inscriptions.ts` writes the « Suivi » sheets (one PDF per Zone and practice type, with the binômes of the registered Parcours filled in) into a gitignored folder, never into `public/` (runbook: `scripts/README-inscriptions-extract.md`); a deregistration is the deletion of the `inscriptions:<year>:<zoneId>:<tourId>` key in the Upstash console (the site has no admin UI).

## Build/Lint/Test Commands

All commands run from `apps/clean/` (dependencies are installed once at the monorepo root with `bun install`).

```bash
# Development server (http://localhost:4200)
bun run dev         # next dev -p 4200 (`bun run start` is the same dev server)

# Build (prerenders every route)
bun run build       # next build

# Unit tests (Vitest + jsdom + Testing Library)
bun run test        # vitest run — single run of the whole suite
bun run test:watch  # watch mode
bunx vitest run lib/tour-map.spec.ts  # single spec file

# E2E tests (Playwright — webServer boots its own dev server on port 4200)
bun run e2e         # playwright test (chromium + firefox)

# Linting and formatting
bun run lint            # eslint --max-warnings 0
bun run lint:fix        # eslint --fix . && prettier --write .
bun run format          # prettier --write .
bun run format:check    # prettier --check .

# Type checking
bun run check-types     # tsc --noEmit

# Data generation (details in README.md)
bun run generate:routes # Start/end GPX segments from the Point de rendez-vous (OSRM, Valhalla fallback)
bun run generate:tours  # Regenerate tours-data.ts + the precomputed GeoJSON assets
bun run generate:pdfs   # Regenerate the Fiche PDFs
bun run generate:one -- --tour=V1 --zone=bruz-sud  # Single Parcours/zone (--skip-routes --skip-tours)
bun run generate:zone-pdf -- --zone=bruz-sud       # Merge one Zone's PDFs into a single pack
bun run generate:all    # routes + tours + pdfs

# Inscriptions — referent extraction of the « Fiches de suivi » (local files, never deployed)
bun scripts/extract-inscriptions.ts  # Extract the Édition inscriptions (see scripts/README-inscriptions-extract.md)
```

`bun run lint`, `bun run check-types` and `bun run format:check` must be green before any handoff; never commit without passing tests.

## Code Style Guidelines

### General Principles

- React function components with named exports; no classes and no `any`.
- Strict TypeScript everywhere; `readonly` modifiers on data that must not be mutated.
- Server components by default — add `'use client'` only for hooks, events or browser APIs.
- Keep the legacy DOM contract: ids, class names and custom elements the E2E suite scopes on (e.g. `app-tour-list-section`, `my-drawer-1`) are part of the parity spec (#3) and must not be renamed.
- All code and comments in English; user-facing copy stays in French.

### Documentation & Research

- Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

### Naming Conventions

| Element        | Convention                           | Examples                                    |
| -------------- | ------------------------------------ | ------------------------------------------- |
| Components     | PascalCase export + kebab-case file  | `TourView`, `tour-view.tsx`                 |
| Next.js routes | `page.tsx` / `layout.tsx` folders    | `app/tour/[zoneId]/[id]/page.tsx`           |
| Helper modules | camelCase, pure functions            | `tour-downloads.ts`, `route-meta.ts`        |
| Unit tests     | Colocated `*.spec.ts(x)`             | `lib/tour-map.spec.ts`, `app/page.spec.tsx` |
| E2E tests      | `e2e/*.spec.ts`                      | `e2e/tour.spec.ts`                          |
| CSS            | Tailwind utilities + DaisyUI classes | `card bg-base-100 shadow-md`                |

### Imports

Import order is enforced by `prettier-plugin-organize-imports` (run `bun run format`): external packages sorted by module id, then relative imports. Use `import type` for type-only imports.

```tsx
'use client';

import { PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Tour } from '../src/app/tours-queries';
```

### Component Structure

```tsx
'use client';

import { useRouter } from 'next/navigation';

import type { Tour, TourType } from '../src/app/tours-queries';

interface TourListSectionProps {
  readonly title: string;
  readonly tours: readonly Tour[];
  readonly type: TourType;
  readonly zoneId: string;
}

export function TourListSection({ title, tours, type, zoneId }: TourListSectionProps) {
  const router = useRouter();

  const handleClick = (id: string) => {
    router.push(`/tour/${zoneId}/${id}`);
  };

  return <ul className="list bg-base-200 rounded-box">{/* … */}</ul>;
}
```

- Props are typed in a local `…Props` interface with `readonly` members.
- Pages export `generateMetadata` using `pageTitle()` from `lib/route-meta`, and call `notFound()` for unknown routes or invalid parameters (spec #3 US 25).
- State that must survive a reload lives in `src/app/tour-storage.ts` (Parcours en cours), never in module scope.

### TypeScript Guidelines

- Always define return types for functions.
- Use interfaces for object shapes; use unions instead of optional properties when possible.
- Prefer pure modules in `lib/` and `src/app/shared/` so they stay unit-testable without a DOM.

```tsx
// Good
const vTours: readonly Tour[] = [{ name: 'V1', distance: 1.1 }];

// Avoid
const tours: any[] = [];
```

### Styling

- Tailwind CSS utility classes inline; DaisyUI components (`btn`, `card`, `list`, `drawer`, `modal`…).
- DaisyUI themes only: `vrnb` (light) and `vrnb-dark` (dark) — no hard-coded colors (monorepo rule).
- Single exception, maps only: Leaflet options (the `TOUR_COLORS` palette, route stroke and GPS
  accuracy circle in `src/app/shared/map/` and `components/*-map.tsx`) embed hex constants inherited
  from the Angular app for exact visual parity (spec #3), each with an in-code parity comment. They
  cannot be Tailwind/DaisyUI theme classes because Leaflet renders to SVG/canvas outside the DOM.
- Global styles and theme imports live in `app/globals.css`.
- Responsive and accessible by default: the app is used outdoors on mobile and audited with axe in the E2E suite.

```tsx
<div className="card bg-base-100 shadow-xl">
  <button className="btn btn-primary">Click me</button>
</div>
```

### Error Handling

- Pages answer invalid URLs/parameters with `notFound()` instead of a broken shell.
- Async asset loading degrades gracefully: precomputed GeoJSON first, GPX parsing as runtime fallback.
- `try/catch` around network and file operations in the generation scripts, with an explicit log message.

### Testing

Unit tests — Vitest (jsdom, globals), colocated `*.spec.ts(x)`; component/page specs use `@testing-library/react`. No DI container: shared behavior is extracted into pure functions — that seam (pure-TS modules, 25 tests) is what spec #3 validated; the component/page RTL specs go beyond the spec's minimal seam and were added during implementation as a safety net, not as spec-validated scope.

- Migration note (implementation): the unit suite was expanded from the 25 pure-TS tests of the spec #3 seam to 290 tests today — the component/page RTL specs (`app/page.spec.tsx`, `app/manual/page.spec.tsx`, `app/not-found.spec.tsx` and friends) and the Inscriptions feature modules (`src/app/inscriptions/*.spec.ts`, `scripts/inscriptions-extract.spec.ts`, `scripts/extract-inscriptions-cli.spec.ts`) — a deliberate safety net before the PR, documented like the E2E deltas in `e2e/tests.md`.

```ts
import { describe, expect, it } from 'vitest';

import { getSegmentForStep } from './tour-map';

describe('getSegmentForStep', () => {
  it('should map step 0 to the start segment', () => {
    expect(getSegmentForStep(0)).toBe('start');
  });
});
```

- A good test asserts observable behavior (rendered page, navigation, downloads, persistence, accessibility) — never implementation details; a test that breaks when code is reorganized without a behavior change is a bad test.
- E2E tests (`e2e/*.spec.ts`) are black-box Playwright runs against the dev server started by `playwright.config.ts`; the plan and its parity deltas live in `e2e/tests.md` (single source of truth).
- Name test files after the file under test; keep comments in English.

### Git Conventions

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Run `bun run lint` and `bun run check-types` before committing
- No commit without passing tests
- Never commit without my approval first

### File Organization

```
apps/clean/
├── app/                       # Next.js App Router routes (server components)
│   ├── layout.tsx             # Root shell: header, menu drawer, analytics
│   ├── globals.css            # Tailwind + DaisyUI themes
│   ├── page.tsx               # Home `/`
│   ├── manual/page.tsx        # Mode d'emploi `/manual`
│   ├── tour/[zoneId]/[id]/page.tsx    # Parcours page (3 Étapes)
│   ├── tours/[zoneId]/[type]/page.tsx # Zone map
│   └── api/inscriptions/route.ts     # Inscriptions API (GET public state, POST registration)
├── components/                # React components (client where hooks/events needed)
├── lib/                       # Pure route/URL helpers (route-meta, menu-links…)
├── src/app/                   # Domain logic (pure TS + colocated specs)
│   ├── tours-data.ts          # GENERATED tour data — never edit by hand
│   ├── tours-queries.ts       # Parcours/Zone queries
│   ├── tour-storage.ts        # Parcours en cours persistence (localStorage)
│   ├── zones.ts               # Zones and Points de rendez-vous
│   ├── inscriptions/          # Inscriptions feature (edition, KV, validation, API core)
│   └── shared/                # gpx/ (GPX + GeoJSON) and map/ (Leaflet wrappers)
├── public/
│   ├── gpx/                   # GPX traces, one folder per Parcours
│   ├── geojson/               # GENERATED precomputed GeoJSON (one file per Parcours)
│   ├── pdf/                   # Fiche PDFs
│   └── media/ icons/ manual/  # Images, icons, manual screenshots
├── e2e/                       # Playwright specs + tests.md (E2E plan)
└── scripts/                   # Data generation (generate-*.ts) + inscriptions extraction
```

### Package Manager

- `bun`, through the monorepo workspaces; run `bun install` at the repository root.

### Key Dependencies

- Next.js 16 (App Router) + React 19
- Vitest + Testing Library (unit); Playwright + @axe-core/playwright (E2E)
- ESLint (`@repo/eslint-config` Next.js preset) + Prettier (config in `package.json`)
- Tailwind CSS 4 + DaisyUI 5 (`vrnb` / `vrnb-dark` themes only)
- Leaflet + leaflet-arrowheads + leaflet.fullscreen for maps
- HugeIcons (React) for icons; canvas-confetti on Parcours completion
- Script side: `@tmcw/togeojson`, `jspdf`/`pdf-lib`, `qrcode`, `sharp`, `tsx`

### Key Files

- `app/layout.tsx` — root shell (header, menu drawer, analytics)
- `lib/route-meta.ts` — page titles and header flags per route
- `src/app/tours-queries.ts` — Parcours/Zone queries (see GLOSSARY)
- `src/app/tours-data.ts` — generated tour definitions (never edit by hand)
- `src/app/tour-storage.ts` — Parcours en cours persistence
- `src/app/inscriptions/` — Inscriptions feature core (Édition config, KV adapter, validation, API handlers)
- `src/app/shared/gpx/` — GPX parsing and precomputed GeoJSON loading
- `src/app/shared/map/` — Leaflet wrappers (map, route, markers, position)
- `components/tour-view.tsx` — Parcours page UI (Début/Nettoyage/Fin state machine)
- `components/tours-map.tsx`, `components/tour-map.tsx` — Zone map and Parcours map
- `components/register-binome-modal.tsx` — Binôme registration modal (identity, honeypot, GDPR notice)
- `public/geojson/<zone>/<tour>.geojson` — precomputed asset (see GLOSSARY)
- `scripts/generate-tours.ts` — data pipeline (tours-data + GeoJSON)
- `scripts/README-inscriptions-extract.md` — referent runbook of the « Suivi » extraction
- `scripts/suivi-pdf.ts` — PDF renderer of the « Suivi » sheets (the printed tracking sheets)
- `e2e/tests.md` — E2E test plan
- `GLOSSARY.md` — domain vocabulary; `README.md` — commands and data generation
