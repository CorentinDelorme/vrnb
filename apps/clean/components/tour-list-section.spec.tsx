import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findZoneTours } from '../src/app/tours-queries';
import type { InscriptionsStatus } from './inscriptions-status-provider';
import { TourListSection } from './tour-list-section';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

/** Mutable fixture: each test sets the status the hook reports. */
const status = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('./inscriptions-status-provider', () => ({
  useInscriptionsStatus: () => status.current as InscriptionsStatus,
}));

/** Bruz Sud bike tours (V1…) used through the section under test. */
const TOURS = findZoneTours('bruz-sud', 'V');

/** Set the statuses the provider hook answers for the ongoing render. */
function setStatus(next: InscriptionsStatus): void {
  status.current = next;
}

const SUCCESS: InscriptionsStatus = {
  state: {
    edition: { actionDate: '2027-02-14', year: 2027 },
    inscriptions: [{ tourId: 'V1', zoneId: 'bruz-sud' }],
    registrationOpen: true,
  },
  status: 'success',
};

/**
 * The « Binôme inscrit » badge of a covered Parcours row (ticket #16): shown
 * after hydration for covered rows only, never while loading or on error.
 */
describe('TourListSection inscriptions badge', () => {
  beforeEach(() => {
    push.mockClear();
    status.current = { status: 'loading' };
  });

  it('should badge the covered tour row, leaving all the other rows unchanged', () => {
    setStatus(SUCCESS);
    const { container } = render(
      <TourListSection title="Parcours à vélo" type="V" tours={TOURS} zoneId="bruz-sud" />,
    );

    const badges = container.querySelectorAll('.badge-success');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.textContent).toBe('Binôme inscrit');

    const v1Row = Array.from(container.querySelectorAll('li.list-row')).find((row) =>
      row.textContent?.includes('V1'),
    );
    expect(v1Row?.querySelector('.badge-success')?.textContent).toBe('Binôme inscrit');

    const v2Row = Array.from(container.querySelectorAll('li.list-row')).find((row) =>
      /^(V2[\s\S]*km)/.test(row.textContent ?? ''),
    );
    expect(v2Row?.querySelector('.badge-success')).toBeNull();
  });

  it('should badge no row while the statuses are loading or on error', () => {
    for (const loadingOrError of [{ status: 'loading' }, { status: 'error' }]) {
      setStatus(loadingOrError as InscriptionsStatus);
      const { unmount } = render(
        <TourListSection title="Parcours à vélo" type="V" tours={TOURS} zoneId="bruz-sud" />,
      );
      expect(screen.queryByText('Binôme inscrit')).toBeNull();
      unmount();
    }
  });

  it('should keep the play button of every row alongside the badge', () => {
    setStatus(SUCCESS);
    const { container } = render(
      <TourListSection title="Parcours à vélo" type="V" tours={TOURS} zoneId="bruz-sud" />,
    );
    expect(container.querySelectorAll('button[aria-label="Lancer le parcours"]')).toHaveLength(
      TOURS.length,
    );
  });
});

/**
 * The register buttons of ticket #17: one per uncovered Parcours next to the
 * play button, hidden on the covered rows. The action slot stays empty while
 * the statuses are loading, so the button never turns into a badge under the
 * volunteer's eyes; once the public state answered, the button and the badge
 * are shown at the same time. A failed request leaves the coverage unknown
 * too: neither the badge nor the button is shown, because the site never
 * offers a registration it cannot honor.
 * Ticket #18 hides the button on every row once the registration window is
 * closed (3 days before the action date).
 */
describe('TourListSection inscriptions register button', () => {
  /** Render with the given status and return the RTL result. */
  function renderSection(next: InscriptionsStatus) {
    setStatus(next);
    return render(
      <TourListSection title="Parcours à vélo" type="V" tours={TOURS} zoneId="bruz-sud" />,
    );
  }

  beforeEach(() => {
    push.mockClear();
    status.current = { status: 'loading' };
  });

  it('should offer no register button until the public state answered', () => {
    const { container, unmount } = renderSection({ status: 'loading' });
    expect(container.querySelectorAll('button[aria-label^="S\'inscrire en binôme"]')).toHaveLength(
      0,
    );
    unmount();
  });

  it('should hide the register button and the badge when the public state failed', () => {
    const { container, unmount } = renderSection({ status: 'error' });
    // The site never offers a registration it cannot honor: neither the
    // register button nor the « Binôme inscrit » badge.
    expect(container.querySelectorAll('button[aria-label^="S\'inscrire en binôme"]')).toHaveLength(
      0,
    );
    expect(container.querySelectorAll('.badge-success')).toHaveLength(0);
    // The play buttons stay: the degraded state never touches the legacy DOM.
    expect(container.querySelectorAll('button[aria-label="Lancer le parcours"]')).toHaveLength(
      TOURS.length,
    );
    unmount();
  });

  it('should offer the register button on uncovered rows of an open window only', () => {
    const { container } = renderSection(SUCCESS);
    // V1 is covered (badge), every other bike tour is uncovered:
    const v1Row = Array.from(container.querySelectorAll('li.list-row')).find((row) =>
      row.textContent?.includes('V1'),
    );
    const v2Row = Array.from(container.querySelectorAll('li.list-row')).find((row) =>
      row.textContent?.includes('V2'),
    );
    expect(v1Row?.querySelector('button[aria-label^="S\'inscrire en binôme"]')).toBeNull();
    expect(
      v2Row?.querySelector('button[aria-label="S\'inscrire en binôme pour le parcours V2"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('button[aria-label^="S\'inscrire en binôme"]')).toHaveLength(
      TOURS.length - 1,
    );
  });

  it('should hide the register button on every row once the window is closed', () => {
    const { container } = renderSection({
      state: {
        edition: { actionDate: '2027-02-14', year: 2027 },
        inscriptions: [],
        registrationOpen: false,
      },
      status: 'success',
    });
    // The window closes 3 days before the action: the organizers need that
    // time, so the registration button disappears with it.
    expect(container.querySelectorAll('button[aria-label^="S\'inscrire en binôme"]')).toHaveLength(
      0,
    );
    // The play buttons stay: the closed window never touches the legacy DOM.
    expect(container.querySelectorAll('button[aria-label="Lancer le parcours"]')).toHaveLength(
      TOURS.length,
    );
  });
});
