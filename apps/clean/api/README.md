# `apps/clean/api` — Vercel Functions (binome registration)

Serverless API of the binome registration feature: `GET`/`POST /api/inscriptions`,
deployed with the Angular app on Vercel (same origin, no CORS). One binome per
(parcours, year), first come first served; personal data never leaves the store
through this API.

| File                                    | Role                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `inscriptions.ts`                       | Vercel Function entry (Web `Request`/`Response`, Node.js runtime)           |
| `../server/inscriptions-handler.ts`     | Pure HTTP handler (the single test seam; ports for store and captcha)       |
| `../server/kv.ts`                       | Upstash Redis REST store (`SET ... NX`, `SCAN` + `MGET`, no runtime dependency) |
| `../server/turnstile.ts`                | Cloudflare Turnstile siteverify verifier                                    |

The HTTP contract (types, French messages, KV key format
`inscriptions:<year>:<zoneId>:<tourName>`) lives in
`../src/app/registration/registration-contract.ts`. The annual edition (year +
action date) lives in `../src/app/registration/registration-config.ts`. The
extraction script for tracking sheets is separate and never deployed.

## Environment variables

Set on Vercel for **Production and Preview** (never committed):

| Variable                                      | Required        | Description                                                                                  |
| --------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | yes     | Upstash Redis REST endpoint and **standard** token (read/write; SCAN requires it).            |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN`       | fallback        | Vercel-Marketplace-compatible names; used when the `UPSTASH_*` pair is absent.                |
| `TURNSTILE_SITE_KEY`                          | recommended     | Public Cloudflare Turnstile site key, served to the client by `GET /api/inscriptions`.        |
| `TURNSTILE_SECRET_KEY`                        | yes (for POST)  | Cloudflare Turnstile secret. When missing, POST answers a clean 500; GET keeps working.       |

Notes:

- The **standard** Upstash token must never reach the browser; only the functions
  and the local extraction script use it. Read-only tokens cannot run `SCAN`.
- `GET /api/inscriptions` returns `turnstileSiteKey: ''` when the site key is not
  configured, so a preview without Turnstile still shows the covered tours.

## Vercel + Upstash setup

1. **Upstash Redis via the Vercel Marketplace** (Vercel KV no longer exists):
   from `apps/clean`, run `vercel install upstash` (or Dashboard → Storage →
   Marketplace → Upstash Redis). The integration injects both the `UPSTASH_*`
   and `KV_REST_API_*` variable pairs.
2. `vercel env pull .env.local`, then confirm which pairs were injected; the code
   reads `UPSTASH_*` first, `KV_REST_API_*` second.
3. **Turnstile**: create the widget in the Cloudflare dashboard and set the site
   key and secret per environment. The function bundle needs no rebuild when the
   keys change (they are read per request).
4. **Project settings**: Root Directory `apps/clean`, Node.js 24.x. For local
   `vercel dev`, make sure the Development Command passes `$PORT`
   (fallback: `"devCommand": "ng serve --port $PORT"`); not verified in this
   workstream.
5. `vercel.json` excludes `/api/*` from the SPA rewrite with the documented
   negative-lookahead pattern `/:path((?!api/).*)`, so everything else (deep
   links like `/tour/bruz-sud/V1`) still serves `index.html`.

### Turnstile test keys (local, e2e and preview only)

Official test keys, documented here and used in no code:

- Always pass: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`
- Always fail: site key `2x00000000000000000000AB`, secret `2x0000000000000000000000000000000AA`
- Dummy token produced by test site keys: `XXXX.DUMMY.TOKEN.XXXX`

Production keys reject dummy tokens; test keys work on any domain.

## Local development and checks

```bash
# Node-side unit tests (Vitest, Node runtime — not `bun test`, not `ng test`)
bun run test:api

# Type-check the API, the server modules and the extraction scripts
bun run check-types
```

`vercel dev` (from `apps/clean`, after `vercel link`) serves `/api` functions and
applies the rewrites locally; function iteration is faster through the Vitest
suite above.

## Operations runbook

All manual operations use the KV console or CLI; there is no admin UI.

- **Browse registrations**: Upstash Console → database → Data Browser / CLI, or
  Vercel Dashboard → project → Storage → resource → **Database** (Redis browser
  and CLI; requires Owner permissions).
- **Cancel one registration (désistement)**: delete the key
  `inscriptions:<year>:<zoneId>:<tourName>` (e.g. `inscriptions:2027:bruz-sud:V1`).
  The tour becomes available again immediately on the public site.
- **Annual purge (early January, personal-data retention)**: delete all keys
  `inscriptions:<previous-year>:*` (`SCAN` then `DEL` from the console/CLI). The
  new year starts empty with no deployment: keys are namespaced by year.
- **Extract the year's registrations** for the tracking sheets: run the local
  extraction script (`scripts/extract-inscriptions.ts`, documented in its own
  README) with the standard token; output stays in a local, git-ignored folder.

## Preview-deployment smoke test (TODO before production)

On a preview URL with the test Turnstile keys and the Upstash integration:

1. `GET /api/inscriptions` → 200,
   `{"year":<edition year>,"coveredTours":[...],"turnstileSiteKey":"..."}`.
2. Root `/` and deep link `/tour/bruz-sud/V1` → app HTML (rewrite matches).
3. `POST /api/inscriptions` with a test token → 201; same tour again → 409
   `already_registered`; the key exists in the KV console.
4. After the smoke test, delete the 201-created key (or purge the preview year).
