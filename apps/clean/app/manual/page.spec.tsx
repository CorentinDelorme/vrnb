import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import {
  CURRENT_EDITION,
  formatActionDateLabel,
  INSCRIPTIONS_RETENTION_DAYS,
  REGISTRATION_CLOSURE_DAYS,
  registrationsCloseDate,
} from '../../src/app/inscriptions/edition';
import ManualPage from './page';

/**
 * Spec of the mode d'emploi (ticket #37): ONE list of sections feeds BOTH the
 * sommaire (labelled `<nav>` with an ordered list) and the rendered order, the
 * titles carry the number of their sommaire position, and the binôme
 * registration comes LAST — the manual first tells how to do a parcours,
 * registration comes after. Every date/delay sentence derives from the
 * Édition config (never a typed number), and the glossary vocabulary rules
 * hold (inscrire / Binôme — never réserver, équipe, participants).
 */

/** Reading order of the page: the sommaire's entries and the sections' order in one. */
const SECTION_ORDER = ['principe', 'exemple', 'reprendre', 'menu', 'inscription'] as const;

/** The sommaire titles, in the same reading order. */
const SECTION_TITLES = [
  'Le principe en 3 temps',
  'Exemple : faire le parcours Bruz Sud P2',
  'Reprendre plus tard',
  'Le bouton Menu pendant le parcours',
  "S'inscrire en binôme",
] as const;

/** Normalized rendered text (the JSX copy is asserted through its public DOM). */
function renderedText(container: HTMLElement): string {
  return (container.textContent ?? '').replace(/\s+/g, ' ');
}

