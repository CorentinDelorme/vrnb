import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InscriptionsStatus } from './inscriptions-status-provider';
import { ZoneList } from './zone-list';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const status = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('./inscriptions-status-provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./inscriptions-status-provider')>()),
  useInscriptionsStatus: () => status.current as InscriptionsStatus,
}));

const SUCCESS: InscriptionsStatus = {
  state: {
    edition: {
      actionDate: '2027-02-14',
      actionEndTime: '12:00',
      actionStartTime: '09:00',
      inscriptionsOpenDate: '2027-01-04',
      year: 2027,
    },
    inscriptions: [],
    registrationOpen: true,
  },
  status: 'success',
};

function setStatus(next: InscriptionsStatus): void {
  status.current = next;
}

function zone(zoneName: string) {
  return screen.getByLabelText(`Zone ${zoneName}`);
}

function summaryText(zoneName: string): string | null {
  return zone(zoneName).querySelector('summary')?.textContent ?? null;
}

function inputFor(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

describe('ZoneList', () => {
  beforeEach(() => {
    push.mockClear();
    setStatus(SUCCESS);
  });

  it('renders the filter bar with "Tous" selected by default', () => {
    const { container } = render(<ZoneList />);

    const fieldset = container.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
    expect(fieldset?.querySelector('legend')?.textContent).toBe('Type de parcours');

    expect(inputFor('Tous').checked).toBe(true);
    expect(inputFor('À pied').checked).toBe(false);
    expect(inputFor('À vélo').checked).toBe(false);
  });

  it('shows every zone and both sections without filter, with live badges', () => {
    render(<ZoneList />);

    expect(zone('Bruz Sud')).toBeDefined();
    expect(zone('Bruz Vau Gaillard')).toBeDefined();
    expect(zone('Bruz Ker Lann')).toBeDefined();

    expect(screen.getAllByText('Parcours à vélo')).toHaveLength(3);
    expect(screen.getAllByText('Parcours à pied')).toHaveLength(2);

    expect(summaryText('Bruz Sud')).toContain('28 parcours');
    expect(summaryText('Bruz Vau Gaillard')).toContain('6 parcours');
    expect(summaryText('Bruz Ker Lann')).toContain('15 parcours');
  });

  it('hides the walking sections and keeps the bike sections when filtering to "À vélo"', () => {
    render(<ZoneList />);

    fireEvent.click(inputFor('À vélo'));
    expect(inputFor('À vélo').checked).toBe(true);
    expect(inputFor('Tous').checked).toBe(false);

    // Bruz Sud keeps its bike section (15 tours) but loses the walking section.
    expect(zone('Bruz Sud')).toBeDefined();
    expect(summaryText('Bruz Sud')).toContain('15 parcours');
    expect(zone('Bruz Sud').querySelector('app-tour-list-section')?.textContent).toContain(
      'Parcours à vélo',
    );

    // The other zones are bike-only and are untouched.
    expect(summaryText('Bruz Vau Gaillard')).toContain('6 parcours');
    expect(summaryText('Bruz Ker Lann')).toContain('13 parcours');
  });

  it('keeps only zones with a walking section when filtering to "À pied"; bike-only zones disappear', () => {
    render(<ZoneList />);

    fireEvent.click(inputFor('À pied'));
    expect(inputFor('À pied').checked).toBe(true);

    // Bruz Sud (13 walking) and Bruz Ker Lann (2 walking) stay; Bruz Vau Gaillard (no walking tour) vanishes.
    expect(zone('Bruz Sud')).toBeDefined();
    expect(summaryText('Bruz Sud')).toContain('13 parcours');
    expect(zone('Bruz Ker Lann')).toBeDefined();
    expect(summaryText('Bruz Ker Lann')).toContain('2 parcours');
    expect(screen.queryByLabelText('Zone Bruz Vau Gaillard')).toBeNull();

    // Two walking headings remain (one per remaining zone).
    expect(screen.getAllByText('Parcours à pied')).toHaveLength(2);
  });

  it('comes back to every zone when switching back to "Tous"', () => {
    render(<ZoneList />);

    fireEvent.click(inputFor('À pied'));
    expect(screen.queryByLabelText('Zone Bruz Vau Gaillard')).toBeNull();

    fireEvent.click(inputFor('Tous'));
    expect(inputFor('Tous').checked).toBe(true);
    expect(zone('Bruz Vau Gaillard')).toBeDefined();
    expect(zone('Bruz Ker Lann')).toBeDefined();
    expect(summaryText('Bruz Sud')).toContain('28 parcours');
  });
});
