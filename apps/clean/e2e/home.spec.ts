import { expect, test, type Page } from '@playwright/test';

/** A zone Card of the home page. The zones render as Cards:
 *  a CardTitle with the zone name and a "N parcours" Badge. The filter on the
 *  CardTitle disambiguates from the menu drawer card, which also names the
 *  zones. */
function zoneCard(page: Page, name: string) {
  return page.locator('[data-slot="card"]').filter({
    has: page.locator('[data-slot="card-title"]', { hasText: name }),
  });
}

/** The distance sliders of the filter bar. Base UI 1.9 renders no
 *  `role="slider"` attribute: the slider role is implicit on the native
 *  `<input type="range">` nested in each thumb, named through
 *  `getAriaLabel`. */
function cleaningMinSlider(page: Page) {
  return page.getByRole('slider', { name: 'Distance de nettoyage (km) (borne minimale)' });
}

/** Select a Type de parcours choice by clicking its toggle button.
 *  The filter uses a shadcn ToggleGroup (role="button" with aria-pressed),
 *  not native radio inputs. Uses JavaScript click to bypass sticky card interception. */
async function typeChoiceClick(page: Page, label: string) {
  await clickFilterToggle(page, label);
}

/** Open the filters accordion if it's closed (required on mobile/small viewports). */
async function openFiltersAccordion(page: Page) {
  const accordionTrigger = page.getByRole('button', { name: 'Filtres' });
  // First, wait for the accordion to open automatically on desktop (via useEffect).
  // If it doesn't open within 5s, click the trigger to open it manually.
  try {
    await expect(page.getByRole('slider')).toHaveCount(4, { timeout: 5000 });
  } catch {
    const isExpanded = await accordionTrigger.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await accordionTrigger.click();
    }
  }
  // Wait for accordion content to be fully rendered (animation completes)
  // Wait for all 4 sliders to be present
  await expect(page.getByRole('slider')).toHaveCount(4, { timeout: 15000 });
  // Wait for filter state to be applied
  await expect(page.getByRole('button', { name: 'Tous', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 15000 },
  );
  await expect(page.getByRole('button', { name: 'À pied', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'À vélo', exact: true })).toBeVisible({
    timeout: 15000,
  });
  // Small delay to let any sticky positioning settle
  await page.waitForTimeout(300);
}

