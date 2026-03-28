import { expect, test } from '@playwright/test';

test.describe('Tours map — Bike (V)', () => {
  test('should have correct title', async ({ page }) => {
    await page.goto('/tours/V');
    await expect(page).toHaveTitle('Parcours à vélo');
  });

  test('should show back button in header', async ({ page }) => {
    await page.goto('/tours/V');
    await expect(page.locator('a[aria-label="Retour à l\'accueil"]')).toBeVisible();
  });

  test('should render map element', async ({ page }) => {
    await page.goto('/tours/V');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should show Menu button in header', async ({ page }) => {
    await page.goto('/tours/V');
    await expect(page.getByText('Menu', { exact: true })).toBeVisible();
  });

  test('should open drawer on Menu click', async ({ page }) => {
    await page.goto('/tours/V');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('.drawer-side ul.menu');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('h1')).toContainText('Parcours à vélo');
  });

  test('should show PDF download link in drawer', async ({ page }) => {
    await page.goto('/tours/V');
    await page.getByText('Menu', { exact: true }).click();
    const pdfLink = page.locator('.drawer-side').getByRole('link', {
      name: 'Télécharger le PDF de suivi',
    });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('href', '/pdf/Suivi_parcours_a_velo.pdf');
  });

  test('should close drawer on close button click', async ({ page }) => {
    await page.goto('/tours/V');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('.drawer-side ul.menu');
    await expect(drawer).toBeVisible();
    await page.locator('.drawer-side label.btn-circle[aria-label="close sidebar"]').click();
    await expect(drawer).not.toBeVisible();
  });

  test('should navigate to home on back button click', async ({ page }) => {
    await page.goto('/tours/V');
    await page.locator('a[aria-label="Retour à l\'accueil"]').click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Tours map — Walking (P)', () => {
  test('should have correct title', async ({ page }) => {
    await page.goto('/tours/P');
    await expect(page).toHaveTitle('Parcours à pied');
  });

  test('should render map element', async ({ page }) => {
    await page.goto('/tours/P');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should show PDF download link with correct href', async ({ page }) => {
    await page.goto('/tours/P');
    await page.getByText('Menu', { exact: true }).click();
    const pdfLink = page.locator('.drawer-side').getByRole('link', {
      name: 'Télécharger le PDF de suivi',
    });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('href', '/pdf/Suivi_parcours_a_pied.pdf');
  });
});
