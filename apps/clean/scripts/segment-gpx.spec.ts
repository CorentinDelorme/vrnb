import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import { buildSegmentGpx } from './segment-gpx';

import type { LonLat, RouterSource } from './route-parcours';
import type { GpxType } from './segment-gpx';

/**
 * GPX trace of a segment (ticket #25, spec #21) — the seam is the public
 * API of `scripts/segment-gpx.ts`:
 *
 * - `buildSegmentGpx(name, type, coords, source)` → the XML of the trace.
 *
 * The trace is the one the pipeline has always produced: same file name,
 * same XML, same `creator`, same six-decimal coordinates.
 */

const COORDS: LonLat[] = [
  [-1.747083, 48.024417],
  [-1.73, 48.02],
];

/** A segment trace produced by the pipeline and versioned in the repository. */
const PRODUCED_SEGMENT = join(import.meta.dirname, '..', 'public/gpx/bruz-sud/V1/V1_start.gpx');

describe('buildSegmentGpx', () => {
  it('should build the GPX trace of a segment', () => {
    const gpx = buildSegmentGpx('Place du Dr Joly vers le parcours V1', 'cycling', COORDS, 'osrm');

    expect(gpx).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="clean generate-start-end-gpx (OSRM)">
  <metadata>
    <link href="https://router.project-osrm.org">
      <text>OSRM</text>
    </link>
  </metadata>
  <trk>
    <type>cycling</type>
    <name>Place du Dr Joly vers le parcours V1</name>
    <trkseg>
      <trkpt lat="48.024417" lon="-1.747083">
      </trkpt>
      <trkpt lat="48.020000" lon="-1.730000">
      </trkpt>
    </trkseg>
  </trk>
</gpx>
`);
  });

  it('should tell the router that answered in the creator', () => {
    const gpx = buildSegmentGpx(
      'Fin du parcours V1 vers la Place du Dr Joly',
      'walking',
      COORDS,
      'valhalla',
    );

    expect(gpx).toContain('creator="clean generate-start-end-gpx (Valhalla)"');
    expect(gpx).toContain('<type>walking</type>');
  });

  it('should escape the XML of the name', () => {
    const gpx = buildSegmentGpx('Place du Dr Joly & le Parcours <V1>', 'cycling', COORDS, 'osrm');

    expect(gpx).toContain('<name>Place du Dr Joly &amp; le Parcours &lt;V1&gt;</name>');
  });

  it('should rebuild the GPX traces the pipeline has already produced', () => {
    // The traces of the repository are the reference: the builder must give
    // them back byte for byte, or the routing would change the files the
    // site serves.
    const produced = readFileSync(PRODUCED_SEGMENT, 'utf-8');
    const name = produced.match(/<name>(.*)<\/name>/)?.[1] ?? '';
    const type = (produced.match(/<type>(.*)<\/type>/)?.[1] ?? '') as GpxType;
    const source: RouterSource = produced.includes('(Valhalla)') ? 'valhalla' : 'osrm';
    const coords: LonLat[] = [...produced.matchAll(/lat="([-\d.]+)" lon="([-\d.]+)"/g)].map(
      ([, lat, lon]) => [Number(lon), Number(lat)],
    );

    expect(buildSegmentGpx(name, type, coords, source)).toBe(produced);
  });
});
