/**
 * GPX trace of a segment (start or end) of a Parcours (ticket #25, spec #21).
 *
 * The traces written by the routing script must not change: the same file
 * names, the same XML, the same `creator`, the same six-decimal
 * coordinates. The builder therefore lives in its own module, where a test
 * can pin the produced XML.
 *
 * Pure module: no import-time side effect, no console output.
 */

import type { LonLat, RouterSource } from './route-parcours';

/** The `<type>` of a GPX trace, from the practice type of the Parcours. */
export type GpxType = 'cycling' | 'walking';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Build the GPX trace of a segment: the Point de rendez-vous and the
 * beginning of a Parcours, or its end and the Point de rendez-vous.
 */
export function buildSegmentGpx(
  name: string,
  type: GpxType,
  coords: readonly LonLat[],
  source: RouterSource,
): string {
  const creator = source === 'osrm' ? 'OSRM' : 'Valhalla';
  const points = coords
    .map(
      ([lon, lat]) =>
        `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">\n      </trkpt>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="clean generate-start-end-gpx (${creator})">
  <metadata>
    <link href="https://router.project-osrm.org">
      <text>OSRM</text>
    </link>
  </metadata>
  <trk>
    <type>${type}</type>
    <name>${escapeXml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}
