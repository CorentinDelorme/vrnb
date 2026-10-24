import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InscriptionsOutcome } from '../src/app/inscriptions/inscriptions-client';
import HomePage from './page';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

/**
 * Mutable fixture: each test sets the outcome the mocked fetch answers (the
 * resolved value, or a never-settling promise so the provider keeps its
 * loading state). The default is the error outcome so the home spec stays
 * deterministic and network-free (badges stay hidden).
 */
const mockedOutcome = vi.hoisted(() => ({
  current: { status: 'error' } as InscriptionsOutcome | Promise<never>,
}));
// The registration modal imports `postRegistration` from the same module: it
// is mocked too, so a home-page test submitting the modal never hits a
// missing export.
vi.mock('../src/app/inscriptions/inscriptions-client', () => ({
  fetchInscriptionsOutcome: async () => mockedOutcome.current,
  postRegistration: async () => ({ status: 'error' }) as const,
}));

/**
 * Render the home page and let the inscriptions provider settle its mocked
 * fetch inside `act`: the provider's state update is then applied by React
 * itself, with no « not wrapped in act(...) » warning.
 */
async function renderHomePage() {
  const result = render(<HomePage />);
  await act(async () => {});
  return result;
}

/**
 * Home page (spec #3, ticket #6): the legacy Angular `tours-list` component.
 * These tests assert the public rendered output (DOM text, links, attributes)
 * — the same contract the E2E suite checks through `e2e/home.spec.ts`.
 */
describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
    mockedOutcome.current = { status: 'error' };
  });

  it('renders each zone as an open accordion labelled with its name and tour count', async () => {
    const { container } = await renderHomePage();
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    expect(zone).not.toBeNull();
    expect(zone?.hasAttribute('open')).toBe(true);
    expect(zone?.querySelector('summary h2')?.textContent).toBe('Bruz Sud');
    expect(zone?.querySelector('summary')?.textContent).toContain('28 parcours');
  });

  it('lists all Bruz Sud bike and walking tours in their sections', async () => {
    const { container } = await renderHomePage();
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    const sections = zone?.querySelectorAll('app-tour-list-section') ?? [];
    expect(sections).toHaveLength(2);

    const bikeRows = sections[0]?.querySelectorAll('li.list-row') ?? [];
    expect(bikeRows).toHaveLength(15);
    expect(sections[0]?.textContent).toContain('Parcours à vélo');
    expect(sections[0]?.textContent).toContain('V15');

    const walkingRows = sections[1]?.querySelectorAll('li.list-row') ?? [];
    expect(walkingRows).toHaveLength(13);
    expect(sections[1]?.textContent).toContain('Parcours à pied');
    expect(sections[1]?.textContent).toContain('P13');
  });

  it('formats distances with a French km comma and switches to meters below 1 km', async () => {
    const { container } = await renderHomePage();
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    const [bikeSection, walkingSection] = zone?.querySelectorAll('app-tour-list-section') ?? [];

    // V1 (first bike row) has distance 1.1 → "1,1 km"; P2 (second walking row) 0.8 → "800 m".
    expect(bikeSection?.querySelectorAll('li.list-row')[0]?.textContent).toContain('1,1 km');
    expect(walkingSection?.querySelectorAll('li.list-row')[1]?.textContent).toContain('800 m');
  });

  it('shows both distances on each row in French format', async () => {
    const { container } = await renderHomePage();
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    const bikeSection = zone?.querySelectorAll('app-tour-list-section')[0];

    // V1: distance 1.1 km, total 4.2 km → "1,1 km nettoyage · 4,2 km total".
    expect(bikeSection?.querySelectorAll('li.list-row')[0]?.textContent).toContain(
      '1,1 km nettoyage · 4,2 km total',
    );
  });

  it('renders the filter bar above the zones with "Tous" selected by default', async () => {
    const { container } = await renderHomePage();

    const filterBar = container.querySelector('section[aria-label="Filtres de parcours"]');
    expect(filterBar).not.toBeNull();

    const fieldset = filterBar?.querySelector('fieldset');
    expect(fieldset?.querySelector('legend')?.textContent).toBe('Type de parcours');

    const tous = container.querySelector('input[name="tour-type"][value="all"]');
    expect(tous).not.toBeNull();
    expect(tous?.matches(':checked')).toBe(true);
  });

  it('renders the two distance slider families with "tout" by default and all rows', async () => {
    await renderHomePage();

    expect(screen.getAllByRole('slider')).toHaveLength(4);
    // Both families span their whole axis by default: "tout" label on each.
    expect(screen.getAllByText('tout')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Lancer le parcours' })).toHaveLength(49);
  });

  it('moving the cleaning-distance min bound filters rows; returning to the extreme restores them', async () => {
    await renderHomePage();

    const sliders = screen.getAllByRole('slider');
    const cleaningMin = sliders[0];
    expect(cleaningMin.getAttribute('aria-valuenow')).toBe('0.5');

    // Invariant without filter: every section and all 49 play buttons.
    expect(screen.getAllByRole('button', { name: 'Lancer le parcours' })).toHaveLength(49);

    // Raise the cleaning minimum from 0,5 km to 1 km: short tours disappear.
    cleaningMin.focus();
    fireEvent.keyDown(cleaningMin, { key: 'ArrowRight' });
    expect(cleaningMin.getAttribute('aria-valuenow')).toBe('1');
    expect(screen.getAllByText('tout')).toHaveLength(1); // cleaning is no longer "tout"
    const after = screen.getAllByRole('button', { name: 'Lancer le parcours' });
    expect(after.length).toBeLessThan(49);
    expect(after.length).toBeGreaterThan(0);

    // Return to the axis extreme: everything comes back.
    fireEvent.keyDown(cleaningMin, { key: 'ArrowLeft' });
    expect(cleaningMin.getAttribute('aria-valuenow')).toBe('0.5');
    expect(screen.getAllByText('tout')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Lancer le parcours' })).toHaveLength(49);
  });

  it('links each section to its zone map and labels every play button', async () => {
    await renderHomePage();
    const mapLinks = screen.getAllByRole('link', { name: 'Voir tous les parcours' });
    expect(mapLinks.map((link) => link.getAttribute('href'))).toContain('/tours/bruz-sud/V');
    expect(mapLinks.map((link) => link.getAttribute('href'))).toContain('/tours/bruz-sud/P');
  });

  it('navigates to the tour when a play button is clicked', async () => {
    const { container } = await renderHomePage();
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    const firstPlayButton = zone?.querySelector(
      'li.list-row button[aria-label="Lancer le parcours"]',
    );
    expect(firstPlayButton).not.toBeNull();

    fireEvent.click(firstPlayButton!);
    expect(push).toHaveBeenCalledWith('/tour/bruz-sud/V1');
  });

  it('does not show the resume banner by default', async () => {
    await renderHomePage();
    expect(screen.queryByText(/Reprendre le parcours/)).toBeNull();
  });

  it('shows the resume banner when a coherent tour is saved', async () => {
    localStorage.setItem(
      'vrnb_tour',
      JSON.stringify({ tourId: 'V1', step: 1, zoneId: 'bruz-sud' }),
    );
    await renderHomePage();
    await screen.findByText('Reprendre le parcours Bruz Sud - V1 (étape 2/3)');
  });

  it('hides the resume banner when the saved tour does not exist', async () => {
    localStorage.setItem(
      'vrnb_tour',
      JSON.stringify({ tourId: 'ZZ9', step: 1, zoneId: 'bruz-sud' }),
    );
    await renderHomePage();
    expect(screen.queryByText(/Reprendre le parcours/)).toBeNull();
  });

  it('offers the mode d\u2019emploi CTA and the Ouest-France articles', async () => {
    await renderHomePage();
    expect(screen.getByRole('link', { name: /Mode d'emploi/ }).getAttribute('href')).toBe(
      '/manual',
    );

    const pressLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('ouest-france.fr'));
    expect(pressLinks).toHaveLength(2);
    expect(pressLinks[0]?.getAttribute('target')).toBe('_blank');
  });

  it('renders the footer with the current year', async () => {
    const { container } = await renderHomePage();
    const year = new Date().getFullYear().toString();
    expect(container.querySelector('footer')?.textContent).toContain(`©${year} VRNB`);
  });
});

/**
 * The inscriptions opening announcement (ticket #34): before the opening
 * bound, the loaded home shows one single mention announcing the opening
 * date in letters (« Les inscriptions ouvrent le lundi 4 janvier 2027. »),
 * and it goes away as soon as the public state announces an open window.
 * While the public state is unknown (the fetch has not answered, it failed),
 * the degraded home keeps showing no mention, no badge and no button — the
 * statically prerendered page carries nothing: the mention resolves purely
 * client-side, after the provider's fetch effect. After the closing bound
 * the mention never comes back.
 *
 * The system clock is faked with the `Date` fake only, so the window phase
 * the provider derives stays deterministic whatever the wall clock of the
 * runner — the render flow itself uses no timers.
 */
describe('Home page inscriptions opening announcement', () => {
  /** An instant before the opening bound of the Édition (2027-01-04). */
  const BEFORE_OPENING_CLOCK = new Date('2026-12-15T12:00:00Z');
  /** An instant inside the open window (between the two bounds). */
  const WINDOW_CLOCK = new Date('2027-01-10T12:00:00Z');
  /** An instant 2 days before the action date: the closing bound applies. */
  const AFTER_CLOSURE_CLOCK = new Date('2027-02-12T09:00:00Z');

  /** The loaded public state of a window, announced open or not open yet. */
  const state = (registrationOpen: boolean): InscriptionsOutcome => ({
    state: {
      edition: {
        actionDate: '2027-02-14',
        actionEndTime: '12:00',
        actionStartTime: '09:00',
        inscriptionsOpenDate: '2027-01-04',
        year: 2027,
      },
      inscriptions: [],
      registrationOpen,
    },
    status: 'success',
  });

  /** Pin the fake system clock and the outcome the mocked fetch answers. */
  function setContext(clock: Date, outcome: InscriptionsOutcome | Promise<never>): void {
    vi.setSystemTime(clock);
    mockedOutcome.current = outcome;
  }

  /** The selectors of the degraded state, asserted per test. */
  function registerButtons(container: HTMLElement): NodeListOf<HTMLButtonElement> {
    return container.querySelectorAll('button[aria-label^="S\'inscrire en binôme"]');
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces the opening date after the provider effect settles, not before', async () => {
    setContext(BEFORE_OPENING_CLOCK, state(false));
    // Rendering is synchronous: what a statically prerendered home carries
    // at first paint (the provider has not fetched yet) is no announcement.
    const { container } = render(<HomePage />);
    expect(container.textContent).not.toContain('Les inscriptions ouvrent le');

    await act(async () => {});

    // One single mention for the whole page, with the Édition date in letters.
    expect(screen.getAllByText('Les inscriptions ouvrent le lundi 4 janvier 2027.')).toHaveLength(
      1,
    );
    // The window is not open yet: still no register button on any row.
    expect(registerButtons(container)).toHaveLength(0);
  });

  it('drops the announcement and offers the register buttons once the window is open', async () => {
    setContext(WINDOW_CLOCK, state(true));
    const { container } = await renderHomePage();

    expect(screen.queryByText(/Les inscriptions ouvrent le/)).toBeNull();
    expect(registerButtons(container).length).toBeGreaterThan(0);
  });

  it('shows nothing while the public state has not answered', async () => {
    // A never-settling fetch keeps the provider in its loading state.
    setContext(BEFORE_OPENING_CLOCK, new Promise(() => {}));
    const { container } = await renderHomePage();

    expect(container.textContent).not.toContain('Les inscriptions ouvrent le');
    expect(registerButtons(container)).toHaveLength(0);
    expect(screen.queryByText('Binôme inscrit')).toBeNull();
  });

  it('shows nothing when the public state failed to load', async () => {
    setContext(BEFORE_OPENING_CLOCK, { status: 'error' });
    const { container } = await renderHomePage();

    expect(container.textContent).not.toContain('Les inscriptions ouvrent le');
    expect(registerButtons(container)).toHaveLength(0);
    expect(screen.queryByText('Binôme inscrit')).toBeNull();
  });

  it('shows nothing once the closing bound applies', async () => {
    // The local clock is past the closure and the state answers closed: the
    // announcement must not come back.
    setContext(AFTER_CLOSURE_CLOCK, state(false));
    const { container } = await renderHomePage();

    expect(screen.queryByText(/Les inscriptions ouvrent le/)).toBeNull();
    expect(registerButtons(container)).toHaveLength(0);
  });
});
