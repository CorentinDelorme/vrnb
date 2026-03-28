import { expect, test } from '@playwright/test';

test.describe('Tour progress persistence (localStorage)', () => {
  test('should save progress to localStorage on step change', async ({ page }) => {
    await page.goto('/tour/V1');
    await page.getByRole('button', { name: 'Suivant' }).click();

    const stored = await page.evaluate(() => localStorage.getItem('vrnb_tour'));
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({ tourId: 'V1', step: 1 });
  });

  test('should restore step from localStorage on revisit', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'V1', step: 1 }));
    });
    await page.goto('/tour/V1');

    // Step 1 (Nettoyage) should be active
    const secondStep = page.locator('li.step').nth(1);
    await expect(secondStep).toHaveClass(/step-secondary/);
    await expect(secondStep).toHaveClass(/text-secondary/);
  });

  test('should show resume banner on home page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'V1', step: 1 }));
    });
    await page.goto('/');
    await expect(page.getByText('Reprendre le parcours V1 (étape 2/3)')).toBeVisible();
  });

  test('should clear localStorage on tour finish', async ({ page }) => {
    await page.goto('/tour/V1');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Terminer' }).click();

    const stored = await page.evaluate(() => localStorage.getItem('vrnb_tour'));
    expect(stored).toBeNull();
  });

  test('should NOT show resume banner after finishing', async ({ page }) => {
    // Navigate to tour and advance to step 2 without addInitScript
    // (addInitScript re-runs on every navigation, re-setting localStorage)
    await page.goto('/tour/V1');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Terminer' }).click();

    // Verify localStorage was cleared
    const stored = await page.evaluate(() => localStorage.getItem('vrnb_tour'));
    expect(stored).toBeNull();

    // Navigate back to home
    await page.goto('/');
    await expect(page.getByText('Reprendre le parcours')).not.toBeVisible();
  });

  test('should NOT restore step if saved tour is different', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'P3', step: 1 }));
    });
    await page.goto('/tour/V1');

    // Should start at step 0 (Début), not step 1
    const firstStep = page.locator('li.step').nth(0);
    await expect(firstStep).toHaveClass(/text-secondary/);
  });

  test('should show resume banner for P tour', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'P3', step: 2 }));
    });
    await page.goto('/');
    await expect(page.getByText('Reprendre le parcours P3 (étape 3/3)')).toBeVisible();
  });
});
