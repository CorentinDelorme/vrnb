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
