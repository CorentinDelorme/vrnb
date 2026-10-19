/**
 * Download URLs of a parcours' files, mirroring the legacy Angular tour drawer
 * (`src/app/tour-drawer/tour-drawer.ts`). Pure builders so the drawer markup
 * and the unit/E2E suites share one source of truth for the exact hrefs
 * asserted by `e2e/tour.spec.ts` (printed QR codes depend on them, spec #3).
 */

/** GPX file variant: `null` = the tour route itself. */
export type GpxSegment = 'start' | 'end' | null;

/** URL of the tour fiche PDF (e.g. `/pdf/bruz-sud/V1.pdf`). */
export function tourPdfUrl(zoneId: string, id: string): string {
  return `/pdf/${zoneId}/${id}.pdf`;
}

/** URL of a tour GPX trace (e.g. `/gpx/bruz-sud/V1/V1_start.gpx`). */
export function tourGpxUrl(zoneId: string, id: string, segment: GpxSegment = null): string {
  const suffix = segment ? `_${segment}` : '';
  return `/gpx/${zoneId}/${id}/${id}${suffix}.gpx`;
}
