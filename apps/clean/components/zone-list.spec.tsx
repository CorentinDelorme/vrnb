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
    expect(screen.getAllByText('Parcours à pied')).toHaveLength(1);

    expect(summaryText('Bruz Sud')).toContain('28 parcours');
    expect(summaryText('Bruz Vau Gaillard')).toContain('6 parcours');
    expect(summaryText('Bruz Ker Lann')).toContain('13 parcours');
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

  it('keeps only Bruz Sud with its walking section when filtering to "À pied"; other zones disappear', () => {
    render(<ZoneList />);

    fireEvent.click(inputFor('À pied'));
    expect(inputFor('À pied').checked).toBe(true);

    expect(zone('Bruz Sud')).toBeDefined();
    expect(summaryText('Bruz Sud')).toContain('13 parcours');

    // Bruz Vau Gaillard and Bruz Ker Lann have no walking tour: the zones vanish.
    expect(screen.queryByLabelText('Zone Bruz Vau Gaillard')).toBeNull();
    expect(screen.queryByLabelText('Zone Bruz Ker Lann')).toBeNull();

    // A single walking heading remains (inside Bruz Sud).
    expect(screen.getAllByText('Parcours à pied')).toHaveLength(1);
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
