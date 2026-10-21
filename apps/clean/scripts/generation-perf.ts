/**
 * The `[perf]` block of a generation run (ticket #28, spec #21).
 *
 * The referent needs to know what a generation run costs: how long it
 * took, how long each of its steps took, how many map tiles came from
 * the cache and how many were downloaded, and how many Parcours were
 * regenerated and how many were left alone.
 *
 * This module is the pure part of the reporting: it builds the report of
 * a run from its durations and its counters, and renders it as the lines
 * of the `[perf]` block. It never prints anything, never touches the
 * filesystem and never reaches the network, so the unit suite checks the
 * block with fake durations and fake counters.
 */

import { parcoursStateKey, zoneMapKey } from './generation-state';

/**
 * One step of a run, and how long it took.
 */
export interface PerfStep {
  /** Name of the step, as the referent knows it. */
  readonly name: string;
  /** Duration of the step, in milliseconds. */
  readonly durationMs: number;
}

/**
 * The map tiles of a run: the ones read from the disk cache, and the ones
 * downloaded from the tile server.
 */
export interface TileCounters {
  /** Tiles read from the disk cache, without any network call. */
  readonly fromCache: number;
  /** Tiles downloaded from the tile server. */
  readonly downloaded: number;
}

/**
 * The Parcours of a run: the ones the run regenerated, and the ones it
 * left alone.
 *
 * The ids are the keys of the generation state (`<zone>/<parcours>`), so
 * the counters of a run can be merged with the ones of another step.
 */
export interface ParcoursCounters {
  /** The Parcours the run regenerated. */
  readonly regenerated: readonly string[];
  /** The Parcours the run left alone. */
  readonly skipped: readonly string[];
}

/**
 * The overview maps of a Zone: the ones the run rendered again, and the
 * ones it left alone.
 */
export interface ZoneMapCounters {
  /** The overview maps the run rendered, as `<zone>/<kind>` ids. */
  readonly regenerated: readonly string[];
  /** The overview maps the run left alone. */
  readonly skipped: readonly string[];
}

/**
 * The packs of a run: the ones it wrote, and the documents they hold.
 *
 * The pack script merges the published documents of a Zone: it renders
 * no Parcours, but it does write files.
 */
export interface PackCounters {
  /** The packs the run wrote, as `<zone>` ids. */
  readonly written: readonly string[];
  /** The number of documents the packs of the run hold. */
  readonly documents: number;
}

/**
 * Everything the `[perf]` block of a run shows.
 */
export interface PerfReport {
  /** Name of the script the report belongs to. */
  readonly script: string;
  /** Duration of the whole run, in milliseconds. */
  readonly totalMs: number;
  /** The steps of the run, in the order they ran. */
  readonly steps: readonly PerfStep[];
  /** The tiles of the run. */
  readonly tiles: TileCounters;
  /** The Parcours of the run. */
  readonly parcours: ParcoursCounters;
  /** The overview maps of the run. */
  readonly zoneMaps: ZoneMapCounters;
  /** The packs of the run, `undefined` when the run wrote none. */
  readonly packs: PackCounters | undefined;
}

/** The inputs of the report of a run. */
export interface PerfReportInput {
  /** Name of the script the report belongs to. */
  readonly script: string;
  /** Duration of the whole run, in milliseconds. */
  readonly totalMs: number;
  /** The steps of the run, in the order they ran. */
  readonly steps: readonly PerfStep[];
  /** The tiles of the run. */
  readonly tiles: TileCounters;
  /** The Parcours of the run. */
  readonly parcours: ParcoursCounters;
  /** The overview maps of the run, empty when the run holds none. */
  readonly zoneMaps?: ZoneMapCounters;
  /** The packs of the run, absent when the run wrote none. */
  readonly packs?: PackCounters;
}

/** The overview maps of a run that touched none. */
const EMPTY_ZONE_MAPS: ZoneMapCounters = { regenerated: [], skipped: [] };

/**
 * The clock the durations of a run are measured with.
 *
 * The clock is injected, so the unit suite checks the durations of a run
 * without waiting for anything.
 */
export interface PerfClock {
  /** The current time, in milliseconds. */
  now(): number;
}

/**
 * Measure the durations of the steps of a run.
 */
