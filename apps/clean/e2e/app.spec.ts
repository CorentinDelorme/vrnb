import { expect, test } from '@playwright/test';

test.describe('App', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
