import { describe, expect, it } from 'vitest';

import {
  CURRENT_EDITION,
  INSCRIPTIONS_RETENTION_DAYS,
  REGISTRATION_CLOSURE_DAYS,
  inscriptionsExpiryInstant,
  isRegistrationOpen,
  ttlSecondsUntil,
} from './edition';

/**
 * "Registration open" derivation from the Édition config (pure, clock
 * injected): open until 3 days before the action date INCLUSIVE — the
 * organizers need that time to print the tracking sheets and organize the
 * day — and closed from 2 days before.
 * February 2027 is CET (UTC+1) in `EDITION_TIME_ZONE`, so UTC instants are
 * converted explicitly in the expectations.
 */
describe('isRegistrationOpen', () => {
  it('should be open well before the action date', () => {
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2026-12-01T00:00:00Z'))).toBe(true);
  });

  it('should still be open late on the last registration day', () => {
    // The last registration day is 2027-02-11 (3 days before the action):
    // 22:30 UTC = 23:30 Paris on that day.
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-02-11T22:30:00Z'))).toBe(true);
  });

  it('should close the window 2 days before the action', () => {
    // 23:00 UTC on the 11th = 00:00 Paris on 2027-02-12 (2 days before).
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-02-11T23:00:00Z'))).toBe(false);
    // The action day itself is closed too.
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-02-14T09:00:00Z'))).toBe(false);
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-06-01T00:00:00Z'))).toBe(false);
  });

  it('should close the window exactly 3 days before the action', () => {
    expect(REGISTRATION_CLOSURE_DAYS).toBe(3);
  });

  it('should follow the edition passed in, not the bundled one', () => {
    const edition = { actionDate: '2030-05-20', year: 2030 };
    // 3 days before the action, still open…
    expect(isRegistrationOpen(edition, new Date('2030-05-17T12:00:00Z'))).toBe(true);
    // …2 days before, closed.
    expect(isRegistrationOpen(edition, new Date('2030-05-18T12:00:00Z'))).toBe(false);
    // The action day itself is closed as well.
    expect(isRegistrationOpen(edition, new Date('2030-05-20T12:00:00Z'))).toBe(false);
  });
});

/**
 * Expiry of the stored inscriptions (ticket #17): every created key dies at
 * the midnight starting 90 days after the action date, in Europe/Paris.
 * February–May 2027 spans a DST change (2027-03-28), so the expiry instant is
 * asserted as an explicit UTC conversion.
 */
describe('inscriptionsExpiryInstant', () => {
  it('should land at midnight Europe/Paris of actionDate + 90 days', () => {
    expect(INSCRIPTIONS_RETENTION_DAYS).toBe(90);
    expect(inscriptionsExpiryInstant(CURRENT_EDITION).toISOString()).toBe(
      '2027-05-14T22:00:00.000Z',
    );
  });

  it('should keep pure calendar arithmetic across DST and month ends', () => {
    expect(inscriptionsExpiryInstant({ actionDate: '2024-02-29', year: 2024 }).toISOString()).toBe(
      '2024-05-28T22:00:00.000Z',
    );
    expect(inscriptionsExpiryInstant({ actionDate: '2027-12-01', year: 2027 }).toISOString()).toBe(
      '2028-02-28T23:00:00.000Z',
    );
  });
});

describe('ttlSecondsUntil', () => {
  it('should round the remaining time up to whole seconds', () => {
    const instant = new Date('2027-05-14T22:00:00.000Z');
    expect(ttlSecondsUntil(instant, new Date('2027-02-01T09:00:00Z'))).toBe(8859600);
    expect(ttlSecondsUntil(instant, new Date('2027-05-14T21:59:59.500Z'))).toBe(1);
  });

  it('should floor at 1 second whatever an oddly late now', () => {
    const instant = new Date('2027-05-14T22:00:00.000Z');
    expect(ttlSecondsUntil(instant, instant)).toBe(1);
    expect(ttlSecondsUntil(instant, new Date('2030-01-01T00:00:00Z'))).toBe(1);
  });
});
