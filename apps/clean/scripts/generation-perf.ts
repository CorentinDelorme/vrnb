/**
 * The `[perf]` block of a generation run (ticket #28, spec #21).
 *
 * The referent needs to know what a generation run costs: how long it
 * took, how long each of its steps took, how many map tiles came from
 * the cache and how many were downloaded, and what the run did with each
 * element of the pipeline (the segments, the data, the Fiches, the zone
 * maps and the packs).
 *
 * The block is a recap table, in French: the metrics of the run, then one
 * line per element the run changed and one line per group of elements it
 * left alone, with the reason of every decision.
 *
 * This module is the pure part of the reporting: it builds the report of
 * a run from its durations and its counters, and renders it as the lines
 * of the `[perf]` block. It never prints anything, never touches the
 * filesystem and never reaches the network, so the unit suite checks the
 * block with fake durations and fake counters.
 */

import type { FicheReason, GenerationReason, ZoneReason } from './generation-plan';

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
 * One element of a run: what the run did with it, and why.
 */
export interface PerfElement {
  /**
   * Unique id of the element (`<subject>/<zone>/<element>`), used to merge
   * the steps of a run.
   */
  readonly id: string;
  /** The subject the element belongs to (`fiche`, `segments`, …). */
  readonly subject: string;
  /** The Zone of the element. */
  readonly zoneId: string;
  /** The label the referent reads (`V1`, `vélo`, …). */
  readonly label: string;
  /** The machine reason of the decision (`trace-changed`, `up-to-date`, …). */
  readonly reason: string;
}

/**
 * A French expression, in the singular and in the plural.
 *
 * The recap table shows a subject, a unit and a decision: each of them
 * agrees in gender and in number with the elements it counts.
 */
export interface PerfPlural {
  /** The singular form (`Fiche`). */
  readonly singular: string;
  /** The plural form (`Fiches`). */
  readonly plural: string;
}

/**
 * The vocabulary of a subject: how the referent reads the elements the
 * run acts on.
 *
 * The scripts own the vocabulary: the renderer only knows how to lay it
 * out.
 */
export interface PerfSubject {
  /** Id of the subject (`fiche`, `segments`, …). */
  readonly id: string;
  /** The name of the subject, in the singular (`Fiche`). */
  readonly label: string;
  /** The name of the subject, in the plural (`Fiches`). */
  readonly plural: string;
  /** The unit the grouped rows count (`Fiche`/`Fiches`, `carte`/`cartes`). */
  readonly unit: PerfPlural;
  /** The decision of the subject when the run changed the element. */
  readonly changed: PerfPlural;
  /** The decision of the subject when the run left the element alone. */
  readonly unchanged: PerfPlural;
}

/**
 * The elements of a run: the ones it changed, and the ones it left alone.
 *
 * Every element carries its reason, so the recap table can tell the
 * referent why the run did what it did.
 */
export interface PerfCounters {
  /** The elements the run changed. */
  readonly changed: readonly PerfElement[];
  /** The elements the run left alone. */
  readonly unchanged: readonly PerfElement[];
}

/**
 * The Parcours of a run: the ones the run regenerated, and the ones it
 * left alone.
 *
 * The elements are the ones the run acts on: the segments, the data or
 * the Fiches, depending on the script.
 */
export type ParcoursCounters = PerfCounters;

/**
 * The overview maps of a Zone: the ones the run rendered again, and the
 * ones it left alone.
 */
export type ZoneMapCounters = PerfCounters;

/**
 * The packs of a run: the ones it wrote, and the documents they hold.
 *
 * The pack script merges the published documents of a Zone: it renders
 * no Parcours, but it does write files.
 */
export interface PackCounters {
  /** The packs the run wrote. */
  readonly written: readonly PerfElement[];
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
  /** The vocabulary of the subjects the run acted on. */
  readonly subjects: readonly PerfSubject[];
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
  /** The vocabulary of the subjects the run acted on. */
  readonly subjects: readonly PerfSubject[];
  /** The Parcours of the run. */
  readonly parcours: ParcoursCounters;
  /** The overview maps of the run, empty when the run holds none. */
  readonly zoneMaps?: ZoneMapCounters;
  /** The packs of the run, absent when the run wrote none. */
  readonly packs?: PackCounters;
}

/** The overview maps of a run that touched none. */
const EMPTY_ZONE_MAPS: ZoneMapCounters = { changed: [], unchanged: [] };

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
 * A decision of the plan of a run, as the counters of the run need it.
 */
export interface PerfDecision {
  /** Zone of the element. */
  readonly zoneId: string;
}

/**
 * How the counters read the decisions of a plan.
 */
