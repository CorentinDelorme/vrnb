import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ManualPage from './page';

/**
 * Port of the legacy Angular `manual.spec.ts` (spec #3, seam Vitest): the three
 * `it()` cases assert the rendered copy — French typography spacing rules and
 * the P2 walkthrough example — through the page's public output (DOM text).
 */
describe('Manual page', () => {
  it('renders the illustrated mode d\u2019emploi content', () => {
    const { container } = render(<ManualPage />);
    expect(container).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Le principe en 3 temps' })).toBeDefined();
  });

  it('should use correct French spacing (no space after apostrophe or before comma)', () => {
    const { container } = render(<ManualPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).not.toMatch(/' /);
    expect(text).not.toMatch(/ ,/);
    expect(text).not.toMatch(/ \./);
  });

  it('should explain the P2 completion example', () => {
    const { container } = render(<ManualPage />);
    const text = container.textContent ?? '';
    expect(text).toContain('Bruz Sud P2');
    expect(text.toLowerCase()).toContain('reprendre');
    expect(text).toContain('Menu');
  });

  /**
   * The sommaire lists every section of the page and links to its heading: a
   * reader on a phone jumps straight to the part he needs. The links and the
   * `id` of the headings must never drift apart.
   */
  it('should list every section of the page in the sommaire', () => {
    render(<ManualPage />);
    const sommaire = screen.getByRole('navigation', { name: 'Sommaire' });
    const links = within(sommaire).getAllByRole('link');
    const anchors = links.map((link) => link.getAttribute('href'));

    expect(anchors).toEqual(['#principe', '#inscription', '#exemple', '#reprendre', '#menu']);
    for (const anchor of anchors) {
      const id = anchor?.replace('#', '') ?? '';
      expect(
        document.getElementById(id),
        `missing heading for the anchor ${anchor}`,
      ).not.toBeNull();
    }
  });

  it('should explain the binôme registration', () => {
    const { container } = render(<ManualPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');

    expect(screen.getByRole('heading', { name: "S'inscrire en binôme" })).toBeDefined();
    expect(text).toContain(
      "Un binôme, c'est deux bénévoles qui couvrent ensemble le même parcours",
    );
    expect(text).toContain(
      "chaque parcours encore libre affiche un bouton S'inscrire à côté de son bouton de lecture",
    );
    expect(text).toContain("Les inscriptions ferment 3 jours avant la date de l'action");
    expect(text).toContain("Les noms des membres sont effacés 90 jours après l'action");
    expect(text).toContain('un parcours déjà couvert affiche la pastille Binôme inscrit');
  });

  // Regression guard for the JSX whitespace pitfall: a space between an inline
  // element (`<strong>`, `<kbd>`, icon) and the following text is stripped by the
  // compiler when the text contains an HTML entity like `&apos;`. Every sentence
  // below was rendered glued ("allerjusqu'au") before explicit `{' '}` were added.
  it('keeps spaces around inline bold words and icons', () => {
    const { container } = render(<ManualPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    const spaced = [
      "3 temps : aller jusqu'au départ depuis le lieu de rendez-vous, nettoyer le parcours",
      "Sur l'accueil, trouvez votre zone",
      'boutons Précédent, Suivant et Terminer en bas',
      'boutons + et − de la carte',
      'Votre progression est enregistrée automatiquement sur votre téléphone',
      'Le parcours P2 de Bruz Sud fait 800 mètres de nettoyage',
      'parcours de 800 mètres : ramassez les déchets',
      'revenir au lieu de rendez-vous : une fois arrivé',
      'où vous étiez : étape 1 sur 3 (le chemin pour aller au départ)',
      "le message disparaît : il n'y a plus rien à reprendre",
      "Suivant en bas de l'écran",
      "Terminer en bas de l'écran",
      'Télécharger le PDF : une fiche du parcours',
      "fichier pour aller au départ : le chemin depuis le lieu de rendez-vous jusqu'au départ",
      'Itinéraire pour revenir (via GeoVelo) : ouvre le guidage à vélo',
      "Un binôme, c'est deux bénévoles qui couvrent ensemble le même parcours",
      "1. Choisissez un parcours libre. Sur l'accueil, chaque parcours encore libre affiche un bouton S'inscrire",
      "2. Remplissez la fenêtre. Appuyez sur S'inscrire : la fenêtre rappelle la zone",
      "3. C'est confirmé. Un message vert confirme votre inscription",
      'Premier arrivé, premier servi : un parcours déjà couvert affiche la pastille Binôme inscrit',
      "Les inscriptions ferment 3 jours avant la date de l'action : les organisateurs ont besoin",
      "Les noms des membres sont effacés 90 jours après l'action. Ils servent uniquement",
    ];
    for (const phrase of spaced) {
      expect(text, `missing space around inline element near: "${phrase}"`).toContain(phrase);
    }
  });
});
