import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage from './page';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

/**
 * Home page (spec #3, ticket #6): the legacy Angular `tours-list` component.
 * These tests assert the public rendered output (DOM text, links, attributes)
 * — the same contract the E2E suite checks through `e2e/home.spec.ts`.
 */
describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  it('renders each zone as an open accordion labelled with its name and tour count', () => {
    const { container } = render(<HomePage />);
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    expect(zone).not.toBeNull();
    expect(zone?.hasAttribute('open')).toBe(true);
    expect(zone?.querySelector('summary h2')?.textContent).toBe('Bruz Sud');
    expect(zone?.querySelector('summary')?.textContent).toContain('28 parcours');
  });

  it('lists all Bruz Sud bike and walking tours in their sections', () => {
    const { container } = render(<HomePage />);
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

  it('formats distances with a French km comma and switches to meters below 1 km', () => {
    const { container } = render(<HomePage />);
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    const [bikeSection, walkingSection] = zone?.querySelectorAll('app-tour-list-section') ?? [];

    // V1 (first bike row) has distance 1.1 → "1,1 km"; P2 (second walking row) 0.8 → "800 m".
    expect(bikeSection?.querySelectorAll('li.list-row')[0]?.textContent).toContain('1,1 km');
    expect(walkingSection?.querySelectorAll('li.list-row')[1]?.textContent).toContain('800 m');
  });

  it('links each section to its zone map and labels every play button', () => {
    render(<HomePage />);
    const mapLinks = screen.getAllByRole('link', { name: 'Voir tous les parcours' });
    expect(mapLinks.map((link) => link.getAttribute('href'))).toContain('/tours/bruz-sud/V');
    expect(mapLinks.map((link) => link.getAttribute('href'))).toContain('/tours/bruz-sud/P');
  });

  it('navigates to the tour when a play button is clicked', () => {
    const { container } = render(<HomePage />);
    const zone = container.querySelector('details[aria-label="Zone Bruz Sud"]');
    const firstPlayButton = zone?.querySelector(
      'li.list-row button[aria-label="Lancer le parcours"]',
    );
    expect(firstPlayButton).not.toBeNull();

    fireEvent.click(firstPlayButton!);
    expect(push).toHaveBeenCalledWith('/tour/bruz-sud/V1');
  });

  it('does not show the resume banner by default', () => {
    render(<HomePage />);
    expect(screen.queryByText(/Reprendre le parcours/)).toBeNull();
  });

  it('shows the resume banner when a coherent tour is saved', async () => {
    localStorage.setItem(
      'vrnb_tour',
      JSON.stringify({ tourId: 'V1', step: 1, zoneId: 'bruz-sud' }),
    );
    render(<HomePage />);
    await screen.findByText('Reprendre le parcours Bruz Sud - V1 (étape 2/3)');
  });

  it('hides the resume banner when the saved tour does not exist', () => {
    localStorage.setItem(
      'vrnb_tour',
      JSON.stringify({ tourId: 'ZZ9', step: 1, zoneId: 'bruz-sud' }),
    );
    render(<HomePage />);
    expect(screen.queryByText(/Reprendre le parcours/)).toBeNull();
  });

  it('offers the mode d\u2019emploi CTA and the Ouest-France articles', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Mode d'emploi/ }).getAttribute('href')).toBe(
      '/manual',
    );

    const pressLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('ouest-france.fr'));
    expect(pressLinks).toHaveLength(2);
    expect(pressLinks[0]?.getAttribute('target')).toBe('_blank');
  });

  it('renders the footer with the current year', () => {
    const { container } = render(<HomePage />);
    const year = new Date().getFullYear().toString();
    expect(container.querySelector('footer')?.textContent).toContain(`©${year} VRNB`);
  });
});