export interface PerfElementSource<T> {
  /** The subject the elements belong to (`fiche`, `segments`, …). */
  readonly subject: string;
  /** The label the referent reads (`V1`, `vélo`, …). */
  readonly label: (decision: T) => string;
  /** The reason of the decision (`trace-changed`, `up-to-date`, …). */
  readonly reason: (decision: T) => string;
  /** Whether the run changed the element. */
  readonly isChanged: (decision: T) => boolean;
}

/**
 * The counters of a run, from the decisions of its plan.
 *
 * Only the decisions of the run are counted: a run that filters its
 * Parcours counts what it really did, never the whole catalogue.
 */
export function countersFromDecisions<T extends PerfDecision>(
  decisions: readonly T[],
  source: PerfElementSource<T>,
): ParcoursCounters {
  const changed: PerfElement[] = [];
  const unchanged: PerfElement[] = [];

  for (const decision of decisions) {
    const element = elementOf(
      source.subject,
      decision.zoneId,
      source.label(decision),
      source.reason(decision),
    );
    if (source.isChanged(decision)) {
      changed.push(element);
    } else {
      unchanged.push(element);
    }
  }

  return { changed, unchanged };
}

/**
 * The counters of the zone maps of a run, from the decisions of its plan.
 *
 * The zone maps are elements like the others: the recap table only needs
 * their subject, their label and their reason.
 */
export function countersFromZoneDecisions<T extends PerfDecision>(
  decisions: readonly T[],
  source: PerfElementSource<T>,
): ZoneMapCounters {
  return countersFromDecisions(decisions, source);
}

/**
 * The counters of a run, from the ids of the elements it changed and the
 * ids of the elements of its scope.
 *
 * The ids are the keys of the generation state (`<zone>/<element>`): the
 * Zone and the label of the element are read from them.
 */
export function countersFromIds(
  subject: string,
  changed: readonly string[],
  scope: readonly string[],
  unchangedReason: string,
  changedReason = 'changed',
): ParcoursCounters {
  const done = new Set(changed);

  return {
    changed: changed.map((id) => elementOfId(subject, id, changedReason)),
    unchanged: scope
      .filter((id) => !done.has(id))
      .map((id) => elementOfId(subject, id, unchangedReason)),
  };
}

/** One element of a run, from its subject, its Zone and its label. */
function elementOf(subject: string, zoneId: string, label: string, reason: string): PerfElement {
  return {
    id: `${subject}/${zoneId}/${label}`,
    subject,
    zoneId,
    label,
    reason,
  };
}

/** One element of a run, from the key it has in the generation state. */
function elementOfId(subject: string, id: string, reason: string): PerfElement {
  const [zoneId = '', ...rest] = id.split('/');
  return elementOf(subject, zoneId, rest.join('/'), reason);
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
 * downloaded, whatever the step they belong to. The elements are merged
 * by id: an element one step changed is changed for the run, even when
 * another step left it alone.
 */
export function aggregatePerfReports(input: PerfAggregateInput): PerfReport {
  const changedIds = new Set(
    input.reports
      .flatMap((report) => [
        ...report.parcours.changed,
        ...report.zoneMaps.changed,
        ...(report.packs?.written ?? []),
      ])
      .map((element) => element.id),
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
    subjects: mergeSubjects(input.reports.flatMap((report) => report.subjects)),
    parcours: {
      changed: mergeElements(input.reports.flatMap((report) => report.parcours.changed)),
      unchanged: mergeElements(input.reports.flatMap((report) => report.parcours.unchanged)).filter(
        (element) => !changedIds.has(element.id),
      ),
    },
    zoneMaps: {
      changed: mergeElements(input.reports.flatMap((report) => report.zoneMaps.changed)),
      unchanged: mergeElements(input.reports.flatMap((report) => report.zoneMaps.unchanged)).filter(
        (element) => !changedIds.has(element.id),
      ),
    },
    packs: packs.length > 0 ? mergePackCounters(packs) : undefined,
  });
}

/** The elements the run changed, whatever the counter they come from. */
function changedElements(report: PerfReport): readonly PerfElement[] {
  return [...report.parcours.changed, ...report.zoneMaps.changed, ...(report.packs?.written ?? [])];
}

/** The elements the run left alone, whatever the counter they come from. */
function unchangedElements(report: PerfReport): readonly PerfElement[] {
  return [...report.parcours.unchanged, ...report.zoneMaps.unchanged];
}

/** Merge the packs of the steps of a run: the packs are unique, the documents add up. */
function mergePackCounters(packs: readonly PackCounters[]): PackCounters {
  return {
    written: mergeElements(packs.flatMap((pack) => pack.written)),
    documents: sum(packs.map((pack) => pack.documents)),
  };
}

