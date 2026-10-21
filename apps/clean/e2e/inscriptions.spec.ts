import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Public inscriptions endpoints on the home page. Tickets #16 + #17: a
 * Parcours covered by the Édition shows the « Binôme inscrit » badge next to
 * its title once the home page has hydrated, every uncovered Parcours shows a
 * register button next to its play button, and the registration flows through
 * the DaisyUI modal with `POST /api/inscriptions`. Every exchange (GET and
 * POST) is intercepted with `page.route`, so no KV backend is needed.
 *
 * Ticket #18: the modal of a closed registration window (the action date is
 * closed) announces that the window is closed and disables its form, the hidden
 * anti-bot honeypot is in the DOM but invisible to humans, and the modal
 * states how long the names are kept.
 */

/** Public state shape returned by the (mocked) API. */
const COVERED_V1 = {
  edition: { actionDate: '2027-02-14', year: 2027 },
  inscriptions: [{ tourId: 'V1', zoneId: 'bruz-sud' }],
  registrationOpen: true,
} as const;

/** Édition echoed in every (mocked) state. */
const EDITION = { actionDate: '2027-02-14', year: 2027 } as const;

/** Public state of an open window covering nothing. */
const OPEN_STATE = { edition: EDITION, inscriptions: [], registrationOpen: true } as const;

/** Public state of a closed window (the action date is past). */
const CLOSED_STATE = { edition: EDITION, inscriptions: [], registrationOpen: false } as const;

/**
 * An instant 2 days before the action date of the Édition (2027-02-14): the
 * registration window is closed then (it closes 3 days before the action).
 */
const AFTER_CLOSURE_DATE = new Date('2027-02-12T09:00:00Z');

/**
 * An instant of the last registration day (2027-02-11, 3 days before the
 * action): the window is still open that day.
 */
const LAST_REGISTRATION_DAY = new Date('2027-02-11T12:00:00Z');

/** The exact POST contract the registering client sends (ticket #17). */
const CONTRACT_BODY = {
  engaged: true,
  firstName1: 'Léa',
  firstName2: 'Marc',
  honeypot: '',
  lastName1: 'Dupont',
  lastName2: 'Martin',
  tourId: 'V2',
  zoneId: 'bruz-sud',
} as const;

/** Every « Binôme inscrit » badge of the page (none while loading/error). */
function badgeLocator(page: Page) {
  return page.locator('.badge-success', { hasText: 'Binôme inscrit' });
}

/** The row containing the tour name (row text glues name + badge + distance). */
function rowLocator(page: Page, tourId: string) {
  return page.locator('li.list-row', { hasText: tourId }).first();
}

interface MockedResponse {
  readonly json?: unknown;
  readonly status?: number;
}

type MockedPost = (request: {
  readonly body: string;
  readonly fulfill: (response: MockedResponse) => Promise<void>;
}) => Promise<void>;

interface MockedExchange {
  /** State the GET answers with, re-evaluated on every call. */
  readonly get: () => unknown;
  /** Handler of a POST when any; it must resolve `fulfill` itself. */
  readonly post?: MockedPost;
}

/**
 * Script both directions of `/api/inscriptions`: the GET side re-evaluates
 * `get()` on every call (so a POST can make later fetches see the newly
 * covered tour) and the POST side is scripted per test.
 */
async function mockInscriptionsApi(page: Page, exchange: MockedExchange): Promise<void> {
  await page.route('**/api/inscriptions', (route) => {
    if (route.request().method() === 'POST') {
      return (
        exchange.post!({
          body: route.request().postData() ?? '',
          fulfill: (response) => route.fulfill(response),
        }) ?? route.fulfill({ json: exchange.get() })
      );
    }
    return route.fulfill({ json: exchange.get() });
  });
}

/** Fill the identity fields and the engagement statement of the open modal. */
async function fillRegistration(
  page: Page,
  body: { readonly [key in keyof typeof CONTRACT_BODY]: string | boolean },
): Promise<void> {
  const modal = page.getByRole('dialog');
  // `exact: true` everywhere: without it, « Nom du membre 1 » also matches the
  // « Prénom du membre 1 » label (« Prénom » contains « nom » as a substring).
  await modal.getByLabel('Prénom du membre 1', { exact: true }).fill(String(body.firstName1));
  await modal.getByLabel('Nom du membre 1', { exact: true }).fill(String(body.lastName1));
  await modal.getByLabel('Prénom du membre 2', { exact: true }).fill(String(body.firstName2));
  await modal.getByLabel('Nom du membre 2', { exact: true }).fill(String(body.lastName2));
  await modal.getByRole('checkbox').check();
}