/** Click a filter toggle button using JavaScript to bypass sticky card interception. */
async function clickFilterToggle(page: Page, label: string) {
  await page.evaluate((btnLabel) => {
    const btn = Array.from(document.querySelectorAll('button[data-slot="toggle-group-item"]')).find(
      (b) => b.textContent?.trim() === btnLabel,
    );
    if (btn instanceof HTMLElement) btn.click();
  }, label);
}

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
      await expect(page.locator('footer')).toContainText(
        `©${currentYear} Vélo Rando Nature Bruz (VRNB)`,
      );
    });
  });

  test.describe('Tour sections', () => {
    test('should display Bruz Sud zone heading', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-slot="card-title"]', { hasText: 'Bruz Sud' })).toBeVisible();
    });

    test('should display zone heading with tour count', async ({ page }) => {
      await page.goto('/');
      const zone = zoneCard(page, 'Bruz Sud');
      await expect(zone.locator('[data-slot="card-title"]', { hasText: 'Bruz Sud' })).toBeVisible();
      await expect(zone).toContainText('28 parcours');
    });

    test('should display bike tours section', async ({ page }) => {
      await page.goto('/');
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Parcours à vélo' }).first(),
      ).toBeVisible();
    });

    test('should display walking tours section', async ({ page }) => {
      await page.goto('/');
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: 'Parcours à pied' }).first(),
      ).toBeVisible();
    });

    test('should list all 15 Bruz Sud bike tours (V1–V15)', async ({ page }) => {
      await page.goto('/');
      const bikeSection = zoneCard(page, 'Bruz Sud').locator('app-tour-list-section', {
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
      const walkingSection = zoneCard(page, 'Bruz Sud').locator('app-tour-list-section', {
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
      // 15 bike + 13 walking (Bruz Sud) + 6 bike (Vau Gaillard) + 13 bike (Ker Lann) = 47 tours.
      // Each row carries a mobile (sm:hidden) and a desktop play variant:
      // toHaveCount counts attached nodes, so both are counted → 94.
      await expect(playButtons).toHaveCount(94);
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
    test('the filter bar sits above the zones with "Tous" pressed by default', async ({ page }) => {
      await page.goto('/');
      await openFiltersAccordion(page);

      await expect(page.locator('[aria-label="Filtres de parcours"]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tous', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByRole('button', { name: 'À pied', exact: true })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      await expect(page.getByRole('button', { name: 'À vélo', exact: true })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    test('filtering to "À vélo" hides walking sections and rows, then restoring "Tous" brings them back', async ({
      page,
    }) => {
      await page.goto('/');
      await openFiltersAccordion(page);

      // Invariant without filter: every section and all 94 play buttons
      // (47 tours × the 2 breakpoint variants attached to the DOM).
      await expect(zoneCard(page, 'Bruz Sud')).toBeVisible();
      await expect(zoneCard(page, 'Bruz Vau Gaillard')).toBeVisible();
      await expect(zoneCard(page, 'Bruz Ker Lann')).toBeVisible();
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        94,
      );
      await expect(zoneCard(page, 'Bruz Sud')).toContainText('28 parcours');

      // Switch to bike only.
      await typeChoiceClick(page, 'À vélo');
      await expect(page.getByRole('button', { name: 'À vélo', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      // The Bruz Sud walking block disappears; bike blocks remain everywhere.
      await expect(
        zoneCard(page, 'Bruz Sud').locator('[data-slot="card-title"]', {
          hasText: 'Parcours à pied',
        }),
      ).not.toBeVisible();
      await expect(
        zoneCard(page, 'Bruz Sud').locator('[data-slot="card-title"]', {
          hasText: 'Parcours à vélo',
        }),
      ).toBeVisible();
      await expect(zoneCard(page, 'Bruz Vau Gaillard')).toBeVisible();
      await expect(zoneCard(page, 'Bruz Ker Lann')).toBeVisible();

      // Only the bike tours remain: 15 + 6 + 13 = 34 tours → 68 play buttons
      // (both breakpoint variants are attached to the DOM).
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        68,
      );
      await expect(zoneCard(page, 'Bruz Sud')).toContainText('15 parcours');

      // Restore everything.
      await typeChoiceClick(page, 'Tous');
      await expect(page.getByRole('button', { name: 'Tous', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        94,
      );
      await expect(zoneCard(page, 'Bruz Sud')).toContainText('28 parcours');
    });
  });

  test.describe('Distance filters (ticket #52)', () => {
    test('the two distance sliders sit in the bar, "tout" by default, all rows visible', async ({
      page,
    }) => {
      await page.goto('/');
      await openFiltersAccordion(page);

      await expect(page.locator('[aria-label="Filtres de parcours"]')).toBeVisible();
      // Both distance sliders render (two handles each) with their "tout" label.
      await expect(page.getByRole('slider')).toHaveCount(4);
      await expect(page.getByText('tout')).toHaveCount(2);
      // 47 tours × 2 breakpoint play variants attached to the DOM.
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        94,
      );
    });

    test('moving the cleaning-distance min bound filters rows; returning to the extreme restores them', async ({
      page,
    }) => {
      await page.goto('/');
      await openFiltersAccordion(page);

      const cleaningMin = cleaningMinSlider(page);
      await expect(cleaningMin).toHaveAttribute('aria-valuenow', '0.5');

      // Invariant without filter: all 94 play buttons (47 tours × 2 variants).
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        94,
      );

      // Raise the cleaning minimum from 0,5 km to 1 km: short tours disappear.
      await cleaningMin.press('ArrowRight');
      await expect(cleaningMin).toHaveAttribute('aria-valuenow', '1');
      await expect(page.getByText('tout')).toHaveCount(1); // cleaning is no longer "tout"
      const playButtons = page.locator('li.list-row button[aria-label="Lancer le parcours"]');
      const remaining = await playButtons.count();
      expect(remaining).toBeLessThan(94);
      expect(remaining).toBeGreaterThan(0);

      // Return to the axis extreme: everything comes back.
      await cleaningMin.press('ArrowLeft');
      await expect(cleaningMin).toHaveAttribute('aria-valuenow', '0.5');
      await expect(page.getByText('tout')).toHaveCount(2);
      await expect(playButtons).toHaveCount(94);
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

      await typeChoiceClick(page, 'À vélo');
      await expect(page.getByRole('button', { name: 'À vélo', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByText('34 parcours affichés')).toBeVisible();

      // Restoring "Tous" removes the counter.
      await typeChoiceClick(page, 'Tous');
      await expect(page.getByText(/parcours affich/)).not.toBeVisible();
    });

    test('shows a singular counter when exactly one tour matches', async ({ page }) => {
      await page.goto('/');
      await openFiltersAccordion(page);

      await typeChoiceClick(page, 'À vélo');

      // Move the cleaning min from 0,5 to 4 km (7 steps of 0,5).
      const cleaningMin = cleaningMinSlider(page);
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
      await openFiltersAccordion(page);

      await typeChoiceClick(page, 'À pied');

      // No walking tour has a cleaning distance of 4 km → zero results.
      const cleaningMin = cleaningMinSlider(page);
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
      await openFiltersAccordion(page);

      await typeChoiceClick(page, 'À pied');

      const cleaningMin = cleaningMinSlider(page);
      for (let i = 0; i < 7; i++) {
        await cleaningMin.press('ArrowRight');
      }

      await expect(page.getByText('Aucun parcours ne correspond à ces filtres')).toBeVisible();

      await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click();

      // Back to the unfiltered state.
      await expect(page.getByRole('button', { name: 'Tous', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByText('tout')).toHaveCount(2);
      await expect(page.getByText(/Aucun parcours/)).not.toBeVisible();
      await expect(page.getByText(/parcours affich/)).not.toBeVisible();
      await expect(page.locator('li.list-row button[aria-label="Lancer le parcours"]')).toHaveCount(
        94,
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
