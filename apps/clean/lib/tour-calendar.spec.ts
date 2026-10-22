import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import { tourGoogleCalendarUrl, tourIcsContent, type TourCalendarEvent } from './tour-calendar';

/**
 * The pure calendar module of a registered Parcours (ticket #35): the Google
 * Calendar URL and the .ics content built from plain data — Édition (action
 * day + hours), Zone (stable id, name, Point de rendez-vous) and the Parcours
 * id — plus the injected generation instant for the .ics only. Every
 * expectation is a known-good literal (worked example of the 2027 Édition,
 * Bruz Sud, V1): February 14th 2027 is a Sunday, 9h–12h CET (UTC+1).
 */

const EDITION_2027 = {
  actionDate: '2027-02-14',
  actionEndTime: '12:00',
  actionStartTime: '09:00',
  inscriptionsOpenDate: '2027-01-04',
  year: 2027,
} as const;

/** The (Édition, Zone, Parcours) triple of the worked example. */
const BRUZ_SUD_V1: TourCalendarEvent = {
  edition: EDITION_2027,
  pointDeRendezVous: 'Place du Dr Joly',
  tourId: 'V1',
  zoneId: 'bruz-sud',
  zoneName: 'Bruz Sud',
};

/** A spicy event spot exercising every RFC 5545 reserved character. */
const SPICY_POINT_DE_RDV = 'Rond-point, arrêt Sud; le \\ pratique\n(note)';

/** The two generation instants used to prove DTSTAMP is the only difference. */
const GENERATED_AT_1 = new Date('2026-10-22T15:45:00Z');
const GENERATED_AT_2 = new Date('2026-11-30T08:30:00Z');

describe('tourGoogleCalendarUrl', () => {
  it('should build the full 2027 / Bruz Sud (V1) template URL', () => {
    expect(tourGoogleCalendarUrl(BRUZ_SUD_V1)).toBe(
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=Ramassage+VRNB+%E2%80%94+Bruz+Sud+%28V1%29' +
        '&dates=20270214T090000%2F20270214T120000' +
        '&ctz=Europe%2FParis' +
        '&details=Votre+bin%C3%B4me+est+inscrit+sur+le+parcours+V1+de+la+zone+Bruz+Sud.' +
        '+Rendez-vous+le+dimanche+14+f%C3%A9vrier+2027+de+9h+%C3%A0+12h.+' +
        'Point+de+rendez-vous%C2%A0%3A+Place+du+Dr+Joly.' +
        '&location=Point+de+rendez-vous%C2%A0%3A+Place+du+Dr+Joly',
    );
  });

  it('should carry the action, zone and parcours in the title', () => {
    const url = new URL(tourGoogleCalendarUrl(BRUZ_SUD_V1));
    expect(url.origin).toBe('https://calendar.google.com');
    expect(url.pathname).toBe('/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Ramassage VRNB — Bruz Sud (V1)');
  });

  it('should carry the Paris-time event bounds and the ctz timezone', () => {
    const url = new URL(tourGoogleCalendarUrl(BRUZ_SUD_V1));
    expect(url.searchParams.get('dates')).toBe('20270214T090000/20270214T120000');
    expect(url.searchParams.get('ctz')).toBe('Europe/Paris');
  });

  it('should carry the registered binôme, hours and Point de rendez-vous in the description', () => {
    const url = new URL(tourGoogleCalendarUrl(BRUZ_SUD_V1));
    expect(url.searchParams.get('details')).toBe(
      'Votre binôme est inscrit sur le parcours V1 de la zone Bruz Sud. ' +
        'Rendez-vous le dimanche 14 février 2027 de 9h à 12h. ' +
        'Point de rendez-vous\u00a0: Place du Dr Joly.',
    );
  });

  it('should carry the Point de rendez-vous in the location', () => {
    const url = new URL(tourGoogleCalendarUrl(BRUZ_SUD_V1));
    expect(url.searchParams.get('location')).toBe('Point de rendez-vous\u00a0: Place du Dr Joly');
  });

  it('should survive reserved characters through URL decoding', () => {
    const spicy: TourCalendarEvent = {
      ...BRUZ_SUD_V1,
      pointDeRendezVous: SPICY_POINT_DE_RDV,
    };
    const url = new URL(tourGoogleCalendarUrl(spicy));
    expect(url.searchParams.get('location')).toBe(
      `Point de rendez-vous\u00a0: ${SPICY_POINT_DE_RDV}`,
    );
    expect(url.searchParams.get('details')).toContain(SPICY_POINT_DE_RDV);
  });

  it('should follow the event passed in, not the worked example', () => {
    const url = new URL(tourGoogleCalendarUrl({ ...BRUZ_SUD_V1, tourId: 'P3' }));
    expect(url.searchParams.get('text')).toBe('Ramassage VRNB — Bruz Sud (P3)');
    expect(url.searchParams.get('dates')).toBe('20270214T090000/20270214T120000');
  });
});

