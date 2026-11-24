import { expect, test } from '@playwright/test';

test.describe('Global tours map — /tours', () => {
  test('should have correct title', async ({ page }) => {
    await page.goto('/tours');
    await expect(page).toHaveTitle('Action ramassage des déchets - Tous les parcours');
  });

  test('should show back button in header', async ({ page }) => {
    await page.goto('/tours');
    await expect(page.locator('a[aria-label="Retour à l\'accueil"]')).toBeVisible();
  });

  test('should render map element', async ({ page }) => {
    await page.goto('/tours');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should show Menu button in header', async ({ page }) => {
    await page.goto('/tours');
    await expect(page.getByText('Menu', { exact: true })).toBeVisible();
  });

  test('should open drawer on Menu click', async ({ page }) => {
    await page.goto('/tours');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();
    // The title should be "Action ramassage des déchets - Tous les parcours"
    await expect(drawer.locator('[data-slot="drawer-title"]')).toHaveText([
      'Action ramassage des déchets',
      'Tous les parcours',
    ]);
  });

  test('should show global map PDF download link in drawer', async ({ page }) => {
    await page.goto('/tours');
    await page.getByText('Menu', { exact: true }).click();
    const pdfLink = page.locator('[data-slot="drawer-content"]').getByRole('link', {
      name: 'Télécharger le PDF de la carte',
    });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('href', '/pdf/Carte_tous_les_parcours.pdf');
  });

  test('should close drawer on close button click', async ({ page }) => {
    await page.goto('/tours');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();
    await page.locator('[data-slot="drawer-close"]').click();
    await expect(drawer).not.toBeVisible();
  });

  test('should navigate to home on back button click', async ({ page }) => {
    await page.goto('/tours');
    await page.locator('a[aria-label="Retour à l\'accueil"]').click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Home page — Menu links', () => {
  test('should show "Voir tous les parcours" link in home menu', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Voir tous les parcours' })).toBeVisible();
  });

  test('should navigate to /tours from home menu', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Menu', { exact: true }).click();
    await page.getByRole('link', { name: 'Voir tous les parcours' }).click();
    await expect(page).toHaveURL('/tours');
  });
});
