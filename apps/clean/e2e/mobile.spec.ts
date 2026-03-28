import { expect, test } from '@playwright/test';

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('should hide "Voir tous les parcours" links on mobile', async ({ page }) => {
    await page.goto('/');
    const bikeSection = page.locator('app-tour-list-section', {
      hasText: 'Parcours à vélo',
    });
    const link = bikeSection.getByRole('link', { name: 'Voir tous les parcours' });
    await expect(link).not.toBeVisible();

    const walkingSection = page.locator('app-tour-list-section', {
      hasText: 'Parcours à pied',
    });
    const walkLink = walkingSection.getByRole('link', { name: 'Voir tous les parcours' });
    await expect(walkLink).not.toBeVisible();
  });

  test('should still display all tour rows on mobile', async ({ page }) => {
    await page.goto('/');
    const playButtons = page.locator('li.list-row button[aria-label="Lancer le parcours"]');
    // 15 bike + 13 walking = 28 total
    await expect(playButtons).toHaveCount(28);
  });

  test('should render tour page with functional dock buttons', async ({ page }) => {
    await page.goto('/tour/V1');
    await expect(page.getByRole('button', { name: 'Précédent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible();
  });

  test('should allow step navigation on mobile', async ({ page }) => {
    await page.goto('/tour/V1');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Terminer' }).click();
    const modal = page.locator('dialog#finish_modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h3')).toContainText('Félicitations !');
  });

  test('should render map on mobile tours page', async ({ page }) => {
    await page.goto('/tours/V');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should open and close drawer on mobile', async ({ page }) => {
    await page.goto('/tour/V1');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('.drawer-side ul.menu');
    await expect(drawer).toBeVisible();
    await page.locator('.drawer-side label.btn-circle[aria-label="close sidebar"]').click();
    await expect(drawer).not.toBeVisible();
  });
});
