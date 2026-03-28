import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Accessibility', () => {
  test.describe('Automated a11y audits (axe-core)', () => {
    // Known violations to exclude:
    // - meta-viewport: app uses user-scalable=no (by design for map interaction)
    // - color-contrast: DaisyUI theme color contrast on step indicators
    const EXCLUDED_RULES = ['meta-viewport', 'color-contrast'];

    test('should have no a11y violations on home page', async ({ page }) => {
      await page.goto('/');
      const results = await new AxeBuilder({ page }).disableRules(EXCLUDED_RULES).analyze();
      expect(results.violations).toEqual([]);
    });

    test('should have no a11y violations on tours map page', async ({ page }) => {
      await page.goto('/tours/V');
      // Wait for map to render
      await expect(page.locator('div#map')).toBeVisible();
      const results = await new AxeBuilder({ page }).disableRules(EXCLUDED_RULES).analyze();
      expect(results.violations).toEqual([]);
    });

    test('should have no a11y violations on tour page', async ({ page }) => {
      await page.goto('/tour/V1');
      // Wait for map to render
      await expect(page.locator('div#map')).toBeVisible();
      const results = await new AxeBuilder({ page }).disableRules(EXCLUDED_RULES).analyze();
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('Manual a11y checks', () => {
    test('should have aria-labels on all icon buttons', async ({ page }) => {
      await page.goto('/');
      // All play buttons should have aria-label
      const playButtons = page.locator('li.list-row button');
      const count = await playButtons.count();
      for (let i = 0; i < count; i++) {
        await expect(playButtons.nth(i)).toHaveAttribute('aria-label');
      }
    });

    test('should have alt text on VRNB logo', async ({ page }) => {
      await page.goto('/');
      const logo = page.locator('header img');
      await expect(logo).toHaveAttribute('alt', 'VRNB');
    });

    test('should have accessible back button', async ({ page }) => {
      await page.goto('/tour/V1');
      const backButton = page.locator('a[aria-label="Retour à l\'accueil"]');
      await expect(backButton).toBeVisible();
      await expect(backButton).toHaveAttribute('aria-label', "Retour à l'accueil");
    });

    test('should have accessible close button on modal', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('dialog#finish_modal');
      await expect(modal).toBeVisible();
      const closeButton = modal.locator('button[aria-label="Fermer"]');
      await expect(closeButton).toBeVisible();
    });

    test('should have accessible drawer close button', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByText('Menu', { exact: true }).click();
      const closeLabel = page.locator('.drawer-side label.btn-circle[aria-label="close sidebar"]');
      await expect(closeLabel).toBeVisible();
    });

    test('should support keyboard navigation on step buttons', async ({ page }) => {
      await page.goto('/tour/V1');
      const suivantButton = page.getByRole('button', { name: 'Suivant' });
      await suivantButton.focus();
      await page.keyboard.press('Enter');
      const secondStep = page.locator('li.step').nth(1);
      await expect(secondStep).toHaveClass(/step-secondary/);
    });

    test('should support keyboard navigation to close modal', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('dialog#finish_modal');
      await expect(modal).toBeVisible();

      const closeButton = modal.locator('button[aria-label="Fermer"]');
      await closeButton.focus();
      await page.keyboard.press('Enter');
      await expect(modal).not.toBeVisible();
    });
  });
});
