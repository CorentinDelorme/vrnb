import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InscriptionsOpeningAnnouncement } from './inscriptions-opening-announcement';
import type { InscriptionsStatus } from './inscriptions-status-provider';

/** Mutable fixture: each test sets the status the hook reports. */
const status = vi.hoisted(() => ({ current: undefined as unknown }));
// The real module is kept (only the hook is mocked): the announcement reads
// the window phase through the shared rule of the provider.
vi.mock('./inscriptions-status-provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./inscriptions-status-provider')>()),
  useInscriptionsStatus: () => status.current as InscriptionsStatus,
}));

/** The public state of a window that has not opened yet (`registrationOpen: false`). */
const NOT_OPEN_YET_STATUS: InscriptionsStatus = {
  state: {
    edition: {
      actionDate: '2027-02-14',
      actionEndTime: '12:00',
      actionStartTime: '09:00',
      inscriptionsOpenDate: '2027-01-04',
      year: 2027,
    },
    inscriptions: [],
    registrationOpen: false,
  },
  status: 'success',
};

/** The public state of an open registration window. */
const OPEN_STATUS: InscriptionsStatus = {
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

/**
 * An instant before the opening bound of the Édition (2027-01-04): the
 * registration window is not open yet then.
 */
const BEFORE_OPENING_CLOCK = new Date('2026-12-15T12:00:00Z');

/** An instant of the open window (between the two bounds). */
const WINDOW_CLOCK = new Date('2027-01-10T12:00:00Z');

/**
 * An instant 2 days before the action date of the Édition (2027-02-14): the
 * closing bound applies then (the window closes 3 days before the action).
 */
const AFTER_CLOSURE_CLOCK = new Date('2027-02-12T09:00:00Z');

/**
 * The announcement of the inscriptions opening date (ticket #34): shown once
 * the public state is loaded and its window is `not-open-yet`, gone as soon
 * as the state announces an open window, never while the state is unknown
 * (loading, error) and never after the closing bound.
 */
describe('InscriptionsOpeningAnnouncement', () => {
  beforeEach(() => {
    status.current = { status: 'loading' };
  });

  it('should announce the opening date once the public state is loaded before the opening bound', () => {
    status.current = NOT_OPEN_YET_STATUS;
    render(<InscriptionsOpeningAnnouncement now={BEFORE_OPENING_CLOCK} />);

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('alert-info');
    expect(alert.textContent).toBe('Les inscriptions ouvrent le lundi 4 janvier 2027.');
    // The alert opens with a decorative information-circle icon: visible to
    // the eye, transparent to screen readers (the sentence is the message).
    // Two nodes then: the svg element, then the text node. The visible
    // spacing comes from the alert grid gap, not from a literal space.
    expect(alert.childNodes).toHaveLength(2);
    // SVG elements keep their lowercase tag name in the DOM namespace.
    expect(alert.firstElementChild?.tagName).toBe('svg');
    expect(alert.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should drop the announcement once the loaded public state answers an open window', () => {
    status.current = OPEN_STATUS;
    render(<InscriptionsOpeningAnnouncement now={WINDOW_CLOCK} />);

    expect(screen.queryByText(/Les inscriptions ouvrent le/)).toBeNull();
  });

  it('should show nothing while the public state is unknown (loading or error)', () => {
    for (const unknown of [{ status: 'loading' }, { status: 'error' }]) {
      status.current = unknown as InscriptionsStatus;
      const { unmount } = render(
        // The local clock would read the window not open yet: the unknown
        // state alone must keep the mention hidden.
        <InscriptionsOpeningAnnouncement now={BEFORE_OPENING_CLOCK} />,
      );
      expect(screen.queryByText(/Les inscriptions ouvrent le/)).toBeNull();
      unmount();
    }
  });

  it('should show nothing once the closing bound applies', () => {
    for (const now of [AFTER_CLOSURE_CLOCK, WINDOW_CLOCK]) {
      // The server answers a closed window; the local clock either agrees
      // (after the closure) or would still read the window open — the
      // loaded answer is authoritative, the announcement never comes back.
      status.current = NOT_OPEN_YET_STATUS;
      const { unmount } = render(<InscriptionsOpeningAnnouncement now={now} />);
      expect(screen.queryByText(/Les inscriptions ouvrent le/)).toBeNull();
      unmount();
    }
  });
});
