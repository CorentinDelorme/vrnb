/**
 * The versioned generation state (ticket #26, spec #21).
 *
 * The state is the memory of the generation pipeline: for every Parcours,
 * the fingerprint of its source trace, of the Point de rendez-vous of its
 * Zone, of the segments the pipeline produced and of the Fiche it
 * rendered; and for every overview map of a Zone, the fingerprint of the
 * document. A version constant covers the routing algorithm and the Fiche
 * template.
 *
 * It lives in the repository (never in a gitignored cache folder), so a
 * fresh clone behaves like an up-to-date working copy: the pipeline
 * compares the fingerprints it finds on disk with the ones it recorded and
 * only re-routes what actually changed.
 *
 * This module owns the fingerprints and the reading and the writing of the
 * state file. The decision of what must be regenerated lives in
 * `generation-plan.ts`.
 */

import { createHash } from 'crypto';
import { mkdirSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';

import type { ParcoursEntry, PracticeType } from './generation-helpers';
import {
  isRecord,
  resolveGpxTracePath,
  tourPdfPath,
  writeFileIfChanged,
} from './generation-helpers';

/**
 * Version of the generation state: the single source of truth of what the
 * produced artefacts depend on.
 *
 * It covers the routing algorithm and the Fiche template. Bumping it
 * invalidates every Parcours: the plan then asks for a full regeneration,
 * whatever the recorded fingerprints are.
 */
export const GENERATION_STATE_VERSION = 1;

/** Name of the state file, inside the `scripts` folder of the app. */
export const GENERATION_STATE_FILENAME = 'generation-state.json';

/**
 * What the state knows about one Parcours.
 *
 * Every fingerprint is a union: an absent one (`undefined`) means
 * "unknown", and the plan regenerates the artefact rather than trusting the
 * state. On the disk, an unknown fingerprint is an absent key: the
 * undefined ones are dropped when the state is written, so the file only
 * holds the fingerprints the pipeline knows.
 */
export interface ParcoursGenerationRecord {
  /** Fingerprint of the source trace of the Parcours. */
  readonly trace: string | undefined;
  /** Fingerprint of the produced start segment. */
  readonly startSegment: string | undefined;
  /** Fingerprint of the produced end segment. */
  readonly endSegment: string | undefined;
  /** Fingerprint of the produced Fiche. */
  readonly fiche: string | undefined;
  /** Fingerprint of the Point de rendez-vous of the Zone of the Parcours. */
  readonly meetingPoint: string | undefined;
}

/** The generation state, as it is written in the repository. */
export interface GenerationState {
  /** The version constant the state was written with. */
  readonly version: number;
  /** The records of the Parcours, keyed by `<zone>/<parcours>`. */
  readonly parcours: Readonly<Record<string, ParcoursGenerationRecord>>;
  /**
   * The fingerprints of the overview maps of the Zones, keyed by
   * `<zone>/<kind>`.
   */
  readonly zoneMaps: Readonly<Record<string, string | undefined>>;
}

/** The fingerprints of the trace and of the segments of a Parcours. */
export interface ParcoursSegmentFingerprints {
  /** Fingerprint of the source trace, `undefined` when the file is missing. */
  readonly trace: string | undefined;
  /** Fingerprint of the start segment, `undefined` when the file is missing. */
  readonly startSegment: string | undefined;
  /** Fingerprint of the end segment, `undefined` when the file is missing. */
  readonly endSegment: string | undefined;
}

/** The fingerprints of every file of a Parcours, as found on the disk. */
export interface ParcoursFingerprints extends ParcoursSegmentFingerprints {
  /**
   * Fingerprint of the produced Fiche, `undefined` when the file is
   * missing, empty or unreadable.
   */
  readonly fiche: string | undefined;
}

/** What the pipeline produced for a Parcours during a run. */
export interface ParcoursStateUpdate {
  /** Key of the Parcours (`<zone>/<parcours>`). */
  readonly key: string;
  /**
   * The new record of the Parcours, `undefined` when the run failed: a
   * Parcours that failed is not marked as up to date.
   */
  readonly record: ParcoursGenerationRecord | undefined;
}

/** What the pipeline produced for an overview map during a run. */
export interface ZoneMapStateUpdate {
  /** Key of the overview map (`<zone>/<kind>`). */
  readonly key: string;
  /**
   * The new fingerprint of the overview map, `undefined` when the render
   * failed: an overview map that failed is not marked as up to date.
   */
  readonly fingerprint: string | undefined;
}

/** What the reading of the generation state found. */
export type GenerationStateRead =
  /** The state was read. */
  | { readonly status: 'read'; readonly state: GenerationState }
  /** The state file does not exist: the pipeline knows nothing yet. */
  | { readonly status: 'missing' }
  /** The state file exists but cannot be read: it is corrupt. */
  | { readonly status: 'unreadable'; readonly reason: string };

/** Key of a Parcours in the state: `<zone>/<parcours>`. */
export function parcoursStateKey(zoneId: string, tourId: string): string {
  return `${zoneId}/${tourId}`;
}

/**
 * Read the key of a Parcours of the state: `<zone>/<parcours>`.
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

/** Key of an overview map in the state: `<zone>/<kind>`. */
export function zoneMapKey(zoneId: string, kind: PracticeType): string {
  return `${zoneId}/${kind}`;
}

/** Path of the state file of the app. */
export function generationStatePath(rootDir: string): string {
  return join(rootDir, 'scripts', GENERATION_STATE_FILENAME);
}

/**
 * Fingerprint of a file: the sha256 of its content, as an hexadecimal
 * digest.
 *
 * `undefined` when the file cannot be read (absent, unreadable): an
 * unknown fingerprint is what makes the pipeline regenerate the artefact.
 */
export function fingerprintFile(path: string): string | undefined {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return undefined;
  }
}

