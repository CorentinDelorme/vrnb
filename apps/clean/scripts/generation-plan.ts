/**
 * The generation plan (ticket #26, spec #21).
 *
 * The plan is the pure decision of what a generation run must regenerate:
 * for every Parcours of the run, whether its start and end segments have
 * to be routed again, and why.
 *
 * It never touches the network, nor the filesystem: the fingerprints of
 * the files are computed by the caller and passed in, so the plan is
 * checked by the unit suite with fake inputs.
 *
 * The rules it applies:
 *
 * - a Parcours is re-routed when the state does not know it, when the
 *   version constant changed, when its source trace changed, when its
 *   segments are missing from the disk or from the state, or when the run
 *   is forced;
 * - a Parcours that is up to date is left alone: its segments are not
 *   routed again and its trace is not touched.
 *
 * The decisions of the Fiche (ticket #27) will join this module: the
 * record of a decision already carries what a Fiche decision needs.
 */

import type { GenerationFilters } from './generation-helpers';
import { matchesFilters } from './generation-helpers';
import type { GenerationState } from './generation-state';
import { parcoursStateKey } from './generation-state';

/** Why the plan decided what it decided for a Parcours. */
export type GenerationReason =
  /** The run was forced: everything the filters select is regenerated. */
  | 'forced'
  /** The generation state is missing or unreadable. */
  | 'no-state'
  /** The version constant changed: every artefact is outdated. */
  | 'version-changed'
  /** The state knows nothing about this Parcours. */
  | 'no-state-entry'
  /** The source trace of the Parcours changed. */
  | 'trace-changed'
  /** The source trace of the Parcours is missing on disk. */
  | 'missing-trace'
  /** The start or end segment is missing from the disk or from the state. */
  | 'missing-segments'
  /** The Parcours is up to date: nothing to regenerate. */
  | 'unchanged';

/** The fingerprints of the files of a Parcours, as found on the disk. */
export interface ParcoursFingerprints {
  /** Fingerprint of the source trace, `undefined` when the file is missing. */
  readonly trace: string | undefined;
  /** Fingerprint of the start segment, `undefined` when the file is missing. */
  readonly startSegment: string | undefined;
  /** Fingerprint of the end segment, `undefined` when the file is missing. */
  readonly endSegment: string | undefined;
}

/** A Parcours of the run, with the fingerprints of its files. */
export interface PlanCandidate {
  /** Zone of the Parcours. */
  readonly zoneId: string;
  /** Id of the Parcours (`V1`, `P13`). */
  readonly tourId: string;
  /** Fingerprints of the files of the Parcours. */
  readonly fingerprints: ParcoursFingerprints;
}

/** The inputs of a generation plan. */
export interface PlanGenerationInput {
  /** The generation state, `undefined` when it is missing or unreadable. */
  readonly state: GenerationState | undefined;
  /** The current version constant of the state. */
  readonly currentVersion: number;
  /** The Parcours of the run, with the fingerprints of their files. */
  readonly candidates: readonly PlanCandidate[];
  /** The `--tour` and `--zone` filters of the run. */
  readonly filters?: GenerationFilters;
  /** Whether the run is forced. */
  readonly force?: boolean;
}

/** What the plan decided for one Parcours. */
export interface ParcoursDecision {
  /** Zone of the Parcours. */
  readonly zoneId: string;
  /** Id of the Parcours (`V1`, `P13`). */
  readonly tourId: string;
  /** Whether the start and end segments must be routed again. */
  readonly rerouteSegments: boolean;
  /** Why the plan decided this. */
  readonly reason: GenerationReason;
}

/** The decisions of a generation run. */
export interface GenerationPlan {
  /** One decision per Parcours of the run, in the order of the run. */
  readonly decisions: readonly ParcoursDecision[];
}

/**
 * Decide what a generation run must regenerate.
 *
 * The Parcours the filters leave out get no decision at all: they are not
 * part of the run.
 */
export function planGeneration(input: PlanGenerationInput): GenerationPlan {
  const candidates = input.candidates.filter((candidate) =>
    matchesFilters(input.filters, candidate.zoneId, candidate.tourId),
  );

  return {
    decisions: candidates.map((candidate) =>
      decideParcours(candidate, input.state, input.currentVersion, input.force ?? false),
    ),
  };
}

function decideParcours(
  candidate: PlanCandidate,
  state: GenerationState | undefined,
  currentVersion: number,
  force: boolean,
): ParcoursDecision {
  const decision = (rerouteSegments: boolean, reason: GenerationReason): ParcoursDecision => ({
    zoneId: candidate.zoneId,
    tourId: candidate.tourId,
    rerouteSegments,
    reason,
  });

  if (force) {
    return decision(true, 'forced');
  }
  if (!state) {
    return decision(true, 'no-state');
  }
  if (state.version !== currentVersion) {
    return decision(true, 'version-changed');
  }

  const record = state.parcours[parcoursStateKey(candidate.zoneId, candidate.tourId)];
  if (!record) {
    return decision(true, 'no-state-entry');
  }
  if (!candidate.fingerprints.trace) {
    return decision(true, 'missing-trace');
  }
  if (record.trace !== candidate.fingerprints.trace) {
    return decision(true, 'trace-changed');
  }
  if (
    !record.startSegment ||
    !record.endSegment ||
    !candidate.fingerprints.startSegment ||
    !candidate.fingerprints.endSegment
  ) {
    return decision(true, 'missing-segments');
  }

  return decision(false, 'unchanged');
}