/**
 * Merge the elements of the steps of a run: an element is unique, and the
 * first one wins.
 */
function mergeElements(elements: readonly PerfElement[]): PerfElement[] {
  const merged = new Map<string, PerfElement>();
  for (const element of elements) {
    if (!merged.has(element.id)) {
      merged.set(element.id, element);
    }
  }
  return [...merged.values()];
}

/**
 * Merge the subjects of the steps of a run: a subject is unique, and the
 * first one wins.
 */
function mergeSubjects(subjects: readonly PerfSubject[]): PerfSubject[] {
  const merged = new Map<string, PerfSubject>();
  for (const subject of subjects) {
    if (!merged.has(subject.id)) {
      merged.set(subject.id, subject);
    }
  }
  return [...merged.values()];
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
    subjects: input.subjects,
    parcours: input.parcours,
    zoneMaps: input.zoneMaps ?? EMPTY_ZONE_MAPS,
    packs: input.packs,
  };
}

/** The number of spaces between two columns of a table. */
const COLUMN_GAP = 2;

/**
 * Render the `[perf]` block of a run: the metrics of the run, and the
 * recap of what it did with each element.
 *
 * A run that changed nothing says so: the referent must be able to
 * tell a run that changed nothing from a run that worked.
 */
export function formatPerfReport(report: PerfReport): string[] {
  const lines = [`[perf] ${report.script} — durée totale : ${formatDuration(report.totalMs)}`, ''];

  lines.push(...metricsTable(report));

  const elements = elementsTable(report);
  if (elements.length > 0) {
    lines.push('', ...elements);
  }

  const nothingChanged = nothingChangedLine(report);
  if (nothingChanged) {
    lines.push('', nothingChanged);
  }

  return lines;
}

/**
 * The metrics of a run: the duration of each step, the tiles of the run
 * and, for every subject the run acted on, the number of elements it
 * changed and the number of elements it left alone.
 */
function metricsTable(report: PerfReport): string[] {
  const rows: string[][] = [];

  for (const step of report.steps) {
    rows.push([`Étape « ${step.name} »`, formatDuration(step.durationMs)]);
  }

  rows.push(['Tuiles en cache', String(report.tiles.fromCache)]);
  rows.push(['Tuiles téléchargées', String(report.tiles.downloaded)]);

  for (const subject of report.subjects) {
    const changed = countElements(report, subject.id, true);
    const unchanged = countElements(report, subject.id, false);
    if (changed === 0 && unchanged === 0) {
      continue;
    }
    rows.push([`${capitalize(subject.plural)} ${subject.changed.plural}`, String(changed)]);
    rows.push([`${capitalize(subject.plural)} ${subject.unchanged.plural}`, String(unchanged)]);
  }

  if (report.packs) {
    rows.push(['Documents des packs', String(report.packs.documents)]);
  }

  return renderTable(['Métrique', 'Valeur'], rows);
}

/**
 * The recap of what the run did: one row per element it changed, then one
 * row per group of elements it left alone.
 *
 * The table is omitted when the run holds no element at all.
 */
function elementsTable(report: PerfReport): string[] {
  const rows: string[][] = [];

  for (const element of changedElements(report)) {
    const subject = subjectOf(report, element.subject);
    rows.push([
      subject?.label ?? element.subject,
      element.label,
      element.zoneId || EMPTY_CELL,
      subject?.changed.singular ?? reasonLabel(element.reason),
      reasonLabel(element.reason),
    ]);
  }

  for (const group of groupedElements(report)) {
    const subject = subjectOf(report, group.subject);
    const unit = group.count === 1 ? subject?.unit.singular : subject?.unit.plural;
    rows.push([
      subject?.label ?? group.subject,
      `${group.count} ${unit ?? group.subject}`,
      group.zoneId || EMPTY_CELL,
      subject?.unchanged.plural ?? reasonLabel(group.reason),
      reasonLabel(group.reason),
    ]);
  }

  if (rows.length === 0) {
    return [];
  }

  return renderTable(['Sujet', 'Élément', 'Zone', 'Décision', 'Raison'], rows);
}

/**
 * The elements the run left alone, grouped by subject, Zone and reason.
 *
 * A group holds the elements of a same subject, in a same Zone, left
 * alone for a same reason.
 */
interface ElementGroup {
  /** The subject of the elements of the group. */
  readonly subject: string;
  /** The Zone of the elements of the group. */
  readonly zoneId: string;
  /** The reason the run left the elements alone. */
  readonly reason: string;
  /** The number of elements of the group. */
  readonly count: number;
}