/** Open the registration modal of a Parcours from its register button. */
async function openRegistrationModal(page: Page, tourId: string) {
  await page
    .getByRole('button', { name: `S'inscrire en binôme pour le parcours ${tourId}`, exact: true })
    .click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  return modal;
}

/**
 * Fill the hidden anti-bot honeypot the way a bot would (a human never sees
 * it): the native value setter plus an `input` event, so the controlled React
 * input notices the change.
 */
async function fillHoneypot(page: Page, value: string): Promise<void> {
  await page.locator('input[name="website"]').evaluate((input, filled) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, filled);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe('Public inscriptions statuses', () => {
  test.describe('Covered Parcours badge', () => {
    test('should badge the covered Parcours after hydration, and only it', async ({ page }) => {
      await page.route('**/api/inscriptions', (route) => route.fulfill({ json: COVERED_V1 }));
      await page.goto('/');

      const bikeSection = page
        .locator('app-tour-list-section', { hasText: 'Parcours à vélo' })
        .first();
      // Rows are listed in Parcours order (V1 first), so `hasText: 'V1'`
      // selects the V1 row — same pattern as `e2e/home.spec.ts`.
      const v1Row = bikeSection.locator('li.list-row', { hasText: 'V1' }).first();
      const v2Row = bikeSection.locator('li.list-row', { hasText: 'V2' }).first();

      await expect(v1Row.locator('.badge-success')).toHaveText(['Binôme inscrit']);
      await expect(v2Row.locator('.badge-success')).toHaveCount(0);
      await expect(badgeLocator(page)).toHaveCount(1);
    });

    test('should leave every row unbadged when the store covers nothing', async ({ page }) => {
      await page.route('**/api/inscriptions', (route) =>
        route.fulfill({
          json: { edition: COVERED_V1.edition, inscriptions: [], registrationOpen: true },
        }),
      );
      await page.goto('/');

      await expect(badgeLocator(page)).toHaveCount(0);
    });

    test('should degrade silently when the API fails', async ({ page }) => {
      await page.route('**/api/inscriptions', (route) =>
        route.fulfill({
          json: { error: 'inscriptions-unavailable' },
          status: 502,
        }),
      );
      await page.goto('/');

      await expect(badgeLocator(page)).toHaveCount(0);
      // A failed fetch means an unknown state: the site offers neither the
      // badge nor the register button, and the play button DOM contract
      // (47 rows × 1 button) stays untouched.
      await expect(
        page.getByRole('button', { name: "S'inscrire en binôme pour le parcours V2", exact: true }),
      ).toHaveCount(0);
      const playButtons = page.locator('li.list-row button[aria-label="Lancer le parcours"]');
      await expect(playButtons).toHaveCount(47);
    });
  });
});

test.describe('Binôme registration', () => {
  test('should register through the modal: 201, confirmation, badge, button gone', async ({
    page,
  }) => {
    let covered: readonly { tourId: string; zoneId: string }[] = [];
    const postBodies: string[] = [];
    await mockInscriptionsApi(page, {
      get: () => ({ edition: EDITION, inscriptions: covered, registrationOpen: true }),
      post: async ({ body, fulfill }) => {
        postBodies.push(body);
        covered = [{ tourId: CONTRACT_BODY.tourId, zoneId: CONTRACT_BODY.zoneId }];
        await fulfill({
          json: { inscription: { tourId: CONTRACT_BODY.tourId, zoneId: CONTRACT_BODY.zoneId } },
          status: 201,
        });
      },
    });
    await page.goto('/');

    const v2Register = page.getByRole('button', {
      name: "S'inscrire en binôme pour le parcours V2",
      exact: true,
    });
    await expect(v2Register).toBeVisible();
    await v2Register.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    // The modal shows the selected tour context before anything is typed: the
    // Zone first, then the Parcours, and the meeting point without a
    // repeated Zone.
    await expect(modal.getByText('Zone Bruz Sud — Parcours V2')).toBeVisible();
    await expect(modal.getByText('14 février 2027')).toBeVisible();
    await expect(modal.getByText('Point de rendez-vous : Place du Dr Joly')).toBeVisible();

    await fillRegistration(page, CONTRACT_BODY);
    // The engagement statement gates the submit: untick it → disabled, then
    // re-tick → enabled (the form is otherwise complete).
    const submit = modal.getByRole('button', { name: 'Inscrire mon binôme' });
    await modal.getByRole('checkbox').uncheck();
    await expect(submit).toBeDisabled();
    await modal.getByRole('checkbox').check();
    await expect(submit).toBeEnabled();

    await submit.click();

    await expect(modal).toContainText('Votre binôme est inscrit');
    // One exact POST, then the statuses reload without a page reload:
    expect(postBodies).toHaveLength(1);
    expect(JSON.parse(postBodies[0] ?? '{}')).toEqual(CONTRACT_BODY);
    await expect(rowLocator(page, 'V2').locator('.badge-success')).toHaveText('Binôme inscrit');
    await expect(v2Register).toHaveCount(0);
  });

  test('should keep the typed values between a close without submitting and a reopen', async ({
    page,
  }) => {
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: OPEN_STATE }));
    await page.goto('/');

    await page
      .getByRole('button', { name: "S'inscrire en binôme pour le parcours P3", exact: true })
      .click();
    await page.getByLabel('Prénom du membre 1', { exact: true }).fill('Céline');
    await page.getByLabel('Nom du membre 2', { exact: true }).fill('Roux');

    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(page.getByLabel('Prénom du membre 1', { exact: true })).toBeHidden();

    await page
      .getByRole('button', { name: "S'inscrire en binôme pour le parcours P3", exact: true })
      .click();
    await expect(page.getByLabel('Prénom du membre 1', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Prénom du membre 1', { exact: true })).toHaveValue('Céline');
    await expect(page.getByLabel('Nom du membre 2', { exact: true })).toHaveValue('Roux');
  });

  test('should show no register button on a covered tour but keep its badge', async ({ page }) => {
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: COVERED_V1 }));
    await page.goto('/');

    await expect(rowLocator(page, 'V1').locator('.badge-success')).toHaveText('Binôme inscrit');
    await expect(
      page.getByRole('button', { name: "S'inscrire en binôme pour le parcours V1", exact: true }),
    ).toHaveCount(0);
    // The covered row keeps its play button (legacy DOM contract).
    await expect(
      rowLocator(page, 'V1').getByRole('button', { name: 'Lancer le parcours' }),
    ).toHaveCount(1);
  });

  test('should guard a 409 race: message in the modal, then badge on the reload', async ({
    page,
  }) => {
    let covered = false;
    const postBodies: string[] = [];
    await mockInscriptionsApi(page, {
      get: () => ({
        edition: EDITION,
        inscriptions: covered ? [{ tourId: 'P2', zoneId: 'bruz-sud' }] : [],
        registrationOpen: true,
      }),
      post: async ({ body, fulfill }) => {
        postBodies.push(body);
        // Another Binôme won the KV race between the page load and the click:
        // the store is now covered, so the statuses reload the client does
        // after the 409 reveals the state the server just adopted.
        covered = true;
        await fulfill({ json: { error: 'inscriptions-conflict' }, status: 409 });
      },
    });
    await page.goto('/');

    await page
      .getByRole('button', { name: "S'inscrire en binôme pour le parcours P2", exact: true })
      .click();

    const modal = page.getByRole('dialog').first();
    await fillRegistration(page, {
      ...CONTRACT_BODY,
      firstName2: 'Yanis',
      lastName2: 'Roux',
      tourId: 'P2',
    });
    await modal.getByRole('button', { name: 'Inscrire mon binôme' }).click();

    await expect(modal).toContainText(/couvert par un autre binôme/);
    expect(postBodies).toHaveLength(1);
    // The 409's statuses reload shows the covered state: badge + button gone.
    await expect(rowLocator(page, 'P2').locator('.badge-success')).toHaveText('Binôme inscrit');
    await expect(
      page.getByRole('button', { name: "S'inscrire en binôme pour le parcours P2", exact: true }),
    ).toHaveCount(0);
  });
});

