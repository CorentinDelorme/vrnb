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

| Test name                                                     | Steps                 | Expected                                                 |
| ------------------------------------------------------------- | --------------------- | -------------------------------------------------------- |
| `should display bike tours section`                           | `goto('/')`           | Heading "Parcours à vélo" visible                        |
| `should display walking tours section`                        | `goto('/')`           | Heading "Parcours à pied" visible                        |
| `should list all 15 bike tours (V1–V15)`                      | `goto('/')`           | 15 tour rows under bike section, names V1 through V15    |
| `should list all 13 walking tours (P1–P13)`                   | `goto('/')`           | 13 tour rows under walking section, names P1 through P13 |
| `should display distance in km for V1 (1,1 km)`               | `goto('/')`           | V1 row contains text "1,1 km"                            |
| `should display distance in meters for tours under 1km`       | `goto('/')`           | P1 (0.5 km) shows "500 m"                                |
| `should have play button on each tour row`                    | `goto('/')`           | 28 buttons with `aria-label="Lancer le parcours"`        |
| `should show "Voir tous les parcours" link for bike tours`    | `goto('/')` (desktop) | Link visible in V section, href `/tours/V`               |
| `should show "Voir tous les parcours" link for walking tours` | `goto('/')` (desktop) | Link visible in P section, href `/tours/P`               |

#### Saved tour banner

| Test name                                                        | Steps                                                                   | Expected                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| `should NOT show saved tour banner by default`                   | `goto('/')`                                                             | No "Reprendre le parcours" text                |
| `should show saved tour banner when localStorage has saved tour` | Set localStorage `vrnb_tour` to `{"tourId":"V1","step":1}`, `goto('/')` | "Reprendre le parcours V1 (étape 2/3)" visible |

---

## File: `e2e/tours-map.spec.ts`

Routes: `/tours/V`, `/tours/P`

### `describe('Tours map — Bike (V)')`

| Test name                                      | Steps                                            | Expected                                                                   |
| ---------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| `should have correct title`                    | `goto('/tours/V')`                               | `page.toHaveTitle('Parcours à vélo')`                                      |
| `should show back button in header`            | `goto('/tours/V')`                               | `a[aria-label="Retour à l'accueil"]` visible                               |
| `should render map element`                    | `goto('/tours/V')`                               | `div#map` visible                                                          |
| `should show Menu button in header`            | `goto('/tours/V')`                               | "Menu" text visible                                                        |
| `should open drawer on Menu click`             | Click "Menu"                                     | Drawer visible with title "Parcours à vélo"                                |
| `should show PDF download link in drawer`      | Open drawer                                      | "Télécharger le PDF de suivi" with `href="/pdf/Suivi_parcours_a_velo.pdf"` |
| `should close drawer on close button click`    | Open drawer → click `aria-label="close sidebar"` | Drawer hidden                                                              |
| `should navigate to home on back button click` | Click back button                                | URL is `/`                                                                 |

### `describe('Tours map — Walking (P)')`

| Test name                                         | Steps              | Expected                                |
| ------------------------------------------------- | ------------------ | --------------------------------------- |
| `should have correct title`                       | `goto('/tours/P')` | `page.toHaveTitle('Parcours à pied')`   |
| `should render map element`                       | `goto('/tours/P')` | `div#map` visible                       |
| `should show PDF download link with correct href` | Open drawer        | `href="/pdf/Suivi_parcours_a_pied.pdf"` |

---

## File: `e2e/tour.spec.ts`

Routes: `/tour/V1`, `/tour/P3`

### `describe('Tour page — V1 (bike)')`

#### Basic rendering

| Test name                                     | Steps              | Expected                                 |
| --------------------------------------------- | ------------------ | ---------------------------------------- |
| `should have correct title`                   | `goto('/tour/V1')` | `page.toHaveTitle('Parcours V1')`        |
| `should show back button`                     | `goto('/tour/V1')` | Back link visible                        |
| `should display steps indicator with 3 steps` | `goto('/tour/V1')` | 3 `li.step`: "Début", "Nettoyage", "Fin" |
| `should render map`                           | `goto('/tour/V1')` | `div#map` visible                        |

