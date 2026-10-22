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

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';

import { DEFAULT_ZONE_ID } from '../src/app/zones';

import type {
  PackCounters,
  PerfCounters,
  PerfElement,
  PerfPlural,
  PerfReport,
  PerfSubject,
} from './generation-perf';

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

/**
 * Whether the run is forced: the `--force` flag asks the pipeline to
 * regenerate everything the filters select, whatever the generation state
 * says.
 */
export function parseForceFlag(argv: readonly string[]): boolean {
  return argv.includes('--force');
}

/**
 * Write a file only when its content changes.
 *
 * The generated files (the catalogue of the Parcours, the precomputed
 * GeoJSON assets) are computed on every run, but writing them again when
 * their content did not change would leave an empty diff in the
 * repository after every run.
 *
 * Returns whether the file was written.
 */
export function writeFileIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf-8') === content) {
    return false;
  }
  writeFileSync(path, content);
  return true;
}

// --- The reports of the runs ---

/**
 * Folder holding the `[perf]` reports of the steps of the last run.
 *
 * The folder is inside the gitignored `scripts/output` folder: the
 * reports are the output of a run, not a source of truth.
 */
export function perfReportsDir(rootDir: string): string {
  return join(rootDir, 'scripts', 'output', 'perf');
}

/** Report of a step of a run: `scripts/output/perf/<step>.json`. */
export function perfReportPath(rootDir: string, script: string): string {
  return join(perfReportsDir(rootDir), `${script}.json`);
}

/**
 * Write the `[perf]` report of a step, so the orchestrators can read the
 * counters of the steps they ran.
 *
 * Returns whether the report was written.
 */
export function writePerfReport(path: string, report: PerfReport): boolean {
  mkdirSync(dirname(path), { recursive: true });
  return writeFileIfChanged(path, `${JSON.stringify(report, null, 2)}\n`);
}

/**
 * Read the `[perf]` report of a step.
 *
 * `undefined` when the report is missing or unreadable: an orchestrator
 * then knows nothing about that step.
 */
export function readPerfReport(path: string): PerfReport | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return undefined;
  }
  if (!isRecord(raw)) {
    return undefined;
  }

  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  return {
    script: typeof raw.script === 'string' ? raw.script : '',
    totalMs: typeof raw.totalMs === 'number' ? raw.totalMs : 0,
    steps: steps.flatMap((step) =>
      isRecord(step) && typeof step.name === 'string' && typeof step.durationMs === 'number'
        ? [{ name: step.name, durationMs: step.durationMs }]
        : [],
    ),
    tiles: {
      fromCache:
        isRecord(raw.tiles) && typeof raw.tiles.fromCache === 'number' ? raw.tiles.fromCache : 0,
      downloaded:
        isRecord(raw.tiles) && typeof raw.tiles.downloaded === 'number' ? raw.tiles.downloaded : 0,
    },
    subjects: readSubjects(raw.subjects),
    parcours: readCounters(raw.parcours),
    zoneMaps: readCounters(raw.zoneMaps),
    packs: readPacks(raw.packs),
  };
}

/** The subjects of a report, with the vocabulary the recap table reads. */
function readSubjects(value: unknown): PerfSubject[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((subject) => {
    if (!isRecord(subject) || typeof subject.id !== 'string') {
      return [];
    }
    const label = typeof subject.label === 'string' ? subject.label : subject.id;
    const plural = typeof subject.plural === 'string' ? subject.plural : label;
    return [
      {
        id: subject.id,
        label,
        plural,
        unit: readPlural(subject.unit, label),
        changed: readPlural(subject.changed, ''),
        unchanged: readPlural(subject.unchanged, ''),
      },
    ];
  });
}

/** A French expression of a report, in the singular and in the plural. */
function readPlural(value: unknown, fallback: string): PerfPlural {
  if (!isRecord(value)) {
    return { singular: fallback, plural: fallback };
  }
  const singular = typeof value.singular === 'string' ? value.singular : fallback;
  const plural = typeof value.plural === 'string' ? value.plural : singular;
  return { singular, plural };
}

/** The elements of a report, with the reason of every decision. */
function readElements(value: unknown): PerfElement[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((element) => {
    if (!isRecord(element) || typeof element.id !== 'string') {
      return [];
    }
    return [
      {
        id: element.id,
        subject: typeof element.subject === 'string' ? element.subject : '',
        zoneId: typeof element.zoneId === 'string' ? element.zoneId : '',
        label: typeof element.label === 'string' ? element.label : '',
        reason: typeof element.reason === 'string' ? element.reason : '',
      },
    ];
  });
}

/** The elements of a counter of a report. */
function readCounters(value: unknown): PerfCounters {
  if (!isRecord(value)) {
    return { changed: [], unchanged: [] };
  }
  return {
    changed: readElements(value.changed),
    unchanged: readElements(value.unchanged),
  };
}

