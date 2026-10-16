import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { DEFAULT_ZONE_ID, getZone } from '../src/app/zones';

const rootDir = join(__dirname, '..');
const gpxDir = join(rootDir, 'public/gpx');

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';
const REQUEST_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 30_000;

type LonLat = [number, number];

type RouterSource = 'osrm' | 'valhalla';

interface RoutedPath {
  readonly coords: LonLat[];
  /** Routed distance in meters, as reported by the router. */
  readonly distanceM: number;
  readonly source: RouterSource;
}

function profileForTour(tourId: string): { osrm: 'bicycle' | 'foot'; gpxType: string } {
  return tourId.startsWith('V')
    ? { osrm: 'bicycle', gpxType: 'cycling' }
    : { osrm: 'foot', gpxType: 'walking' };
}

function getTourEndpoints(
  tourId: string,
  baseDir: string,
): { start: LonLat; end: LonLat } | undefined {
  const gpxPath = join(baseDir, tourId, `${tourId}.gpx`);
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
  routes?: { geometry?: { coordinates?: number[][] }; distance?: number }[];
}

interface ValhallaResponse {
  trip?: {
    status?: number;
    status_message?: string;
    summary?: { length?: number };
    legs?: { shape?: string }[];
  };
}

async function fetchRoute(from: LonLat, to: LonLat, profile: string): Promise<RoutedPath> {
  const url =
    `${OSRM_BASE_URL}/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'vrnb-clean/generate-start-end-gpx' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`OSRM HTTP ${res.status} for ${url}`);
  }
  const json = (await res.json()) as OsrmResponse;
  const route = json.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (json.code !== 'Ok' || !coords || coords.length === 0) {
    throw new Error(`OSRM error: ${json.code}${json.message ? ` (${json.message})` : ''}`);
  }
  return {
    coords: coords.map(([lon, lat]) => [lon, lat] as LonLat),
    distanceM: route?.distance ?? 0,
    source: 'osrm',
  };
}

/**
 * Decode a polyline-encoded shape (Valhalla uses precision 6 by default).
 * Returns [lon, lat] pairs.
 */
function decodePolyline(encoded: string, precision = 6): LonLat[] {
  const coords: LonLat[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const factor = 10 ** precision;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lon / factor, lat / factor]);
  }

  return coords;
}

/**
 * Route with Valhalla. Unlike the OSRM demo server, Valhalla does not force
 * pedestrians and contraflow cyclists onto detours: one-way streets that are
 * legally usable on foot (or by bike in 30 km/h zones, e.g. Rue Gaudrine in
 * Bruz) don't trigger a loop around the block.
 */
async function fetchValhalla(
  from: LonLat,
  to: LonLat,
  costing: 'bicycle' | 'pedestrian',
): Promise<RoutedPath> {
  const res = await fetch(VALHALLA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'vrnb-clean/generate-start-end-gpx',
    },
    body: JSON.stringify({
      locations: [
        { lon: from[0], lat: from[1] },
        { lon: to[0], lat: to[1] },
      ],
      costing,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Valhalla HTTP ${res.status}`);
  }
  const json = (await res.json()) as ValhallaResponse;
  const trip = json.trip;
  const shape = trip?.legs?.[0]?.shape;
  const lengthKm = trip?.summary?.length;
  if (trip?.status !== 0 || typeof shape !== 'string' || shape.length === 0) {
    throw new Error(`Valhalla error: ${trip?.status_message ?? 'no route'}`);
  }
  const coords = decodePolyline(shape);
  if (coords.length === 0) {
    throw new Error('Valhalla error: empty shape');
  }
  return { coords, distanceM: (lengthKm ?? 0) * 1000, source: 'valhalla' };
}

/**
 * Query both routers and keep the shortest path.
 * Falls back to whichever router answered when the other one fails.
 */
