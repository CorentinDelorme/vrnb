import { test } from '@playwright/test';

/**
 * Régénère tous les screenshots du mode d'emploi (/manual) en mode mobile
 * (viewport 360×780). Jamais de `fullPage` : on capture uniquement la zone
 * visible dans le viewport.
 *
 * Conçu pour être lancé contre un serveur en mode production
 * (next build && next start), pas contre le dev server.
 *
 * Les screenshots sont écrits dans public/manual/.
 *
 * Inscription Open / Closed :
 * - registrationOpen = false pour les screens 1 à 7 (pas de bouton « S'inscrire » sur l'accueil)
 * - registrationOpen = true pour les screens 8 et 9 (modal d'inscription visible)
 *
 * Usage:
 *   bun run build                      # une fois
 *   PORT=4200 bunx next start -p 4200  # dans un terminal
 *   bunx playwright test e2e/capture-manual.spec.ts --project=chromium
 */

const SCREENSHOT_DIR = '/home/corentin/Documents/workspace/vrnb/apps/clean/public/manual';

const EDITION = {
  actionDate: '2027-02-14',
  actionEndTime: '12:00',
  actionStartTime: '09:00',
  inscriptionsOpenDate: '2027-01-04',
  year: 2027,
};

/** Crée le mock d'inscriptions avec un registrationOpen donné. */
function inscriptionsMock(registrationOpen: boolean): unknown {
  return {
    edition: EDITION,
    registrationOpen,
    inscriptions: [],
  };
}

/** Attendre que les cartes Leaflet aient le temps de se dessiner (tuiles async). */
async function waitForMaps(page: any, ms = 1500): Promise<void> {
  await page.waitForTimeout(ms);
}

test.describe('Capture manual screenshots (mobile)', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('captures all 9 manual screenshots', async ({ page, context }) => {
    test.setTimeout(120000);

    // Mock initial : inscriptions FERMÉES (registrationOpen: false).
    // Pas de bouton « S'inscrire » sur l'accueil pour les screens 1 à 7.
    await context.route('**/api/inscriptions', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(inscriptionsMock(false)),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'created' }),
        });
      }
    });

    // ── 01-accueil ── (vue mobile, zone visible uniquement)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForMaps(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-accueil.png` });

    // ── 02-choisir-p2 ── (juste l'item de la ligne P2, pas toute la section)
    await page.locator('text=Bruz Sud').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page
      .locator('[data-testid="tour-row"]')
      .filter({ hasText: 'P2' })
      .first()
      .screenshot({ path: `${SCREENSHOT_DIR}/02-choisir-p2.png` });

    // ── 03-etape-debut ──
    await page.goto('/tour/bruz-sud/P2');
    await page.waitForLoadState('networkidle');
    await waitForMaps(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-etape-debut.png` });

    // ── 04-etape-nettoyage ── (clic Suivant → étape 1)
    await page.getByRole('button', { name: 'Suivant' }).click();
    await waitForMaps(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-etape-nettoyage.png` });

    // ── 05-etape-fin ── (clic Suivant → étape 2)
    await page.getByRole('button', { name: 'Suivant' }).click();
    await waitForMaps(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-etape-fin.png` });

    // ── 06-menu ── (Menu drawer ouvert)
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-menu.png` });

    // ── 07-reprendre ── (tour en cours dans localStorage, retour à l'accueil)
    await page.evaluate(() => {
      localStorage.setItem(
        'vrnb_tour',
        JSON.stringify({ tourId: 'P2', step: 1, zoneId: 'bruz-sud' }),
      );
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-reprendre.png` });

    // ── Passer les inscriptions en OUVERTES (registrationOpen: true)
    // Avant les screens 8 et 9 : le bouton « S'inscrire » apparaît sur l'accueil.
    await page.unroute('**/api/inscriptions');
    await context.route('**/api/inscriptions', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(inscriptionsMock(true)),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'created' }),
        });
      }
    });

    // ── 08-inscription-binome ── (modal d'inscription pour P2, fenêtre ouverte)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: "S'inscrire en binôme pour le parcours P2" }).click();
    await page.waitForTimeout(800);
    await page
      .locator('#register_modal_P2')
      .screenshot({ path: `${SCREENSHOT_DIR}/08-inscription-binome.png` });

    // ── 09-confirmation-inscription ── (remplir + soumettre → confirmation)
    // Les inputs sont des composants React contrôlés : on force leur activation
    // (ils peuvent être disabled tant que le statut d'inscriptions n'est pas
    // chargé), on remplit avec fill({ force: true }), puis on notifie React via
    // les événements DOM pour qu'il re-calcule complete.
    await page.evaluate(() => {
      const ids = [
        'register-first-name-1',
        'register-last-name-1',
        'register-first-name-2',
        'register-last-name-2',
      ];
      for (const id of ids) {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) input.disabled = false;
      }
      const checkbox = document.getElementById('register-engaged') as HTMLInputElement | null;
      if (checkbox) checkbox.disabled = false;
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Inscrire mon binôme'),
      ) as HTMLButtonElement | null;
      if (btn) btn.disabled = false;
    });
    await page.locator('#register-first-name-1').fill('Jean', { force: true });
    await page.locator('#register-last-name-1').fill('Dupont', { force: true });
    await page.locator('#register-first-name-2').fill('Marie', { force: true });
    await page.locator('#register-last-name-2').fill('Martin', { force: true });
    // Le Checkbox de shadcn rend un input caché : cliquer sur le label associé.
    await page.locator('label[for="register-engaged"]').click();
    // Notifier React des changements pour qu'il re-calcule complete.
    await page.evaluate(() => {
      const ids = [
        'register-first-name-1',
        'register-last-name-1',
        'register-first-name-2',
        'register-last-name-2',
      ];
      for (const id of ids) {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const checkbox = document.getElementById('register-engaged') as HTMLInputElement | null;
      if (checkbox) checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Inscrire mon binôme' }).click();
    // Attendre que le modal bascule sur l'état de confirmation.
    await page
      .locator('text=Votre binôme est inscrit pour ce parcours.')
      .waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page
      .locator('#register_modal_P2')
      .screenshot({ path: `${SCREENSHOT_DIR}/09-confirmation-inscription.png` });
  });
});