/** The packs of a report, `undefined` when the report holds none. */
function readPacks(value: unknown): PackCounters | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    written: readElements(value.written),
    documents: typeof value.documents === 'number' ? value.documents : 0,
  };
}

/**
 * Drop the reports of the previous run, so an orchestrator never reads
 * the report of a step it did not run.
 */
export function clearPerfReports(rootDir: string): void {
  rmSync(perfReportsDir(rootDir), { recursive: true, force: true });
}

/** Whether a value is a JSON object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The message of an error, for the logs of the generation scripts.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Run the workers in parallel, at most `limit` of them at a time.
 *
 * The items are taken in order: the worker of an item is started as soon
 * as a slot is free. A worker that throws rejects the whole call: the
 * callers catch the failures of their own item, so one failing item never
 * stops the others.
 */
export async function forEachConcurrently<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const concurrency = Math.max(1, limit);
  let next = 0;

  const run = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
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

/**
 * Pattern of the Fiche PDFs of a Zone: a practice type letter followed by
 * the number of the Parcours (`V1.pdf`, `P13.pdf`).
 */
const TOUR_PDF_PATTERN = /^[VP]\d+\.pdf$/;

/**
 * The published documents of a Zone, in the order of the zone packs: the
 * overview maps (vélo then pied), then the Fiches of the Parcours.
 *
 * The pack is built from the published documents: a Fiche that was not
 * rendered again is still in the folder, and the pack picks it up.
 *
 * The tracking sheets are not part of the pack anymore: the « Fiches de
 * suivi » are generated from the real inscriptions by the referent script
 * (`scripts/extract-inscriptions.ts`), outside the site.
 */
export function zonePackFiles(rootDir: string, zoneId: string): string[] {
  const zoneFolder = zonePdfDir(rootDir, zoneId);
  if (!existsSync(zoneFolder)) {
    return [];
  }

  const files: string[] = [];
  for (const kind of ['V', 'P'] as const) {
    const mapPath = zoneMapPdfPath(rootDir, zoneId, kind);
    if (existsSync(mapPath)) {
      files.push(mapPath);
    }
  }

  const tourPdfs = readdirSync(zoneFolder)
    .filter((file) => TOUR_PDF_PATTERN.test(file))
    .sort(compareParcoursIds);
  for (const tourPdf of tourPdfs) {
    files.push(join(zoneFolder, tourPdf));
  }

  return files;
}

/**
 * The Parcours whose Fiche is part of the pack of a Zone, as
 * `<zone>/<parcours>` ids.
 *
 * The overview maps of the Zone are not Parcours: they are left out.
 */
export function zonePackParcours(rootDir: string, zoneId: string): string[] {
  return zonePackFiles(rootDir, zoneId)
    .filter((file) => TOUR_PDF_PATTERN.test(basename(file)))
    .map((file) => parcoursStateKey(zoneId, basename(file, '.pdf')));
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

/**
 * The practice type of a Parcours: `V` (bike) or `P` (walk).
 *
 * The type is the first letter of the id of the Parcours: it is the
 * naming rule of the Parcours, and the pipelines use it to tell the two
 * practices apart.
 */
export type PracticeType = 'V' | 'P';

/**
 * The practice type of a Parcours, from its id: `V` (bike) or `P` (walk).
 */
export function practiceTypeOf(tourId: string): PracticeType {
  return tourId.startsWith('P') ? 'P' : 'V';
}

/**
 * The French name of a practice, as the referent reads it.
 *
 * The scripts name the two practices either by their type (`V`, `P`) or
 * by the routing profile that stands for them (`bicycle`, `foot`): the
 * console shows them in French, whatever the name it starts from.
 */
export function practiceLabel(practice: PracticeType | 'bicycle' | 'foot'): string {
  return practice === 'V' || practice === 'bicycle' ? 'vélo' : 'pied';
}

// --- The keys of the generation state ---

/**
 * Key of a Parcours: `<zone>/<parcours>`.
 *
 * The key identifies a Parcours everywhere it is named: in the generation
 * state, in the counters of the `[perf]` block, in the documents of a zone
 * pack and in the deep link of its page. It is built here, and only here,
 * so every module speaks the same format.
 */
export function parcoursStateKey(zoneId: string, tourId: string): string {
  return `${zoneId}/${tourId}`;
}

/**
 * Read the key of a Parcours: `<zone>/<parcours>`.
 *
 * `undefined` when the key does not hold a Zone and a Parcours: the state
 * is then ignored for that key.
 */
export function parseParcoursStateKey(
  key: string,
): { readonly zoneId: string; readonly tourId: string } | undefined {
  const parts = key.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return undefined;
  }
  return { zoneId: parts[0], tourId: parts[1] };
}

/** Key of an overview map of a Zone: `<zone>/<kind>`. */
export function zoneMapKey(zoneId: string, kind: PracticeType): string {
  return `${zoneId}/${kind}`;
}

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
