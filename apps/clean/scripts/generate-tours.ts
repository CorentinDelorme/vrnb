import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import type { FeatureCollection } from 'geojson';
import { join } from 'path';

import { buildTourGeoJsonAsset } from '../src/app/shared/gpx/tour-geojson';
import { toursData } from '../src/app/tours-data';

import type { ParcoursEntry } from './generation-helpers';
import {
  compareParcoursIds,
  geoJsonAssetPath,
  geoJsonRootDir,
  isFilterActive,
  listParcours,
  parseForceFlag,
  parseGenerationFilters,
  writeFileIfChanged,
} from './generation-helpers';

const rootDir = join(import.meta.dirname, '..');
const outputFile = join(rootDir, 'src/app/tours-data.ts');

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

/** Distances of a Parcours, read from its GPX traces. */
function readTourDistances(entry: ParcoursEntry): GeneratedTour {
  return {
    name: entry.tourId,
    distance: parseGpxDistance(entry.tracePath),
    startDistance: parseGpxDistance(entry.startSegmentPath),
    endDistance: parseGpxDistance(entry.endSegmentPath),
    zoneId: entry.zoneId,
  };
}

/**
 * The content of the precomputed GeoJSON asset of a Parcours
 * (public/geojson/<zone>/<tour>.geojson): the route plus the start/end
 * segments, each feature tagged with its role, so maps fetch precomputed
 * data at runtime instead of parsing GPX.
 */
function buildTourGeoJson(entry: ParcoursEntry): string {
  const asset = buildTourGeoJsonAsset({
    start: readGpxCollection(entry.startSegmentPath),
    tour: readGpxCollection(entry.tracePath),
    end: readGpxCollection(entry.endSegmentPath),
  });

  return `${JSON.stringify(asset)}\n`;
}

/**
 * Write the precomputed GeoJSON asset of a Parcours, when its content
 * changed.
 *
 * Returns whether the asset was written.
 */
function emitTourGeoJson(entry: ParcoursEntry): boolean {
  try {
    const outputDir = join(geoJsonRootDir(rootDir), entry.zoneId);
    mkdirSync(outputDir, { recursive: true });
    return writeFileIfChanged(
      geoJsonAssetPath(rootDir, entry.zoneId, entry.tourId),
      buildTourGeoJson(entry),
    );
  } catch (error) {
    throw new Error(
      `cannot emit ${entry.zoneId}/${entry.tourId}.geojson: ${error instanceof Error ? error.message : error}`,
    );
  }
}

function sortTours(a: GeneratedTour, b: GeneratedTour): number {
  if (a.zoneId !== b.zoneId) {
    return a.zoneId.localeCompare(b.zoneId);
  }
  return compareParcoursIds(a.name, b.name);
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

/** Whether two lists of Parcours hold the same data. */
function sameTours(a: readonly GeneratedTour[], b: readonly GeneratedTour[]): boolean {
  return (
    a.length === b.length &&
    a.every((tour, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        tour.name === other.name &&
        tour.distance === other.distance &&
        tour.startDistance === other.startDistance &&
        tour.endDistance === other.endDistance &&
        tour.zoneId === other.zoneId
      );
    })
  );
}

const filters = parseGenerationFilters(process.argv);
const force = parseForceFlag(process.argv);
const filtered = isFilterActive(filters.tourIds) || isFilterActive(filters.zoneIds);

if (force) {
  console.log('Force mode: the catalogue and the GeoJSON assets are regenerated anyway.');
}

const inventory = listParcours(rootDir, filters);
const zoneIds = inventory.zoneIds;
if (filtered && zoneIds.length === 0) {
  throw new Error('No zones match the --tour/--zone filter.');
}
const freshTours = inventory.parcours.map(readTourDistances);
const freshVTours = freshTours.filter((tour) => tour.name.startsWith('V'));
const freshPTours = freshTours.filter((tour) => tour.name.startsWith('P'));
if (filtered && freshVTours.length === 0 && freshPTours.length === 0) {
  throw new Error('No tours match the --tour/--zone filter.');
}

const vTours = filtered ? mergeTours(toursData.vTours, freshVTours) : freshVTours;
const pTours = filtered ? mergeTours(toursData.pTours, freshPTours) : freshPTours;

// Emit precomputed GeoJSON for every freshly computed tour only; tours kept
// by the --tour/--zone merge keep their existing asset untouched. The asset
// is written only when its content changed, so a run that changed nothing
// leaves no diff behind.
let emitFailures = 0;
let emitted = 0;
for (const entry of inventory.parcours) {
  try {
    if (emitTourGeoJson(entry)) {
      emitted += 1;
    }
  } catch (error) {
    emitFailures += 1;
    console.error(`fail ${entry.tourId}: ${error instanceof Error ? error.message : error}`);
  }
}
if (emitFailures > 0) {
  throw new Error(`${emitFailures} GeoJSON asset(s) failed to emit.`);
}

const content = `// Auto-generated from public/gpx folder (one folder per zone)
export const toursData = {
  vTours: ${JSON.stringify(vTours, null, 2).replace(/"/g, "'")},
  pTours: ${JSON.stringify(pTours, null, 2).replace(/"/g, "'")},
};
`;

// The catalogue is written only when the data of the Parcours changed.
if (sameTours(toursData.vTours, vTours) && sameTours(toursData.pTours, pTours)) {
  console.log('Tours data unchanged: src/app/tours-data.ts left as is.');
} else {
  writeFileSync(outputFile, content);
  console.log('Updated src/app/tours-data.ts.');
}

console.log(
  `Generated tours data: ${vTours.length} bike tours, ${pTours.length} walking tours (${zoneIds.join(', ') || 'no zones'})`,
);
console.log(
  `Emitted ${emitted} precomputed GeoJSON file(s) under public/geojson/ (${inventory.parcours.length} computed)`,
);
