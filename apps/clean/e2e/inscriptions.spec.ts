import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Public inscriptions statuses on the home page (ticket #16): a Parcours
 * covered by the Édition shows the « Binôme inscrit » badge next to its title
 * once the home page has hydrated, uncovered rows stay unchanged. The
 * `GET /api/inscriptions` exchange is intercepted, so no KV backend is needed.
 */

/** Public state shape returned by the (mocked) API. */
const COVERED_V1 = {
  edition: { actionDate: '2027-02-14', year: 2027 },
  inscriptions: [{ tourId: 'V1', zoneId: 'bruz-sud' }],
  registrationOpen: true,
} as const;

/** Every « Binôme inscrit » badge of the page (none while loading/error). */
function badgeLocator(page: Page) {
  return page.locator('.badge-success', { hasText: 'Binôme inscrit' });
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
