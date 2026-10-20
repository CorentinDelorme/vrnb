import { expect, test } from '@playwright/test';

// Guard for the JSX whitespace pitfall documented in `app/manual/page.tsx`: the
// compiler strips the space between an inline element (`<strong>`, `<kbd>`) and
// the following text when that text contains an HTML entity like `&apos;`
// ("allerjusqu'au"). The Vitest transform keeps the space, so only the
// dev-server-rendered page (SWC compilation) can catch a regression here.
test.describe('Manual', () => {
  test('keeps spaces around bold words in the rendered copy', async ({ page }) => {
    await page.goto('/manual');
    const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const spaced = [
      "3 temps : aller jusqu'au départ depuis le lieu de rendez-vous, nettoyer le parcours",
      "Sur l'accueil, trouvez votre zone",
      'boutons Précédent, Suivant et Terminer en bas',
      'boutons + et − de la carte',
      'Votre progression est enregistrée automatiquement sur votre téléphone',
      'Le parcours P2 de Bruz Sud fait 800 mètres de nettoyage',
      'parcours de 800 mètres : ramassez les déchets',
      "chemin du lieu de rendez-vous jusqu'au départ du parcours",
      "appuyez sur Suivant en bas de l'écran",
      "appuyez sur Terminer en bas de l'écran",
      'où vous étiez : étape 1 sur 3 (le chemin pour aller au départ)',
      "le message disparaît : il n'y a plus rien à reprendre",
      'Télécharger le PDF : une fiche du parcours',
      "fichier pour aller au départ : le chemin depuis le lieu de rendez-vous jusqu'au départ",
      'Itinéraire pour revenir (via GeoVelo) : ouvre le guidage à vélo de la fin du parcours',
    ];
    for (const phrase of spaced) {
      expect(text, `missing space around an inline element near: "${phrase}"`).toContain(phrase);
    }
  });
});
