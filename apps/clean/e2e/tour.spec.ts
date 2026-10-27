import { expect, test } from '@playwright/test';

test.describe('Tour page — V1 (bike)', () => {
  test.describe('Basic rendering', () => {
    test('should have correct title', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await expect(page).toHaveTitle('Bruz Sud - Parcours V1');
    });

    test('should show back button', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await expect(page.locator('a[aria-label="Retour à l\'accueil"]')).toBeVisible();
    });

    test('should display steps indicator with 3 steps', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      // The stepper renders one outer container (step-N, carrying the label)
      // and one circle (step-N-circle) per step: two testids per step.
      await expect(page.locator('[data-testid$="-circle"]')).toHaveCount(3);
      await expect(page.locator('[data-testid="step-0"]')).toContainText('Début');
      await expect(page.locator('[data-testid="step-1"]')).toContainText('Nettoyage');
      await expect(page.locator('[data-testid="step-2"]')).toContainText('Fin');
    });

    test('should render map', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await expect(page.locator('div#map')).toBeVisible();
    });
  });

  test.describe('Step navigation', () => {
    test('should start at step Début (step 0)', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await expect(page.locator('[data-testid="step-0"]')).toContainText('Début');
      await expect(page.locator('[data-testid="step-0-circle"]')).toHaveClass(/bg-secondary/);
    });

    test('should have Précédent button disabled at step 0', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await expect(page.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    });

    test('should show Suivant button at step 0', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible();
    });

    test('should advance to Nettoyage on Suivant click', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await expect(page.locator('[data-testid="step-1-circle"]')).toHaveClass(/bg-secondary/);
      await expect(page.getByRole('button', { name: 'Précédent' })).toBeEnabled();
    });

    test('should advance to Fin on second Suivant click', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await expect(page.locator('[data-testid="step-2-circle"]')).toHaveClass(/bg-secondary/);
    });

    test('should show Terminer button at step 2', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Suivant' })).not.toBeVisible();
    });

    test('should go back to Nettoyage on Précédent click', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Précédent' }).click();
      await expect(page.locator('[data-testid="step-1-circle"]')).toHaveClass(/bg-secondary/);
      await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible();
    });

    test('should disable Précédent at step 0 after going back', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Précédent' }).click();
      await expect(page.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    });
  });

  test.describe('Finish flow', () => {
    test('should open finish modal on Terminer click', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('#finish_modal');
      await expect(modal).toBeVisible();
    });

    test('should show participation message in modal', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('#finish_modal');
      await expect(modal.locator('[data-slot="card-title"]')).toContainText(
        'Merci pour votre participation !',
      );
      await expect(modal).toContainText(
        'Allez voir les organisateurs pour faire peser les déchets ramassés.',
      );
    });

    test('should close modal on close button click', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('#finish_modal');
      await expect(modal).toBeVisible();
      await modal.locator('[data-slot="dialog-close"]').click();
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Drawer menu', () => {
    test('should show Menu button', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await expect(page.getByText('Menu', { exact: true })).toBeVisible();
    });

    test('should open drawer with tour title', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawer = page.locator('[data-slot="drawer-content"]');
      await expect(drawer).toBeVisible();
      // The title splits on " - " into two DrawerTitle lines.
      await expect(drawer.locator('[data-slot="drawer-title"]')).toHaveText([
        'Bruz Sud',
        'Parcours V1',
      ]);
    });

    test('should show PDF download link', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByText('Menu', { exact: true }).click();
      const pdfLink = page.locator('[data-slot="drawer-content"]').getByRole('link', {
        name: 'Télécharger le PDF',
      });
      await expect(pdfLink).toBeVisible();
      await expect(pdfLink).toHaveAttribute('href', '/pdf/bruz-sud/V1.pdf');
    });

    test('should show 3 GPX download links', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawerSide = page.locator('[data-slot="drawer-content"]');

      const startGpx = drawerSide.getByRole('link', {
        name: 'Télécharger le GPX vers le point de départ',
      });
      await expect(startGpx).toBeVisible();
      await expect(startGpx).toHaveAttribute('href', '/gpx/bruz-sud/V1/V1_start.gpx');

      const tourGpx = drawerSide.getByRole('link', {
        name: 'Télécharger le GPX du parcours',
      });
      await expect(tourGpx).toBeVisible();
      await expect(tourGpx).toHaveAttribute('href', '/gpx/bruz-sud/V1/V1.gpx');

      const endGpx = drawerSide.locator('a', {
        hasText: 'GPX pour retourner au lieu',
      });
      await expect(endGpx).toBeVisible();
      await expect(endGpx).toHaveAttribute('href', '/gpx/bruz-sud/V1/V1_end.gpx');
    });

    test('should show GeoVelo section', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawerSide = page.locator('[data-slot="drawer-content"]');
      await expect(drawerSide.locator('img[alt="GeoVelo"]')).toBeVisible();
      await expect(drawerSide.locator('a', { hasText: 'depuis ma position' })).toBeVisible();
    });

    test('should close drawer on close button', async ({ page }) => {
      await page.goto('/tour/bruz-sud/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawer = page.locator('[data-slot="drawer-content"]');
      await expect(drawer).toBeVisible();
      await page.locator('[data-slot="drawer-close"]').click();
      await expect(drawer).not.toBeVisible();
    });
  });
});

test.describe('Tour page — P3 (walking)', () => {
  test('should have correct title', async ({ page }) => {
    await page.goto('/tour/bruz-sud/P3');
    await expect(page).toHaveTitle('Bruz Sud - Parcours P3');
  });

  test('should navigate through steps and finish', async ({ page }) => {
    await page.goto('/tour/bruz-sud/P3');
    // Step 0 → Step 1
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.locator('[data-testid="step-1-circle"]')).toHaveClass(/bg-secondary/);

    // Step 1 → Step 2
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.locator('[data-testid="step-2-circle"]')).toHaveClass(/bg-secondary/);

    // Click Terminer
    await page.getByRole('button', { name: 'Terminer' }).click();
    const modal = page.locator('#finish_modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-slot="card-title"]')).toContainText(
      'Merci pour votre participation !',
    );
  });

  test('should show correct PDF link in drawer', async ({ page }) => {
    await page.goto('/tour/bruz-sud/P3');
    await page.getByText('Menu', { exact: true }).click();
    const pdfLink = page.locator('[data-slot="drawer-content"]').getByRole('link', {
      name: 'Télécharger le PDF',
    });
    await expect(pdfLink).toHaveAttribute('href', '/pdf/bruz-sud/P3.pdf');
  });

  test('should show correct GPX links', async ({ page }) => {
    await page.goto('/tour/bruz-sud/P3');
    await page.getByText('Menu', { exact: true }).click();
    const drawerSide = page.locator('[data-slot="drawer-content"]');

    // P3 has startDistance 0 — so the start GPX link may or may not show
    // Check tour GPX which always exists
    const tourGpx = drawerSide.getByRole('link', {
      name: 'Télécharger le GPX du parcours',
    });
    await expect(tourGpx).toBeVisible();
    await expect(tourGpx).toHaveAttribute('href', '/gpx/bruz-sud/P3/P3.gpx');

    const endGpx = drawerSide.locator('a', {
      hasText: 'GPX pour retourner au lieu',
    });
    await expect(endGpx).toBeVisible();
    await expect(endGpx).toHaveAttribute('href', '/gpx/bruz-sud/P3/P3_end.gpx');
  });
});
