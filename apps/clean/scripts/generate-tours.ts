import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import type { FeatureCollection } from 'geojson';
import { join } from 'path';
import { format, resolveConfig } from 'prettier';

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
  perfReportPath,
  practiceTypeOf,
  writeFileIfChanged,
  writePerfReport,
} from './generation-helpers';
import type { PerfRecorder } from './generation-perf';
import {
  buildPerfReport,
  countersFromIds,
  createPerfRecorder,
  formatPerfReport,
} from './generation-perf';
import { parcoursStateKey } from './generation-state';
import { DATA_SUBJECT } from './generation-subjects';

const rootDir = join(import.meta.dirname, '..');
const outputFile = join(rootDir, 'src/app/tours-data.ts');

/** Name of the script, as the `[perf]` block of the run shows it. */
const SCRIPT_NAME = 'generate-tours';

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
  totalDistance: number;
  zoneId: string;
}

/**
 * Distance totale of a Parcours (GLOSSARY): the sum of its three Étapes
 * (Début + Nettoyage + Fin), rounded to the tenth of a kilometre like each
 * step — the same value the Fiche display computes (`formatTotal` of
 * `generate-pdfs.ts`). The rounding keeps the emitted number safe from the
 * float drift of the sum (`0.1 + 1.1 + 1.1` reads `2.3000000000000003`).
 */
function tourTotal(startDistance: number, distance: number, endDistance: number): number {
  return Math.round((startDistance + distance + endDistance) * 10) / 10;
}

