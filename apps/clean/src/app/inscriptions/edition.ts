/**
 * Édition configuration — the single source of truth of the inscriptions
 * feature (registration statuses, register button, organizer exports).
 *
 * Client-safe pure module: the static home page, the `/api/inscriptions`
 * route handler and every other consumer import it without a server-only
 * dependency. "Registration open" is derived as a pure function of the
 * config with an injectable clock, so tests control "today".
 */

/** The annual clean-up action (see GLOSSARY: Édition). */
export interface Edition {
  /** Calendar year the edition is named after (also the KV namespace). */
  readonly year: number;
  /** Action date as a `YYYY-MM-DD` calendar date in `EDITION_TIME_ZONE`. */
  readonly actionDate: string;
}

/**
 * The Édition this app instance serves. Bump these values for a new action:
 * the KV keys (`inscriptions:<year>:<zone>:<tour>`) namespace themselves from
 * `year`, so a new year starts with an empty covered-tours list.
 */
export const CURRENT_EDITION: Edition = { year: 2027, actionDate: '2027-02-14' };

/** The action happens in Bruz (France): calendar boundaries use its timezone. */
export const EDITION_TIME_ZONE = 'Europe/Paris';

/**
 * Whether registering a Binôme is possible: open until the action day starts
 * (midnight of `actionDate` in the Édition timezone), closed afterwards.
 *
 * Pure: the comparison never touches `Date.now()` — pass the current time.
 */
export function isRegistrationOpen(edition: Edition, now: Date): boolean {
  return calendarDateInEurope(now) < edition.actionDate;
}

/** `YYYY-MM-DD` calendar date of `now`, as seen in the Édition timezone. */
function calendarDateInEurope(now: Date): string {
  // 'en-CA' renders month/day zero-padded and ordered `YYYY-MM-DD`, so dates
  // compare lexicographically in the Édition timezone whatever the host clock.
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: EDITION_TIME_ZONE,
    year: 'numeric',
  }).format(now);
}
