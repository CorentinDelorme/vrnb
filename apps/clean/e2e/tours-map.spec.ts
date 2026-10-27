import { expect, test } from '@playwright/test';

test.describe('Tours map — Bike (V)', () => {
  test('should have correct title', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await expect(page).toHaveTitle('Bruz Sud - Parcours à vélo');
  });

  test('should show back button in header', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await expect(page.locator('a[aria-label="Retour à l\'accueil"]')).toBeVisible();
  });

  test('should render map element', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should show Menu button in header', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await expect(page.getByText('Menu', { exact: true })).toBeVisible();
  });

  test('should open drawer on Menu click', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();
    // The title splits on " - " into two DrawerTitle lines.
    await expect(drawer.locator('[data-slot="drawer-title"]')).toHaveText([
      'Bruz Sud',
      'Parcours à vélo',
    ]);
  });

  test('should not show the tracking PDF link in drawer', async ({ page }) => {
    // The « Fiches de suivi » are generated from the real inscriptions by the
    // referent script, outside the site: the drawer only offers the map PDF.
    await page.goto('/tours/bruz-sud/V');
    await page.getByText('Menu', { exact: true }).click();
    await expect(
      page
        .locator('[data-slot="drawer-content"]')
        .getByRole('link', { name: 'Télécharger le PDF de suivi' }),
    ).toHaveCount(0);
  });

  test('should show map PDF download link in drawer', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await page.getByText('Menu', { exact: true }).click();
    const pdfLink = page.locator('[data-slot="drawer-content"]').getByRole('link', {
      name: 'Télécharger le PDF de la carte',
    });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('href', '/pdf/bruz-sud/Carte_parcours_a_velo.pdf');
  });

  test('should close drawer on close button click', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await page.getByText('Menu', { exact: true }).click();
    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();
    await page.locator('[data-slot="drawer-close"]').click();
    await expect(drawer).not.toBeVisible();
  });

  test('should navigate to home on back button click', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await page.locator('a[aria-label="Retour à l\'accueil"]').click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Tours map — Walking (P)', () => {
  test('should have correct title', async ({ page }) => {
    await page.goto('/tours/bruz-sud/P');
    await expect(page).toHaveTitle('Bruz Sud - Parcours à pied');
  });

  test('should render map element', async ({ page }) => {
    await page.goto('/tours/bruz-sud/P');
    await expect(page.locator('div#map')).toBeVisible();
  });

  test('should not show the tracking PDF link with the walking tour map', async ({ page }) => {
    await page.goto('/tours/bruz-sud/P');
    await page.getByText('Menu', { exact: true }).click();
    await expect(
      page
        .locator('[data-slot="drawer-content"]')
        .getByRole('link', { name: 'Télécharger le PDF de suivi' }),
    ).toHaveCount(0);
  });

  test('should show map PDF download link with correct href', async ({ page }) => {
    await page.goto('/tours/bruz-sud/P');
    await page.getByText('Menu', { exact: true }).click();
    const pdfLink = page.locator('[data-slot="drawer-content"]').getByRole('link', {
      name: 'Télécharger le PDF de la carte',
    });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('href', '/pdf/bruz-sud/Carte_parcours_a_pied.pdf');
  });
});

test.describe('Tours map — Drawing parity', () => {
  test('should draw one distinctly colored route per tour with markers and labels', async ({
    page,
  }) => {
    await page.goto('/tours/bruz-sud/V');

    // 15 bike tours of Bruz Sud, each drawn as at least one colored polyline.
    const routes = page.locator('.leaflet-overlay-pane path');
    await expect.poll(() => routes.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(15);

    // Distinct colors per parcours (20-color legacy palette).
    const colors = await routes.evaluateAll((elements) =>
      [...new Set(elements.map((element) => element.getAttribute('stroke')))].filter(Boolean),
    );
    expect(colors.length).toBeGreaterThanOrEqual(10);

    // Small start/end pins and mid-trace labels for every tour.
    await expect
      .poll(() => page.locator('img[src="/media/pin-icon-start.png"]').count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(15);
    await expect
      .poll(() => page.locator('img[src="/media/pin-icon-end.png"]').count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(15);
    await expect
      .poll(() => page.locator('div.tour-label').count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(15);
  });

  test('should expose the fullscreen control', async ({ page }) => {
    await page.goto('/tours/bruz-sud/V');
    await expect(page.locator('.leaflet-control-zoom-fullscreen')).toBeVisible();
  });
});

test.describe('Tours map — Invalid params', () => {
  test('should return 404 for an unknown zone', async ({ page }) => {
    const response = await page.goto('/tours/nowhere/V');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Page introuvable')).toBeVisible();
  });

  test('should return 404 for an unknown practice type', async ({ page }) => {
    const response = await page.goto('/tours/bruz-sud/X');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Page introuvable')).toBeVisible();
  });
});