/** The groups of the elements the run left alone. */
function groupedElements(report: PerfReport): ElementGroup[] {
  const groups = new Map<string, ElementGroup>();

  for (const element of unchangedElements(report)) {
    const key = `${element.subject}|${element.zoneId}|${element.reason}`;
    const group = groups.get(key);
    if (group) {
      groups.set(key, { ...group, count: group.count + 1 });
      continue;
    }
    groups.set(key, {
      subject: element.subject,
      zoneId: element.zoneId,
      reason: element.reason,
      count: 1,
    });
  }

  // The groups are shown by subject, in the order the run declares them;
  // the groups of a same subject keep the order of the run.
  return [...groups.values()].sort(
    (a, b) => subjectRank(report, a.subject) - subjectRank(report, b.subject),
  );
}

/** The rank of a subject in the vocabulary of the run. */
function subjectRank(report: PerfReport, id: string): number {
  const index = report.subjects.findIndex((subject) => subject.id === id);
  return index === -1 ? report.subjects.length : index;
}

/** The number of elements of a subject the run changed, or left alone. */
function countElements(report: PerfReport, subject: string, changed: boolean): number {
  const elements = changed ? changedElements(report) : unchangedElements(report);
  return elements.filter((element) => element.subject === subject).length;
}

/** The vocabulary of a subject, `undefined` when the run holds none. */
function subjectOf(report: PerfReport, id: string): PerfSubject | undefined {
  return report.subjects.find((subject) => subject.id === id);
}

/** The cell of an element that has no Zone. */
const EMPTY_CELL = '—';

/**
 * Render a table: a header row, a horizontal rule, then one row per line
 * of the table.
 *
 * Every column is padded to the width of its widest cell, so the table
 * stays aligned.
 */
function renderTable(headers: readonly string[], rows: readonly (readonly string[])[]): string[] {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)),
  );
  const width =
    widths.reduce((total, column) => total + column, 0) + COLUMN_GAP * (widths.length - 1);

  const lines = [`  ${formatRow(headers, widths)}`, `  ${'─'.repeat(width)}`];
  for (const row of rows) {
    lines.push(`  ${formatRow(row, widths)}`);
  }

  return lines;
}

/** One row of a table, every cell padded to the width of its column. */
function formatRow(cells: readonly string[], widths: readonly number[]): string {
  return cells
    .map((cell, index) => cell.padEnd(widths[index] ?? cell.length))
    .join(' '.repeat(COLUMN_GAP))
    .trimEnd();
}

/** The first letter of a label, in upper case. */
function capitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * The line telling the referent the run changed nothing, `undefined` when
 * the run changed something.
 */
function nothingChangedLine(report: PerfReport): string | undefined {
  if (report.packs) {
    // The pack script writes files even though it renders no Parcours.
    return undefined;
  }
  if (changedElements(report).length > 0) {
    return undefined;
  }
  if (unchangedElements(report).length === 0) {
    return undefined;
  }
  return report.zoneMaps.unchanged.length > 0
    ? "  rien n'a changé : aucun Parcours ni aucune carte de zone régénérés"
    : "  rien n'a changé : aucun Parcours régénéré";
}

/** The reasons of the plan of a run. */
type PlanReason = GenerationReason | FicheReason | ZoneReason;

/**
 * The French of the reasons of the plan.
 *
 * The plan owns the machine reasons; the presentation belongs here.
 */
const PLAN_REASON_LABELS: Record<PlanReason, string> = {
  forced: 'forcé',
  'no-state': 'état de génération absent',
  'version-changed': 'version modifiée',
  'no-state-entry': "inconnu de l'état",
  'trace-changed': 'trace modifiée',
  'missing-trace': 'trace absente',
  'meeting-point-changed': 'point de rendez-vous modifié',
  'missing-segments': 'segments absents',
  unchanged: 'à jour',
  'parcours-changed': 'parcours modifié',
  'missing-fiche': 'fiche absente',
  'no-fiche-state': "inconnue de l'état",
  'fiche-changed': 'fiche modifiée',
  'up-to-date': 'à jour',
  'missing-zone-map': 'carte absente',
  'no-zone-map-state': "inconnue de l'état",
  'zone-map-changed': 'carte modifiée',
};

/**
 * The French of the reasons the scripts own (the plan owns the others).
 */
const SCRIPT_REASON_LABELS: Record<string, string> = {
  'data-changed': 'données modifiées',
  'pack-written': 'documents publiés',
  'pack-empty': 'aucun document',
};

/**
 * The French of a reason of a decision.
 *
 * An unknown reason is shown as it is: the recap table never fails on a
 * reason the perf module does not know.
 */
export function reasonLabel(reason: string): string {
  const known = PLAN_REASON_LABELS[reason as PlanReason] ?? SCRIPT_REASON_LABELS[reason];
  return known ?? reason;
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