#### Step navigation

| Test name                                             | Steps                   | Expected                                              |
| ----------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| `should start at step Début (step 0)`                 | `goto('/tour/V1')`      | First step has `step-secondary` class                 |
| `should have Précédent button disabled at step 0`     | `goto('/tour/V1')`      | "Précédent" disabled                                  |
| `should show Suivant button at step 0`                | `goto('/tour/V1')`      | "Suivant" visible                                     |
| `should advance to Nettoyage on Suivant click`        | Click "Suivant"         | Second step has `step-secondary`, "Précédent" enabled |
| `should advance to Fin on second Suivant click`       | Click "Suivant" ×2      | Third step has `step-secondary`                       |
| `should show Terminer button at step 2`               | Navigate to step 2      | "Terminer" visible, "Suivant" hidden                  |
| `should go back to Nettoyage on Précédent click`      | At step 2 → "Précédent" | Second step active, "Suivant" reappears               |
| `should disable Précédent at step 0 after going back` | Step 1 → "Précédent"    | "Précédent" disabled                                  |

#### Finish flow

| Test name                                    | Steps                                    | Expected                                             |
| -------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `should open finish modal on Terminer click` | Step 2 → "Terminer"                      | `dialog#finish_modal` visible                        |
| `should show congratulations text in modal`  | Open modal                               | "Félicitations !" + "Vous avez terminé le parcours." |
| `should close modal on close button click`   | Open modal → click `aria-label="Fermer"` | Modal hidden                                         |

#### Drawer menu

| Test name                             | Steps              | Expected                                                                         |
| ------------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `should show Menu button`             | `goto('/tour/V1')` | "Menu" visible                                                                   |
| `should open drawer with tour title`  | Click "Menu"       | Drawer shows "Parcours V1"                                                       |
| `should show PDF download link`       | Open drawer        | "Télécharger le PDF" with `href="/pdf/V1.pdf"`                                   |
| `should show 3 GPX download links`    | Open drawer        | Start: `/gpx/V1/V1_start.gpx`, Tour: `/gpx/V1/V1.gpx`, End: `/gpx/V1/V1_end.gpx` |
| `should show GeoVelo section`         | Open drawer        | GeoVelo logo + "Retourner au Parc de l'An 2000" link                             |
| `should close drawer on close button` | Open/close drawer  | Drawer toggles correctly                                                         |

### `describe('Tour page — P3 (walking)')`

| Test name                                  | Steps                       | Expected                                              |
| ------------------------------------------ | --------------------------- | ----------------------------------------------------- |
| `should have correct title`                | `goto('/tour/P3')`          | `page.toHaveTitle('Parcours P3')`                     |
| `should navigate through steps and finish` | Full step flow → "Terminer" | Modal opens with "Félicitations !"                    |
| `should show correct PDF link in drawer`   | Open drawer                 | `href="/pdf/P3.pdf"`                                  |
| `should show correct GPX links`            | Open drawer                 | Tour GPX: `/gpx/P3/P3.gpx`, End: `/gpx/P3/P3_end.gpx` |

---

## File: `e2e/navigation.spec.ts`

### `describe('Cross-route navigation')`

| Test name                                              | Steps                                            | Expected                            |
| ------------------------------------------------------ | ------------------------------------------------ | ----------------------------------- |
| `should navigate from home to tour V1 via play button` | `goto('/')` → click V1 play                      | URL `/tour/V1`, title "Parcours V1" |
| `should navigate from home to tour P3 via play button` | `goto('/')` → click P3 play                      | URL `/tour/P3`, title "Parcours P3" |
| `should navigate from home to bike tours map`          | `goto('/')` → click "Voir tous les parcours" (V) | URL `/tours/V`                      |
| `should navigate from home to walking tours map`       | `goto('/')` → click "Voir tous les parcours" (P) | URL `/tours/P`                      |
| `should navigate from tours map back to home`          | `goto('/tours/V')` → back button                 | URL `/`                             |
| `should navigate from tour back to home`               | `goto('/tour/V1')` → back button                 | URL `/`                             |
| `should navigate from saved tour banner to tour`       | Set saved tour → `goto('/')` → click banner play | URL `/tour/V1`                      |

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

