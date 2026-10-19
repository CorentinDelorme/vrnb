import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { FeatureCollection } from 'geojson';
import { join } from 'path';

import { buildTourGeoJsonAsset } from '../src/app/shared/gpx/tour-geojson';
import { toursData } from '../src/app/tours-data';
import { DEFAULT_ZONE_ID } from '../src/app/zones';

const rootDir = join(import.meta.dirname, '..');
const gpxDir = join(rootDir, 'public/gpx');
const geoJsonDir = join(rootDir, 'public/geojson');
const outputFile = join(rootDir, 'src/app/tours-data.ts');

const TOUR_FOLDER_PATTERN = /^[VP]\d+$/;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Convert a GPX file to GeoJSON, or undefined when the file is missing. */
function readGpxCollection(gpxPath: string): FeatureCollection | undefined {
  if (!existsSync(gpxPath)) {
    return undefined;
  }

  const content = readFileSync(gpxPath, 'utf-8');
  const parsedGpx = new DOMParser().parseFromString(content, 'application/xml');
  return gpx(parsedGpx);
}

function parseGpxDistance(gpxPath: string): number {
  const geoJson = readGpxCollection(gpxPath);

  if (!geoJson) {
    return 0;
  }

  const feature = geoJson.features[0];

  if (!feature || feature.geometry.type !== 'LineString') {
    return 0;
  }

  const coords = feature.geometry.coordinates;
  let totalDistance = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }

  return Math.round(totalDistance * 10) / 10;
}

interface GeneratedTour {
  name: string;
  distance: number;
  startDistance: number;
  endDistance: number;
  zoneId: string;
}

/** List the zone ids found under public/gpx (each zone is a folder of tour folders). */
function getZoneIds(): string[] {
  if (!existsSync(gpxDir)) {
    return [];
  }

  const zoneIds = readdirSync(gpxDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !TOUR_FOLDER_PATTERN.test(entry.name))
    .map((entry) => entry.name);

  // Legacy layout: tour folders directly under public/gpx belong to the default zone.
  const hasLegacyTours = readdirSync(gpxDir, { withFileTypes: true }).some(
    (entry) => entry.isDirectory() && TOUR_FOLDER_PATTERN.test(entry.name),
  );
  if (hasLegacyTours && !zoneIds.includes(DEFAULT_ZONE_ID)) {
    zoneIds.push(DEFAULT_ZONE_ID);
  }

  return zoneIds.sort();
}

function getTours(prefix: string, zoneId: string, baseDir: string): GeneratedTour[] {
  if (!existsSync(baseDir)) {
    return [];
  }

  const folders = readdirSync(baseDir).filter((f) => f.startsWith(prefix));
  return folders
    .map((tourId) => {
      const gpxPath = join(baseDir, tourId, `${tourId}.gpx`);
      const startGpxPath = join(baseDir, tourId, `${tourId}_start.gpx`);
      const endGpxPath = join(baseDir, tourId, `${tourId}_end.gpx`);

      const distance = parseGpxDistance(gpxPath);
      const startDistance = parseGpxDistance(startGpxPath);
      const endDistance = parseGpxDistance(endGpxPath);

      return {
        name: tourId,
        distance,
        startDistance,
        endDistance,
        zoneId,
      };
    })
    .sort((a, b) => {
      const numA = parseInt(a.name.slice(1));
      const numB = parseInt(b.name.slice(1));
      return numA - numB;
    });
}

function zoneBaseDir(zoneId: string): string {
  // Legacy layout: default-zone tours live directly under public/gpx.
  if (zoneId === DEFAULT_ZONE_ID && !existsSync(join(gpxDir, DEFAULT_ZONE_ID))) {
    return gpxDir;
  }
  return join(gpxDir, zoneId);
}

/**
 * Emit the precomputed GeoJSON asset for a tour (public/geojson/<zone>/<tour>
 * .geojson): the route plus the start/end segments, each feature tagged with
 * its role, so maps fetch precomputed data at runtime instead of parsing GPX.
 */
function emitTourGeoJson(zoneId: string, tourId: string): void {
  const tourGpxDir = join(zoneBaseDir(zoneId), tourId);
  const asset = buildTourGeoJsonAsset({
    start: readGpxCollection(join(tourGpxDir, `${tourId}_start.gpx`)),
    tour: readGpxCollection(join(tourGpxDir, `${tourId}.gpx`)),
    end: readGpxCollection(join(tourGpxDir, `${tourId}_end.gpx`)),
  });

  const outputDir = join(geoJsonDir, zoneId);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, `${tourId}.geojson`), `${JSON.stringify(asset)}\n`);
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

function sortTours(a: GeneratedTour, b: GeneratedTour): number {
  if (a.zoneId !== b.zoneId) {
    return a.zoneId.localeCompare(b.zoneId);
  }
  if (a.name[0] !== b.name[0]) {
    return a.name[0] < b.name[0] ? -1 : 1;
  }
  return parseInt(a.name.slice(1)) - parseInt(b.name.slice(1));
}

/**
 * Merge freshly computed tours with the existing data: only matching tours
 * are recomputed, other entries are kept untouched. Without filters every
 * tour is recomputed from the GPX files.
 */
function mergeTours(existing: GeneratedTour[], fresh: GeneratedTour[]): GeneratedTour[] {
  const freshKeys = new Set(fresh.map((t) => `${t.zoneId}/${t.name}`));
  const kept = existing.filter((t) => !freshKeys.has(`${t.zoneId}/${t.name}`));
  return [...kept, ...fresh].sort(sortTours);
}

const tourFilter = parseArgValues('--tour');
const zoneFilter = parseArgValues('--zone');
const filtered = tourFilter !== undefined || zoneFilter !== undefined;

const zoneIds = getZoneIds().filter((zoneId) => !zoneFilter || zoneFilter.has(zoneId));
if (filtered && zoneIds.length === 0) {
  throw new Error('No zones match the --tour/--zone filter.');
}
const matchesTour = (tour: GeneratedTour): boolean => !tourFilter || tourFilter.has(tour.name);
const freshVTours = zoneIds.flatMap((zoneId) =>
  getTours('V', zoneId, zoneBaseDir(zoneId)).filter(matchesTour),
);
const freshPTours = zoneIds.flatMap((zoneId) =>
  getTours('P', zoneId, zoneBaseDir(zoneId)).filter(matchesTour),
);
if (filtered && freshVTours.length === 0 && freshPTours.length === 0) {
  throw new Error('No tours match the --tour/--zone filter.');
}

const vTours = filtered ? mergeTours(toursData.vTours, freshVTours) : freshVTours;
const pTours = filtered ? mergeTours(toursData.pTours, freshPTours) : freshPTours;

// Emit precomputed GeoJSON for every freshly computed tour only; tours kept
// by the --tour/--zone merge keep their existing asset untouched.
const freshTours = [...freshVTours, ...freshPTours];
for (const tour of freshTours) {
  emitTourGeoJson(tour.zoneId, tour.name);
}

const content = `// Auto-generated from public/gpx folder (one folder per zone)
export const toursData = {
  vTours: ${JSON.stringify(vTours, null, 2).replace(/"/g, "'")},
  pTours: ${JSON.stringify(pTours, null, 2).replace(/"/g, "'")},
};
`;

writeFileSync(outputFile, content);
console.log(
  `Generated tours data: ${vTours.length} bike tours, ${pTours.length} walking tours (${zoneIds.join(', ') || 'no zones'})`,
);
console.log(`Emitted ${freshTours.length} precomputed GeoJSON files under public/geojson/`);
