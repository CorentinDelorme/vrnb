import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
  test.describe('Basic rendering', () => {
    test('should have correct page title', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle('Action ramassage des déchets');
    });

    test('should display VRNB logo in header', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('img[alt="VRNB"]')).toBeVisible();
    });

    test('should display Ouest-France links in the press collapse', async ({ page }) => {
      await page.goto('/');
      await page.getByText('Articles Ouest-France').click();

      await expect(page.locator('img[alt="Logo Ouest-France"]')).toBeVisible();
      await expect(
        page.getByRole('link', {
          name: 'Bruz. Ils organisent une sortie pour ramasser les déchets',
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', {
          name: 'Bruz. 201 kg de déchets ramassés dans la nature',
        }),
      ).toBeVisible();
    });

    test('should NOT show back button on home', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('a[aria-label="Retour à l\'accueil"]')).not.toBeVisible();
    });

    test('should display footer with current year', async ({ page }) => {
      await page.goto('/');
      const currentYear = new Date().getFullYear().toString();
      await expect(page.locator('footer')).toContainText(`©${currentYear} VRNB`);
    });
  });

  test.describe('Tour sections', () => {
    test('should display bike tours section', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h2', { hasText: 'Parcours à vélo' })).toBeVisible();
    });

    test('should display walking tours section', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h2', { hasText: 'Parcours à pied' })).toBeVisible();
    });

    test('should list all 15 bike tours (V1–V15)', async ({ page }) => {
      await page.goto('/');
      const bikeSection = page.locator('app-tour-list-section', {
        hasText: 'Parcours à vélo',
      });
      const tourRows = bikeSection.locator('li.list-row');
      await expect(tourRows).toHaveCount(15);

      for (let i = 1; i <= 15; i++) {
        await expect(
          bikeSection.locator('li.list-row', { hasText: `V${i}` }).first(),
        ).toBeVisible();
      }
    });

    test('should list all 13 walking tours (P1–P13)', async ({ page }) => {
      await page.goto('/');
      const walkingSection = page.locator('app-tour-list-section', {
        hasText: 'Parcours à pied',
      });
      const tourRows = walkingSection.locator('li.list-row');
      await expect(tourRows).toHaveCount(13);

      for (let i = 1; i <= 13; i++) {
        await expect(
          walkingSection.locator('li.list-row', { hasText: `P${i}` }).first(),
        ).toBeVisible();
      }
    });

    test('should display distance in km for V1 (1,1 km)', async ({ page }) => {
      await page.goto('/');
      const v1Row = page.locator('li.list-row', { hasText: 'V1' }).first();
      await expect(v1Row).toContainText('1,1 km');
    });

    test('should display distance in meters for tours under 1 km', async ({ page }) => {
      await page.goto('/');
      // P1 has distance 0.5, so it should display "500 m"
      const p1Row = page.locator('li.list-row', { hasText: 'P1' }).first();
      await expect(p1Row).toContainText('500 m');
    });

    test('should have play button on each tour row', async ({ page }) => {
      await page.goto('/');
      const playButtons = page.locator('li.list-row button[aria-label="Lancer le parcours"]');
      // 15 bike + 13 walking = 28 total
      await expect(playButtons).toHaveCount(28);
    });

    test('should show "Voir tous les parcours" link for bike tours', async ({ page }) => {
      await page.goto('/');
      const bikeSection = page.locator('app-tour-list-section', {
        hasText: 'Parcours à vélo',
      });
      const link = bikeSection.getByRole('link', { name: 'Voir tous les parcours' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/tours/V');
    });

    test('should show "Voir tous les parcours" link for walking tours', async ({ page }) => {
      await page.goto('/');
      const walkingSection = page.locator('app-tour-list-section', {
        hasText: 'Parcours à pied',
      });
      const link = walkingSection.getByRole('link', { name: 'Voir tous les parcours' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/tours/P');
    });
  });

  test.describe('Saved tour banner', () => {
    test('should NOT show saved tour banner by default', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Reprendre le parcours')).not.toBeVisible();
    });

    test('should show saved tour banner when localStorage has saved tour', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vrnb_tour', JSON.stringify({ tourId: 'V1', step: 1 }));
      });
      await page.goto('/');
      await expect(page.getByText('Reprendre le parcours V1 (étape 2/3)')).toBeVisible();
    });
  });
});