describe('Manual page', () => {
  it('renders the illustrated mode d\u2019emploi content', () => {
    const { container } = render(<ManualPage />);
    expect(container).toBeDefined();
    expect(document.getElementById('principe')).toBeDefined();
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
   * The sommaire is a labelled navigation whose ordered list lists every
   * section of the page — ONE list drives both the nav and the order, so a
   * section cannot miss it. The links and the `id` of the headings must
   * never drift apart: every anchor resolves to an existing `h2` heading
   * (one heading level, for the screen-reader structure).
   */
  it('should list every section of the page in the sommaire, last one the registration', () => {
    render(<ManualPage />);
    const sommaire = screen.getByRole('navigation', { name: 'Sommaire' });

    const list = within(sommaire).getByRole('list');
    expect(list.tagName).toBe('OL');

    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(SECTION_ORDER.length);
    const anchors = items.map((item) => within(item).getByRole('link').getAttribute('href') ?? '');
    expect(anchors).toEqual(SECTION_ORDER.map((id) => `#${id}`));

    for (const anchor of anchors) {
      const id = anchor.replace('#', '');
      expect(
        document.getElementById(id),
        `missing heading for the anchor ${anchor}`,
      ).not.toBeNull();
    }
  });

  /**
   * The rendered sections follow the sommaire order too: the single
   * `MANUAL_SECTIONS` list feeds both, so a section cannot appear without
   * being anchored nor drift away from the nav.
   */
  it('should render the sections in the sommaire order', () => {
    const { container } = render(<ManualPage />);
    const sectionIds = Array.from(container.querySelectorAll('[data-slot="card-title"][id]')).map(
      (heading) => heading.id,
    );
    expect(sectionIds).toEqual([...SECTION_ORDER]);
  });

  /**
   * Every section title visually carries the SAME number as its sommaire
   * entry: the ordinal derives from the list position (never typed by hand),
   * and the heading is an accessible `h2`.
   */
  it('should number each section title with its sommaire position', () => {
    render(<ManualPage />);
    const sommaire = screen.getByRole('navigation', { name: 'Sommaire' });
    const items = within(sommaire).getAllByRole('listitem');

    items.forEach((item, position) => {
      const link = within(item).getByRole('link');
      const id = link.getAttribute('href')?.replace('#', '') ?? '';
      const heading = document.getElementById(id);
      expect(heading).not.toBeNull();
      expect(heading?.getAttribute('data-slot')).toBe('card-title');
      expect(heading?.textContent, `number of the heading #${id}`).toBe(
        `${position + 1}. ${SECTION_TITLES[position]}`,
      );
    });
  });

  it('should explain the binôme registration with the arbitrated wording', () => {
    const { container } = render(<ManualPage />);
    const text = renderedText(container);
    const heading = document.getElementById('inscription');
    expect(heading).toBeDefined();

    // The arbitrated intro paragraph, verbatim (ticket #37): an inscription
    // is recommended, never required — the Fiche de suivi covers those who
    // did not register.
    expect(text).toContain(
      "Un binôme, c'est deux bénévoles qui couvrent ensemble le même parcours : une inscription vaut pour un seul parcours.",
    );
    expect(text).toContain(
      "Inscrire votre binôme est recommandé pour aider les organisateurs à préparer la journée, mais ce n'est pas obligatoire : ceux qui ne se sont pas inscrits sur le site peuvent compléter la fiche de suivi sur place, avant le début de l'action.",
    );

    // The bold spans of the arbitrated intro are part of the wording.
    const card = heading?.closest('[data-slot="card"]');
    const intro = card?.querySelector('p');
    expect(intro?.querySelectorAll('strong')).toHaveLength(2);
    expect(intro?.querySelectorAll('strong')[0]?.textContent).toBe('binôme');
    expect(intro?.querySelectorAll('strong')[1]?.textContent?.trim()).toBe(
      'Inscrire votre binôme est recommandé',
    );

    // The three numbered steps: choose a free Parcours, fill the window
    // (names + engagement), the confirmation with the day-of-action recalls.
    expect(text).toContain('1. Choisissez un parcours libre');
    expect(text).toContain(
      "Sur l'accueil, chaque parcours encore libre affiche un bouton S'inscrire",
    );
    expect(text).toContain("2. Remplissez la fenêtre. Appuyez sur S'inscrire :");
    expect(text).toContain(
      "Saisissez le prénom et le nom des deux membres du binôme, cochez la case d'engagement",
    );
    expect(text).toContain("3. La confirmation s'affiche");
    expect(text).toContain(
      "Un message vert confirme votre inscription et rappelle le jour de l'action",
    );
  });

  it('should show the registration window and the confirmation screenshots', () => {
    render(<ManualPage />);
    const heading = document.getElementById('inscription');
    const card = heading?.closest('[data-slot="card"]');

    const windowShot = within(card as HTMLElement).getByRole('img', {
      name: "Fenêtre d'inscription d'un binôme avec les prénoms et noms des deux membres",
    });
    expect(windowShot.getAttribute('src')).toBe('/manual/08-inscription-binome.png');

    const confirmationShot = within(card as HTMLElement).getByRole('img', {
      name: "Confirmation de l'inscription avec la note à prendre (zone et nom du parcours), les horaires de l'action et les liens pour l'agenda",
    });
    expect(confirmationShot.getAttribute('src')).toBe('/manual/09-confirmation-inscription.png');
  });

  it('should derive the window and erasure notes from the Édition config', () => {
    const { container } = render(<ManualPage />);
    const text = renderedText(container);

    // The delays come from the config constants, never typed.
    expect(text).toContain(
      `la fenêtre se ferme ${REGISTRATION_CLOSURE_DAYS} jours avant la date de l'action`,
    );
    expect(text).toContain(
      `Les informations sont effacées ${INSCRIPTIONS_RETENTION_DAYS} jours après l'action.`,
    );

    // The opening and the closing dates, in letters, from the Édition config.
    expect(text).toContain(
      `Les inscriptions ouvrent le ${formatActionDateLabel(CURRENT_EDITION.inscriptionsOpenDate)}`,
    );
    expect(text, 'the closing date announced in letters must be the window bound').toContain(
      `jusqu'au ${formatActionDateLabel(registrationsCloseDate(CURRENT_EDITION))}`,
    );
  });

  it('should keep the FCFS and tracking-sheet explanations', () => {
    const { container } = render(<ManualPage />);
    const text = renderedText(container);
    expect(text).toContain(
      'Premier arrivé, premier servi : le premier binôme à inscrire couvre le parcours, les suivants en choisissent un autre.',
    );
    expect(text).toContain("Ils servent uniquement à établir les fiches de suivi de l'édition");
  });

  /** Glossary avoid-list: inscrire / Binôme only — the banned terms may not leak in. */
  it('never uses the banned vocabulary', () => {
    const { container } = render(<ManualPage />);
    const text = (container.textContent ?? '').toLowerCase();
    for (const banned of ['réserver', 'réservation', 'résa', 'équipe', 'participants']) {
      expect(text, `the mode d'emploi must never say "${banned}"`).not.toContain(banned);
    }
  });

  // Regression guard for the JSX whitespace pitfall: a space between an inline
  // element (`<strong>`, `<kbd>`, icon) and the following text is stripped by the
  // compiler when the text contains an HTML entity like `&apos;`. Every sentence
  // below was rendered glued ("allerjusqu'au") before explicit `{' '}` were added.
  it('keeps spaces around inline bold words and icons', () => {
    const { container } = render(<ManualPage />);
    const text = renderedText(container);
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
      // The arbitrated intro: the strong « recommandé » is followed by the rest
      // of the sentence, a textbook case of the whitespace pitfall.
      "Un binôme, c'est deux bénévoles qui couvrent ensemble le même parcours : une inscription vaut pour un seul parcours",
      'Inscrire votre binôme est recommandé pour aider les organisateurs à préparer la journée',
      "1. Choisissez un parcours libre. Sur l'accueil, chaque parcours encore libre affiche un bouton S'inscrire",
      "2. Remplissez la fenêtre. Appuyez sur S'inscrire : la fenêtre rappelle la zone",
      "3. La confirmation s'affiche. Un message vert confirme votre inscription",
      'Premier arrivé, premier servi : le premier binôme à inscrire couvre le parcours',
      "Les inscriptions ouvrent le lundi 4 janvier 2027 et sont possibles jusqu'au jeudi 11 février 2027 : la fenêtre se ferme 3 jours avant la date de l'action",
      "Les informations sont effacées 90 jours après l'action. Ils servent uniquement",
    ];
    for (const phrase of spaced) {
      expect(text, `missing space around inline element near: "${phrase}"`).toContain(phrase);
    }
  });
});
