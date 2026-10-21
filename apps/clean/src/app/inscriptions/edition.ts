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
 * Whether registering a Binôme is possible: the window stays OPEN during the
 * whole action day (the calendar date of `actionDate` in the Édition
 * timezone) and closes the next day (the calendar date after `actionDate`).
 *
 * The spec says the inscription « reste ouverte jusqu'à la date de l'action »
 * and is refused « après la date de l'action » — the action day itself is
 * still a registration day, so the boundary is inclusive.
 *
 * Pure: the comparison never touches `Date.now()` — pass the current time.
 */
export function isRegistrationOpen(edition: Edition, now: Date): boolean {
  return calendarDateInEditionZone(now) <= edition.actionDate;
}

/** Storage retention of a Binôme inscription after the action, in days (spec). */
export const INSCRIPTIONS_RETENTION_DAYS = 90;

/**
 * The instant every created inscription must expire at: the midnight starting
 * `actionDate + INSCRIPTIONS_RETENTION_DAYS` in the Édition timezone. The
 * creation-time `EX` TTL reaches it from "now", so the stored Binôme identity
 * is erased 90 days after the action (spec) without any cron. Pure: derived
 * from the edition alone, no clock.
 */
export function inscriptionsExpiryInstant(edition: Edition): Date {
  const erasure = calendarDatePlusDays(edition.actionDate, INSCRIPTIONS_RETENTION_DAYS);
  return instantOfWallTime(erasure, '00:00:00', EDITION_TIME_ZONE);
}

/**
 * Time to live of a created inscription in whole seconds, from `now` to the
 * erasure deadline: rounded up (a key must never expire early) and floored at
 * 1 so a late call still carries a positive `EX`. Expects `now` to be before
 * `instant`; anything else yields the 1-second minimum (an `EX<=0` would
 * delete the key immediately — never meaningful for a fresh reservation).
 */
export function ttlSecondsUntil(instant: Date, now: Date): number {
  return Math.max(1, Math.ceil((instant.getTime() - now.getTime()) / 1000));
}

/** `YYYY-MM-DD` calendar date `n` days after `calendarDate` (pure UTC arithmetic). */
function calendarDatePlusDays(calendarDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) {
    throw new Error(`Invalid calendar date ${calendarDate}`);
  }
  const [year, month, date] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const shifted = new Date(Date.UTC(year, month - 1, date));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const y = shifted.getUTCFullYear();
  const m = pad(shifted.getUTCMonth() + 1);
  const d = pad(shifted.getUTCDate());
  return `${y}-${m}-${d}`;
}

/**
 * The instant whose local time in `timeZone` reads "`calendarDate` at `time`"
 * (`time` as `HH:MM:SS`). Practically the way to take "midnight in Paris"
 * without a date library: start from the naive reading understood as UTC and
 * walk by the offset the zone really applies, converging in at most two steps
 * (a time zone offset never shifts by a day between two steps).
 */
function instantOfWallTime(calendarDate: string, time: string, timeZone: string): Date {
  const wanted = `${calendarDate}T${time}`;
  let instant = new Date(`${wanted}Z`);
  for (let step = 0; step < 5; step++) {
    const seen = `${calendarDateInTimeZone(instant, timeZone)}T${wallClockInTimeZone(instant, timeZone)}`;
    if (seen === wanted) return instant;
    instant = new Date(instant.getTime() - (Date.parse(seen) - Date.parse(wanted)));
  }
  throw new Error(`No UTC instant reads ${wanted} in ${timeZone}`);
}

/** `YYYY-MM-DD` calendar date of `instant` in the given timezone. */
function calendarDateInTimeZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).format(instant);
}

/** `HH:MM:SS` local time of `instant` in the given timezone (hour cycle 0–23). */
function wallClockInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${read('hour')}:${read('minute')}:${read('second')}`;
}

/** `YYYY-MM-DD` calendar date of `now`, as seen in the Édition timezone. */
function calendarDateInEditionZone(now: Date): string {
  // 'en-CA' renders month/day zero-padded and ordered `YYYY-MM-DD`, so dates
  // compare lexicographically in the Édition timezone whatever the host clock.
  return calendarDateInTimeZone(now, EDITION_TIME_ZONE);
}
