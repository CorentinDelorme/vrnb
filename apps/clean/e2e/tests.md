# tests.md — E2E Test Plan (Playwright)

> This document is the single source of truth for all E2E tests.
> Each section maps 1:1 to a spec file in `e2e/`.
> Implementing agents should create each file independently following the patterns here.

---

## General Setup

- **Framework:** Playwright Test (`@playwright/test`)
- **Config:** `playwright.config.ts` — baseURL `http://localhost:4200`, projects: Chromium + Firefox
- **Dev server:** must be running (`npm start`) or configure `webServer` in playwright config
- **Imports pattern:**
  ```ts
  import { expect, test } from '@playwright/test';
  ```
- **Representative tours:** V1 (bike, 1.1 km) and P3 (walking, 0.7 km) used as examples throughout
- **Deleted** `e2e/example.spec.ts` (broken placeholder expecting wrong title)
- **Installed** `@axe-core/playwright` as devDependency for a11y tests

---

## Migration notes (Angular → Next.js)

Deltas to the original 88-test plan, each justified by an entry of spec #3:

1. **`should have play button on each tour row` (home) and `should still display all tour rows on
mobile`: expected count 34 → 47.** Stale assertion, not a migration change: commit `2155965`
   (2026-10-18, "feat: add bruz ker lann tours") added the `bruz-ker-lann` zone and its 13 bike tours
   to `ZONES` / `toursData` but the assertion, written in `222dcd9` (2026-10-16), was never updated.
   Both commits predate the migration baseline `c2ae89e`, so the Angular reference itself rendered 47
   play buttons at baseline: `tours-list.html` loops over **all** `tourService.zones` — 28 Bruz Sud
   (15 V + 13 P) + 6 Vau Gaillard + 13 Ker Lann = 47 — with one `button[aria-label="Lancer le parcours"]`
   per `li.list-row`. `src/app/tours-data.ts` confirms 47 tour entries (13 / 28 / 6 per zone). The
   updated expectation matches both the Angular reference and the Next app.
2. **New tests beyond the 88** (same seam — black-box page DOM, no new seam):
   - `Tours map — Drawing parity` (2 tests): the original plan asserted only `div#map` visibility;
     parity for US 8–12 needs evidence that each tour is drawn as a distinct colored trace with
     start/end pins, labels and the fullscreen control.
   - `Tours map — Invalid params` (2 tests) and `App` 404 test (1 test): cover the **only sanctioned
     behavioral delta** (US 25 / route contract: unknown URL or invalid parameter → `notFound()`,
     HTTP 404 + "Page introuvable"). The legacy SPA answered a broken 200 shell, so there is no legacy
     behavior to preserve here.
   - `Cross-route navigation` scroll-restoration test (1 test): makes the spec #3 intent « scroll
     restauré en haut de navigation » explicit and covered — navigate from the bottom of `/` to a
     tour page, assert `window.scrollY` is back at the top. Relies on the App Router default (no
     custom scroll code), so browser-back keeps its own restoration.
   - `Manual — keeps spaces around bold words in the rendered copy` (1 test): guards a JSX
     whitespace pitfall (a space between an inline element and the following text is stripped when
     it contains `&apos;` — cf. the note in `app/manual/page.tsx`). Migration rendering delta, not a
     behavior change: Vitest keeps the space (different JSX transform), so only a run against the
     served page catches it.

Totals: **95 tests per browser** (88 original + 7 added) × chromium + firefox = **190**.