/** Distances of a Parcours, read from its GPX traces. */
function readTourDistances(entry: ParcoursEntry): GeneratedTour {
  const distance = parseGpxDistance(entry.tracePath);
  const startDistance = parseGpxDistance(entry.startSegmentPath);
  const endDistance = parseGpxDistance(entry.endSegmentPath);
  return {
    name: entry.tourId,
    distance,
    startDistance,
    endDistance,
    totalDistance: tourTotal(startDistance, distance, endDistance),
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
      `impossible d'écrire ${parcoursStateKey(entry.zoneId, entry.tourId)}.geojson : ${error instanceof Error ? error.message : error}`,
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
  const freshKeys = new Set(fresh.map((tour) => parcoursStateKey(tour.zoneId, tour.name)));
  const kept = existing.filter((tour) => !freshKeys.has(parcoursStateKey(tour.zoneId, tour.name)));
  return [...kept, ...fresh].sort(sortTours);
}

/**
 * The catalogue of the Parcours, as it is written in the repository.
 *
 * The file is formatted the way Prettier formats it, so the generated file
 * is always the file the linters expect — and so the comparison with the
 * file already on the disk tells whether the data of the Parcours changed.
 */
async function buildToursData(vTours: GeneratedTour[], pTours: GeneratedTour[]): Promise<string> {
  const content = `// Auto-generated from public/gpx folder (one folder per zone)
export const toursData = {
  vTours: ${JSON.stringify(vTours, null, 2).replace(/"/g, "'")},
  pTours: ${JSON.stringify(pTours, null, 2).replace(/"/g, "'")},
};
`;

  const config = await resolveConfig(outputFile);
  return format(content, { ...config, filepath: outputFile });
}

async function main(): Promise<void> {
  const perf = createPerfRecorder();
  /** The Parcours of the run, and the ones whose data changed. */
  let scope: string[] = [];
  const changed = new Set<string>();

  try {
    const filters = parseGenerationFilters(process.argv);
    const force = parseForceFlag(process.argv);
    const filtered = isFilterActive(filters.tourIds) || isFilterActive(filters.zoneIds);

    if (force) {
      console.log(
        "Mode forcé : le catalogue et les assets GeoJSON sont régénérés quoi qu'il arrive.",
      );
    }

    const inventory = listParcours(rootDir, filters);
    const zoneIds = inventory.zoneIds;
    if (filtered && zoneIds.length === 0) {
      throw new Error('Aucune Zone ne correspond au filtre --tour/--zone.');
    }
    scope = inventory.parcours.map((entry) => parcoursStateKey(entry.zoneId, entry.tourId));
    const freshTours = await perf.measure('distances', async () =>
      inventory.parcours.map(readTourDistances),
    );
    const freshVTours = freshTours.filter((tour) => practiceTypeOf(tour.name) === 'V');
    const freshPTours = freshTours.filter((tour) => practiceTypeOf(tour.name) === 'P');
    if (filtered && freshVTours.length === 0 && freshPTours.length === 0) {
      throw new Error('Aucun Parcours ne correspond au filtre --tour/--zone.');
    }

    const vTours = filtered ? mergeTours(toursData.vTours, freshVTours) : freshVTours;
    const pTours = filtered ? mergeTours(toursData.pTours, freshPTours) : freshPTours;

    // A Parcours whose distances changed is regenerated, even when its
    // GeoJSON asset did not change: the catalogue holds its new distances.
    const existingTours = new Map(
      [...toursData.vTours, ...toursData.pTours].map((tour) => [
        parcoursStateKey(tour.zoneId, tour.name),
        tour,
      ]),
    );
    for (const fresh of freshTours) {
      if (distancesChanged(existingTours.get(parcoursStateKey(fresh.zoneId, fresh.name)), fresh)) {
        changed.add(parcoursStateKey(fresh.zoneId, fresh.name));
      }
    }

    // Emit precomputed GeoJSON for every freshly computed tour only; tours kept
    // by the --tour/--zone merge keep their existing asset untouched. The asset
    // is written only when its content changed, so a run that changed nothing
    // leaves no diff behind.
    let emitFailures = 0;
    let emitted = 0;
    await perf.measure('GeoJSON', async () => {
      for (const entry of inventory.parcours) {
        try {
          if (emitTourGeoJson(entry)) {
            emitted += 1;
            changed.add(parcoursStateKey(entry.zoneId, entry.tourId));
          }
        } catch (error) {
          emitFailures += 1;
          console.error(
            `échec ${entry.tourId} : ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    });
    if (emitFailures > 0) {
      throw new Error(`${emitFailures} asset(s) GeoJSON n'ont pas pu être écrits.`);
    }

    // The catalogue is written only when its content changed.
    await perf.measure('catalogue', async () => {
      try {
        if (writeFileIfChanged(outputFile, await buildToursData(vTours, pTours))) {
          console.log('Catalogue mis à jour : src/app/tours-data.ts.');
        } else {
          console.log('Catalogue inchangé : src/app/tours-data.ts laissé tel quel.');
        }
      } catch (error) {
        throw new Error(
          `impossible d'écrire ${outputFile} : ${error instanceof Error ? error.message : error}`,
        );
      }
    });

    console.log(
      `Catalogue généré : ${vTours.length} Parcours à vélo, ${pTours.length} Parcours à pied (${zoneIds.join(', ') || 'aucune Zone'})`,
    );
    console.log(
      `${emitted} fichier(s) GeoJSON précalculé écrits dans public/geojson/ (${inventory.parcours.length} calculés)`,
    );
  } finally {
    reportRun(perf, scope, changed);
  }
}

/**
 * Show the `[perf]` block of the run: how long it took, how long each step
 * took, and what the run did with the data of every Parcours.
 *
 * The data step reads no tile: the tile counters of a run are the ones of
 * the Fiche step.
 */
function reportRun(
  perf: PerfRecorder,
  scope: readonly string[],
  changed: ReadonlySet<string>,
): void {
  const report = buildPerfReport({
    script: SCRIPT_NAME,
    totalMs: perf.totalMs(),
    steps: perf.steps,
    tiles: { fromCache: 0, downloaded: 0 },
    subjects: [DATA_SUBJECT],
    parcours: countersFromIds(DATA_SUBJECT.id, [...changed], scope, 'up-to-date', 'data-changed'),
  });

  console.log(formatPerfReport(report).join('\n'));
  writePerfReport(perfReportPath(rootDir, SCRIPT_NAME), report);
}

/**
 * Whether the distances of a Parcours changed since the catalogue on the
 * disk — the last check covers the Distance totale too, the derived field
 * the emitter adds next to the three Étapes.
 */
function distancesChanged(existing: GeneratedTour | undefined, fresh: GeneratedTour): boolean {
  if (!existing) {
    return true;
  }
  return (
    existing.distance !== fresh.distance ||
    existing.startDistance !== fresh.startDistance ||
    existing.endDistance !== fresh.endDistance ||
    existing.totalDistance !== fresh.totalDistance
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