export interface PerfRecorder {
  /** Run a step and keep how long it took. */
  measure<T>(name: string, run: () => T | Promise<T>): Promise<T>;
  /** The steps measured so far, in the order they ran. */
  readonly steps: readonly PerfStep[];
  /** The duration of the whole run, in milliseconds. */
  totalMs(): number;
}

/**
 * Create a recorder: it measures the duration of each step of a run, and
 * the duration of the run itself.
 */
export function createPerfRecorder(clock: PerfClock = { now: () => Date.now() }): PerfRecorder {
  const startedAt = clock.now();
  const steps: PerfStep[] = [];

  return {
    async measure<T>(name: string, run: () => T | Promise<T>): Promise<T> {
      const from = clock.now();
      try {
        return await run();
      } finally {
        steps.push({ name, durationMs: Math.max(0, clock.now() - from) });
      }
    },
    get steps(): readonly PerfStep[] {
      return [...steps];
    },
    totalMs(): number {
      return Math.max(0, clock.now() - startedAt);
    },
  };
}

/**
 * A Parcours of a run, as the plan of the run describes it.
 */
export interface PerfDecision {
  /** Zone of the Parcours. */
  readonly zoneId: string;
  /** Id of the Parcours (`V1`, `P13`). */
  readonly tourId: string;
}

/**
 * An overview map of a run, as the plan of the run describes it.
 */
export interface PerfZoneDecision {
  /** Zone of the overview map. */
  readonly zoneId: string;
  /** Practice type of the overview map: `V` (bike) or `P` (walk). */
  readonly kind: 'V' | 'P';
}

/**
 * The Parcours counters of a run, from the decisions of its plan.
 *
 * Only the decisions of the run are counted: a run that filters its
 * Parcours counts what it really did, never the whole catalogue.
 */
export function countersFromDecisions<T extends PerfDecision>(
  decisions: readonly T[],
  isRegenerated: (decision: T) => boolean,
): ParcoursCounters {
  return splitDecisions(decisions, isRegenerated, (decision) =>
    parcoursStateKey(decision.zoneId, decision.tourId),
  );
}

/**
 * The overview map counters of a run, from the decisions of its plan.
 */
export function countersFromZoneDecisions<T extends PerfZoneDecision>(
  decisions: readonly T[],
  isRegenerated: (decision: T) => boolean,
): ZoneMapCounters {
  return splitDecisions(decisions, isRegenerated, (decision) =>
    zoneMapKey(decision.zoneId, decision.kind),
  );
}

/** Split the decisions of a run into the ones it regenerated and the others. */
function splitDecisions<T>(
  decisions: readonly T[],
  isRegenerated: (decision: T) => boolean,
  idOf: (decision: T) => string,
): { readonly regenerated: string[]; readonly skipped: string[] } {
  const regenerated: string[] = [];
  const skipped: string[] = [];

  for (const decision of decisions) {
    const id = idOf(decision);
    if (isRegenerated(decision)) {
      regenerated.push(id);
    } else {
      skipped.push(id);
    }
  }

  return { regenerated, skipped };
}

/**
 * The Parcours counters of a run, from the ids of the Parcours it
 * regenerated and the ids of the Parcours of its scope.
 */
export function countersFromIds(
  regenerated: readonly string[],
  scope: readonly string[],
): ParcoursCounters {
  const done = new Set(regenerated);
  return {
    regenerated: [...regenerated],
    skipped: scope.filter((id) => !done.has(id)),
  };
}

/**
 * The report of an orchestrator: the durations of the steps it ran, and
 * the counters of the steps it ran.
 */
export interface PerfAggregateInput {
  /** Name of the script the report belongs to. */
  readonly script: string;
  /** Duration of the whole run, in milliseconds. */
  readonly totalMs: number;
  /** The steps of the run, in the order they ran. */
  readonly steps: readonly PerfStep[];
  /** The reports of the steps of the run. */
  readonly reports: readonly PerfReport[];
}

/**
 * Merge the reports of the steps of a run into the report of the run.
 *
 * The tiles of the steps are added up: they are the tiles the run
 * downloaded, whatever the step they belong to. The Parcours are merged
 * by id: a Parcours one step regenerated is regenerated for the run, even
 * when another step left it alone.
 */
