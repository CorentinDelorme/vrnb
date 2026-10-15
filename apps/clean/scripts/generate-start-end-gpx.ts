import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { MEETING_POINT } from '../src/app/shared/constants';

const rootDir = join(__dirname, '..');
const gpxDir = join(rootDir, 'public/gpx');

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const REQUEST_DELAY_MS = 400;

type LonLat = [number, number];

function profileForTour(tourId: string): { osrm: 'bicycle' | 'foot'; gpxType: string } {
  return tourId.startsWith('V')
    ? { osrm: 'bicycle', gpxType: 'cycling' }
    : { osrm: 'foot', gpxType: 'walking' };
}

function getTourEndpoints(tourId: string): { start: LonLat; end: LonLat } | undefined {
  const gpxPath = join(gpxDir, tourId, `${tourId}.gpx`);
  if (!existsSync(gpxPath)) {
    return undefined;
  }

  const content = readFileSync(gpxPath, 'utf-8');
  const parsedGpx = new DOMParser().parseFromString(content, 'application/xml');
  const geoJson = gpx(parsedGpx);
  const feature = geoJson.features[0];

  if (!feature || feature.geometry.type !== 'LineString') {
    return undefined;
  }

  const coords = feature.geometry.coordinates;
  if (coords.length === 0) {
    return undefined;
  }

  const first = coords[0];
  const last = coords[coords.length - 1];
  return { start: [first[0], first[1]], end: [last[0], last[1]] };
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: { geometry?: { coordinates?: number[][] } }[];
}

async function fetchRoute(from: LonLat, to: LonLat, profile: string): Promise<number[][]> {
  const url =
    `${OSRM_BASE_URL}/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'vrnb-clean/generate-start-end-gpx' },
  });
  if (!res.ok) {
    throw new Error(`OSRM HTTP ${res.status} for ${url}`);
  }
  const json = (await res.json()) as OsrmResponse;
  const coords = json.routes?.[0]?.geometry?.coordinates;
  if (json.code !== 'Ok' || !coords || coords.length === 0) {
    throw new Error(`OSRM error: ${json.code}${json.message ? ` (${json.message})` : ''}`);
  }
  return coords;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildGpx(name: string, type: string, coords: number[][]): string {
  const points = coords
    .map(
      ([lon, lat]) =>
        `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">\n      </trkpt>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="clean generate-start-end-gpx (OSRM)">
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTourFilter(): Set<string> | undefined {
  const arg = process.argv.find((a) => a.startsWith('--tour='));
  if (!arg) return undefined;
  const ids = arg
    .slice('--tour='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : undefined;
}

async function main(): Promise<void> {
  const tourFilter = parseTourFilter();
  const meetingCoords: LonLat = [MEETING_POINT.coordinates[0], MEETING_POINT.coordinates[1]];

  if (!existsSync(gpxDir)) {
    throw new Error(`GPX directory not found: ${gpxDir}`);
  }

  const tourIds = readdirSync(gpxDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[VP]/.test(entry.name))
    .map((entry) => entry.name)
    .filter((id) => !tourFilter || tourFilter.has(id))
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

  if (tourIds.length === 0) {
    throw new Error('No tours found to process.');
  }

  console.log(`Meeting point: ${MEETING_POINT.name} (${meetingCoords[1]}, ${meetingCoords[0]})`);
  console.log(`Generating start/end GPX for ${tourIds.length} tours...`);

  let failures = 0;

  for (const tourId of tourIds) {
    const { osrm, gpxType } = profileForTour(tourId);
    try {
      const endpoints = getTourEndpoints(tourId);
      if (!endpoints) {
        throw new Error(`cannot read endpoints from ${tourId}/${tourId}.gpx`);
      }

      const toStart = await fetchRoute(meetingCoords, endpoints.start, osrm);
      await delay(REQUEST_DELAY_MS);
      const fromEnd = await fetchRoute(endpoints.end, meetingCoords, osrm);

      writeFileSync(
        join(gpxDir, tourId, `${tourId}_start.gpx`),
        buildGpx(`${MEETING_POINT.name} vers le parcours ${tourId}`, gpxType, toStart),
      );
      writeFileSync(
        join(gpxDir, tourId, `${tourId}_end.gpx`),
        buildGpx(`Fin du parcours ${tourId} vers ${MEETING_POINT.name}`, gpxType, fromEnd),
      );

      console.log(`ok ${tourId} (${osrm}): start ${toStart.length} pts, end ${fromEnd.length} pts`);
    } catch (error) {
      failures += 1;
      console.error(`fail ${tourId}: ${error instanceof Error ? error.message : error}`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  if (failures > 0) {
    throw new Error(`${failures} tour(s) failed.`);
  }

  console.log('Done. Run `bun run generate:tours` to refresh distances.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