async function resolveRoute(
  from: LonLat,
  to: LonLat,
  kind: 'bicycle' | 'foot',
): Promise<RoutedPath> {
  const valhallaCosting = kind === 'bicycle' ? 'bicycle' : 'pedestrian';
  const outcomes = await Promise.allSettled([
    fetchRoute(from, to, kind),
    (async () => {
      await delay(REQUEST_DELAY_MS);
      return fetchValhalla(from, to, valhallaCosting);
    })(),
  ]);
  const fulfilled = outcomes
    .filter(
      (outcome): outcome is PromiseFulfilledResult<RoutedPath> => outcome.status === 'fulfilled',
    )
    .map((outcome) => outcome.value);
  if (fulfilled.length === 0) {
    const reasons = outcomes
      .filter((outcome) => outcome.status === 'rejected')
      .map((outcome) => String((outcome as PromiseRejectedResult).reason))
      .join(' | ');
    throw new Error(`No route from either router: ${reasons}`);
  }
  return fulfilled.reduce((best, candidate) =>
    candidate.distanceM < best.distanceM ? candidate : best,
  );
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildGpx(name: string, type: string, coords: LonLat[], source: RouterSource): string {
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgValues(flag: string): Set<string> | undefined {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!arg) return undefined;
  const ids = arg
    .slice(flag.length + 1)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : undefined;
}

function parseTourFilter(): Set<string> | undefined {
  return parseArgValues('--tour');
}

function parseZoneFilter(): Set<string> | undefined {
  return parseArgValues('--zone');
}

interface ZoneTours {
  readonly zoneId: string;
  readonly baseDir: string;
  readonly tourIds: string[];
}

/** Group tour folders by zone (legacy root-level tours belong to the default zone). */
function getZoneTours(
  tourFilter: Set<string> | undefined,
  zoneFilter: Set<string> | undefined,
): ZoneTours[] {
  if (!existsSync(gpxDir)) {
    throw new Error(`GPX directory not found: ${gpxDir}`);
  }

  const isTourDir = (name: string): boolean => /^[VP]/.test(name);
  const sortTours = (a: string, b: string): number => parseInt(a.slice(1)) - parseInt(b.slice(1));
  const filterTours = (ids: string[]): string[] =>
    ids.filter((id) => !tourFilter || tourFilter.has(id)).sort(sortTours);

  const result: ZoneTours[] = [];
  const entries = readdirSync(gpxDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || isTourDir(entry.name)) continue;
    if (zoneFilter && !zoneFilter.has(entry.name)) continue;
    const baseDir = join(gpxDir, entry.name);
    const tourIds = filterTours(
      readdirSync(baseDir, { withFileTypes: true })
        .filter((tour) => tour.isDirectory() && isTourDir(tour.name))
        .map((tour) => tour.name),
    );
    if (tourIds.length > 0) {
      result.push({ zoneId: entry.name, baseDir, tourIds });
    }
  }

  // Legacy layout: tour folders directly under public/gpx.
  const legacyIds = filterTours(
    entries.filter((entry) => entry.isDirectory() && isTourDir(entry.name)).map((e) => e.name),
  );
  if (legacyIds.length > 0 && (!zoneFilter || zoneFilter.has(DEFAULT_ZONE_ID))) {
    result.push({ zoneId: DEFAULT_ZONE_ID, baseDir: gpxDir, tourIds: legacyIds });
  }

  return result.sort((a, b) => a.zoneId.localeCompare(b.zoneId));
}

async function main(): Promise<void> {
  const tourFilter = parseTourFilter();
  const zoneFilter = parseZoneFilter();
  const zones = getZoneTours(tourFilter, zoneFilter);

  if (zones.length === 0 || zones.every((z) => z.tourIds.length === 0)) {
    throw new Error('No tours found to process.');
  }

  let failures = 0;

  for (const { zoneId, baseDir, tourIds } of zones) {
    const meetingPoint = getZone(zoneId).meetingPoint;
    const meetingCoords: LonLat = [meetingPoint.coordinates[0], meetingPoint.coordinates[1]];

    console.log(
      `Zone ${zoneId} — meeting point: ${meetingPoint.name} (${meetingCoords[1]}, ${meetingCoords[0]})`,
    );
    console.log(`Generating start/end GPX for ${tourIds.length} tours...`);

    for (const tourId of tourIds) {
      const { osrm, gpxType } = profileForTour(tourId);
      try {
        const endpoints = getTourEndpoints(tourId, baseDir);
        if (!endpoints) {
          throw new Error(`cannot read endpoints from ${tourId}/${tourId}.gpx`);
        }

        const toStart = await resolveRoute(meetingCoords, endpoints.start, osrm);
        await delay(REQUEST_DELAY_MS);
        const fromEnd = await resolveRoute(endpoints.end, meetingCoords, osrm);

        writeFileSync(
          join(baseDir, tourId, `${tourId}_start.gpx`),
          buildGpx(
            `${meetingPoint.name} vers le parcours ${tourId}`,
            gpxType,
            toStart.coords,
            toStart.source,
          ),
        );
        writeFileSync(
          join(baseDir, tourId, `${tourId}_end.gpx`),
          buildGpx(
            `Fin du parcours ${tourId} vers ${meetingPoint.name}`,
            gpxType,
            fromEnd.coords,
            fromEnd.source,
          ),
        );

        console.log(
          `ok ${tourId} (${osrm}): start ${toStart.coords.length} pts` +
            ` ${Math.round(toStart.distanceM)}m [${toStart.source}], end ${fromEnd.coords.length} pts` +
            ` ${Math.round(fromEnd.distanceM)}m [${fromEnd.source}]`,
        );
      } catch (error) {
        failures += 1;
        console.error(`fail ${tourId}: ${error instanceof Error ? error.message : error}`);
      }

      await delay(REQUEST_DELAY_MS);
    }
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
