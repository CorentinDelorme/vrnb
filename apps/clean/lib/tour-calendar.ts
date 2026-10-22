import type { Edition } from '../src/app/inscriptions/edition';
import { EDITION_TIME_ZONE, formatActionDateLabel } from '../src/app/inscriptions/edition';

/**
 * Calendar artefacts of a registered Parcours (ticket #35): the Google
 * Calendar link and the .ics file content, built from plain data — the Édition
 * (action day, start/end hours), the Zone (stable id, display name, Point de
 * rendez-vous) and the Parcours id — plus the injected generation instant for
 * the .ics. Pure and self-contained: no DOM, no network (the Google URL is a
 * string built from data, never fetched), no dependency outside the project.
 *
 * No personal data enters the module — the Binôme names never leave the store
 * — so the copy recalls THAT a binôme is registered, never who. The event
 * happens on the action day from the start to the end hour in Europe/Paris:
 * the bounds are Édition wall times qualified by `ctz` (Google) or `TZID`
 * (.ics), never cross-computed UTC instants. The event id derives from the
 * (year, zone, parcours) couple alone, so re-adding the action to a calendar
 * updates it instead of duplicating it: two generations at different instants
 * differ only by their DTSTAMP.
 */

/** Inputs of the calendar artefacts: plain display data, never a personal name. */
export interface TourCalendarEvent {
  /** The Édition the event belongs to (action day + start/end hours). */
  readonly edition: Edition;
  /** Point de rendez-vous of the Zone, as displayed. */
  readonly pointDeRendezVous: string;
  /** The Parcours id, as displayed (e.g. `V1`). */
  readonly tourId: string;
  /** Stable Zone id (e.g. `bruz-sud`) — it feeds the event id (UID). */
  readonly zoneId: string;
  /** Zone display name (e.g. `Bruz Sud`). */
  readonly zoneName: string;
}

/** The Google Calendar event template endpoint (`new-tab` link, ticket #36). */
const GOOGLE_CALENDAR_RENDER_URL = 'https://calendar.google.com/calendar/render';

/** Title of the event: the action, the Zone, the Parcours. */
const ACTION_TITLE = 'Ramassage VRNB';

/** Calendar boilerplate: the producer id (RFC 5545 §3.7.3). */
const ICS_PRODID = '-//VRNB//Ramassage des déchets à Bruz//FR';

/** Maximum octets of one .ics content line before RFC 5545 §3.1 folding. */
const MAX_CONTENT_LINE_OCTETS = 75;

/** A wall time of the Édition config (`HH:MM`, as it already is when "edit"). */
const WALL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Google Calendar link of the registered Parcours event: event bounds in
 * Paris time (`dates` + `ctz`), title, description and Point de rendez-vous
 * location, URL-encoded (WHATWG form-urlencoded, readable in the browser).
 * Pure: nothing is fetched, the string is the artefact.
 */
export function tourGoogleCalendarUrl(event: TourCalendarEvent): string {
  const startDate = event.edition.actionDate;
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', eventSummary(event));
  params.set(
    'dates',
    `${icsWallTimestamp(startDate, event.edition.actionStartTime)}/${icsWallTimestamp(startDate, event.edition.actionEndTime)}`,
  );
  params.set('ctz', EDITION_TIME_ZONE);
  params.set('details', eventDescription(event));
  params.set('location', eventLocation(event));
  return `${GOOGLE_CALENDAR_RENDER_URL}?${params.toString()}`;
}

/**
 * .ics file content of the registered Parcours event, RFC 5545: one VEVENT in
 * a VCALENDAR, the Édition wall bounds qualified by the Édition timezone, the
 * stable (year, zone, parcours) event id, and the generation instant as an
 * UTC DTSTAMP — which makes two generations at different instants differ only
 * by their DTSTAMP. Deterministic: same inputs and instant, same content.
 */
export function tourIcsContent(event: TourCalendarEvent, generatedAt: Date): string {
  const actionDate = event.edition.actionDate;
  const lines: readonly string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${ICS_PRODID}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${eventUid(event)}`,
    `DTSTAMP:${icsUtcTimestamp(generatedAt)}`,
    `DTSTART;TZID=${EDITION_TIME_ZONE}:${icsWallTimestamp(actionDate, event.edition.actionStartTime)}`,
    `DTEND;TZID=${EDITION_TIME_ZONE}:${icsWallTimestamp(actionDate, event.edition.actionEndTime)}`,
    `SUMMARY:${escapeText(eventSummary(event))}`,
    `LOCATION:${escapeText(eventLocation(event))}`,
    `DESCRIPTION:${escapeText(eventDescription(event))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldContentLine).join('\r\n') + '\r\n';
}