/**
 * The registration window of ticket #18: the window closes 3 days before the
 * action date (the organizers need that time to print the tracking sheets and
 * organize the day), then the modal announces the closure and disables its
 * form. The instant is deterministic — the browser clock is fixed on a date
 * after the closure (2027-02-12) before the navigation, and the mocked API
 * answers the closed window like the real server would answer it then.
 */
test.describe('Closed registration window', () => {
  test('should hide the register button once the window is closed', async ({ page }) => {
    await page.clock.setFixedTime(AFTER_CLOSURE_DATE);
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: CLOSED_STATE }));
    await page.goto('/');

    // The window closes 3 days before the action: the organizers need that
    // time to print the tracking sheets, so the button disappears with it.
    await expect(
      page.getByRole('button', { name: "S'inscrire en binôme pour le parcours V2", exact: true }),
    ).toHaveCount(0);
    // The play buttons stay: the closed window never touches the legacy DOM.
    await expect(page.locator('button[aria-label="Lancer le parcours"]')).toHaveCount(47);
  });

  test('should hide the register button when the public state cannot be loaded', async ({
    page,
  }) => {
    // The public state is unknown: the site offers neither the badge nor the
    // register button, so the modal cannot be reached from the home page.
    await page.clock.setFixedTime(AFTER_CLOSURE_DATE);
    await page.route('**/api/inscriptions', (route) =>
      route.fulfill({ json: { error: 'inscriptions-unavailable' }, status: 502 }),
    );
    await page.goto('/');

    await expect(
      page.getByRole('button', { name: "S'inscrire en binôme pour le parcours V2", exact: true }),
    ).toHaveCount(0);
    await expect(badgeLocator(page)).toHaveCount(0);
    // The play buttons stay: the degraded state never touches the legacy DOM.
    await expect(page.locator('button[aria-label="Lancer le parcours"]')).toHaveCount(47);
  });

  test('should offer the register button on the last registration day', async ({ page }) => {
    // 3 days before the action is still a registration day: the window the
    // server answers is open, so the button shows.
    await page.clock.setFixedTime(LAST_REGISTRATION_DAY);
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: OPEN_STATE }));
    await page.goto('/');

    await expect(
      page.getByRole('button', { name: "S'inscrire en binôme pour le parcours V2", exact: true }),
    ).toBeVisible();
  });
});

