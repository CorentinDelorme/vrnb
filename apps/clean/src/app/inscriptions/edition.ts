/**
 * Édition configuration — the single source of truth of the inscriptions
 * feature (registration statuses, register button, organizer exports).
 *
 * Client-safe pure module: the static home page, the `/api/inscriptions`
 * route handler and every other consumer import it without a server-only
 * dependency. The registration window is derived as a pure function of the
 * config with an injectable clock (`registrationWindowPhase`: the opening
 * bound, the open phase, the closing bound), so tests control "today".
 */

/** The annual clean-up action (see GLOSSARY: Édition). */
export interface Edition {
  /** Calendar year the edition is named after (also the KV namespace). */
  readonly year: number;
  /** Action date as a `YYYY-MM-DD` calendar date in `EDITION_TIME_ZONE`. */
  readonly actionDate: string;
  /**
   * First day of the registration window, as a `YYYY-MM-DD` calendar date in
   * `EDITION_TIME_ZONE`. The bound is a DATE, never a timestamp: the window
   * opens at midnight of that day in the Édition timezone, inclusively.
   */
  readonly inscriptionsOpenDate: string;
  /** Wall-clock start of the action, `HH:MM` in `EDITION_TIME_ZONE` (provisional). */
  readonly actionStartTime: string;
  /** Wall-clock end of the action, `HH:MM` in `EDITION_TIME_ZONE` (provisional). */
  readonly actionEndTime: string;
}

/**
 * The Édition this app instance serves. Bump these values for a new action:
 * the KV keys (`inscriptions:<year>:<zone>:<tour>`) namespace themselves from
 * `year`, so a new year starts with an empty covered-tours list.
 */
export const CURRENT_EDITION: Edition = {
  actionDate: '2027-02-14',
  actionEndTime: '12:00',
  actionStartTime: '09:00',
  inscriptionsOpenDate: '2027-01-04',
  year: 2027,
};

/** The action happens in Bruz (France): calendar boundaries use its timezone. */
export const EDITION_TIME_ZONE = 'Europe/Paris';

/**
 * Days before the action date when the registration window closes: the
 * organizers need that time to print the tracking sheets and to organize the
 * day, so a Binôme can register until 3 days before the action at the latest.
 */
export const REGISTRATION_CLOSURE_DAYS = 3;

/**
 * Which bound of the registration window applies to "now" — the phases the
 * ONE window rule distinguishes, shared by the API (`register.ts`,
 * `public-state.ts`) and the client (`inscriptions-status-provider.tsx`,
 * the registration modal): window not open yet (before the opening bound,
 * a refusal the API answers with its own code), open, or closed (after the
 * closing bound).
 */
export type RegistrationWindowPhase = 'not-open-yet' | 'open' | 'closed';

/**
 * The registration window of the Édition at `now` — the ONE derivation rule
 * serving both sides of the API. The window opens on `inscriptionsOpenDate`
 * (inclusive) and closes on `actionDate - REGISTRATION_CLOSURE_DAYS`
 * (inclusive), both as calendar dates in the Édition timezone; before the
 * opening and after the closing a registration is refused. With a plausible
 * Édition the two bounds never overlap (the opening lies weeks before the
 * closing).
 *
 * Pure: the comparison never touches `Date.now()` — pass the current time.
 */
export function registrationWindowPhase(edition: Edition, now: Date): RegistrationWindowPhase {
  const todayInEditionZone = calendarDateInEditionZone(now);
  if (todayInEditionZone < edition.inscriptionsOpenDate) return 'not-open-yet';
  return todayInEditionZone <= calendarDatePlusDays(edition.actionDate, -REGISTRATION_CLOSURE_DAYS)
    ? 'open'
    : 'closed';
}

/**
 * Whether registering a Binôme is possible: exactly the `open` phase of the
 * two-bound window (see `registrationWindowPhase`). The window stays OPEN
 * from `inscriptionsOpenDate` until `actionDate - REGISTRATION_CLOSURE_DAYS`
 * (the calendar date in the Édition timezone, inclusive) and closes after —
 * a Binôme can still register 3 days before the action, never 2 days before
 * and never before the Édition opened its inscriptions.
 *
 * The closing exists for the organizers: they need the covered-Parcours list
 * before the action to print the tracking sheets and organize the day.
 * The opening exists for the volunteers: a Parcours registered on an
 * unfinished route catalogue would have to be cancelled by hand, so the
 * inscriptions only open once the Édition is published. Announcing an Édition
 * whose opening date lies ahead keeps its window shut and the API refusing
 * registrations — an intended, documented effect.
 *
 * Pure: the comparison never touches `Date.now()` — pass the current time.
 */
export function isRegistrationOpen(edition: Edition, now: Date): boolean {
  return registrationWindowPhase(edition, now) === 'open';
}

/** Storage retention of a Binôme inscription after the action, in days (spec). */
export const INSCRIPTIONS_RETENTION_DAYS = 90;

/**
 * French long date of a calendar date of the Édition — « dimanche 14 février
 * 2027 ». Client-safe pure helper: the registration modal (browser) and the
 * referent extraction script (Node) format the action day through it, so the
 * label never drifts between the two.
 *
 * The date is read at noon UTC so the calendar day never shifts, whatever the
 * timezone of the host. The weekday keeps its lowercase French form: the
 * callers embed it in a sentence (the modal) or capitalize it themselves (the
 * « Fiche de suivi » line).
 *
 * The error stays French: it surfaces in the referent's console.
 */
export function formatActionDateLabel(calendarDate: string): string {
  const instant = new Date(`${calendarDate}T12:00:00Z`);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Date de l'action de l'Édition invalide : ${calendarDate}`);
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: EDITION_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
  }).format(instant);
}

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
