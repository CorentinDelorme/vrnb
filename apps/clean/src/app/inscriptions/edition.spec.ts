import { describe, expect, it } from 'vitest';

import {
  CURRENT_EDITION,
  formatActionDateLabel,
  INSCRIPTIONS_RETENTION_DAYS,
  inscriptionsExpiryInstant,
  isRegistrationOpen,
  REGISTRATION_CLOSURE_DAYS,
  registrationsCloseDate,
  registrationWindowPhase,
  ttlSecondsUntil,
} from './edition';

/**
 * The Édition configuration (pure, clock injected): the registration window
 * has TWO bounds — the inscriptions open on `inscriptionsOpenDate` (opening
 * day inclusive) and close on `actionDate - 3` (inclusive), so a Binôme can
 * register 3 days before the action but never 2 days before and never before
 * the Édition opened. February 2027 is CET (UTC+1) in `EDITION_TIME_ZONE`, so
 * UTC instants are converted explicitly in the expectations.
 */

/** The configured Édition of this app instance (2027): the opening day, the action day and its hours. */
describe('CURRENT_EDITION', () => {
  it('should open the inscriptions on 4 January 2027, the action from 9h to 12h', () => {
    expect(CURRENT_EDITION.inscriptionsOpenDate).toBe('2027-01-04');
    expect(CURRENT_EDITION.actionStartTime).toBe('09:00');
    expect(CURRENT_EDITION.actionEndTime).toBe('12:00');
  });
});

describe('registrationWindowPhase', () => {
  it('should not be open the day before, but open on the opening day itself', () => {
    // 14:00 UTC on 2027-01-03 = 15:00 Paris: one day before the opening.
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-01-03T14:00:00Z'))).toBe(
      'not-open-yet',
    );
    // 09:00 UTC on 2027-01-04 = 10:00 Paris: the opening day is inclusive.
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-01-04T09:00:00Z'))).toBe('open');
  });

  it('should turn open exactly at midnight of the opening day, Paris time', () => {
    // January 2027 is CET (UTC+1), so the Paris-midnight boundary is cheap:
    // one second before midnight of the 4th it is still the day before, and
    // the window opens with the Édition day itself.
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-01-03T22:59:59Z'))).toBe(
      'not-open-yet',
    );
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-01-03T23:00:00Z'))).toBe('open');
  });

  it('should stay open on the last registration day, then close 2 days before the action', () => {
    // 10:00 UTC on 2027-02-10 = 11:00 Paris: inside the window.
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-02-10T09:00:00Z'))).toBe('open');
    // The last registration day is 2027-02-11 (3 days before the action):
    // 22:30 UTC = 23:30 Paris on that day — still open.
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-02-11T22:30:00Z'))).toBe('open');
    // 23:00 UTC on the 11th = 00:00 Paris on 2027-02-12: closed.
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-02-11T23:00:00Z'))).toBe(
      'closed',
    );
    // 2 days before the action and later: closed, the action day included.
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-02-12T09:00:00Z'))).toBe(
      'closed',
    );
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-02-14T09:00:00Z'))).toBe(
      'closed',
    );
    expect(registrationWindowPhase(CURRENT_EDITION, new Date('2027-06-01T00:00:00Z'))).toBe(
      'closed',
    );
  });

  it('should follow the edition passed in, not the bundled one', () => {
    const edition = {
      actionDate: '2030-05-20',
      actionEndTime: '12:00',
      actionStartTime: '09:00',
      inscriptionsOpenDate: '2030-05-01',
      year: 2030,
    };
    // 2030-04-30 is the day before that Édition opened: not open yet, and the
    // bundled Édition (already open in 2027) never wins over the parameter.
    expect(registrationWindowPhase(edition, new Date('2030-04-30T12:00:00Z'))).toBe('not-open-yet');
    expect(registrationWindowPhase(edition, new Date('2027-01-04T09:00:00Z'))).toBe('not-open-yet');
    // On the opening day of that Édition (inclusive) and the day before its
    // closing (2030-05-17 = 3 days before the action), still open…
    expect(registrationWindowPhase(edition, new Date('2030-05-01T12:00:00Z'))).toBe('open');
    expect(registrationWindowPhase(edition, new Date('2030-05-17T12:00:00Z'))).toBe('open');
    // …2 days before the action, closed.
    expect(registrationWindowPhase(edition, new Date('2030-05-18T12:00:00Z'))).toBe('closed');
    // The action day itself is closed as well.
    expect(registrationWindowPhase(edition, new Date('2030-05-20T12:00:00Z'))).toBe('closed');
  });
});