/**
 * The anti-bot honeypot and the data retention notice of ticket #18: the
 * hidden field is in the DOM (a bot fills it) but invisible to humans, and
 * the modal states how long the names are kept.
 */
test.describe('Anti-bot honeypot and GDPR notice', () => {
  test('should hide the honeypot from humans in the modal', async ({ page }) => {
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: OPEN_STATE }));
    await page.goto('/');

    const modal = await openRegistrationModal(page, 'V2');
    const honeypot = modal.locator('input[name="website"]');
    // Present in the DOM…
    await expect(honeypot).toHaveCount(1);
    // …but invisible to humans: never displayed, never in the tab order, and
    // out of the accessibility tree.
    await expect(honeypot).toBeHidden();
    await expect(honeypot).toHaveAttribute('aria-hidden', 'true');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toHaveAttribute('autocomplete', 'off');
  });

  test('should post the filled honeypot and be refused like any other invalid input', async ({
    page,
  }) => {
    const postBodies: string[] = [];
    await mockInscriptionsApi(page, {
      get: () => OPEN_STATE,
      post: async ({ body, fulfill }) => {
        postBodies.push(body);
        // The server refuses a filled honeypot with the SAME 400 as any other
        // invalid input: nothing is stored, and the answer never names the
        // honeypot (a bot must not be able to fingerprint the trap).
        await fulfill({ json: { error: 'invalid-inscription' }, status: 400 });
      },
    });
    await page.goto('/');

    const modal = await openRegistrationModal(page, 'V2');
    await fillRegistration(page, CONTRACT_BODY);
    // A bot fills the hidden field: the value travels with the registration
    // and the server refuses it without storing anything.
    await fillHoneypot(page, 'https://spam.example');
    await modal.getByRole('button', { name: 'Inscrire mon binôme' }).click();

    // The refusal is silent: the standard invalid-input message, never an
    // anti-robots hint.
    await expect(modal).toContainText('Saisie invalide');
    await expect(modal).not.toContainText(/anti-robots/i);
    expect(postBodies).toHaveLength(1);
    expect(JSON.parse(postBodies[0] ?? '{}')).toEqual({
      ...CONTRACT_BODY,
      honeypot: 'https://spam.example',
    });
    // Nothing was stored: the Parcours stays uncovered and unbadged.
    await expect(badgeLocator(page)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: "S'inscrire en binôme pour le parcours V2", exact: true }),
    ).toHaveCount(1);
  });

  test('should state the data retention of the names in the modal', async ({ page }) => {
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: OPEN_STATE }));
    await page.goto('/');

    const modal = await openRegistrationModal(page, 'V2');
    await expect(modal).toContainText(
      "Vos informations servent à établir les fiches de suivi de l'action.",
    );
    await expect(modal).toContainText('Les données sont effacées 90 jours après l');
  });

  test('should have no a11y violation on the open registration modal', async ({ page }) => {
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: OPEN_STATE }));
    await page.goto('/');

    await openRegistrationModal(page, 'V2');
    // The hidden honeypot must not break the audit of the home page.
    const results = await new AxeBuilder({ page })
      .disableRules(['meta-viewport', 'color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
