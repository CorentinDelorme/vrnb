import { describe, expect, it } from 'vitest';

import { CURRENT_EDITION, isRegistrationOpen } from './edition';

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