| Test name                                             | Steps                                              | Expected                               |
| ----------------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| `should save progress to localStorage on step change` | `goto('/tour/V1')` → "Suivant" → read localStorage | `{"tourId":"V1","step":1}`             |
| `should restore step from localStorage on revisit`    | Set step 1 in localStorage → `goto('/tour/V1')`    | "Nettoyage" step active                |
| `should show resume banner on home page`              | Set step 1 → `goto('/')`                           | "Reprendre le parcours V1 (étape 2/3)" |
| `should clear localStorage on tour finish`            | Complete tour → read localStorage                  | `null`                                 |
| `should NOT show resume banner after finishing`       | Finish tour → `goto('/')`                          | No resume banner                       |
| `should NOT restore step if saved tour is different`  | Save P3 step 1 → visit `/tour/V1`                  | Starts at step 0                       |
| `should show resume banner for P tour`                | Save P3 step 2 → `goto('/')`                       | "Reprendre le parcours P3 (étape 3/3)" |

### localStorage helper pattern

```ts
// Set before navigation (using addInitScript for pre-load injection):
await page.addInitScript(() => {
  localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'V1', step: 1 }));
});
await page.goto('/');

// Read after interaction:
const stored = await page.evaluate(() => localStorage.getItem('vrnb_tour'));
expect(JSON.parse(stored!)).toEqual({ tourId: 'V1', step: 1 });
```

---

## File: `e2e/mobile.spec.ts`

### `describe('Mobile viewport')`

Uses `test.use({ viewport: { width: 390, height: 844 } })` (iPhone 12 dimensions).

| Test name                                              | Steps                                    | Expected                            |
| ------------------------------------------------------ | ---------------------------------------- | ----------------------------------- |
| `should hide "Voir tous les parcours" links on mobile` | `goto('/')`                              | Links NOT visible (`max-sm:hidden`) |
| `should still display all tour rows on mobile`         | `goto('/')`                              | 28 play buttons present             |
| `should render tour page with functional dock buttons` | `goto('/tour/V1')`                       | "Précédent" and "Suivant" visible   |
| `should allow step navigation on mobile`               | Full step flow → "Terminer"              | Finish modal opens                  |
| `should render map on mobile tours page`               | `goto('/tours/V')`                       | `div#map` visible                   |
| `should open and close drawer on mobile`               | `goto('/tour/V1')` → "Menu" → open/close | Drawer toggles correctly            |

---

## File: `e2e/accessibility.spec.ts`

### `describe('Accessibility')`

#### Automated a11y audits (axe-core)

Uses `@axe-core/playwright` (`AxeBuilder`).

| Test name                                          | Steps                         | Expected      |
| -------------------------------------------------- | ----------------------------- | ------------- |
| `should have no a11y violations on home page`      | `goto('/')` → axe scan        | No violations |
| `should have no a11y violations on tours map page` | `goto('/tours/V')` → axe scan | No violations |
| `should have no a11y violations on tour page`      | `goto('/tour/V1')` → axe scan | No violations |

#### Manual a11y checks

| Test name                                            | Steps                            | Expected                                     |
| ---------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `should have aria-labels on all icon buttons`        | `goto('/')`                      | All `li.list-row button` have `aria-label`   |
| `should have alt text on VRNB logo`                  | `goto('/')`                      | `header img` has `alt="VRNB"`                |
| `should have accessible back button`                 | `goto('/tour/V1')`               | Has `aria-label="Retour à l'accueil"`        |
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
