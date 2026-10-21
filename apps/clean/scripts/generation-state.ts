/**
 * The versioned generation state (ticket #26, spec #21).
 *
 * The state is the memory of the generation pipeline: for every Parcours,
 * the fingerprint of its source trace and of the segments the pipeline
 * produced, plus a version constant covering the routing algorithm and the
 * Fiche template.
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

import type { ParcoursEntry } from './generation-helpers';
import { resolveGpxTracePath, tourPdfPath, writeFileIfChanged } from './generation-helpers';

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
 * Every fingerprint is optional: an absent one means "unknown", and the
 * plan regenerates the artefact rather than trusting the state.
 */
export interface ParcoursGenerationRecord {
  /** Fingerprint of the source trace of the Parcours. */
  readonly trace?: string;
  /** Fingerprint of the produced start segment. */
  readonly startSegment?: string;
  /** Fingerprint of the produced end segment. */
  readonly endSegment?: string;
  /** Fingerprint of the produced Fiche (filled by the Fiche decisions). */
  readonly fiche?: string;
}

/** The generation state, as it is written in the repository. */
export interface GenerationState {
  /** The version constant the state was written with. */
  readonly version: number;
  /** The records of the Parcours, keyed by `<zone>/<parcours>`. */
  readonly parcours: Readonly<Record<string, ParcoursGenerationRecord>>;
}

/** The fingerprints of the files of a Parcours, as found on the disk. */
export interface ParcoursFingerprints {
  /** Fingerprint of the source trace, `undefined` when the file is missing. */
  readonly trace: string | undefined;
  /** Fingerprint of the start segment, `undefined` when the file is missing. */
  readonly startSegment: string | undefined;
  /** Fingerprint of the end segment, `undefined` when the file is missing. */
  readonly endSegment: string | undefined;
  /**
   * Fingerprint of the produced Fiche, `undefined` when the file is
   * missing, empty or unreadable.
   */
  readonly fiche?: string;
}

/** What the pipeline produced for a Parcours during a run. */
export interface ParcoursStateUpdate {
  /** Key of the Parcours (`<zone>/<parcours>`). */
  readonly key: string;
  /**
   * The new record of the Parcours, `undefined` when the run failed: a
   * Parcours that failed is not marked as up to date.
   */
  readonly record?: ParcoursGenerationRecord;
}

/** Key of a Parcours in the state: `<zone>/<parcours>`. */
export function parcoursStateKey(zoneId: string, tourId: string): string {
  return `${zoneId}/${tourId}`;
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
 * The fingerprints of the files of a Parcours, as they are on the disk: its
 * source trace and its two segments.
 */
export function fingerprintParcoursFiles(entry: ParcoursEntry): ParcoursFingerprints {
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
 * Parcours are left untouched.
 */
export function nextGenerationState(
  state: GenerationState | undefined,
  updates: readonly ParcoursStateUpdate[],
): GenerationState {
  const records: Record<string, ParcoursGenerationRecord> = { ...state?.parcours };

  for (const update of updates) {
    if (!update.record) {
      delete records[update.key];
      continue;
    }
    records[update.key] = update.record;
  }

  return { version: GENERATION_STATE_VERSION, parcours: records };
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
  return { ...record, fiche };
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

  return { version: state.version, parcours };
}

/**
 * Read the generation state.
 *
 * `undefined` when the state is missing or unreadable: the pipeline then
 * knows nothing about the artefacts it produced and regenerates them.
 */
export function readGenerationState(path: string): GenerationState | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return undefined;
  }

  if (!isRecord(raw) || typeof raw.version !== 'number') {
    return undefined;
  }

  const parcours: Record<string, ParcoursGenerationRecord> = {};
  if (isRecord(raw.parcours)) {
    for (const [key, value] of Object.entries(raw.parcours)) {
      if (isRecord(value)) {
        parcours[key] = readRecord(value);
      }
    }
  }

  return { version: raw.version, parcours };
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
  };
}

function readFingerprint(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
