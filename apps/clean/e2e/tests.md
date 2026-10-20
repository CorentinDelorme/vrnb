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

## File: `e2e/tours-map.spec.ts`

Routes: `/tours/bruz-sud/V`, `/tours/bruz-sud/P`

### `describe('Tours map — Bike (V)')`

| Test name                                      | Steps                                            | Expected                                                                               |
| ---------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `should have correct title`                    | `goto('/tours/bruz-sud/V')`                      | `page.toHaveTitle('Bruz Sud - Parcours à vélo')`                                       |
| `should show back button in header`            | `goto('/tours/bruz-sud/V')`                      | `a[aria-label="Retour à l'accueil"]` visible                                           |
| `should render map element`                    | `goto('/tours/bruz-sud/V')`                      | `div#map` visible                                                                      |
| `should show Menu button in header`            | `goto('/tours/bruz-sud/V')`                      | "Menu" text visible                                                                    |
| `should open drawer on Menu click`             | Click "Menu"                                     | Drawer visible with title "Bruz Sud - Parcours à vélo"                                 |
| `should show PDF download link in drawer`      | Open drawer                                      | "Télécharger le PDF de suivi" with `href="/pdf/bruz-sud/Suivi_parcours_a_velo.pdf"`    |
| `should show map PDF download link in drawer`  | Open drawer                                      | "Télécharger le PDF de la carte" with `href="/pdf/bruz-sud/Carte_parcours_a_velo.pdf"` |
| `should close drawer on close button click`    | Open drawer → click `aria-label="close sidebar"` | Drawer hidden                                                                          |
| `should navigate to home on back button click` | Click back button                                | URL is `/`                                                                             |

### `describe('Tours map — Walking (P)')`

| Test name                                             | Steps                       | Expected                                         |
| ----------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| `should have correct title`                           | `goto('/tours/bruz-sud/P')` | `page.toHaveTitle('Bruz Sud - Parcours à pied')` |
| `should render map element`                           | `goto('/tours/bruz-sud/P')` | `div#map` visible                                |
| `should show PDF download link with correct href`     | Open drawer                 | `href="/pdf/bruz-sud/Suivi_parcours_a_pied.pdf"` |
| `should show map PDF download link with correct href` | Open drawer                 | `href="/pdf/bruz-sud/Carte_parcours_a_pied.pdf"` |

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

| Test name                                              | Steps                                             | Expected                            |
| ------------------------------------------------------ | ------------------------------------------------- | ----------------------------------- |
| `should hide "Voir tous les parcours" links on mobile` | `goto('/')`                                       | Links NOT visible (`max-sm:hidden`) |
| `should still display all tour rows on mobile`         | `goto('/')`                                       | 47 play buttons present             |
| `should render tour page with functional dock buttons` | `goto('/tour/bruz-sud/V1')`                       | "Précédent" and "Suivant" visible   |
| `should allow step navigation on mobile`               | Full step flow → "Terminer"                       | Finish modal opens                  |
| `should render map on mobile tours page`               | `goto('/tours/bruz-sud/V')`                       | `div#map` visible                   |
| `should open and close drawer on mobile`               | `goto('/tour/bruz-sud/V1')` → "Menu" → open/close | Drawer toggles correctly            |

---

## File: `e2e/manual.spec.ts`

### `describe('Manual')`

Guards the JSX whitespace pitfall (space stripped between an inline element and the
following text when it contains `&apos;` — cf. the note in `app/manual/page.tsx`).
Vitest cannot reproduce it (its JSX transform keeps the space), hence this E2E check.

| Test name                                             | Steps             | Expected                                                     |
| ----------------------------------------------------- | ----------------- | ------------------------------------------------------------ |
| `keeps spaces around bold words in the rendered copy` | `goto('/manual')` | 15 spaced French phrases present in the rendered `main` text |

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

| Element                       | Selector                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| VRNB logo                     | `img[alt="VRNB"]`                                           |
| Back button                   | `a[aria-label="Retour à l'accueil"]`                        |
| Page title `<h1>`             | `h1` (inside header)                                        |
| Tour section heading          | `h2` with text "Parcours à vélo" / "Parcours à pied"        |
| Tour section component        | `app-tour-list-section` with `hasText` filter               |
| Tour row                      | `li.list-row`                                               |
| Tour play button              | `button[aria-label="Lancer le parcours"]`                   |
| "Voir tous les parcours" link | `a` with text "Voir tous les parcours" (hidden on `max-sm`) |
| Map                           | `div#map`                                                   |
| Step items                    | `li.step`                                                   |
| "Précédent" button            | `getByRole('button', { name: 'Précédent' })`                |
| "Suivant" button              | `getByRole('button', { name: 'Suivant' })`                  |
| "Terminer" button             | `getByRole('button', { name: 'Terminer' })`                 |
| Menu button                   | `getByText('Menu', { exact: true })`                        |
| Drawer sidebar                | `.drawer-side ul.menu`                                      |
| Drawer close                  | `.drawer-side label[aria-label="close sidebar"]`            |
| Finish modal                  | `dialog#finish_modal`                                       |
| Modal close                   | `button[aria-label="Fermer"]` inside `dialog#finish_modal`  |
| Saved tour banner             | `li.list-row` containing "Reprendre le parcours"            |
| Footer                        | `footer`                                                    |

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