/** Event title: the action, the Zone, the Parcours. */
function eventSummary(event: TourCalendarEvent): string {
  return `${ACTION_TITLE} — ${event.zoneName} (${event.tourId})`;
}

/**
 * The Point de rendez-vous as a French location line: tomorrow's calendar
 * readers see the event place, named explicitly like the site does.
 */
function eventLocation(event: TourCalendarEvent): string {
  return `Point de rendez-vous\u00a0: ${event.pointDeRendezVous}`;
}

/**
 * Event description in French, built from the Édition config alone: the
 * registered fact (a binôme, never a name), the long action date named by
 * `formatActionDateLabel` (« dimanche 14 février 2027 »), the hours « de 9h
 * à 12h » and the Point de rendez-vous.
 */
function eventDescription(event: TourCalendarEvent): string {
  const hours = formatActionHours(event.edition.actionStartTime, event.edition.actionEndTime);
  return (
    `Votre binôme est inscrit sur le parcours ${event.tourId} de la zone ${event.zoneName}. ` +
    `Rendez-vous le ${formatActionDateLabel(event.edition.actionDate)} ${hours}. ` +
    `Point de rendez-vous\u00a0: ${event.pointDeRendezVous}.`
  );
}

/**
 * French hours of the action, « de 9h à 12h » from the Édition `HH:MM`
 * strings. Malformed config is a developer error, said in English.
 */
function formatActionHours(startTime: string, endTime: string): string {
  return `de ${frenchHourLabel(startTime)} à ${frenchHourLabel(endTime)}`;
}

/** French short hour of one `HH:MM` wall time (`09:00` → `9h`, `13:30` → `13h30`). */
function frenchHourLabel(wallTime: string): string {
  const match = WALL_TIME_PATTERN.exec(wallTime);
  if (match === null) throw new Error(`Invalid action wall time: ${wallTime}`);
  const hour = Number.parseInt(match[1], 10).toString();
  const minutes = match[2];
  return `${hour}h${minutes === '00' ? '' : minutes}`;
}

/**
 * Compact local timestamp `YYYYMMDDTHHMMSS` of an Édition wall bound
 * (`2027-02-14`, `09:00` → `20270214T090000`). The timezone stays with the
 * qualifier (`ctz`, `TZID`) — no UTC cross-computation.
 */
function icsWallTimestamp(calendarDate: string, wallTime: string): string {
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.exec(calendarDate);
  const timeMatch = WALL_TIME_PATTERN.exec(wallTime);
  if (dateMatch === null || timeMatch === null) {
    throw new Error(`Invalid Édition action schedule: ${calendarDate} ${wallTime}`);
  }
  return `${calendarDate.replaceAll('-', '')}T${wallTime.replaceAll(':', '')}00`;
}

/**
 * UTC stamp `YYYYMMDDTHHMMSSZ` (RFC 5545 UTC datetime) of the generation
 * instant — the injected clock, truncated to seconds.
 */
function icsUtcTimestamp(instant: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${String(instant.getUTCFullYear()).padStart(4, '0')}` +
    `${pad(instant.getUTCMonth() + 1)}${pad(instant.getUTCDate())}` +
    `T${pad(instant.getUTCHours())}${pad(instant.getUTCMinutes())}${pad(instant.getUTCSeconds())}Z`
  );
}

/**
 * Stable event id: the (year, zone, parcours) couple slugified
 * (`vrnb-2027-bruz-sud-v1@vrnb-site`). Zone ids and Parcours ids are ASCII
 * slugs by domain construction, so slugifying only stabilizes the spelling.
 */
function eventUid(event: TourCalendarEvent): string {
  return `vrnb-${event.edition.year}-${slugify(event.zoneId)}-${slugify(event.tourId)}@vrnb-site`;
}

/** Lowercase dash-slug of an id (`V1` → `v1`, runs of odd characters collapsed). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** RFC 5545 §3.3.11 TEXT escaping: backslash first, then `;`, `,`, newlines. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\n/g, '\\n');
}

/**
 * RFC 5545 §3.1 folding of one content line into lines of at most 75 octets:
 * continuations start with one space and unfold back to the original line.
 * The cut counts octets (UTF-8), walks one code point at a time so a counted
 * character is never split, and never produces an empty continuation.
 */
function foldContentLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;
  for (const character of line) {
    const octets = utf8Octets(character);
    const limit = parts.length === 0 ? MAX_CONTENT_LINE_OCTETS : MAX_CONTENT_LINE_OCTETS - 1;
    if (current !== '' && currentOctets + octets > limit) {
      parts.push(current);
      current = '';
      currentOctets = 0;
    }
    current += character;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.length === 1 ? parts[0] : parts.join('\r\n ');
}

/** UTF-8 octets of one code point (walked whole so a character is never split). */
function utf8Octets(character: string): number {
  const code = character.codePointAt(0) ?? 0;
  return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
}