/**
 * Fingerprint of a produced document (a Fiche or an overview map).
 *
 * `undefined` when the file is missing, empty or unreadable: an empty
 * document is not a document, and the pipeline must render it again.
 */
export function fingerprintDocument(path: string): string | undefined {
  try {
    if (statSync(path).size === 0) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return fingerprintFile(path);
}

/**
 * Fingerprint of a Point de rendez-vous: the sha256 of its name and of
 * its coordinates.
 *
 * The name is printed on the Fiche and in the GPX of the segments, the
 * coordinates drive the routing: a Point de rendez-vous that changed
 * invalidates the segments of every Parcours of its Zone.
 */
export function meetingPointFingerprint(meetingPoint: {
  readonly name: string;
  readonly coordinates: readonly number[];
}): string {
  return createHash('sha256')
    .update(`${meetingPoint.name}|${meetingPoint.coordinates.join(',')}`)
    .digest('hex');
}

/**
 * The fingerprints of the files of a Parcours, as they are on the disk: its
 * source trace and its two segments.
 */
export function fingerprintParcoursFiles(entry: ParcoursEntry): ParcoursSegmentFingerprints {
  return {
    trace: fingerprintFile(entry.tracePath),
    startSegment: fingerprintFile(entry.startSegmentPath),
    endSegment: fingerprintFile(entry.endSegmentPath),
  };
}

/**
 * The fingerprints of every file of a Parcours, as they are on the disk:
 * its source trace, its two segments and its Fiche.
 */
export function fingerprintParcoursArtefacts(
  rootDir: string,
  zoneId: string,
  tourId: string,
): ParcoursFingerprints {
  return {
    trace: fingerprintFile(resolveGpxTracePath(rootDir, zoneId, tourId, '')),
    startSegment: fingerprintFile(resolveGpxTracePath(rootDir, zoneId, tourId, '_start')),
    endSegment: fingerprintFile(resolveGpxTracePath(rootDir, zoneId, tourId, '_end')),
    fiche: fingerprintDocument(tourPdfPath(rootDir, zoneId, tourId)),
  };
}

/**
 * The state of the next run.
 *
 * The records of the Parcours the run regenerated hold their new
 * fingerprints, the records of the Parcours the run failed on are dropped
 * (so the next run tries them again), and the records of the other
 * Parcours are left untouched. The same goes for the overview maps: the
 * ones the run rendered hold their new fingerprint, the ones it failed to
 * render hold none.
 */
export function nextGenerationState(
  state: GenerationState | undefined,
  updates: readonly ParcoursStateUpdate[],
  zoneMapUpdates: readonly ZoneMapStateUpdate[] = [],
): GenerationState {
  const records: Record<string, ParcoursGenerationRecord> = { ...state?.parcours };

  for (const update of updates) {
    if (!update.record) {
      delete records[update.key];
      continue;
    }
    records[update.key] = update.record;
  }

  const zoneMaps: Record<string, string | undefined> = { ...state?.zoneMaps };

  for (const update of zoneMapUpdates) {
    if (!update.fingerprint) {
      delete zoneMaps[update.key];
      continue;
    }
    zoneMaps[update.key] = update.fingerprint;
  }

  return { version: GENERATION_STATE_VERSION, parcours: records, zoneMaps };
}

/**
 * The record of a Parcours whose Fiche was rendered: the fingerprints the
 * state knew, with the one of the Fiche that was just written.
 *
 * A `undefined` fingerprint means the Fiche was not rendered: the record
 * then holds no Fiche fingerprint, and the next run renders it again.
 */
export function withFicheFingerprint(
  record: ParcoursGenerationRecord | undefined,
  fiche: string | undefined,
): ParcoursGenerationRecord {
  return {
    trace: record?.trace,
    startSegment: record?.startSegment,
    endSegment: record?.endSegment,
    fiche,
    meetingPoint: record?.meetingPoint,
  };
}

/**
 * The state with the fingerprint of the Fiche of every Parcours that has
 * none yet.
 *
 * A working copy whose Fiches were committed before the state tracked them
 * gets them recorded, so a fresh clone does not render every Fiche again.
 * The fingerprints already recorded are never overwritten: the state must
 * not claim a Fiche is up to date when it was rendered from another trace.
 */
export function withMissingFicheFingerprints(
  state: GenerationState,
  fingerprints: Readonly<Record<string, string | undefined>>,
): GenerationState {
  const parcours: Record<string, ParcoursGenerationRecord> = {};

  for (const [key, record] of Object.entries(state.parcours)) {
    parcours[key] = record.fiche ? record : withFicheFingerprint(record, fingerprints[key]);
  }

  return { version: state.version, parcours, zoneMaps: state.zoneMaps };
}

/**
 * The state with the fingerprint of the Point de rendez-vous of every
 * Parcours that has none yet.
 *
 * The fingerprints are keyed by Zone: every Parcours of a Zone is routed
 * from the same Point de rendez-vous. The fingerprints already recorded are
 * never overwritten: the state must not claim a Parcours is up to date
 * when it was routed from another Point de rendez-vous.
 */
export function withMissingMeetingPointFingerprints(
  state: GenerationState,
  fingerprints: Readonly<Record<string, string | undefined>>,
): GenerationState {
  const parcours: Record<string, ParcoursGenerationRecord> = {};

  for (const [key, record] of Object.entries(state.parcours)) {
    if (record.meetingPoint) {
      parcours[key] = record;
      continue;
    }
    const parsed = parseParcoursStateKey(key);
    parcours[key] = {
      ...record,
      meetingPoint: parsed ? fingerprints[parsed.zoneId] : undefined,
    };
  }

  return { version: state.version, parcours, zoneMaps: state.zoneMaps };
}

/**
 * The state with the fingerprint of every overview map it knows nothing
 * about yet.
 *
 * The fingerprints are keyed by `<zone>/<kind>`. The ones already recorded
 * are never overwritten, and the unknown ones (the map was never rendered)
 * are left out of the state.
 */
export function withMissingZoneMapFingerprints(
  state: GenerationState,
  fingerprints: Readonly<Record<string, string | undefined>>,
): GenerationState {
  const zoneMaps: Record<string, string | undefined> = { ...state.zoneMaps };

  for (const [key, fingerprint] of Object.entries(fingerprints)) {
    if (zoneMaps[key] || !fingerprint) {
      continue;
    }
    zoneMaps[key] = fingerprint;
  }

  return { version: state.version, parcours: state.parcours, zoneMaps };
}

/**
 * Read the generation state.
 *
 * The result tells why the state could not be read: a missing state file
 * is the normal state of a fresh copy, a corrupt one is a problem the
 * referent must know about.
 */
export function readGenerationState(path: string): GenerationStateRead {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (error) {
    if (isMissingFile(error)) {
      return { status: 'missing' };
    }
    return { status: 'unreadable', reason: errorMessage(error) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { status: 'unreadable', reason: errorMessage(error) };
  }

  if (!isRecord(parsed) || typeof parsed.version !== 'number') {
    return { status: 'unreadable', reason: 'the state file holds no version' };
  }

  const parcours: Record<string, ParcoursGenerationRecord> = {};
  if (isRecord(parsed.parcours)) {
    for (const [key, value] of Object.entries(parsed.parcours)) {
      if (isRecord(value)) {
        parcours[key] = readRecord(value);
      }
    }
  }

  const zoneMaps: Record<string, string | undefined> = {};
  if (isRecord(parsed.zoneMaps)) {
    for (const [key, value] of Object.entries(parsed.zoneMaps)) {
      if (typeof value === 'string') {
        zoneMaps[key] = value;
      }
    }
  }

  return { status: 'read', state: { version: parsed.version, parcours, zoneMaps } };
}

/**
 * Write the generation state, creating its folder when needed.
 *
 * The file is written only when its content changes, so a run that
 * regenerated nothing leaves the repository untouched.
 *
 * Returns whether the file was written.
 */
export function writeGenerationState(path: string, state: GenerationState): boolean {
  mkdirSync(dirname(path), { recursive: true });
  return writeFileIfChanged(path, `${JSON.stringify(state, null, 2)}\n`);
}

function readRecord(record: Record<string, unknown>): ParcoursGenerationRecord {
  return {
    trace: readFingerprint(record, 'trace'),
    startSegment: readFingerprint(record, 'startSegment'),
    endSegment: readFingerprint(record, 'endSegment'),
    fiche: readFingerprint(record, 'fiche'),
    meetingPoint: readFingerprint(record, 'meetingPoint'),
  };
}

function readFingerprint(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

/** Whether an error means the file does not exist. */
function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ENOENT'
  );
}

/** The message of an error, for the logs of the scripts. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
