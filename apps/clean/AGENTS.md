# apps/clean — Waste Clean-up Actions App

> Part of the **vrnb** monorepo. See the [root AGENTS.md](../../AGENTS.md) for monorepo build/test commands and environment setup.
> Domain vocabulary lives in [GLOSSARY.md](./GLOSSARY.md) — use its terms (Parcours, Zone, Point de rendez-vous, Étape, Fiche…) in code, docs and UI copy.

## Project Overview

Next.js 16 (App Router) + React 19 application, prerendered statically on build (SSG), with Vitest for unit testing, Playwright for E2E, ESLint on the shared `@repo/eslint-config` Next.js preset, Tailwind CSS 4 with shadcn/ui (Base UI primitives + `hugeicons`, `components/ui/` installed by the shadcn CLI) for styling, and Leaflet for interactive maps with GPX track rendering.

No business database: all data is embedded (generated `src/app/tours-data.ts` and static assets under `public/`). The only exception is the Édition inscriptions, which live in a remote KV store (Upstash REST) behind the Inscriptions API. The dev server listens on **port 4200** (`next dev -p 4200`, parity with the former Angular dev server and the production URLs).

Routes (anything else renders the 404 page, spec #3 US 25):

| Route                             | Page                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| `/`                               | Home — zone and Parcours list                                        |
| `/manual`                         | Mode d'emploi                                                        |
| `/tours/<zone>/<P\|V>`            | Zone map (Type de parcours: `P` à pied, `V` vélo)                    |
| `/tour/<zone>/<id>`               | Parcours page — the three Étapes                                     |
| `/api/inscriptions`               | Inscriptions API — GET public state, POST binôme registration        |
| `/api/calendrier/<zone>/<tourId>` | Fichier calendrier (.ics) — agenda link of a (Zone, Parcours) couple |

### Inscriptions (Édition)

The Inscriptions feature lets a **Binôme** cover a Parcours for the current Édition, first come first served. The core lives in `src/app/inscriptions/` (pure modules), the Next adapters in `app/api/inscriptions/route.ts` and the UI in `components/register-binome-modal.tsx`, `components/tour-register-button.tsx` and `components/inscriptions-status-provider.tsx`.

- **Annual pivot** — `src/app/inscriptions/edition.ts` holds `CURRENT_EDITION` (`{ year, actionDate, inscriptionsOpenDate, actionStartTime, actionEndTime }`) and `EDITION_TIME_ZONE` (`Europe/Paris`). Bumping those values is the whole yearly rotation. The registration window has two bounds, derived by `registrationWindowPhase(edition, now)` (injectable clock): `not-open-yet` (before `inscriptionsOpenDate`, the home announces the opening date while offering no registration), then `open` until `actionDate - REGISTRATION_CLOSURE_DAYS` (3 days: the organizers need that time to print the tracking sheets and organize the day), then `closed`; `isRegistrationOpen` is exactly the `open` phase. On the client, `registrationWindowPhaseOf` (`components/inscriptions-status-provider.tsx`) takes the loaded server answer as authoritative (a local clock that reads the window open never reopens what the server answered closed), falling back to the bundled Édition plus the local clock; the register button and the « Binôme inscrit » badge follow the window.
- **Action slot** — the home list shows the « Binôme inscrit » badge on a covered Parcours and the register button on a free one, but only once the public state answered: while it loads, and when it fails, the slot stays empty (the site never offers a registration it cannot honor).
- **KV contract** — one key per covered Parcours, `inscriptions:<year>:<zoneId>:<tourId>`, holding only the four identity fields. The reservation is atomic (`SET … NX EX`), so the first Binôme wins and a loser gets 409 without anything stored. Names never leave the store: the public state only exposes (zoneId, tourId) pairs. The coverage comes from the KEY alone: a key seeded by hand in the Upstash console covers its Parcours, whatever its value holds.
- **API contract** — `GET /api/inscriptions` answers **200** with the public state (Édition, `registrationOpen`, the covered (Zone, Parcours) pairs) and **502** `{"error":"inscriptions-unavailable"}` when the KV store is unreachable; `POST /api/inscriptions` answers **201** (created), **409** (the Parcours was covered meanwhile), **400** — `invalid-inscription`, or `registration-not-open` before the opening bound, or `registration-closed` after, every refusal storing nothing — and **500** (`inscriptions-unavailable`).
- **Calendar** — the pure module `lib/tour-calendar.ts` builds the agenda artefacts of a registered Parcours (`tourGoogleCalendarUrl`, `tourIcsContent`, `actionHoursLabel`) from the Édition config alone, with the stable event id `vrnb-<year>-<zoneId>-<tourId>@vrnb-site` and no personal data; the route `app/api/calendrier/[zoneId]/[tourId]/route.ts` injects the generation instant and serves **200** `text/calendar` (explicit filename `calendrier-<zoneId>-<tourId>.ics`), **404** with no file for an unknown (Zone, Parcours) couple. The two agenda links live only in the confirmation of the modal (`components/register-binome-modal.tsx`), and while the window is `not-open-yet` the home announcement `components/inscriptions-opening-announcement.tsx` replaces the register button with the opening date in letters.
- **Retention** — every key is created with a TTL reaching `actionDate + INSCRIPTIONS_RETENTION_DAYS` (90) days in `EDITION_TIME_ZONE`, so the personal data expires with no cron and no manual purge.
- **Environment** — `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` feed the Upstash REST adapter (names only, never values in the repo).
- **Anti-bot** — the modal carries a hidden honeypot field (`website`); a filled one is refused with the same 400 as any other invalid input (`invalid-inscription`), silently, and nothing is stored.
- **Human operations** — `bun scripts/extract-inscriptions.ts` writes the « Suivi » sheets (one PDF per Zone and practice type, with the binômes of the registered Parcours filled in) into a gitignored folder, never into `public/` (runbook: `scripts/README-inscriptions-extract.md`); a deregistration is the deletion of the `inscriptions:<year>:<zoneId>:<tourId>` key in the Upstash console (the site has no admin UI).

### Data generation (incremental pipeline)

The generation scripts under `scripts/` are thin orchestrators: the logic lives in pure, unit-tested modules.

- **Versioned state** — `scripts/generation-state.ts` owns the fingerprints (the sha256 of the source trace, of the Point de rendez-vous of the Zone, of the produced start/end segments, of the Fiche and of the Zone overview map) and the version constant `GENERATION_STATE_VERSION`, which covers the routing algorithm and the Fiche template — bumping it invalidates every artefact. The state itself is `scripts/generation-state.json`, **committed in the repository**: a fresh clone therefore behaves like an up-to-date working copy. An unknown fingerprint is an absent key in the file (never a `null`).
- **Generation plan** — `scripts/generation-plan.ts` is the pure decision of what a run must regenerate: `planGeneration({ state, currentVersion, candidates, zoneMapFingerprints, filters, force })` returns one decision per Parcours (re-route the segments? re-render the Fiche?) and one per Zone overview map, each with its reason (`forced`, `trace-changed`, `meeting-point-changed`, `parcours-changed`, `up-to-date`…). It touches neither the network nor the filesystem: the callers compute the fingerprints.
- **Network scheduler** — `scripts/network-scheduler.ts` enforces the politeness of the pipeline, per host: one request every 400 ms, at most 2 simultaneous connections, and in-flight de-duplication of identical requests (a tile needed by two Fiches at once is downloaded once). The clock and the `fetch` are injected. `scripts/tile-fetcher.ts` reads the shared disk cache (`scripts/.cache/tiles/`, gitignored) first and only then goes to the network, and exposes the cache-hit / download counters.
- **Routing** — `scripts/route-parcours.ts` (pure orchestration, two Parcours routed at a time), `scripts/router-client.ts` (OSRM and Valhalla asked at the same time, the shortest answer wins) and `scripts/segment-gpx.ts` (the GPX writer, whose output must not change).
- **Perf block** — `scripts/generation-perf.ts` builds and renders the `[perf]` block every script ends with: the total duration, the duration of each step, the tiles from cache vs downloaded, and a French recap table of what the run did with every element (the segments, the data, the Fiches, the zone maps and the packs) — one line per element the run changed, one line per group of elements it left alone, with the reason of every decision. `scripts/generation-subjects.ts` owns the French vocabulary of the subjects (their name, the unit they count and their decisions); the scripts pick the subjects they act on. The JSON reports land in `scripts/output/perf/` (gitignored) and the orchestrators merge them.
- **Orchestration** — `scripts/generation-steps.ts` holds the three steps of the pipeline (`generate:routes` → `generate:tours` → `generate:pdfs`) and the plumbing they share (the reading and the writing of the generation state, the `[perf]` block of an orchestrated run); `generate-all.ts` and `generate-one.ts` run them and aggregate their reports. `generate-one` forwards the filters (`--tour`, `--zone`) and `--force` to every step, so a single Parcours follows the same incremental logic as a full run.

The published documents are the Fiches (`public/pdf/<zone>/<parcours>.pdf`) and the Zone overview maps — the « Fiche de zone » (`public/pdf/<zone>/Carte_parcours_a_velo.pdf`, `..._pied.pdf`). The « Fiches de suivi » are **not** published any more: they are produced locally by `bun scripts/extract-inscriptions.ts`, outside the site, and the Menu only offers the Zone map PDF.

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
bun run generate:pdfs   # Regenerate the Fiche PDFs and the Zone overview maps (--force)
bun run generate:one -- --tour=V1 --zone=bruz-sud  # Single Parcours/zone (--skip-routes --skip-tours --force)
bun run generate:zone-pdf -- --zone=bruz-sud       # Merge one Zone's PDFs into scripts/output/packs/
bun run generate:all    # routes + tours + pdfs (incremental; --force regenerates everything)
bun run generate:state  # Complete the versioned generation state with the committed Fiches

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

| Element        | Convention                                     | Examples                                    |
| -------------- | ---------------------------------------------- | ------------------------------------------- |
| Components     | PascalCase export + kebab-case file            | `TourView`, `tour-view.tsx`                 |
| Next.js routes | `page.tsx` / `layout.tsx` folders              | `app/tour/[zoneId]/[id]/page.tsx`           |
| Helper modules | camelCase, pure functions                      | `tour-downloads.ts`, `route-meta.ts`        |
| Unit tests     | Colocated `*.spec.ts(x)`                       | `lib/tour-map.spec.ts`, `app/page.spec.tsx` |
| E2E tests      | `e2e/*.spec.ts`                                | `e2e/tour.spec.ts`                          |
| CSS            | Tailwind utilities + shadcn/ui semantic tokens | `bg-background text-muted-foreground`       |

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

  return <ul className="divide-y divide-border">{/* … */}</ul>;
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

- shadcn/ui components from `components/ui/` — always prefer the full composition
  (`CardHeader`/`CardTitle`/`CardContent`…, `DialogTitle`/`DialogDescription` in every dialog,
  `FieldGroup`/`Field`/`FieldError` for forms) before custom markup.
- Tailwind utilities inline with **semantic tokens** (`bg-background`, `text-muted-foreground`,
  `text-secondary`…) — never raw colors; light/dark variations come from the CSS variables mapped
  in `app/globals.css`.
- **Never add `margin`/`padding` on a shadcn component** to fight its built-in spacing — rely on
  the composition (Card `gap-(--card-spacing)`, grid gaps, `flex gap-*`, not `space-y-*`) and only
  keep an override when the layout genuinely requires it. `className` is for layout (widths,
  sticky, grid), not typography/colors of the component.
- Single exception, maps only: Leaflet options (the `TOUR_COLORS` palette, route stroke and GPS
  accuracy circle in `src/app/shared/map/` and `components/*-map.tsx`) embed hex constants inherited
  from the Angular app for exact visual parity (spec #3), each with an in-code parity comment. They
  cannot be Tailwind theme classes because Leaflet renders to SVG/canvas outside the DOM.
- Global styles and theme tokens live in `app/globals.css`.
- Responsive and accessible by default: the app is used outdoors on mobile and audited with axe in the E2E suite.

```tsx
<Card>
  <CardHeader>
    <CardTitle>{zone.name}</CardTitle>
    <CardAction>
      <Badge variant="secondary">{count} parcours</Badge>
    </CardAction>
  </CardHeader>
  <CardContent>
    <Button>Click me</Button>
  </CardContent>
</Card>
```

- **`components/ui/` is installed by the shadcn CLI — never edit it.** If a shadcn primitive needs
  a change, wrap it in a custom component in `components/` instead of editing the file under
  `components/ui/`. The files there are regenerated by `shadcn add` and any manual edit is lost.
- **Links styled as buttons follow the shadcn "As Link" pattern** (the `Button` here is built on
  Base UI, not Radix Slot): `<Link href="…" className={buttonVariants({ … })}>` with `buttonVariants`
  from `components/ui/button`. Never put a `<Button>` inside a `<Link>` (nor wrap a link in one):
  the Base UI Button always applies `role="button"`, which overrides the semantic link role of the
  `<a>`, and `<a><button>` is invalid HTML. Reserve `<Button onClick={…}>` for genuine actions
  (submit, open a drawer, next Étape) — plain navigation is a `<Link>`, not a button that calls
  `router.push`.

### Error Handling

- Pages answer invalid URLs/parameters with `notFound()` instead of a broken shell.
- Async asset loading degrades gracefully: precomputed GeoJSON first, GPX parsing as runtime fallback.
- `try/catch` around network and file operations in the generation scripts, with an explicit log message.

### Testing

Unit tests — Vitest (jsdom, globals), colocated `*.spec.ts(x)`; component/page specs use `@testing-library/react`. No DI container: shared behavior is extracted into pure functions — that seam (pure-TS modules, 25 tests) is what spec #3 validated; the component/page RTL specs go beyond the spec's minimal seam and were added during implementation as a safety net, not as spec-validated scope. The generation pipeline follows the same rule: the **generation plan** (a pure function of fake inputs) and the **network scheduler** (injected clock and `fetch`) are the two seams the unit suite targets, so the incremental decisions and the politeness of the pipeline are checked without touching the network.

- Migration note (implementation): the unit suite was expanded from the 25 pure-TS tests of the spec #3 seam to 507 tests today — the component/page RTL specs (`app/page.spec.tsx`, `app/manual/page.spec.tsx`, `app/not-found.spec.tsx` and friends), the Inscriptions feature modules (`src/app/inscriptions/*.spec.ts`, `scripts/inscriptions-extract.spec.ts`, `scripts/extract-inscriptions-cli.spec.ts`) and the generation pipeline modules (`scripts/generation-plan.spec.ts`, `scripts/generation-state.spec.ts`, `scripts/generation-perf.spec.ts`, `scripts/generation-subjects.spec.ts`, `scripts/generation-helpers.spec.ts`, `scripts/generation-messages.spec.ts`, `scripts/generation-steps.spec.ts`, `scripts/network-scheduler.spec.ts`, `scripts/tile-fetcher.spec.ts`, `scripts/route-parcours.spec.ts`, `scripts/router-client.spec.ts`, `scripts/segment-gpx.spec.ts`) — a deliberate safety net before the PR, documented like the E2E deltas in `e2e/tests.md`.

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
│   ├── globals.css            # Tailwind 4 + shadcn/ui tokens (vrnb palette mapped to CSS variables)
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
└── scripts/                   # Data generation (orchestrators + pure modules) + inscriptions extraction
```

### Package Manager

- `bun`, through the monorepo workspaces; run `bun install` at the repository root.

### Key Dependencies

- Next.js 16 (App Router) + React 19
- Vitest + Testing Library (unit); Playwright + @axe-core/playwright (E2E)
- ESLint (`@repo/eslint-config` Next.js preset) + Prettier (config in `package.json`)
- Tailwind CSS 4 + shadcn/ui (components in `components/ui/`, Base UI primitives, hugeicons)
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
- `scripts/generation-state.ts` + `scripts/generation-state.json` — the versioned generation state (fingerprints + version constant)
- `scripts/generation-plan.ts` — the pure generation plan (what must be regenerated, and why)
- `scripts/generation-perf.ts` — the `[perf]` report of a run
- `scripts/network-scheduler.ts` + `scripts/tile-fetcher.ts` — polite per-host scheduling and the shared tile cache
- `scripts/README-inscriptions-extract.md` — referent runbook of the « Suivi » extraction
- `scripts/suivi-pdf.ts` — PDF renderer of the « Suivi » sheets (the printed tracking sheets)
- `e2e/tests.md` — E2E test plan
- `GLOSSARY.md` — domain vocabulary; `README.md` — commands and data generation
