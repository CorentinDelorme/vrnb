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
      "Un binôme, c'est deux bénévoles qui couvrent ensemble le même parcours : une inscription vaut pour un seul parcours",
      'Inscrire votre binôme est recommandé pour aider les organisateurs à préparer la journée',
      "1. Choisissez un parcours libre. Sur l'accueil, chaque parcours encore libre affiche un bouton S'inscrire à côté de son bouton de lecture",
      "2. Remplissez la fenêtre. Appuyez sur S'inscrire : la fenêtre rappelle la zone, le parcours, la date de l'action et le point de rendez-vous",
      'puis appuyez sur Inscrire mon binôme',
      "3. La confirmation s'affiche. Un message vert confirme votre inscription et rappelle le jour de l'action",
      'Premier arrivé, premier servi : le premier binôme à inscrire couvre le parcours, les suivants en choisissent un autre',
      "Les inscriptions ouvrent le lundi 4 janvier 2027 et sont possibles jusqu'au jeudi 11 février 2027 : la fenêtre se ferme 3 jours avant la date de l'action",
      "Les informations sont effacées 90 jours après l'action. Ils servent uniquement à établir les fiches de suivi de l'édition",
    ];
    for (const phrase of spaced) {
      expect(text, `missing space around an inline element near: "${phrase}"`).toContain(phrase);
    }
  });

  /**
   * The sommaire lists every section of the mode d'emploi and jumps to it: the
   * page is read on a phone, outdoors, so the reader needs a shortcut to the
   * part he needs. Every anchor must resolve to an existing heading — the
   * binôme registration being the LAST section (ticket #37).
   */
  test('should list every section in the sommaire and jump to it', async ({ page }) => {
    await page.goto('/manual');

    const sommaire = page.getByRole('navigation', { name: 'Sommaire' });
    const links = sommaire.getByRole('link');
    await expect(links).toHaveCount(5);

    const anchors = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? ''),
    );
    expect(anchors).toEqual(['#principe', '#exemple', '#reprendre', '#menu', '#inscription']);

    for (const anchor of anchors) {
      await expect(page.locator(anchor)).toBeVisible();
    }

    await sommaire.getByRole('link', { name: "S'inscrire en binôme" }).click();
    await expect(page).toHaveURL(/#inscription$/);
    // The section headings render as CardTitles (divs, not h# headings).
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "5. S'inscrire en binôme" }),
    ).toBeVisible();
  });
});
