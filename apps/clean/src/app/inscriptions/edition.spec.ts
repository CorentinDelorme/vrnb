import { describe, expect, it } from 'vitest';

import {
  CURRENT_EDITION,
  INSCRIPTIONS_RETENTION_DAYS,
  inscriptionsExpiryInstant,
  isRegistrationOpen,
  ttlSecondsUntil,
} from './edition';

/**
 * "Registration open" derivation from the Édition config (pure, clock
 * injected): open before the action date, closed once the action day starts.
 * February 2027 is CET (UTC+1) in `EDITION_TIME_ZONE`, so UTC instants are
 * converted explicitly in the expectations.
 */
describe('isRegistrationOpen', () => {
  it('should be open well before the action date', () => {
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2026-12-01T00:00:00Z'))).toBe(true);
  });

  it('should still be open late on the day before the action', () => {
    // 22:30 UTC = 23:30 Paris on 2027-02-13, the day before the action.
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-02-13T22:30:00Z'))).toBe(true);
  });

  it('should be closed once the action day starts in the Édition timezone', () => {
    // 23:59 UTC on the 13th = 00:59 Paris on 2027-02-14 (the action day).
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-02-13T23:59:00Z'))).toBe(false);
  });

  it('should be closed during and after the action day', () => {
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-02-14T09:00:00Z'))).toBe(false);
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-06-01T00:00:00Z'))).toBe(false);
  });

  it('should follow the edition passed in, not the bundled one', () => {
    const edition = { actionDate: '2030-05-20', year: 2030 };
    expect(isRegistrationOpen(edition, new Date('2030-05-19T12:00:00Z'))).toBe(true);
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
