import { expect, test } from '@playwright/test';

test.describe('App', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  // Sanctioned divergence from the legacy SPA (spec #3, US 25): an unknown URL
  // must answer HTTP 404 instead of the broken 200 shell.
  test('should return a clean 404 for an unknown URL', async ({ page }) => {
    const response = await page.goto('/cette-page-nexiste-pas');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Page introuvable')).toBeVisible();
  });
});
