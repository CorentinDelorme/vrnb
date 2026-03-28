import { expect, test } from '@playwright/test';

test.describe('Tour page — V1 (bike)', () => {
  test.describe('Basic rendering', () => {
    test('should have correct title', async ({ page }) => {
      await page.goto('/tour/V1');
      await expect(page).toHaveTitle('Parcours V1');
    });

    test('should show back button', async ({ page }) => {
      await page.goto('/tour/V1');
      await expect(page.locator('a[aria-label="Retour à l\'accueil"]')).toBeVisible();
    });

    test('should display steps indicator with 3 steps', async ({ page }) => {
      await page.goto('/tour/V1');
      const steps = page.locator('li.step');
      await expect(steps).toHaveCount(3);
      await expect(steps.nth(0)).toContainText('Début');
      await expect(steps.nth(1)).toContainText('Nettoyage');
      await expect(steps.nth(2)).toContainText('Fin');
    });

    test('should render map', async ({ page }) => {
      await page.goto('/tour/V1');
      await expect(page.locator('div#map')).toBeVisible();
    });
  });

  test.describe('Step navigation', () => {
    test('should start at step Début (step 0)', async ({ page }) => {
      await page.goto('/tour/V1');
      const firstStep = page.locator('li.step').nth(0);
      await expect(firstStep).toHaveClass(/step-secondary/);
      await expect(firstStep).toContainText('Début');
    });

    test('should have Précédent button disabled at step 0', async ({ page }) => {
      await page.goto('/tour/V1');
      await expect(page.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    });

    test('should show Suivant button at step 0', async ({ page }) => {
      await page.goto('/tour/V1');
      await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible();
    });

    test('should advance to Nettoyage on Suivant click', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      const secondStep = page.locator('li.step').nth(1);
      await expect(secondStep).toHaveClass(/step-secondary/);
      await expect(page.getByRole('button', { name: 'Précédent' })).toBeEnabled();
    });

    test('should advance to Fin on second Suivant click', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      const thirdStep = page.locator('li.step').nth(2);
      await expect(thirdStep).toHaveClass(/step-secondary/);
    });

    test('should show Terminer button at step 2', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Suivant' })).not.toBeVisible();
    });

    test('should go back to Nettoyage on Précédent click', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Précédent' }).click();
      const secondStep = page.locator('li.step').nth(1);
      await expect(secondStep).toHaveClass(/step-secondary/);
      await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible();
    });

    test('should disable Précédent at step 0 after going back', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Précédent' }).click();
      await expect(page.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    });
  });

  test.describe('Finish flow', () => {
    test('should open finish modal on Terminer click', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('dialog#finish_modal');
      await expect(modal).toBeVisible();
    });

    test('should show congratulations text in modal', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('dialog#finish_modal');
      await expect(modal.locator('h3')).toContainText('Félicitations !');
      await expect(modal).toContainText('Vous avez terminé le parcours.');
    });

    test('should close modal on close button click', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Suivant' }).click();
      await page.getByRole('button', { name: 'Terminer' }).click();
      const modal = page.locator('dialog#finish_modal');
      await expect(modal).toBeVisible();
      await modal.locator('button[aria-label="Fermer"]').click();
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Drawer menu', () => {
    test('should show Menu button', async ({ page }) => {
      await page.goto('/tour/V1');
      await expect(page.getByText('Menu', { exact: true })).toBeVisible();
    });

    test('should open drawer with tour title', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawer = page.locator('.drawer-side ul.menu');
      await expect(drawer).toBeVisible();
      await expect(drawer.locator('h1')).toContainText('Parcours V1');
    });

    test('should show PDF download link', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByText('Menu', { exact: true }).click();
      const pdfLink = page.locator('.drawer-side').getByRole('link', {
        name: 'Télécharger le PDF',
      });
      await expect(pdfLink).toBeVisible();
      await expect(pdfLink).toHaveAttribute('href', '/pdf/V1.pdf');
    });

    test('should show 3 GPX download links', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawerSide = page.locator('.drawer-side');

      const startGpx = drawerSide.getByRole('link', {
        name: 'Télécharger le GPX vers le point de départ',
      });
      await expect(startGpx).toBeVisible();
      await expect(startGpx).toHaveAttribute('href', '/gpx/V1/V1_start.gpx');

      const tourGpx = drawerSide.getByRole('link', {
        name: 'Télécharger le GPX du parcours',
      });
      await expect(tourGpx).toBeVisible();
      await expect(tourGpx).toHaveAttribute('href', '/gpx/V1/V1.gpx');

      const endGpx = drawerSide.locator('a', {
        hasText: 'GPX pour retourner au Parc',
      });
      await expect(endGpx).toBeVisible();
      await expect(endGpx).toHaveAttribute('href', '/gpx/V1/V1_end.gpx');
    });

    test('should show GeoVelo section', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawerSide = page.locator('.drawer-side');
      await expect(drawerSide.locator('img[alt="GeoVelo"]')).toBeVisible();
      await expect(drawerSide.locator('a', { hasText: 'depuis ma position' })).toBeVisible();
    });

    test('should close drawer on close button', async ({ page }) => {
      await page.goto('/tour/V1');
      await page.getByText('Menu', { exact: true }).click();
      const drawer = page.locator('.drawer-side ul.menu');
      await expect(drawer).toBeVisible();
      await page.locator('.drawer-side label.btn-circle[aria-label="close sidebar"]').click();
      await expect(drawer).not.toBeVisible();
    });
  });
});

test.describe('Tour page — P3 (walking)', () => {
  test('should have correct title', async ({ page }) => {
    await page.goto('/tour/P3');
    await expect(page).toHaveTitle('Parcours P3');
  });

  test('should navigate through steps and finish', async ({ page }) => {
    await page.goto('/tour/P3');
    // Step 0 → Step 1
    await page.getByRole('button', { name: 'Suivant' }).click();
    const secondStep = page.locator('li.step').nth(1);
    await expect(secondStep).toHaveClass(/step-secondary/);

    // Step 1 → Step 2
    await page.getByRole('button', { name: 'Suivant' }).click();
    const thirdStep = page.locator('li.step').nth(2);
    await expect(thirdStep).toHaveClass(/step-secondary/);

    // Click Terminer
    await page.getByRole('button', { name: 'Terminer' }).click();
    const modal = page.locator('dialog#finish_modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h3')).toContainText('Félicitations !');
  });

  test('should show correct PDF link in drawer', async ({ page }) => {
    await page.goto('/tour/P3');
    await page.getByText('Menu', { exact: true }).click();
    const pdfLink = page.locator('.drawer-side').getByRole('link', {
      name: 'Télécharger le PDF',
    });
    await expect(pdfLink).toHaveAttribute('href', '/pdf/P3.pdf');
  });

  test('should show correct GPX links', async ({ page }) => {
    await page.goto('/tour/P3');
    await page.getByText('Menu', { exact: true }).click();
    const drawerSide = page.locator('.drawer-side');

    // P3 has startDistance 0 — so the start GPX link may or may not show
    // Check tour GPX which always exists
    const tourGpx = drawerSide.getByRole('link', {
      name: 'Télécharger le GPX du parcours',
    });
    await expect(tourGpx).toBeVisible();
    await expect(tourGpx).toHaveAttribute('href', '/gpx/P3/P3.gpx');

    const endGpx = drawerSide.locator('a', {
      hasText: 'GPX pour retourner au Parc',
    });
    await expect(endGpx).toBeVisible();
    await expect(endGpx).toHaveAttribute('href', '/gpx/P3/P3_end.gpx');
  });
});