Inscriptions feature additions (tickets #16, #17 and #18 — no parity impact, the legacy DOM contract is unchanged):

3. **`Public inscriptions statuses` (3 tests)**: the covered Parcours of the Édition shows a
   « Binôme inscrit » badge — in the row, where the register button stands, next to the play
   button — obtained after hydration from `GET /api/inscriptions`; that endpoint is intercepted
   with `page.route`, so the totals above (and the 47 play buttons) stay unchanged.

4. **`Binôme registration` (4 tests, ticket #17)**: uncovered Parcours rows of an open Édition
   window offer a register button (`aria-label="S'inscrire en binôme pour le parcours <tourId>"`,
   visible-text-first per WCAG 2.5.3 Label in Name — enforced by the home-page axe audit) next to
   their play button; the registration flows through the DaisyUI modal and `POST /api/inscriptions`.
   Both directions of the API stay intercepted with `page.route`, so the totals above (and the 47
   play buttons) stay unchanged.

5. **`Closed registration window` (3 tests) and `Anti-bot honeypot and GDPR notice` (4 tests),
   ticket #18**: the register button disappears once the registration window is closed (and when
   the public state cannot be loaded), the hidden anti-bot honeypot is in the DOM but invisible to
   humans, and the modal states the 90-day retention of the names. The "closed window" cases fix
   the browser clock with `page.clock.setFixedTime` before the navigation, so the instant is
   deterministic; the mocked API answers the closed window like the real server would answer it
   then. The registration window stays **open until 3 days before the action**
   (`REGISTRATION_CLOSURE_DAYS`) and closes after it — one case fixes the clock on the last
   registration day and expects an open window. A closed window hides the register button of the
   uncovered rows (a covered Parcours loses it too), so the play-button contract (47) stays
   unchanged. The modal of a closed window (its own closed state, reached when the public state
   could not be loaded) is covered by the unit suite, not by an E2E case.

6. **`Manual — should list every section in the sommaire and jump to it` (1 test)**: the mode
   d'emploi `/manual` opens with a sommaire that lists every section of the page — numbered, in
   reading order: 1. principe, 2. exemple P2, 3. reprendre plus tard, 4. Menu, 5. inscription
   d'un binôme (LAST after the action-day story, ticket #37) — and links to the `id` of its
   heading — the page is read on a phone, outdoors. The test asserts the five anchors and
   that each one resolves to a visible heading (each an `<h2>` carrying its sommaire number),
   then clicks the « S'inscrire en binôme » link and asserts the jump to `#inscription`. No
   parity impact: the legacy manual page had no sommaire, and the DOM contract of the manual is
   only extended.

7. **`Registration opening announcement` (1 test, ticket #34)**: before the opening bound of
   the Édition (2027-01-04), the home — which shows no badge and no register button then —
   states the opening date in letters (« Les inscriptions ouvrent le lundi 4 janvier 2027. »)
   once the public state has loaded, one sentence for the whole page. The mention resolves
   client-side, so the prerendered HTML carries nothing, and it disappears once the mocked
   state announces an open window: the mocked GET re-evaluates a mutable flag, `page.reload()`
   replays the exchange with `registrationOpen: true`, and the browser clock (fixed before
   the opening bound with `page.clock.setFixedTime`) stays untouched — the loaded server
   answer is authoritative. No parity impact: the mention is a new element, the legacy DOM
   contract (47 play buttons, badges, register buttons, modal) is unchanged.

8. **`Calendar file route` (2 tests) and confirmation calendar links, ticket #36**: the
   registration confirmation reached at the end of the full `Binôme registration` flow now
   recalls the meeting point (note sentence, hours from the Édition config, Point de
   rendez-vous) and offers the two agenda links — asserted inside that extended existing
   case, not as new cases. The two NEW cases exercise the thin adapter route
   `/api/calendrier/<zone>/<parcours>` against the real dev server at request level
   (`page.request.get`): a known (Zone, Parcours) couple answers 200 `text/calendar` with an
   explicit filename and the RFC 5545 body (stable event id `UID:vrnb-2027-<zone>-<parcours>@vrnb-site`,
   `SUMMARY` carrying the action, the Zone and the Parcours), an unknown couple answers 404
   with an empty body. The route needs no KV store, so no interception is needed (see the
   « Calendar file route » intro). No parity impact: no new route of the legacy DOM contract,
   the links exist only on the confirmation panel of the modal.

Totals: **113 tests per browser** (102 after tickets #16 and #17, + 7 for ticket #18, + 1 for the mode d'emploi sommaire, + 1 for the inscriptions opening announcement — ticket #34, + 2 for the calendar file route — ticket #36) × chromium + firefox = **226**.

---

## File: `e2e/app.spec.ts`

Route: `/` (smoke) and unknown URLs (404)

### `describe('App')`

| Test name                                      | Steps                             | Expected                      |
| ---------------------------------------------- | --------------------------------- | ----------------------------- |
| `should load the home page`                    | `goto('/')`                       | `h1` visible                  |
| `should return a clean 404 for an unknown URL` | `goto('/cette-page-nexiste-pas')` | HTTP 404 + "Page introuvable" |

---

## File: `e2e/home.spec.ts`

Route: `/`

### `describe('Home page')`

#### Basic rendering

| Test name                                 | Steps       | Expected                                            |
| ----------------------------------------- | ----------- | --------------------------------------------------- |
| `should have correct page title`          | `goto('/')` | `page.toHaveTitle('Action ramassage des déchets')`  |
| `should display VRNB logo in header`      | `goto('/')` | `img[alt="VRNB"]` is visible, no back button        |
| `should NOT show back button on home`     | `goto('/')` | `a[aria-label="Retour à l'accueil"]` is not visible |
| `should display footer with current year` | `goto('/')` | Footer text contains `©{currentYear} VRNB`          |

#### Tour sections

| Test name                                                     | Steps                       | Expected                                                       |
| ------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| `should display Bruz Sud zone heading`                        | `goto('/')`                 | `details[aria-label="Zone Bruz Sud"]` visible                  |
| `should display zone heading with tour count`                 | `goto('/')`                 | Zone summary shows "Bruz Sud" and "28 parcours"                |
| `should collapse and expand the zone block on summary click`  | `goto('/')` → click summary | `open` attribute toggles off then on                           |
| `should display bike tours section`                           | `goto('/')`                 | Heading "Parcours à vélo" visible                              |
| `should display walking tours section`                        | `goto('/')`                 | Heading "Parcours à pied" visible                              |
| `should list all 15 Bruz Sud bike tours (V1–V15)`             | `goto('/')`                 | 15 tour rows under Bruz Sud bike section, names V1 through V15 |
| `should list all 13 walking tours (P1–P13)`                   | `goto('/')`                 | 13 tour rows under walking sections, names P1 through P13      |
| `should display distance in km for V1 (1,1 km)`               | `goto('/')`                 | V1 row contains text "1,1 km"                                  |
| `should display distance in meters for tours under 1km`       | `goto('/')`                 | P2 Bruz Sud (0.8 km) shows "800 m"                             |
| `should have play button on each tour row`                    | `goto('/')`                 | 47 buttons with `aria-label="Lancer le parcours"`              |
| `should show "Voir tous les parcours" link for bike tours`    | `goto('/')` (desktop)       | Link visible in V section, href `/tours/bruz-sud/V`            |
| `should show "Voir tous les parcours" link for walking tours` | `goto('/')` (desktop)       | Link visible in P section, href `/tours/bruz-sud/P`            |

#### Saved tour banner

| Test name                                                        | Steps                                                                                       | Expected                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `should NOT show saved tour banner by default`                   | `goto('/')`                                                                                 | No "Reprendre le parcours" text                           |
| `should show saved tour banner when localStorage has saved tour` | Set localStorage `vrnb_tour` to `{"tourId":"V1","step":1,"zoneId":"bruz-sud"}`, `goto('/')` | "Reprendre le parcours Bruz Sud - V1 (étape 2/3)" visible |

---

## File: `e2e/inscriptions.spec.ts`

Route: `/` (tickets #16 + #17 + #18 + #34 + #36 — public inscriptions statuses,
Binôme registration, registration window, the home announcement of the
inscriptions opening date and confirmation calendar links)

> `GET /api/inscriptions` is intercepted with `page.route` in every test of this
> file (both browsers), so the dev server needs no KV credentials. The POST
> direction is scripted through the same `page.route` handler, assert by assert.
>
> The calendar file route of ticket #36 is the exception: unlike the Inscriptions
> API, `/api/calendrier/<zone>/<parcours>` needs no KV store, so its two cases
> hit the real dev-server route over `page.request.get` (see the « Calendar file
> route » describe).
>
> The Inscriptions API itself and the Upstash KV adapter are not exercised here:
> they are covered by the unit suite (`src/app/inscriptions/*.spec.ts`), and the
> referent extraction script by `scripts/inscriptions-extract.spec.ts`.
>
> The « closed window » cases fix the browser clock with
> `page.clock.setFixedTime(new Date('2027-02-12T09:00:00Z'))` **before** the
> navigation (the action date of the Édition is 2027-02-14, the window closes
> 3 days before): the instant is deterministic, and the mocked API answers the
> closed window (`registrationOpen: false`) like the real server would answer
> it then. The registration window is **open until 2027-02-11** (3 days before
> the action) and closed from 2027-02-12.

### `describe('Public inscriptions statuses')`

#### Covered Parcours badge

| Test name                                                        | Steps                                                                           | Expected                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `should badge the covered Parcours after hydration, and only it` | Mock `GET /api/inscriptions` covering `bruz-sud`/`V1`, `goto('/')`              | Exactly one `.badge-success` "Binôme inscrit", inside the V1 row of the Bruz Sud bike section; nothing on V2 |
| `should leave every row unbadged when the store covers nothing`  | Mock the API with an empty `inscriptions` list, `goto('/')`                     | No "Binôme inscrit" badge                                                                                    |
| `should degrade silently when the API fails`                     | Mock the API with HTTP 502 `{ error: 'inscriptions-unavailable' }`, `goto('/')` | No "Binôme inscrit" badge, no register button (the coverage is unknown), all 47 play buttons intact          |

### `describe('Registration opening announcement')` (ticket #34)

Before the opening bound of the Édition (2027-01-04), the home shows one
single mention announcing the opening date in letters, from the loaded
public state only: the statically prerendered home carries no announcement,
neither while the public state cannot be loaded (see the degraded cases
above) nor after the closing bound (see the « Closed registration window »
cases). The test fixes the browser clock before the opening bound
(`page.clock.setFixedTime`), so the instant is deterministic, and flips the
mocked GET from `registrationOpen: false` to `true` (a mutable flag
re-evaluated on every call) with `page.reload()`: the mention disappears and
the register button comes back — the loaded server answer is authoritative,
even with the clock still reading before the opening bound.

| Test name                                                                         | Steps                                                                                                                                                                           | Expected                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `should announce the opening date before the window opens, and drop it once open` | Fix the clock before the opening bound, mock GET with a mutable `registrationOpen` flag, `goto('/')` (mocked window not open); then flip the flag to `true` and `page.reload()` | Exactly one « Les inscriptions ouvrent le lundi 4 janvier 2027. » mention and no register button; after the reload the mention is gone and the register button of V2 is visible |

### `describe('Binôme registration')` (ticket #17)

The register button of every uncovered Parcours row is named
`aria-label="S'inscrire en binôme pour le parcours <tourId>"` (visible text
`S'inscrire` first, compact size `btn-xs`/`btn-sm`). The modal is the
`<dialog className="modal">` element, addressed as `getByRole('dialog')`. Its
context reads « Zone <zone> - Parcours <tour> », the meeting point is named
without repeating the Zone, and the engagement statement is « Nous confirmons
notre participation à ce parcours de nettoyage. »

> Locators inside the modal use `exact: true` on every `getByLabel`:
> Playwright matches labels by substring, and « Pré**nom** du membre 1 »
> contains « **Nom** du membre 1 », so the name fields resolve to 2 inputs
> without it.
>
> ```ts
> page.getByRole('dialog').getByLabel('Nom du membre 1', { exact: true });
> ```

| Test name                                                                      | Steps                                                                                                                                                                                                                                                                                                                      | Expected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `should register through the modal: 201, confirmation, badge, button gone`     | Script GET (empty → covered) + POST 201 `{"inscription":{…}}` with `page.route`, `goto('/')`, open V2's button, assert modal context (Zone « Bruz Sud », action date « 14 février 2027 de 9h à 12h », meeting point), fill, tick, submit (the engagement statement gates the submit: untick → disabled, re-tick → enabled) | Exactly one POST carrying the full contract body (4 identity fields, `engaged: true`, `honeypot: ''`, `zoneId`/`tourId`); confirmation text « Votre binôme est inscrit » recalled as a meeting point (ticket #36): note sentence « Notez la zone et le nom du parcours pour le jour de l'action : Bruz Sud - V2. », hours « de 9h à 12h », « Point de rendez-vous : Place du Dr Joly », and the two agenda links — Google Calendar anchor FIRST (`target="_blank"`, `rel="noopener noreferrer"`, template URL built by the pure module), then the `.ics` anchor with the exact href `/api/calendrier/bruz-sud/V2` — the DOM order of the two links asserted; V2 badged; register button gone — no reload |
| `should keep the typed values between a close without submitting and a reopen` | Mock GET (open, empty), `goto('/')`, open P3's button, type P1 first name + P2 last name, close via "Fermer", reopen P3's button                                                                                                                                                                                           | Dialog hidden when closed, same values still there after reopening (the modal stays mounted)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `should show no register button on a covered tour but keep its badge`          | Mock GET covering `bruz-sud`/`V1`, `goto('/')`                                                                                                                                                                                                                                                                             | V1 badged, no register button for it, its play button intact (legacy DOM contract)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `should guard a 409 race: message in the modal, then badge on the reload`      | Script GET (empty → covered) + POST 409 `{"error":"inscriptions-conflict"}`, `goto('/')`, open P2's button, fill, submit                                                                                                                                                                                                   | One POST; « couvert par un autre binôme » message in the modal; the client-side statuses reload reveals the new covered state (P2 badged, register button gone)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### `describe('Closed registration window')` (ticket #18)

A closed window hides the register button: the window closes 3 days **before**
the action date, so the organizers can print the tracking sheets and organize
the day; the last registration day is still open. The modal keeps its closed
state as a safety net (a page opened before the closure, or a public state
that could not be loaded), covered by the unit suite. A covered Parcours
loses its button too (see the row above). A public state that could not be
loaded leaves the site in a degraded mode: neither the badge nor the register
button is shown, so the site never offers a registration it cannot honor.

| Test name                                                                | Steps                                                                                                                        | Expected                                                                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `should hide the register button once the window is closed`              | Fix the clock 2 days before the action date, mock GET with `registrationOpen: false`, `goto('/')`                            | No register button on the rows (the window closes 3 days before the action); the 47 play buttons stay |
| `should hide the register button when the public state cannot be loaded` | Fix the clock after the closure, mock GET with HTTP 502 (the public state cannot be loaded), `goto('/')`                     | No register button, no badge; the 47 play buttons stay                                                |
| `should offer the register button on the last registration day`          | Fix the clock on the last registration day (2027-02-11, 3 days before the action), mock GET with the open state, `goto('/')` | The register button of V2 is visible                                                                  |

### `describe('Anti-bot honeypot and GDPR notice')` (ticket #18)

| Test name                                                                     | Steps                                                                                                                                          | Expected                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `should hide the honeypot from humans in the modal`                           | Mock GET (open, empty), `goto('/')`, open V2's button                                                                                          | One `input[name="website"]` in the modal: present in the DOM, `hidden`, `aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`                                                                                         |
| `should post the filled honeypot and be refused like any other invalid input` | Script GET (open) + POST 400 `{"error":"invalid-inscription"}`, open V2's button, fill, fill the hidden field, submit                          | One POST whose body carries the filled `honeypot`; the refusal is silent — the standard « Saisie invalide » message, never an anti-robots hint, and nothing stored (the Parcours stays unbadged, its register button stays) |
| `should state the data retention of the names in the modal`                   | Mock GET (open, empty), `goto('/')`, open V2's button                                                                                          | The modal states « Vos informations servent à établir les fiches de suivi de l'action. Les données sont effacées 90 jours après l'action. »                                                                                 |
| `should have no a11y violation on the open registration modal`                | Mock GET (open, empty), `goto('/')`, open V2's button, run the axe audit on the page (the `meta-viewport` and `color-contrast` rules disabled) | No axe violation (the hidden honeypot never breaks the audit)                                                                                                                                                               |

### `describe('Calendar file route')` (ticket #36)

The route `/api/calendrier/<zone>/<parcours>` is a thin adapter over the pure
calendar module (`lib/tour-calendar.ts`): it serves the Édition event of a
registered Parcours and needs no KV store, so these two cases hit the **real
dev-server route** at request level (`page.request.get`) — the `page.route`
interception of the Inscriptions API is not needed here, and no link is
clicked (the served file is a download, read through the response instead).

| Test name                                                | Steps                                        | Expected                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `should serve the Édition event file for a known couple` | Request `/api/calendrier/bruz-sud/V1`        | HTTP 200; `content-type` contains `text/calendar` ; `content-disposition` carries the explicit filename `calendrier-bruz-sud-v1.ics` ; the body carries `BEGIN:VCALENDAR`, the stable `UID:vrnb-2027-bruz-sud-v1@vrnb-site`, the title `SUMMARY:Action ramassage des déchets VRNB - Bruz Sud (V1)`, the full postal address `LOCATION:Place du Docteur Joly…` and the Point de rendez-vous in the description |
| `should answer 404 with no file for an unknown couple`   | Request `/api/calendrier/impossible/UNKNOWN` | HTTP 404 with an empty body (no file at all, never an HTML error page)                                                                                                                                                                                                                                                                                                                                        |

> The confirmation links themselves (Google Calendar built by the pure module,
> `.ics` href of the exact couple) are asserted in the extended « Binôme
> registration » flow above; the `.ics` file content is unit-covered by
> `lib/tour-calendar.spec.ts` — these two cases only check the adapter's
> served response.

---

## File: `e2e/tours-map.spec.ts`

Routes: `/tours/bruz-sud/V`, `/tours/bruz-sud/P`

### `describe('Tours map — Bike (V)')`

| Test name                                         | Steps                                            | Expected                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `should have correct title`                       | `goto('/tours/bruz-sud/V')`                      | `page.toHaveTitle('Bruz Sud - Parcours à vélo')`                                                                       |
| `should show back button in header`               | `goto('/tours/bruz-sud/V')`                      | `a[aria-label="Retour à l'accueil"]` visible                                                                           |
| `should render map element`                       | `goto('/tours/bruz-sud/V')`                      | `div#map` visible                                                                                                      |
| `should show Menu button in header`               | `goto('/tours/bruz-sud/V')`                      | "Menu" text visible                                                                                                    |
| `should open drawer on Menu click`                | Click "Menu"                                     | Drawer visible with title "Bruz Sud - Parcours à vélo"                                                                 |
| `should not show the tracking PDF link in drawer` | Open drawer                                      | No "Télécharger le PDF de suivi" link (the « Fiches de suivi » are generated by the referent script, outside the site) |
| `should show map PDF download link in drawer`     | Open drawer                                      | "Télécharger le PDF de la carte" with `href="/pdf/bruz-sud/Carte_parcours_a_velo.pdf"`                                 |
| `should close drawer on close button click`       | Open drawer → click `aria-label="close sidebar"` | Drawer hidden                                                                                                          |
| `should navigate to home on back button click`    | Click back button                                | URL is `/`                                                                                                             |

### `describe('Tours map — Walking (P)')`

| Test name                                                         | Steps                       | Expected                                         |
| ----------------------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| `should have correct title`                                       | `goto('/tours/bruz-sud/P')` | `page.toHaveTitle('Bruz Sud - Parcours à pied')` |
| `should render map element`                                       | `goto('/tours/bruz-sud/P')` | `div#map` visible                                |
| `should not show the tracking PDF link with the walking tour map` | Open drawer                 | No "Télécharger le PDF de suivi" link            |
| `should show map PDF download link with correct href`             | Open drawer                 | `href="/pdf/bruz-sud/Carte_parcours_a_pied.pdf"` |

### `describe('Tours map — Drawing parity')`

| Test name                                                                   | Steps                       | Expected                                                                                          |
| --------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| `should draw one distinctly colored route per tour with markers and labels` | `goto('/tours/bruz-sud/V')` | ≥15 polylines with ≥10 distinct stroke colors, ≥15 start pins, ≥15 end pins, ≥15 `div.tour-label` |
| `should expose the fullscreen control`                                      | `goto('/tours/bruz-sud/V')` | `.leaflet-control-zoom-fullscreen` visible                                                        |

### `describe('Tours map — Invalid params')`

| Test name                                        | Steps                       | Expected                      |
| ------------------------------------------------ | --------------------------- | ----------------------------- |
| `should return 404 for an unknown zone`          | `goto('/tours/nowhere/V')`  | HTTP 404 + "Page introuvable" |
| `should return 404 for an unknown practice type` | `goto('/tours/bruz-sud/X')` | HTTP 404 + "Page introuvable" |

---

## File: `e2e/tour.spec.ts`

Routes: `/tour/bruz-sud/V1`, `/tour/bruz-sud/P3`

### `describe('Tour page — V1 (bike)')`

#### Basic rendering

| Test name                                     | Steps                       | Expected                                     |
| --------------------------------------------- | --------------------------- | -------------------------------------------- |
| `should have correct title`                   | `goto('/tour/bruz-sud/V1')` | `page.toHaveTitle('Bruz Sud - Parcours V1')` |
| `should show back button`                     | `goto('/tour/bruz-sud/V1')` | Back link visible                            |
| `should display steps indicator with 3 steps` | `goto('/tour/bruz-sud/V1')` | 3 `li.step`: "Début", "Nettoyage", "Fin"     |
| `should render map`                           | `goto('/tour/bruz-sud/V1')` | `div#map` visible                            |

#### Step navigation

| Test name                                             | Steps                       | Expected                                              |
| ----------------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `should start at step Début (step 0)`                 | `goto('/tour/bruz-sud/V1')` | First step has `step-secondary` class                 |
| `should have Précédent button disabled at step 0`     | `goto('/tour/bruz-sud/V1')` | "Précédent" disabled                                  |
| `should show Suivant button at step 0`                | `goto('/tour/bruz-sud/V1')` | "Suivant" visible                                     |
| `should advance to Nettoyage on Suivant click`        | Click "Suivant"             | Second step has `step-secondary`, "Précédent" enabled |
| `should advance to Fin on second Suivant click`       | Click "Suivant" ×2          | Third step has `step-secondary`                       |
| `should show Terminer button at step 2`               | Navigate to step 2          | "Terminer" visible, "Suivant" hidden                  |
| `should go back to Nettoyage on Précédent click`      | At step 2 → "Précédent"     | Second step active, "Suivant" reappears               |
| `should disable Précédent at step 0 after going back` | Step 1 → "Précédent"        | "Précédent" disabled                                  |

#### Finish flow

| Test name                                    | Steps                                    | Expected                                                                                                   |
| -------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `should open finish modal on Terminer click` | Step 2 → "Terminer"                      | `dialog#finish_modal` visible                                                                              |
| `should show participation message in modal` | Open modal                               | "Merci pour votre participation !" + "Allez voir les organisateurs pour faire peser les déchets ramassés." |
| `should close modal on close button click`   | Open modal → click `aria-label="Fermer"` | Modal hidden                                                                                               |

#### Drawer menu

| Test name                             | Steps                       | Expected                                                                                                    |
| ------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `should show Menu button`             | `goto('/tour/bruz-sud/V1')` | "Menu" visible                                                                                              |
| `should open drawer with tour title`  | Click "Menu"                | Drawer shows "Bruz Sud - Parcours V1"                                                                       |
| `should show PDF download link`       | Open drawer                 | "Télécharger le PDF" with `href="/pdf/bruz-sud/V1.pdf"`                                                     |
| `should show 3 GPX download links`    | Open drawer                 | Start: `/gpx/bruz-sud/V1/V1_start.gpx`, Tour: `/gpx/bruz-sud/V1/V1.gpx`, End: `/gpx/bruz-sud/V1/V1_end.gpx` |
| `should show GeoVelo section`         | Open drawer                 | GeoVelo logo + "Retourner à la {{ meetingPointName }}" link                                                 |
| `should close drawer on close button` | Open/close drawer           | Drawer toggles correctly                                                                                    |

### `describe('Tour page — P3 (walking)')`

| Test name                                  | Steps                       | Expected                                                                |
| ------------------------------------------ | --------------------------- | ----------------------------------------------------------------------- |
| `should have correct title`                | `goto('/tour/bruz-sud/P3')` | `page.toHaveTitle('Bruz Sud - Parcours P3')`                            |
| `should navigate through steps and finish` | Full step flow → "Terminer" | Modal opens with "Merci pour votre participation !"                     |
| `should show correct PDF link in drawer`   | Open drawer                 | `href="/pdf/bruz-sud/P3.pdf"`                                           |
| `should show correct GPX links`            | Open drawer                 | Tour GPX: `/gpx/bruz-sud/P3/P3.gpx`, End: `/gpx/bruz-sud/P3/P3_end.gpx` |

---

## File: `e2e/navigation.spec.ts`

### `describe('Cross-route navigation')`

| Test name                                                         | Steps                                            | Expected                                                |
| ----------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `should navigate from home to tour V1 via play button`            | `goto('/')` → click V1 play                      | URL `/tour/bruz-sud/V1`, title "Bruz Sud - Parcours V1" |
| `should navigate from home to tour P3 via play button`            | `goto('/')` → click P3 play                      | URL `/tour/bruz-sud/P3`, title "Bruz Sud - Parcours P3" |
| `should navigate from home to bike tours map`                     | `goto('/')` → click "Voir tous les parcours" (V) | URL `/tours/bruz-sud/V`                                 |
| `should navigate from home to walking tours map`                  | `goto('/')` → click "Voir tous les parcours" (P) | URL `/tours/bruz-sud/P`                                 |
| `should navigate from tours map back to home`                     | `goto('/tours/bruz-sud/V')` → back button        | URL `/`                                                 |
| `should navigate from tour back to home`                          | `goto('/tour/bruz-sud/V1')` → back button        | URL `/`                                                 |
| `should navigate from saved tour banner to tour`                  | Set saved tour → `goto('/')` → click banner play | URL `/tour/bruz-sud/V1`                                 |
| `should restore scroll to the top when navigating to a tour page` | `goto('/')` → scroll to bottom → click last play | URL `/tour/…`, `window.scrollY === 0`                   |

### Selectors for play buttons

```ts
// Target a specific tour's play button by finding the row with tour name
page
  .locator('li.list-row', { hasText: 'V1' })
  .first()
  .locator('button[aria-label="Lancer le parcours"]');
```

### Selectors for "Voir tous les parcours" links

```ts
page
  .locator('app-tour-list-section', { hasText: 'Parcours à vélo' })
  .getByRole('link', { name: 'Voir tous les parcours' });
```

---

## File: `e2e/persistence.spec.ts`

### `describe('Tour progress persistence (localStorage)')`

| Test name                                             | Steps                                                       | Expected                                          |
| ----------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| `should save progress to localStorage on step change` | `goto('/tour/bruz-sud/V1')` → "Suivant" → read localStorage | `{"tourId":"V1","step":1,"zoneId":"bruz-sud"}`    |
| `should restore step from localStorage on revisit`    | Set step 1 in localStorage → `goto('/tour/bruz-sud/V1')`    | "Nettoyage" step active                           |
| `should show resume banner on home page`              | Set step 1 → `goto('/')`                                    | "Reprendre le parcours Bruz Sud - V1 (étape 2/3)" |
| `should clear localStorage on tour finish`            | Complete tour → read localStorage                           | `null`                                            |
| `should NOT show resume banner after finishing`       | Finish tour → `goto('/')`                                   | No resume banner                                  |
| `should NOT restore step if saved tour is different`  | Save P3 step 1 → visit `/tour/bruz-sud/V1`                  | Starts at step 0                                  |
| `should show resume banner for P tour`                | Save P3 step 2 → `goto('/')`                                | "Reprendre le parcours Bruz Sud - P3 (étape 3/3)" |

### localStorage helper pattern

```ts
// Set before navigation (using addInitScript for pre-load injection):
await page.addInitScript(() => {
  localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'V1', step: 1, zoneId: 'bruz-sud' }));
});
await page.goto('/');

// Read after interaction:
const stored = await page.evaluate(() => localStorage.getItem('vrnb_tour'));
expect(JSON.parse(stored!)).toEqual({ tourId: 'V1', step: 1, zoneId: 'bruz-sud' });
```

---

## File: `e2e/mobile.spec.ts`

### `describe('Mobile viewport')`

Uses `test.use({ viewport: { width: 390, height: 844 } })` (iPhone 12 dimensions).

| Test name                                              | Steps                                             | Expected                                           |
| ------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------- |
| `should show "Voir tous les parcours" links on mobile` | `goto('/')`                                       | Links visible (full-width button under the header) |
| `should still display all tour rows on mobile`         | `goto('/')`                                       | 47 play buttons present                            |
| `should render tour page with functional dock buttons` | `goto('/tour/bruz-sud/V1')`                       | "Précédent" and "Suivant" visible                  |
| `should allow step navigation on mobile`               | Full step flow → "Terminer"                       | Finish modal opens                                 |
| `should render map on mobile tours page`               | `goto('/tours/bruz-sud/V')`                       | `div#map` visible                                  |
| `should open and close drawer on mobile`               | `goto('/tour/bruz-sud/V1')` → "Menu" → open/close | Drawer toggles correctly                           |

---

## File: `e2e/manual.spec.ts`

### `describe('Manual')`

Guards the JSX whitespace pitfall (space stripped between an inline element and the
following text when it contains `&apos;` — cf. the note in `app/manual/page.tsx`).
Vitest cannot reproduce it (its JSX transform keeps the space), hence this E2E check.

The sommaire test covers the navigation of the mode d'emploi: every section of the
page is listed in reading order (numbered titles), the binôme registration is the
LAST section, and every anchor resolves to an existing heading.

| Test name                                                  | Steps                                                       | Expected                                                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keeps spaces around bold words in the rendered copy`      | `goto('/manual')`                                           | 24 spaced French phrases present in the rendered `main` text (incl. the arbitrated registration intro and the config-dated window/erasure notes)                                  |
| `should list every section in the sommaire and jump to it` | `goto('/manual')` → click the « S'inscrire en binôme » link | 5 sommaire links in order (`#principe`, `#exemple`, `#reprendre`, `#menu`, `#inscription`), each pointing at a visible numbered `<h2>` heading; the click jumps to `#inscription` |

---

## File: `e2e/accessibility.spec.ts`

### `describe('Accessibility')`

#### Automated a11y audits (axe-core)

Uses `@axe-core/playwright` (`AxeBuilder`).

| Test name                                          | Steps                                  | Expected      |
| -------------------------------------------------- | -------------------------------------- | ------------- |
| `should have no a11y violations on home page`      | `goto('/')` → axe scan                 | No violations |
| `should have no a11y violations on tours map page` | `goto('/tours/bruz-sud/V')` → axe scan | No violations |
| `should have no a11y violations on tour page`      | `goto('/tour/bruz-sud/V1')` → axe scan | No violations |

#### Manual a11y checks

| Test name                                            | Steps                            | Expected                                     |
| ---------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `should have aria-labels on all icon buttons`        | `goto('/')`                      | All `li.list-row button` have `aria-label`   |
| `should have alt text on VRNB logo`                  | `goto('/')`                      | `header img` has `alt="VRNB"`                |
| `should have accessible back button`                 | `goto('/tour/bruz-sud/V1')`      | Has `aria-label="Retour à l'accueil"`        |
| `should have accessible close button on modal`       | Open finish modal                | Close button has `aria-label="Fermer"`       |
| `should have accessible drawer close button`         | Open drawer                      | Close label has `aria-label="close sidebar"` |
| `should support keyboard navigation on step buttons` | Focus "Suivant" → Enter          | Step advances                                |
| `should support keyboard navigation to close modal`  | Open modal → focus close → Enter | Modal closes                                 |

#### axe-core pattern

```ts
import AxeBuilder from '@axe-core/playwright';

test('should have no a11y violations on home page', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

## Selector Reference

| Element                       | Selector                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| VRNB logo                     | `img[alt="VRNB"]`                                                                          |
| Back button                   | `a[aria-label="Retour à l'accueil"]`                                                       |
| Page title `<h1>`             | `h1` (inside header)                                                                       |
| Tour section heading          | `h2` with text "Parcours à vélo" / "Parcours à pied"                                       |
| Tour section component        | `app-tour-list-section` with `hasText` filter                                              |
| Tour row                      | `li.list-row`                                                                              |
| Tour play button              | `button[aria-label="Lancer le parcours"]`                                                  |
| Register button               | `button[aria-label="S'inscrire en binôme pour le parcours V2"]`                            |
| Covered Parcours badge        | `.badge-success` with text "Binôme inscrit" (in the row, where the register button stands) |
| Registration modal            | `dialog#register_modal_V2` (`getByRole('dialog')`)                                         |
| Anti-bot honeypot             | `input[name="website"]` (hidden)                                                           |
| "Voir tous les parcours" link | `a` with text "Voir tous les parcours" (full-width button under the header on `max-sm`)    |
| Map                           | `div#map`                                                                                  |
| Step items                    | `li.step`                                                                                  |
| "Précédent" button            | `getByRole('button', { name: 'Précédent' })`                                               |
| "Suivant" button              | `getByRole('button', { name: 'Suivant' })`                                                 |
| "Terminer" button             | `getByRole('button', { name: 'Terminer' })`                                                |
| Menu button                   | `getByText('Menu', { exact: true })`                                                       |
| Drawer sidebar                | `.drawer-side ul.menu`                                                                     |
| Drawer close                  | `.drawer-side label[aria-label="close sidebar"]`                                           |
| Finish modal                  | `dialog#finish_modal`                                                                      |
| Modal close                   | `button[aria-label="Fermer"]` inside `dialog#finish_modal`                                 |
| Saved tour banner             | `li.list-row` containing "Reprendre le parcours"                                           |
| Footer                        | `footer`                                                                                   |

---

## Run Commands

```bash
# Run all E2E tests
npx playwright test

# Run a specific file
npx playwright test e2e/home.spec.ts

# Run only chromium for speed
npx playwright test --project=chromium

# Run with UI mode for debugging
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed
```
