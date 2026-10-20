import { render, screen } from '@testing-library/react';
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
    ];
    for (const phrase of spaced) {
      expect(text, `missing space around inline element near: "${phrase}"`).toContain(phrase);
    }
  });
});