describe('isRegistrationOpen', () => {
  it('should stay open from the opening day on, until 3 days before the action', () => {
    // The opening day (2027-01-04) and two days before the last one.
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-01-04T09:00:00Z'))).toBe(true);
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-02-10T09:00:00Z'))).toBe(true);
  });

  it('should not be open before the opening day of the inscriptions', () => {
    // Long before, and the day before the opening (2027-01-03 in Paris).
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2026-12-01T00:00:00Z'))).toBe(false);
    expect(isRegistrationOpen(CURRENT_EDITION, new Date('2027-01-03T14:00:00Z'))).toBe(false);
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
    const edition = {
      actionDate: '2030-05-20',
      actionEndTime: '12:00',
      actionStartTime: '09:00',
      inscriptionsOpenDate: '2030-05-01',
      year: 2030,
    };
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
    expect(
      inscriptionsExpiryInstant({
        actionDate: '2024-02-29',
        actionEndTime: '12:00',
        actionStartTime: '09:00',
        inscriptionsOpenDate: '2024-01-01',
        year: 2024,
      }).toISOString(),
    ).toBe('2024-05-28T22:00:00.000Z');
    expect(
      inscriptionsExpiryInstant({
        actionDate: '2027-12-01',
        actionEndTime: '12:00',
        actionStartTime: '09:00',
        inscriptionsOpenDate: '2027-10-01',
        year: 2027,
      }).toISOString(),
    ).toBe('2028-02-28T23:00:00.000Z');
  });
});

/**
 * The last day of the registration window (ticket #37): `actionDate` minus
 * `REGISTRATION_CLOSURE_DAYS`, the closing bound `registrationWindowPhase`
 * derives on its own. The mode d'emploi names it in letters through
 * `formatActionDateLabel`, so the closing date on the page never drifts from
 * the bound the API enforces.
 */
describe('registrationsCloseDate', () => {
  it('should close the 2027 window on 2027-02-11, the last open day', () => {
    expect(REGISTRATION_CLOSURE_DAYS).toBe(3);
    expect(registrationsCloseDate(CURRENT_EDITION)).toBe('2027-02-11');
  });

  it('should use the leap year when crossing February backwards', () => {
    // Three days before 2024-03-02: 03-01, 02-29 (leap year), 02-28.
    expect(
      registrationsCloseDate({
        actionDate: '2024-03-02',
        actionEndTime: '12:00',
        actionStartTime: '09:00',
        inscriptionsOpenDate: '2024-02-01',
        year: 2024,
      }),
    ).toBe('2024-02-28');
    // The action day itself may be the 29th of February.
    expect(
      registrationsCloseDate({
        actionDate: '2024-02-29',
        actionEndTime: '12:00',
        actionStartTime: '09:00',
        inscriptionsOpenDate: '2024-01-01',
        year: 2024,
      }),
    ).toBe('2024-02-26');
  });

  it('should follow the edition passed in, not the bundled one', () => {
    expect(
      registrationsCloseDate({
        actionDate: '2030-05-20',
        actionEndTime: '12:00',
        actionStartTime: '09:00',
        inscriptionsOpenDate: '2030-05-01',
        year: 2030,
      }),
    ).toBe('2030-05-17');
  });
});

/**
 * The French long date of the action day (shared by the registration modal and
 * the referent extraction script): « dimanche 14 février 2027 », rendered in
 * the Édition timezone.
 */
describe('formatActionDateLabel', () => {
  it('should render the Édition action date in French, in the Édition timezone', () => {
    expect(formatActionDateLabel(CURRENT_EDITION.actionDate)).toBe('dimanche 14 février 2027');
  });

  it('should refuse an invalid configured date with a French error', () => {
    expect(() => formatActionDateLabel('not-a-date')).toThrow(
      "Date de l'action de l'Édition invalide",
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
