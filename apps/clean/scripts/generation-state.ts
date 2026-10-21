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
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

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

/** Write the generation state, creating its folder when needed. */
export function writeGenerationState(path: string, state: GenerationState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
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
