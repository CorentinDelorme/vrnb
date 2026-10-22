import type { TourCalendarEvent } from '../../../../../lib/tour-calendar';
import { tourIcsContent } from '../../../../../lib/tour-calendar';
import { CURRENT_EDITION } from '../../../../../src/app/inscriptions/edition';
import { findParcours } from '../../../../../src/app/tours-queries';
import { getZone } from '../../../../../src/app/zones';

/** Headers of a served calendar file (RFC 5545, UTF-8). */
const ICS_HEADERS: Readonly<{ readonly 'content-type': string }> = {
  'content-type': 'text/calendar; charset=utf-8',
};

/**
 * `/api/calendrier/<zone>/<parcours>` — the calendar file (.ics) of a
 * registered Parcours (ticket #36): a thin adapter over the pure module in
 * `lib/tour-calendar.ts`, like `/api/inscriptions` is one over
 * `src/app/inscriptions/`. It validates the (Zone, Parcours) couple against
 * the generated catalogue with the same strict lookup the registrations use
 * (`findParcours`: both must match, no Zone fallback), answers **404 with no
 * file** when the couple is unknown (`new Response(null, { status: 404 })` —
 * never an HTML error page), and otherwise serves today's Édition event built
 * by `tourIcsContent`, the generation instant being injected here (`new
 * Date()`) so the pure module stays deterministic. The download is explicit:
 * `content-disposition: attachment; filename="calendrier-<zone>-<parcours>.ics"`,
 * a deterministic, kebab-cased filename carrying the Zone and the Parcours.
 *
 * Like the inscriptions handlers, no caching is opted into (no `force-static`
 * / `revalidate`) — the route stays dynamic and never runs at build time, and
 * it needs no storage: unlike the inscriptions API, the calendar file carries
 * no personal data, so the route is served by the app alone. As in every
 * App Router dynamic route, `params` is a Promise (Next 16).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ readonly tourId: string; readonly zoneId: string }> },
): Promise<Response> {
  const { tourId, zoneId } = await params;
  // The catalogue is the truth of the (Zone, Parcours) couples: an unknown
  // one gets no file at all.
  if (findParcours(zoneId, tourId) === undefined) {
    return new Response(null, { status: 404 });
  }
  // A Parcours of the catalogue always belongs to a Zone of `zones.ts`, so
  // the lookup cannot fall back here (the fallback serves the UI only).
  const zone = getZone(zoneId);
  const event: TourCalendarEvent = {
    edition: CURRENT_EDITION,
    pointDeRendezVous: zone.meetingPoint.name,
    tourId,
    zoneId,
    zoneName: zone.name,
  };
  return new Response(tourIcsContent(event, new Date()), {
    headers: {
      ...ICS_HEADERS,
      'content-disposition': `attachment; filename="calendrier-${zoneId}-${tourId.toLowerCase()}.ics"`,
    },
  });
}
