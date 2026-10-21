/**
 * Shared helpers of the data-generation scripts (ticket #23).
 *
 * The generation scripts (start/end GPX, tours data, Fiches) used to
 * duplicate the same three concerns: reading the `--tour` / `--zone`
 * filters, discovering the Zones and the Parcours on disk, and computing
 * the paths of the generated artefacts. They live here now, so every
 * script sees the same inventory, computed the same way.
 *
 * Pure module: no import-time side effect, no `process.exit`, no console
 * output. The filesystem is reached through the explicit `rootDir`
 * argument, so the unit suite can point the helpers at a temporary
 * fixture tree instead of the real `public/` folders.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

import { DEFAULT_ZONE_ID } from '../src/app/zones';

/**
 * Values of a `--flag=a,b` option: the first matching argument wins, the
 * values are split on commas, trimmed, and the empty ones dropped.
 *
 * An absent flag returns `undefined`, a present but empty one returns an
 * empty array: the two cases are distinct here, even though the scripts
 * have always treated `--tour=` as "no filter at all".
 */
export function parseFilterValues(argv: readonly string[], flag: string): string[] | undefined {
  const arg = argv.find((candidate) => candidate.startsWith(`${flag}=`));
  if (!arg) {
    return undefined;
  }
  return arg
    .slice(flag.length + 1)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * The filters of a generation run: the Parcours ids (`--tour`) and the Zone
 * ids (`--zone`) to keep.
 *
 * A filter is `undefined` when its flag is absent and an empty set when the
 * flag is present but holds no value; both mean "no restriction" for the
 * run (see `isFilterActive`).
 */
export interface GenerationFilters {
  /** Parcours ids to keep, `undefined` when the `--tour` flag is absent. */
  readonly tourIds: ReadonlySet<string> | undefined;
  /** Zone ids to keep, `undefined` when the `--zone` flag is absent. */
  readonly zoneIds: ReadonlySet<string> | undefined;
}

/** Read the `--tour` and `--zone` filters of a generation run. */
export function parseGenerationFilters(argv: readonly string[]): GenerationFilters {
  return {
    tourIds: toFilterSet(parseFilterValues(argv, '--tour')),
    zoneIds: toFilterSet(parseFilterValues(argv, '--zone')),
  };
}

function toFilterSet(values: string[] | undefined): ReadonlySet<string> | undefined {
  return values === undefined ? undefined : new Set(values);
}

// --- Layout of the generated data ---

/** Folder holding the GPX traces: `public/gpx`. */
export function gpxRootDir(rootDir: string): string {
  return join(rootDir, 'public/gpx');
}

/** Folder holding the precomputed GeoJSON assets: `public/geojson`. */
export function geoJsonRootDir(rootDir: string): string {
  return join(rootDir, 'public/geojson');
}

/** Folder holding the published PDFs: `public/pdf`. */
export function pdfRootDir(rootDir: string): string {
  return join(rootDir, 'public/pdf');
}

/**
 * Suffix of a GPX trace inside a Parcours folder: the Parcours trace
 * itself, or one of its start/end segments.
 */
export type GpxSegmentSuffix = '' | '_start' | '_end';

/** GPX trace of a Parcours in the zoned layout: `public/gpx/<zone>/<parcours>/<parcours>.gpx`. */
export function gpxTracePath(
  rootDir: string,
  zoneId: string,
  tourId: string,
  suffix: GpxSegmentSuffix,
): string {
  return join(gpxRootDir(rootDir), zoneId, tourId, `${tourId}${suffix}.gpx`);
}

/** GPX trace of a Parcours in the legacy flat layout: `public/gpx/<parcours>/<parcours>.gpx`. */
export function legacyGpxTracePath(
  rootDir: string,
  tourId: string,
  suffix: GpxSegmentSuffix,
): string {
  return join(gpxRootDir(rootDir), tourId, `${tourId}${suffix}.gpx`);
}

/**
 * GPX trace of a Parcours, with a fallback to the legacy flat layout
 * (pre-zone files): the zoned trace when it exists, the flat one
 * otherwise.
 */
export function resolveGpxTracePath(
  rootDir: string,
  zoneId: string,
  tourId: string,
  suffix: GpxSegmentSuffix,
): string {
  const zoned = gpxTracePath(rootDir, zoneId, tourId, suffix);
  if (existsSync(zoned)) {
    return zoned;
  }
  return legacyGpxTracePath(rootDir, tourId, suffix);
}

/** Precomputed GeoJSON asset of a Parcours: `public/geojson/<zone>/<parcours>.geojson`. */
export function geoJsonAssetPath(rootDir: string, zoneId: string, tourId: string): string {
  return join(geoJsonRootDir(rootDir), zoneId, `${tourId}.geojson`);
}

/** Fiche of a Parcours: `public/pdf/<zone>/<parcours>.pdf`. */
export function tourPdfPath(rootDir: string, zoneId: string, tourId: string): string {
  return join(pdfRootDir(rootDir), zoneId, `${tourId}.pdf`);
}

/** Folder holding the PDFs of a Zone: `public/pdf/<zone>`. */
export function zonePdfDir(rootDir: string, zoneId: string): string {
  return join(pdfRootDir(rootDir), zoneId);
}

/** File name of the overview map of a Zone, per practice type. */
export function zoneMapPdfName(kind: 'V' | 'P'): string {
  return kind === 'V' ? 'Carte_parcours_a_velo.pdf' : 'Carte_parcours_a_pied.pdf';
}

/** Overview map of a Zone: `public/pdf/<zone>/Carte_parcours_a_velo.pdf` (or `..._pied.pdf`). */
export function zoneMapPdfPath(rootDir: string, zoneId: string, kind: 'V' | 'P'): string {
  return join(zonePdfDir(rootDir, zoneId), zoneMapPdfName(kind));
}

// --- Inventory of the Zones and the Parcours ---

/**
 * Strict pattern of a Parcours folder: a practice type letter followed by
 * the number of the Parcours (`V1`, `P13`). It is the naming rule of the
 * Parcours, so it tells a Zone folder from a Parcours folder.
 */
const TOUR_FOLDER_PATTERN = /^[VP]\d+$/;

/**
 * Loose pattern of a Parcours folder, used inside a Zone: any folder
 * starting with a practice type letter. The generation scripts have
 * always listed the Parcours of a Zone this way.
 */
const PARCOURS_FOLDER_PATTERN = /^[VP]/;

/** A Parcours found on disk, with the Zone it belongs to and its GPX traces. */
export interface ParcoursEntry {
  /** Zone of the Parcours. */
  readonly zoneId: string;
  /** Id of the Parcours (`V1`, `P13`). */
  readonly tourId: string;
  /** Folder of the Parcours: it holds the GPX traces. */
  readonly dir: string;
  /** GPX trace of the Parcours itself. */
  readonly tracePath: string;
  /** GPX trace of the start segment (from the Point de rendez-vous). */
  readonly startSegmentPath: string;
  /** GPX trace of the end segment (back to the Point de rendez-vous). */
  readonly endSegmentPath: string;
}

/** The Parcours of a Zone. */
export interface ZoneParcours {
  /** Id of the Zone. */
  readonly zoneId: string;
  /** Parcours of the Zone, in the inventory order. */
  readonly parcours: readonly ParcoursEntry[];
}

/** The Zones and the Parcours found on disk. */
export interface ParcoursInventory {
  /**
   * Ids of the Zones found on disk (the Zone folders, plus the default
   * Zone when the legacy flat layout holds Parcours), zone-filtered.
   * A Zone without any matching Parcours is listed too.
   */
  readonly zoneIds: readonly string[];
  /** The Zones holding at least one matching Parcours. */
  readonly zones: readonly ZoneParcours[];
  /** Every matching Parcours, ordered by Zone, then practice type, then number. */
  readonly parcours: readonly ParcoursEntry[];
}

/**
 * List the Zones and the Parcours of the GPX tree.
 *
 * Two layouts are supported: the current one, where every Zone holds a
 * folder per Parcours (`public/gpx/<zone>/<parcours>/`), and the legacy
 * flat one, where the Parcours folders live directly under `public/gpx`
 * and belong to the default Zone.
 *
 * The two scripts that discovered the Parcours did not use the same
 * folder patterns: `generate-tours.ts` told a Zone folder from a Parcours
 * folder with the strict pattern `/^[VP]\d+$/` (the naming rule of a
 * Parcours id), while `generate-start-end-gpx.ts` used the looser
 * `/^[VP]/`. The inventory keeps both, each where it applies: the strict
 * pattern splits the folders of `public/gpx` into Zones and legacy
 * Parcours (as `generate-tours.ts` did), the loose pattern lists the
 * Parcours folders of a Zone (as `generate-start-end-gpx.ts` did). Both
 * patterns agree on the real data, where every Parcours folder is named
 * after the naming rule.
 *
 * The Parcours of a Zone are ordered by practice type (P before V) then
 * by number, the order of the generated catalogue and of the PDF packs.
 * `generate-start-end-gpx.ts` used to order them by number only, which
 * left the Parcours sharing a number (a walking and a bike one) in the
 * order of the directory listing; the shared order makes the run
 * deterministic, without changing the files it writes.
 */
export function listParcours(rootDir: string, filters?: GenerationFilters): ParcoursInventory {
  const gpxRoot = gpxRootDir(rootDir);
  if (!existsSync(gpxRoot)) {
    return { zoneIds: [], zones: [], parcours: [] };
  }

  const entries = readdirSync(gpxRoot, { withFileTypes: true });
  const zoneFolders = entries.filter(
    (entry) => entry.isDirectory() && !TOUR_FOLDER_PATTERN.test(entry.name),
  );
  const legacyFolders = entries.filter(
    (entry) => entry.isDirectory() && TOUR_FOLDER_PATTERN.test(entry.name),
  );

  // The legacy Parcours belong to the default Zone.
  const zoneIds = zoneFolders.map((folder) => folder.name);
  if (legacyFolders.length > 0 && !zoneIds.includes(DEFAULT_ZONE_ID)) {
    zoneIds.push(DEFAULT_ZONE_ID);
  }

  const parcours: ParcoursEntry[] = [];
  for (const zone of zoneFolders) {
    if (!matchesZoneFilter(filters, zone.name)) {
      continue;
    }
    const zoneDir = join(gpxRoot, zone.name);
    for (const folder of readdirSync(zoneDir, { withFileTypes: true })) {
      if (!folder.isDirectory() || !PARCOURS_FOLDER_PATTERN.test(folder.name)) {
        continue;
      }
      parcours.push(buildEntry(zone.name, folder.name, join(zoneDir, folder.name)));
    }
  }

  // Legacy layout: Parcours folders directly under public/gpx.
  if (legacyFolders.length > 0 && matchesZoneFilter(filters, DEFAULT_ZONE_ID)) {
    for (const folder of legacyFolders) {
      parcours.push(buildEntry(DEFAULT_ZONE_ID, folder.name, join(gpxRoot, folder.name)));
    }
  }

  const kept = parcours
    .filter((entry) => matchesTourFilter(filters, entry.tourId))
    .sort(compareParcoursEntries);

  return {
    zoneIds: zoneIds.filter((zoneId) => matchesZoneFilter(filters, zoneId)).sort(compareZoneIds),
    zones: groupByZone(kept),
    parcours: kept,
  };
}

function buildEntry(zoneId: string, tourId: string, dir: string): ParcoursEntry {
  return {
    zoneId,
    tourId,
    dir,
    tracePath: join(dir, `${tourId}.gpx`),
    startSegmentPath: join(dir, `${tourId}_start.gpx`),
    endSegmentPath: join(dir, `${tourId}_end.gpx`),
  };
}

/**
 * Order of the Parcours of a Zone: the walking ones first, then the bike
 * ones, each group sorted by the number of the Parcours. It is the order
 * of the generated catalogue and of the PDF packs.
 */
export function compareParcoursIds(a: string, b: string): number {
  if (a[0] !== b[0]) {
    return a[0] < b[0] ? -1 : 1;
  }
  return parseInt(a.slice(1)) - parseInt(b.slice(1));
}

/**
 * Order of the Zones: the order of the generated catalogue (and of the
 * routing runs), which compares the Zone ids with the locale.
 */
function compareZoneIds(a: string, b: string): number {
  return a.localeCompare(b);
}

function compareParcoursEntries(a: ParcoursEntry, b: ParcoursEntry): number {
  if (a.zoneId !== b.zoneId) {
    return compareZoneIds(a.zoneId, b.zoneId);
  }
  return compareParcoursIds(a.tourId, b.tourId);
}

function groupByZone(parcours: readonly ParcoursEntry[]): ZoneParcours[] {
  const grouped = new Map<string, ParcoursEntry[]>();
  for (const entry of parcours) {
    const zone = grouped.get(entry.zoneId);
    if (zone) {
      zone.push(entry);
      continue;
    }
    grouped.set(entry.zoneId, [entry]);
  }
  return [...grouped].map(([zoneId, entries]) => ({ zoneId, parcours: entries }));
}

/**
 * Whether a filter restricts the run. An absent flag and a flag holding
 * no value both mean "no restriction": the scripts have always treated
 * `--tour=` as "every Parcours".
 */
export function isFilterActive(ids: ReadonlySet<string> | undefined): boolean {
  return ids !== undefined && ids.size > 0;
}

/** Whether a Zone passes the `--zone` filter. */
export function matchesZoneFilter(filters: GenerationFilters | undefined, zoneId: string): boolean {
  const zoneIds = filters?.zoneIds;
  return zoneIds === undefined || zoneIds.size === 0 || zoneIds.has(zoneId);
}

/** Whether a Parcours passes the `--tour` filter. */
export function matchesTourFilter(filters: GenerationFilters | undefined, tourId: string): boolean {
  const tourIds = filters?.tourIds;
  return tourIds === undefined || tourIds.size === 0 || tourIds.has(tourId);
}

/** Whether a Parcours passes both filters. */
export function matchesFilters(
  filters: GenerationFilters | undefined,
  zoneId: string,
  tourId: string,
): boolean {
  return matchesZoneFilter(filters, zoneId) && matchesTourFilter(filters, tourId);
}