describe('tourIcsContent', () => {
  it('should be a valid VCALENDAR wrapping one VEVENT', () => {
    const content = tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1);
    expect(content.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(content.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(content).toContain('VERSION:2.0\r\n');
    expect(content).toContain('PRODID:-//VRNB//Ramassage des déchets à Bruz//FR\r\n');
    expect(content).toContain('CALSCALE:GREGORIAN\r\n');
    expect(content.indexOf('BEGIN:VEVENT')).toBeGreaterThan(content.indexOf('VERSION:2.0'));
    expect(content.indexOf('END:VEVENT')).toBeLessThan(content.indexOf('END:VCALENDAR'));
  });

  it('should bound the event from the action start hour to end hour, Paris time', () => {
    const content = tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1);
    expect(content).toContain('DTSTART;TZID=Europe/Paris:20270214T090000\r\n');
    expect(content).toContain('DTEND;TZID=Europe/Paris:20270214T120000\r\n');
  });

  it('should title, locate and describe the event', () => {
    const content = tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1);
    expect(content).toContain('SUMMARY:Ramassage VRNB — Bruz Sud (V1)\r\n');
    expect(content).toContain('LOCATION:Point de rendez-vous\u00a0: Place du Dr Joly\r\n');
    expect(contentProperty(BRUZ_SUD_V1, 'DESCRIPTION:')).toBe(
      'Votre binôme est inscrit sur le parcours V1 de la zone Bruz Sud. ' +
        'Rendez-vous le dimanche 14 février 2027 de 9h à 12h. ' +
        'Point de rendez-vous\u00a0: Place du Dr Joly.',
    );
  });

  it('should derive DTSTAMP from the injected generation instant, UTC', () => {
    expect(tourIcsContent(BRUZ_SUD_V1, new Date('2026-01-01T00:00:00.750Z'))).toContain(
      'DTSTAMP:20260101T000000Z\r\n',
    );
    expect(tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_2)).toContain('DTSTAMP:20261130T083000Z\r\n');
  });

  it('should keep the event id stable for a (year, zone, parcours) couple', () => {
    const content = tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1);
    expect(content).toContain('UID:vrnb-2027-bruz-sud-v1@vrnb-site\r\n');
    const v3OfTheSameZone: TourCalendarEvent = { ...BRUZ_SUD_V1, tourId: 'P3' };
    expect(tourIcsContent(v3OfTheSameZone, GENERATED_AT_1)).toContain(
      'UID:vrnb-2027-bruz-sud-p3@vrnb-site\r\n',
    );
    const otherZone: TourCalendarEvent = {
      ...v3OfTheSameZone,
      zoneId: 'bruz-ker-lann',
      zoneName: 'Bruz Ker Lann',
    };
    expect(tourIcsContent(otherZone, GENERATED_AT_1)).toContain(
      'UID:vrnb-2027-bruz-ker-lann-p3@vrnb-site\r\n',
    );
  });

  it('should differ between two generations only by DTSTAMP', () => {
    const first = tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1);
    const second = tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_2);
    expect(first).not.toBe(second);
    const withoutStamp = (content: string): string => content.replace(/DTSTAMP:[0-9TZ]+\r\n/g, '');
    expect(withoutStamp(first)).toBe(withoutStamp(second));
  });

  it('should escape reserved characters (RFC 5545)', () => {
    const spicy: TourCalendarEvent = { ...BRUZ_SUD_V1, pointDeRendezVous: SPICY_POINT_DE_RDV };
    // Every reserved character escapes where it stands and round-trips back
    // through the unfold+unescape reading (the line folds along the way).
    expect(contentProperty(spicy, 'LOCATION:')).toBe(
      `Point de rendez-vous\u00a0: ${SPICY_POINT_DE_RDV}`,
    );
    expect(contentProperty(spicy, 'SUMMARY:')).toBe('Ramassage VRNB — Bruz Sud (V1)');
    // The description carries the place too, so the same escaping flows there.
    expect(contentProperty(spicy, 'DESCRIPTION:').endsWith(`${SPICY_POINT_DE_RDV}.`)).toBe(true);
  });

  it('should fold long lines at 75 octets and unfold to the original description', () => {
    const content = tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1);
    for (const line of content.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    // The unfolded+unescaped description cannot live in one folded line, so
    // the round-trip through unfolding is how the content is asserted.
    expect(contentProperty(BRUZ_SUD_V1, 'DESCRIPTION:')).toBe(
      'Votre binôme est inscrit sur le parcours V1 de la zone Bruz Sud. ' +
        'Rendez-vous le dimanche 14 février 2027 de 9h à 12h. ' +
        'Point de rendez-vous\u00a0: Place du Dr Joly.',
    );
  });

  it('should keep every contended line intact across the fold', () => {
    const spicy: TourCalendarEvent = { ...BRUZ_SUD_V1, pointDeRendezVous: SPICY_POINT_DE_RDV };
    const content = tourIcsContent(spicy, GENERATED_AT_1);
    for (const line of content.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    // The long spicy description still decodes whole, folds included.
    expect(contentProperty(spicy, 'DESCRIPTION:')).toBe(
      'Votre binôme est inscrit sur le parcours V1 de la zone Bruz Sud. ' +
        'Rendez-vous le dimanche 14 février 2027 de 9h à 12h. ' +
        `Point de rendez-vous\u00a0: ${SPICY_POINT_DE_RDV}.`,
    );
  });

  it('should be deterministic for the same inputs', () => {
    expect(tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1)).toBe(
      tourIcsContent(BRUZ_SUD_V1, GENERATED_AT_1),
    );
  });
});

/**
 * One .ics property of the content, unfold+unescape round: strips the RFC
 * folding (CRLF + one leading space), then one pass of the RFC 5545 escapes,
 * so the test compares the intended text however it was wrapped.
 */
function contentProperty(event: TourCalendarEvent, prefix: string): string {
  const content = tourIcsContent(event, GENERATED_AT_1);
  const unfolded = content.replace(/\r\n /g, '');
  const line = unfolded.split(/\r\n/).find((candidate) => candidate.startsWith(prefix));
  if (line === undefined) throw new Error(`Missing ${prefix} property in the .ics content`);
  return line
    .slice(prefix.length)
    .replace(/\\([\\;,n])/g, (_, character: string) =>
      character === 'n' ? '\n' : character === '\\' ? '\\' : character,
    );
}
