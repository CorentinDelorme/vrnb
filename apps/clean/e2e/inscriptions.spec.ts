import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Public inscriptions endpoints on the home page. Tickets #16 + #17: a
 * Parcours covered by the Édition shows the « Binôme inscrit » badge next to
 * its title once the home page has hydrated, every uncovered Parcours shows a
 * register button next to its play button, and the registration flows through
 * the DaisyUI modal with `POST /api/inscriptions`. Every exchange (GET and
 * POST) is intercepted with `page.route`, so no KV backend is needed.
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
  await modal.getByLabel('Prénom du membre 1').fill(String(body.firstName1));
  await modal.getByLabel('Nom du membre 1').fill(String(body.lastName1));
  await modal.getByLabel('Prénom du membre 2').fill(String(body.firstName2));
  await modal.getByLabel('Nom du membre 2').fill(String(body.lastName2));
  await modal.getByRole('checkbox').check();
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
      // A failed fetch just means "unknown coverage": no badge, and the play
      // button DOM contract (47 rows × 1 button) stays untouched.
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
      name: 'Inscrire un binôme pour le parcours V2',
      exact: true,
    });
    await expect(v2Register).toBeVisible();
    await v2Register.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    // The modal shows the selected tour context before anything is typed:
    await expect(modal).toContainText('Bruz Sud');
    await expect(modal).toContainText('14 février 2027');
    await expect(modal).toContainText('Place du Dr Joly');

    await fillRegistration(page, CONTRACT_BODY);
    // The engagement statement gates the submit:
    const submit = modal.getByRole('button', { name: 'Inscrire mon binôme' });
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
      .getByRole('button', { name: 'Inscrire un binôme pour le parcours P3', exact: true })
      .click();
    await page.getByLabel('Prénom du membre 1').fill('Céline');
    await page.getByLabel('Nom du membre 2').fill('Roux');

    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(page.getByLabel('Prénom du membre 1')).toBeHidden();

    await page
      .getByRole('button', { name: 'Inscrire un binôme pour le parcours P3', exact: true })
      .click();
    await expect(page.getByLabel('Prénom du membre 1')).toBeVisible();
    await expect(page.getByLabel('Prénom du membre 1')).toHaveValue('Céline');
    await expect(page.getByLabel('Nom du membre 2')).toHaveValue('Roux');
  });

  test('should show no register button on a covered tour but keep its badge', async ({ page }) => {
    await page.route('**/api/inscriptions', (route) => route.fulfill({ json: COVERED_V1 }));
    await page.goto('/');

    await expect(rowLocator(page, 'V1').locator('.badge-success')).toHaveText('Binôme inscrit');
    await expect(
      page.getByRole('button', { name: 'Inscrire un binôme pour le parcours V1', exact: true }),
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
      .getByRole('button', { name: 'Inscrire un binôme pour le parcours P2', exact: true })
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
      page.getByRole('button', { name: 'Inscrire un binôme pour le parcours P2', exact: true }),
    ).toHaveCount(0);
  });
});
