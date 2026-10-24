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
      await page.getByText('Articles Ouest-France 2026').click();

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
    test('should display Bruz Sud zone heading', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('details[aria-label="Zone Bruz Sud"]')).toBeVisible();
    });

    test('should display zone heading with tour count', async ({ page }) => {
      await page.goto('/');
      const zone = page.locator('details[aria-label="Zone Bruz Sud"]');
      await expect(zone.locator('summary h2', { hasText: 'Bruz Sud' })).toBeVisible();
      await expect(zone.locator('summary')).toContainText('28 parcours');
    });

    test('should collapse and expand the zone block on summary click', async ({ page }) => {
      await page.goto('/');
      const zone = page.locator('details[aria-label="Zone Bruz Sud"]');
      await expect(zone).toHaveAttribute('open', '');
      await zone.locator('summary').click();
      await expect(zone).not.toHaveAttribute('open', '');
      await zone.locator('summary').click();
      await expect(zone).toHaveAttribute('open', '');
    });

    test('should display bike tours section', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h2', { hasText: 'Parcours à vélo' }).first()).toBeVisible();
    });

    test('should display walking tours section', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h2', { hasText: 'Parcours à pied' }).first()).toBeVisible();
    });

    test('should list all 15 Bruz Sud bike tours (V1–V15)', async ({ page }) => {
      await page.goto('/');
      const zone = page.locator('details[aria-label="Zone Bruz Sud"]');
      const bikeSection = zone.locator('app-tour-list-section', {
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

    test('should list all 13 walking tours (P1–P13) of Bruz Sud', async ({ page }) => {
      await page.goto('/');
      // Two zones now have a walking section (Bruz Sud 13 + Bruz Ker Lann 2): scope to Bruz Sud.
      const walkingSection = page
        .locator('details[aria-label="Zone Bruz Sud"]')
        .locator('app-tour-list-section', {
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
      // P2 (Bruz Sud) has distance 0.8, so it should display "800 m"
      const p2Row = page.locator('li.list-row', { hasText: 'P2' }).first();
      await expect(p2Row).toContainText('800 m');
    });

    test('should have play button on each tour row', async ({ page }) => {
      await page.goto('/');
      const playButtons = page.locator('li.list-row button[aria-label="Lancer le parcours"]');
      // 15 bike + 13 walking (Bruz Sud) + 6 bike (Vau Gaillard) + 13 bike (Ker Lann) = 47 total
      await expect(playButtons).toHaveCount(47);
    });

    test('should show "Voir tous les parcours" link for bike tours', async ({ page }) => {
      await page.goto('/');
      const bikeSection = page
        .locator('app-tour-list-section', {
          hasText: 'Parcours à vélo',
        })
        .first();
      const link = bikeSection.getByRole('link', { name: 'Voir tous les parcours' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/tours/bruz-sud/V');
    });

    test('should show "Voir tous les parcours" link for walking tours', async ({ page }) => {
      await page.goto('/');
      const walkingSection = page
        .locator('app-tour-list-section', {
          hasText: 'Parcours à pied',
        })
        .first();
      const link = walkingSection.getByRole('link', { name: 'Voir tous les parcours' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/tours/bruz-sud/P');
    });
  });

  test.describe('Filtering by type', () => {
    test('the filter bar sits above the zones with "Tous" checked by default', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('section[aria-label="Filtres de parcours"]')).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Tous' })).toBeChecked();
      await expect(page.getByRole('radio', { name: 'À pied' })).not.toBeChecked();
      await expect(page.getByRole('radio', { name: 'À vélo' })).not.toBeChecked();
    });

    test('filtering to "À vélo" hides walking sections and rows, then restoring "Tous" brings them back', async ({
      page,
    }) => {
      await page.goto('/');

      // Invariant without filter: every section and all 47 play buttons.
      await expect(page.locator('details[aria-label="Zone Bruz Sud"]')).toBeVisible();
      await expect(page.locator('details[aria-label="Zone Bruz Vau Gaillard"]')).toBeVisible();
      await expect(page.locator('details[aria-label="Zone Bruz Ker Lann"]')).toBeVisible();
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        47,
      );
      await expect(
        page.locator('details[aria-label="Zone Bruz Sud"]').locator('summary'),
      ).toContainText('28 parcours');

      // Switch to bike only.
      await page.getByRole('radio', { name: 'À vélo' }).click();
      await expect(page.getByRole('radio', { name: 'À vélo' })).toBeChecked();

      // The Bruz Sud walking block disappears; bike blocks remain everywhere.
      await expect(
        page.locator('details[aria-label="Zone Bruz Sud"]').locator('h2', {
          hasText: 'Parcours à pied',
        }),
      ).not.toBeVisible();
      await expect(
        page.locator('details[aria-label="Zone Bruz Sud"]').locator('h2', {
          hasText: 'Parcours à vélo',
        }),
      ).toBeVisible();
      await expect(page.locator('details[aria-label="Zone Bruz Vau Gaillard"]')).toBeVisible();
      await expect(page.locator('details[aria-label="Zone Bruz Ker Lann"]')).toBeVisible();

      // Only the bike tours remain: 15 + 6 + 13 = 34 play buttons.
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        34,
      );
      await expect(
        page.locator('details[aria-label="Zone Bruz Sud"]').locator('summary'),
      ).toContainText('15 parcours');

      // Restore everything.
      await page.getByRole('radio', { name: 'Tous' }).click();
      await expect(page.getByRole('radio', { name: 'Tous' })).toBeChecked();
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        47,
      );
      await expect(
        page.locator('details[aria-label="Zone Bruz Sud"]').locator('summary'),
      ).toContainText('28 parcours');
    });
  });

  test.describe('Distance filters (ticket #52)', () => {
    test('the two distance sliders sit in the bar, "tout" by default, all rows visible', async ({
      page,
    }) => {
      await page.goto('/');

      await expect(page.locator('section[aria-label="Filtres de parcours"]')).toBeVisible();
      // Both distance sliders render (two handles each) with their "tout" label.
      await expect(page.locator('[role="slider"]')).toHaveCount(4);
      await expect(page.getByText('tout')).toHaveCount(2);
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        47,
      );
    });

    test('moving the cleaning-distance min bound filters rows; returning to the extreme restores them', async ({
      page,
    }) => {
      await page.goto('/');

      const sliders = page.locator('[role="slider"]');
      const cleaningMin = sliders.nth(0);
      await expect(cleaningMin).toHaveAttribute('aria-valuenow', '0.5');

      // Invariant without filter: all 47 play buttons.
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        47,
      );

      // Raise the cleaning minimum from 0,5 km to 1 km: short tours disappear.
      await cleaningMin.press('ArrowRight');
      await expect(cleaningMin).toHaveAttribute('aria-valuenow', '1');
      await expect(page.getByText('tout')).toHaveCount(1); // cleaning is no longer "tout"
      const playButtons = page.locator('li.list-row button[aria-label="Lancer le parcours"]');
      const remaining = await playButtons.count();
      expect(remaining).toBeLessThan(47);
      expect(remaining).toBeGreaterThan(0);

      // Return to the axis extreme: everything comes back.
      await cleaningMin.press('ArrowLeft');
      await expect(cleaningMin).toHaveAttribute('aria-valuenow', '0.5');
      await expect(page.getByText('tout')).toHaveCount(2);
      await expect(playButtons).toHaveCount(47);
    });
  });

  test.describe('Counter and empty state (ticket #53)', () => {
    test('shows no counter when no filter is active', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText(/parcours affich/)).not.toBeVisible();
      await expect(page.getByText(/Aucun parcours/)).not.toBeVisible();
    });

    test('shows a plural counter when filtering to "À vélo"', async ({ page }) => {
      await page.goto('/');

      await page.getByRole('radio', { name: 'À vélo' }).click();
      await expect(page.getByRole('radio', { name: 'À vélo' })).toBeChecked();
      await expect(page.getByText('34 parcours affichés')).toBeVisible();

      // Restoring "Tous" removes the counter.
      await page.getByRole('radio', { name: 'Tous' }).click();
      await expect(page.getByText(/parcours affich/)).not.toBeVisible();
    });

    test('shows a singular counter when exactly one tour matches', async ({ page }) => {
      await page.goto('/');

      await page.getByRole('radio', { name: 'À vélo' }).click();

      // Move the cleaning min from 0,5 to 4 km (7 steps of 0,5).
      const sliders = page.locator('[role="slider"]');
      const cleaningMin = sliders.nth(0);
      for (let i = 0; i < 7; i++) {
        await cleaningMin.press('ArrowRight');
      }
      await expect(cleaningMin).toHaveAttribute('aria-valuenow', '4');
      await expect(page.getByText('1 parcours affiché')).toBeVisible();
    });

    test('shows the empty state message and a reset button when zero tours match', async ({
      page,
    }) => {
      await page.goto('/');

      await page.getByRole('radio', { name: 'À pied' }).click();

      // No walking tour has a cleaning distance of 4 km → zero results.
      const sliders = page.locator('[role="slider"]');
      const cleaningMin = sliders.nth(0);
      for (let i = 0; i < 7; i++) {
        await cleaningMin.press('ArrowRight');
      }

      await expect(page.getByText('Aucun parcours ne correspond à ces filtres')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Réinitialiser les filtres' })).toBeVisible();

      // No play buttons while the result is empty.
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        0,
      );
    });

    test('resets every filter when clicking "Réinitialiser les filtres"', async ({ page }) => {
      await page.goto('/');

      await page.getByRole('radio', { name: 'À pied' }).click();

      const sliders = page.locator('[role="slider"]');
      const cleaningMin = sliders.nth(0);
      for (let i = 0; i < 7; i++) {
        await cleaningMin.press('ArrowRight');
      }

      await expect(page.getByText('Aucun parcours ne correspond à ces filtres')).toBeVisible();

      await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click();

      // Back to the unfiltered state.
      await expect(page.getByRole('radio', { name: 'Tous' })).toBeChecked();
      await expect(page.getByText('tout')).toHaveCount(2);
      await expect(page.getByText(/Aucun parcours/)).not.toBeVisible();
      await expect(page.getByText(/parcours affich/)).not.toBeVisible();
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        47,
      );
    });
  });

  test.describe('Saved tour banner', () => {
    test('should NOT show saved tour banner by default', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Reprendre le parcours')).not.toBeVisible();
    });

    test('should show saved tour banner when localStorage has saved tour', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          'vrnb_tour',
          JSON.stringify({ tourId: 'V1', step: 1, zoneId: 'bruz-sud' }),
        );
      });
      await page.goto('/');
      await expect(page.getByText('Reprendre le parcours Bruz Sud - V1 (étape 2/3)')).toBeVisible();
    });
  });
});
