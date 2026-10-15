import { expect, test } from '@playwright/test';

test.describe('Cross-route navigation', () => {
  test('should navigate from home to tour V1 via play button', async ({ page }) => {
    await page.goto('/');
    const v1Row = page.locator('li.list-row', { hasText: 'V1' }).first();
    await v1Row.locator('button[aria-label="Lancer le parcours"]').click();
    await expect(page).toHaveURL('/tour/bruz-sud/V1');
    await expect(page).toHaveTitle('Bruz Sud - Parcours V1');
  });

  test('should navigate from home to tour P3 via play button', async ({ page }) => {
    await page.goto('/');
    const p3Row = page.locator('li.list-row', { hasText: 'P3' }).first();
    await p3Row.locator('button[aria-label="Lancer le parcours"]').click();
    await expect(page).toHaveURL('/tour/bruz-sud/P3');
    await expect(page).toHaveTitle('Bruz Sud - Parcours P3');
  });

  test('should navigate from home to bike tours map', async ({ page }) => {
    await page.goto('/');
    const bikeSection = page.locator('app-tour-list-section', {
      hasText: 'Parcours à vélo',
    });
    await bikeSection.getByRole('link', { name: 'Voir tous les parcours' }).click();
    await expect(page).toHaveURL('/tours/bruz-sud/V');
  });

  test('should navigate from home to walking tours map', async ({ page }) => {
    await page.goto('/');
    const walkingSection = page.locator('app-tour-list-section', {
      hasText: 'Parcours à pied',
    });
    await walkingSection.getByRole('link', { name: 'Voir tous les parcours' }).click();
    await expect(page).toHaveURL('/tours/bruz-sud/P');
  });

  test('should navigate from tours map back to home', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await page.locator('a[aria-label="Retour à l\'accueil"]').click();
    await expect(page).toHaveURL('/');
  });

  test('should navigate from tour back to home', async ({ page }) => {
    await page.goto('/tour/bruz-sud/V1');
    await page.locator('a[aria-label="Retour à l\'accueil"]').click();
    await expect(page).toHaveURL('/');
  });

  test('should navigate from saved tour banner to tour', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'vrnb_tour',
        JSON.stringify({ tourId: 'V1', step: 1, zoneId: 'bruz-sud' }),
      );
    });
    await page.goto('/');
    const banner = page.locator('li.list-row', { hasText: 'Reprendre le parcours' });
    await banner.locator('button[aria-label="Lancer le parcours"]').click();
    await expect(page).toHaveURL('/tour/bruz-sud/V1');
  });

  test('should support legacy pre-zone tour URL (defaults to Bruz Sud)', async ({ page }) => {
    await page.goto('/tour/V1');
    await expect(page).toHaveTitle('Bruz Sud - Parcours V1');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should support legacy pre-zone tours map URL (defaults to Bruz Sud)', async ({ page }) => {
    await page.goto('/tours/V');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should restore step from legacy pre-zone save (no zoneId)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'V1', step: 1 }));
    });
    await page.goto('/tour/bruz-sud/V1');

    const secondStep = page.locator('li.step').nth(1);
    await expect(secondStep).toHaveClass(/step-secondary/);
  });
});
