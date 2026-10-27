import { expect, test } from '@playwright/test';

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('should show "Voir tous les parcours" links on mobile', async ({ page }) => {
    await page.goto('/');
    // Bruz Sud is the only zone with both practice types, so per zone the
    // section locator is unique.
    const sudZone = page
      .locator('[data-slot="card"]')
      .filter({ has: page.locator('[data-slot="card-title"]', { hasText: 'Bruz Sud' }) });

    const link = sudZone
      .locator('app-tour-list-section', { hasText: 'Parcours à vélo' })
      .getByRole('link', { name: 'Voir tous les parcours' });
    await expect(link).toBeVisible();

    const walkLink = sudZone
      .locator('app-tour-list-section', { hasText: 'Parcours à pied' })
      .getByRole('link', { name: 'Voir tous les parcours' });
    await expect(walkLink).toBeVisible();
  });

  test('should still display all tour rows on mobile', async ({ page }) => {
    await page.goto('/');
    const playButtons = page.locator('li.list-row button[aria-label="Lancer le parcours"]');
    // 15 bike + 13 walking (Bruz Sud) + 6 bike (Vau Gaillard) + 13 bike (Ker Lann) = 47 tours.
    // Each row carries a mobile (sm:hidden) and a desktop play variant:
    // toHaveCount counts attached nodes, so both are counted → 94.
    await expect(playButtons).toHaveCount(94);
  });

  test('should render tour page with functional dock buttons', async ({ page }) => {
    await page.goto('/tour/bruz-sud/V1');
    await expect(page.getByRole('button', { name: 'Précédent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible();
  });

  test('should allow step navigation on mobile', async ({ page }) => {
    await page.goto('/tour/bruz-sud/V1');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Terminer' }).click();
    // The finish modal is the shadcn Dialog of the tour page (DialogContent).
    const modal = page.locator('#finish_modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-slot="card-title"]')).toContainText(
      'Merci pour votre participation !',
    );
  });

  test('should render map on mobile tours page', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should open and close drawer on mobile', async ({ page }) => {
    await page.goto('/tour/bruz-sud/V1');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();
    await page.locator('[data-slot="drawer-close"]').click();
    await expect(drawer).not.toBeVisible();
  });
});
