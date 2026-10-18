import { Page, expect, test } from '@playwright/test';

/** Minimal stub of the Cloudflare Turnstile global used by the app. */
interface TurnstileStubOptions {
  sitekey: string;
  callback: (token: string) => void;
}

const INSCRIPTIONS_URL = '**/api/inscriptions';
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/**';

const E2E_CAPTCHA_TOKEN = 'e2e-captcha-token';

interface CoveredTour {
  zoneId: string;
  tourName: string;
}

interface StatusOptions {
  coveredTours?: CoveredTour[];
  turnstileSiteKey?: string;
}

/** Fakes the Turnstile global so no real challenge is fetched. */
async function stubTurnstile(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const turnstile = {
      render: (
        container: Element,
        options: { sitekey: string; callback: (token: string) => void },
      ): string => {
        container.innerHTML = '<div data-testid="turnstile-stub"></div>';
        options.callback('e2e-captcha-token');
        return 'e2e-widget';
      },
      reset: (): void => undefined,
    };
    (window as unknown as Record<string, unknown>)['turnstile'] = turnstile;
  });
  // Safety net: the stub is used as is, the remote challenge must never load.
  await page.route(TURNSTILE_SCRIPT_URL, (route) => route.abort());
}

/** Mocks the registration API; `onPost` receives the parsed request body. */
async function mockInscriptions(
  page: Page,
  options: StatusOptions = {},
  onPost?: (body: unknown) => void,
): Promise<void> {
  await page.route(INSCRIPTIONS_URL, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      onPost?.(request.postDataJSON());
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ year: 2027, zoneId: 'bruz-sud', tourName: 'V2' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        year: 2027,
        coveredTours: options.coveredTours ?? [],
        turnstileSiteKey: options.turnstileSiteKey ?? 'e2e-site-key',
      }),
    });
  });
}

/** Row of one tour in one section of the Bruz Sud zone. */
const tourRow = (page: Page, sectionTitle: string, tourName: string) =>
  page
    .locator('details[aria-label="Zone Bruz Sud"]')
    .locator('app-tour-list-section', { hasText: sectionTitle })
    .locator('li.list-row')
    .filter({ hasText: new RegExp(`^${tourName}\\b`) });

const registrationModal = (page: Page) => page.locator('dialog.modal');

test.describe('Binome registration', () => {
  test('registers a binome from the home page and shows the covered badge', async ({ page }) => {
    await stubTurnstile(page);
    let posted: unknown = null;
    await mockInscriptions(page, {}, (body) => {
      posted = body;
    });
    await page.goto('/');

    const row = tourRow(page, 'Parcours à vélo', 'V2');
    await row.getByRole('button', { name: 'Inscrire un binôme' }).click();

    const modal = registrationModal(page);
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('V2');
    await expect(modal).toContainText('Bruz Sud');
    await expect(modal).toContainText('dimanche 14 février 2027');
    await expect(modal).toContainText('Place du Dr Joly');

    await modal.getByLabel('Prénom du premier membre', { exact: true }).fill('Alice');
    await modal.getByLabel('Nom du premier membre', { exact: true }).fill('Martin');
    await modal.getByLabel('Prénom du second membre', { exact: true }).fill('Bruno');
    await modal.getByLabel('Nom du second membre', { exact: true }).fill('Petit');
    await modal.getByRole('checkbox').check();

    const submit = modal.getByRole('button', { name: "Valider l'inscription" });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(modal).toContainText('Votre binôme est inscrit.');
    await expect(row.getByText('Binôme inscrit')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Inscrire un binôme' })).toHaveCount(0);
    expect(posted).toMatchObject({
      zoneId: 'bruz-sud',
      tourName: 'V2',
      firstName1: 'Alice',
      lastName1: 'Martin',
      firstName2: 'Bruno',
      lastName2: 'Petit',
      commitment: true,
      captchaToken: E2E_CAPTCHA_TOKEN,
    });
  });

  test('shows the covered badge and hides the register button for a covered tour', async ({
    page,
  }) => {
    await stubTurnstile(page);
    await mockInscriptions(page, { coveredTours: [{ zoneId: 'bruz-sud', tourName: 'V1' }] });
    await page.goto('/');

    const coveredRow = tourRow(page, 'Parcours à vélo', 'V1');
    await expect(coveredRow.getByText('Binôme inscrit')).toBeVisible();
    await expect(coveredRow.getByRole('button', { name: 'Inscrire un binôme' })).toHaveCount(0);
    // The play button of a covered tour is untouched.
    await expect(coveredRow.getByRole('button', { name: 'Lancer le parcours' })).toBeVisible();

    const availableRow = tourRow(page, 'Parcours à vélo', 'V2');
    await expect(availableRow.getByRole('button', { name: 'Inscrire un binôme' })).toBeVisible();
    await expect(availableRow.getByText('Binôme inscrit')).toHaveCount(0);
  });

  test('shows the closed state when the action date is past', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2027-03-01T12:00:00Z'));
    await stubTurnstile(page);
    await mockInscriptions(page);
    await page.goto('/');

    const row = tourRow(page, 'Parcours à vélo', 'V2');
    await row.getByRole('button', { name: 'Inscrire un binôme' }).click();

    const modal = registrationModal(page);
    await expect(modal).toContainText("L'action est passée.");
    await expect(modal.getByRole('button', { name: "Valider l'inscription" })).toBeDisabled();
    await expect(modal.getByLabel('Prénom du premier membre')).toBeDisabled();
    await expect(modal.getByTestId('turnstile-stub')).toHaveCount(0);
  });
});