export function aggregatePerfReports(input: PerfAggregateInput): PerfReport {
  const regenerated = unique(input.reports.flatMap((report) => report.parcours.regenerated));
  const skipped = unique(input.reports.flatMap((report) => report.parcours.skipped)).filter(
    (id) => !regenerated.includes(id),
  );
  const zoneMapsRegenerated = unique(
    input.reports.flatMap((report) => report.zoneMaps.regenerated),
  );
  const zoneMapsSkipped = unique(input.reports.flatMap((report) => report.zoneMaps.skipped)).filter(
    (id) => !zoneMapsRegenerated.includes(id),
  );

  const packs = input.reports.flatMap((report) => report.packs ?? []);

  return buildPerfReport({
    script: input.script,
    totalMs: input.totalMs,
    steps: input.steps,
    tiles: {
      fromCache: sum(input.reports.map((report) => report.tiles.fromCache)),
      downloaded: sum(input.reports.map((report) => report.tiles.downloaded)),
    },
    parcours: { regenerated, skipped },
    zoneMaps: { regenerated: zoneMapsRegenerated, skipped: zoneMapsSkipped },
    packs: packs.length > 0 ? mergePackCounters(packs) : undefined,
  });
}

/** Merge the packs of the steps of a run: the packs are unique, the documents add up. */
function mergePackCounters(packs: readonly PackCounters[]): PackCounters {
  return {
    written: unique(packs.flatMap((pack) => pack.written)),
    documents: sum(packs.map((pack) => pack.documents)),
  };
}

/** The ids of a list, without the duplicates and in the order they came. */
function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

/** The sum of a list of numbers. */
function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Build the report of a run from its durations and its counters.
 */
export function buildPerfReport(input: PerfReportInput): PerfReport {
  return {
    script: input.script,
    totalMs: input.totalMs,
    steps: input.steps,
    tiles: input.tiles,
    parcours: input.parcours,
    zoneMaps: input.zoneMaps ?? EMPTY_ZONE_MAPS,
    packs: input.packs,
  };
}

/**
 * Render the `[perf]` block of a run: one line per fact, no per-tile
 * logging.
 *
 * A run that regenerated nothing says so: the referent must be able to
 * tell a run that changed nothing from a run that worked.
 */
export function formatPerfReport(report: PerfReport): string[] {
  const lines = [`[perf] ${report.script}`, `  total duration: ${formatDuration(report.totalMs)}`];

  for (const step of report.steps) {
    lines.push(`  step ${step.name}: ${formatDuration(step.durationMs)}`);
  }

  lines.push(
    `  tiles: ${report.tiles.fromCache} from cache, ${report.tiles.downloaded} downloaded`,
    `  Parcours: ${report.parcours.regenerated.length} regenerated, ${report.parcours.skipped.length} skipped`,
  );

  if (report.zoneMaps.regenerated.length > 0 || report.zoneMaps.skipped.length > 0) {
    lines.push(
      `  zone maps: ${report.zoneMaps.regenerated.length} regenerated, ${report.zoneMaps.skipped.length} skipped`,
    );
  }

  if (report.packs) {
    lines.push(
      `  packs: ${report.packs.written.length} written, ${report.packs.documents} documents`,
    );
  }

  const nothingChanged = nothingChangedLine(report);
  if (nothingChanged) {
    lines.push(nothingChanged);
  }

  return lines;
}

/**
 * The line telling the referent the run changed nothing, `undefined` when
 * the run regenerated something.
 */
function nothingChangedLine(report: PerfReport): string | undefined {
  if (report.packs) {
    // The pack script writes files even though it renders no Parcours.
    return undefined;
  }
  if (report.parcours.regenerated.length > 0 || report.zoneMaps.regenerated.length > 0) {
    return undefined;
  }
  if (report.parcours.skipped.length === 0 && report.zoneMaps.skipped.length === 0) {
    return undefined;
  }
  return report.zoneMaps.skipped.length > 0
    ? '  nothing changed: no Parcours and no zone map was regenerated'
    : '  nothing changed: no Parcours was regenerated';
}

/**
 * Format a duration the way the referent reads it: milliseconds under a
 * second, seconds under a minute, minutes and seconds above.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0 ms';
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = Math.round(seconds - minutes * 60);
  if (minutes < 60) {
    return restSeconds === 60
      ? `${minutes + 1} m 00 s`
      : `${minutes} m ${String(restSeconds).padStart(2, '0')} s`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes - hours * 60;
  return `${hours} h ${String(restMinutes).padStart(2, '0')} m`;
}
