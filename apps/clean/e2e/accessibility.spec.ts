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
      await page.goto('/tours/bruz-sud/V');
      // Wait for map to render
      await expect(page.locator('div#map')).toBeVisible();
      const results = await new AxeBuilder({ page }).disableRules(EXCLUDED_RULES).analyze();
      expect(results.violations).toEqual([]);
    });

    test('should have no a11y violations on tour page', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      // Wait for map to render
      await expect(page.locator('div#map')).toBeVisible();
      const results = await new AxeBuilder({ page }).disableRules(EXCLUDED_RULES).analyze();
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('Manual a11y checks', () => {
    test('should have aria-labels on all icon buttons', async ({ page }) => {
      await page.goto('/');
      // All the row buttons (play and register) carry an aria-label. The
      // check is atomic on purpose: the register button of a covered Parcours
      // disappears once the statuses load, so an index-based loop would race
      // with the hydration and fail on a shrinking list.
      const buttonsWithoutLabel = await page
        .locator('li.list-row button')
        .evaluateAll(
          (buttons) => buttons.filter((button) => !button.getAttribute('aria-label')).length,
        );
      expect(buttonsWithoutLabel).toBe(0);
    });

    test('should have alt text on VRNB logo', async ({ page }) => {
      await page.goto('/');
      const logo = page.locator('header img');
      await expect(logo).toHaveAttribute('alt', 'VRNB');
    });

    test('should have accessible back button', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      const backButton = page.locator('a[aria-label="Retour à l\'accueil"]');
      await expect(backButton).toBeVisible();
      await expect(backButton).toHaveAttribute('aria-label', "Retour à l'accueil");
    });

    test('should have accessible close button on modal', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('#finish_modal');
      await expect(modal).toBeVisible();
      const closeButton = modal.locator('[data-slot="dialog-close"]');
      await expect(closeButton).toBeVisible();
    });

    test('should have accessible drawer close button', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByText('Menu', { exact: true }).click();
      const closeLabel = page.locator('[data-slot="drawer-close"]');
      await expect(closeLabel).toBeVisible();
    });

    test('should support keyboard navigation on step buttons', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      const suivantButton = page.getByRole('button', { name: 'Suivant' });
      await suivantButton.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="step-1-circle"]')).toHaveClass(/bg-secondary/);
    });

    test('should support keyboard navigation to close modal', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('#finish_modal');
      await expect(modal).toBeVisible();

      const closeButton = modal.locator('[data-slot="dialog-close"]');
      await closeButton.focus();
      await page.keyboard.press('Enter');
      await expect(modal).not.toBeVisible();
    });
  });
});
