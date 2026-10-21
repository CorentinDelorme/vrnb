/**
 * The generation plan (tickets #26 and #27, spec #21).
 *
 * The plan is the pure decision of what a generation run must regenerate:
 * for every Parcours of the run, whether its start and end segments have
 * to be routed again and whether its Fiche has to be rendered again, and
 * for every Zone of the run, whether its overview map (the « Fiche de
 * zone ») has to be rendered again.
 *
 * It never touches the network, nor the filesystem: the fingerprints of
 * the files are computed by the caller and passed in, so the plan is
 * checked by the unit suite with fake inputs.
 *
 * The rules it applies:
 *
 * - a Parcours is re-routed when the state does not know it, when the
 *   version constant changed, when its source trace changed, when the
 *   Point de rendez-vous of its Zone changed, when its segments are
 *   missing from the disk or from the state, or when the run is forced;
 * - the Fiche of a Parcours is rendered again when the Parcours changed
 *   (its trace or its segments changed, so its segments are routed
 *   again), when the Fiche file is missing, empty or unreadable, when the
 *   state records no Fiche fingerprint, when the Fiche on the disk
 *   differs from the one the state recorded, or when the run is forced;
 * - the overview map of a Zone is rendered again when one of its Parcours
 *   is not up to date (its trace or its segments changed, or its Fiche
 *   must be rendered again), when the map file is missing, empty or
 *   unreadable, when the state records no fingerprint for it (it was
 *   never rendered, or the last render failed), when the map on the disk
 *   differs from the one the state recorded, or when the run is forced;
 * - a Parcours that is up to date is left alone: its segments are not
 *   routed again, its Fiche is not rendered again and its trace is not
 *   touched.
 *
 * Every decision carries the reason it was taken: the run tells what it
 * regenerated and what it left alone, and why.
 */

import type { GenerationFilters, PracticeType } from './generation-helpers';
import { matchesFilters, practiceTypeOf } from './generation-helpers';
import type {
  GenerationState,
  ParcoursFingerprints,
  ParcoursGenerationRecord,
} from './generation-state';
import { parcoursStateKey, zoneMapKey } from './generation-state';

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
  /** The Point de rendez-vous of the Zone changed: the segments are outdated. */
  | 'meeting-point-changed'
  /** The start or end segment is missing from the disk or from the state. */
  | 'missing-segments'
  /** The Parcours is up to date: nothing to regenerate. */
  | 'unchanged';

/** Why the plan decided to render the Fiche of a Parcours again. */
export type FicheReason =
  /** The run was forced: every Fiche of the selection is rendered. */
  | 'forced'
  /** The Parcours changed: its trace or its segments changed. */
  | 'parcours-changed'
  /** The Fiche is missing, empty or unreadable on disk. */
  | 'missing-fiche'
  /** The state records no Fiche fingerprint for the Parcours. */
  | 'no-fiche-state'
  /** The Fiche on the disk differs from the one the state recorded. */
  | 'fiche-changed'
  /** The Fiche is up to date: nothing to render. */
  | 'up-to-date';

/** Why the plan decided to render the overview map of a Zone again. */
export type ZoneReason =
  /** The run was forced: every overview map of the selection is rendered. */
  | 'forced'
  /** At least one Parcours of the Zone is not up to date. */
  | 'parcours-changed'
  /** The overview map is missing, empty or unreadable on disk. */
  | 'missing-zone-map'
  /** The state records no fingerprint for the overview map. */
  | 'no-zone-map-state'
  /** The overview map on the disk differs from the one the state recorded. */
  | 'zone-map-changed'
  /** The overview map is up to date: nothing to render. */
  | 'up-to-date';

/** The fingerprints of the files of a Parcours, as found on the disk. */
export type { ParcoursFingerprints } from './generation-state';

/** A Parcours of the run, with the fingerprints of its files. */
export interface PlanCandidate {
  /** Zone of the Parcours. */
  readonly zoneId: string;
  /** Id of the Parcours (`V1`, `P13`). */
  readonly tourId: string;
  /** Fingerprints of the files of the Parcours. */
  readonly fingerprints: ParcoursFingerprints;
  /**
   * Fingerprint of the Point de rendez-vous of the Zone of the Parcours,
   * `undefined` when the pipeline does not know it.
   */
  readonly meetingPoint: string | undefined;
}

/** The inputs of a generation plan. */
export interface PlanGenerationInput {
  /** The generation state, `undefined` when it is missing or unreadable. */
  readonly state: GenerationState | undefined;
  /** The current version constant of the state. */
  readonly currentVersion: number;
  /** The Parcours of the run, with the fingerprints of their files. */
  readonly candidates: readonly PlanCandidate[];
  /**
   * The fingerprints of the overview maps of the Zones, keyed by
   * `zoneMapKey`. A map that is missing, empty or unreadable has no
   * fingerprint.
   */
  readonly zoneMapFingerprints?: Readonly<Record<string, string | undefined>>;
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
  /** Whether the Fiche must be rendered again. */
  readonly regenerateFiche: boolean;
  /** Why the plan decided this. */
  readonly ficheReason: FicheReason;
}

/** What the plan decided for the overview map of one Zone. */
export interface ZoneDecision {
  /** Zone of the overview map. */
  readonly zoneId: string;
  /** Practice type of the overview map: `V` (bike) or `P` (walk). */
  readonly kind: PracticeType;
  /** Whether the overview map must be rendered again. */
  readonly regenerateZoneMap: boolean;
  /** Why the plan decided this. */
  readonly reason: ZoneReason;
}

/** The decisions of a generation run. */
export interface GenerationPlan {
  /** One decision per Parcours of the run, in the order of the run. */
  readonly decisions: readonly ParcoursDecision[];
  /** One decision per overview map of the run, in the order of the run. */
  readonly zoneDecisions: readonly ZoneDecision[];
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

  const decisions = candidates.map((candidate) =>
    decideParcours(candidate, input.state, input.currentVersion, input.force ?? false),
  );

  return {
    decisions,
    zoneDecisions: decideZoneMaps(
      decisions,
      input.state,
      input.zoneMapFingerprints ?? {},
      input.force ?? false,
    ),
  };
}

function decideParcours(
  candidate: PlanCandidate,
  state: GenerationState | undefined,
  currentVersion: number,
  force: boolean,
): ParcoursDecision {
  const routing = decideRouting(candidate, state, currentVersion, force);
  const fiche = decideFiche(candidate, routing, state, force);

  return {
    zoneId: candidate.zoneId,
    tourId: candidate.tourId,
    ...routing,
    ...fiche,
  };
}

/** Whether the segments of the Parcours must be routed again, and why. */
function decideRouting(
  candidate: PlanCandidate,
  state: GenerationState | undefined,
  currentVersion: number,
  force: boolean,
): { readonly rerouteSegments: boolean; readonly reason: GenerationReason } {
  if (force) {
    return { rerouteSegments: true, reason: 'forced' };
  }
  if (!state) {
    return { rerouteSegments: true, reason: 'no-state' };
  }
  if (state.version !== currentVersion) {
    return { rerouteSegments: true, reason: 'version-changed' };
  }

  const record = state.parcours[parcoursStateKey(candidate.zoneId, candidate.tourId)];
  if (!record) {
    return { rerouteSegments: true, reason: 'no-state-entry' };
  }
  if (!candidate.fingerprints.trace) {
    return { rerouteSegments: true, reason: 'missing-trace' };
  }
  if (record.trace !== candidate.fingerprints.trace) {
    return { rerouteSegments: true, reason: 'trace-changed' };
  }
  // The segments start and end at the Point de rendez-vous of the Zone: a
  // Point de rendez-vous that changed invalidates them.
  if (candidate.meetingPoint !== undefined && record.meetingPoint !== candidate.meetingPoint) {
    return { rerouteSegments: true, reason: 'meeting-point-changed' };
  }
  if (
    !record.startSegment ||
    !record.endSegment ||
    !candidate.fingerprints.startSegment ||
    !candidate.fingerprints.endSegment
  ) {
    return { rerouteSegments: true, reason: 'missing-segments' };
  }

  return { rerouteSegments: false, reason: 'unchanged' };
}

/** Whether the Fiche of the Parcours must be rendered again, and why. */
function decideFiche(
  candidate: PlanCandidate,
  routing: { readonly rerouteSegments: boolean },
  state: GenerationState | undefined,
  force: boolean,
): { readonly regenerateFiche: boolean; readonly ficheReason: FicheReason } {
  if (force) {
    return { regenerateFiche: true, ficheReason: 'forced' };
  }
  // The Fiche shows the trace and the two segments: a Parcours whose
  // segments are routed again has a Fiche that is out of date.
  if (routing.rerouteSegments) {
    return { regenerateFiche: true, ficheReason: 'parcours-changed' };
  }

  const record = state?.parcours[parcoursStateKey(candidate.zoneId, candidate.tourId)];
  if (record && segmentsChanged(record, candidate.fingerprints)) {
    return { regenerateFiche: true, ficheReason: 'parcours-changed' };
  }
  if (!candidate.fingerprints.fiche) {
    return { regenerateFiche: true, ficheReason: 'missing-fiche' };
  }
  if (!record?.fiche) {
    return { regenerateFiche: true, ficheReason: 'no-fiche-state' };
  }
  if (record.fiche !== candidate.fingerprints.fiche) {
    return { regenerateFiche: true, ficheReason: 'fiche-changed' };
  }

  return { regenerateFiche: false, ficheReason: 'up-to-date' };
}

/**
 * Whether the segments of the Parcours changed since the state recorded
 * them.
 *
 * The routing decision only compares the trace: a segment written by hand,
 * or by a run that failed before it could record it, leaves a Fiche that
 * is out of date.
 */
function segmentsChanged(
  record: ParcoursGenerationRecord,
  fingerprints: ParcoursFingerprints,
): boolean {
  return (
    record.startSegment !== fingerprints.startSegment ||
    record.endSegment !== fingerprints.endSegment
  );
}

/** The Zone of the run, with the practice types it holds. */
interface ZoneOfRun {
  readonly zoneId: string;
  readonly kind: PracticeType;
  /** Whether one of the Parcours of the Zone is not up to date. */
  changed: boolean;
}

/**
 * Decide the overview maps of the run: one per Zone and practice type
 * the run holds.
 *
 * Only the Zones of the run are considered: a Zone the filters leave out
 * is not part of the run.
 */
function decideZoneMaps(
  decisions: readonly ParcoursDecision[],
  state: GenerationState | undefined,
  zoneMapFingerprints: Readonly<Record<string, string | undefined>>,
  force: boolean,
): ZoneDecision[] {
  const zones = new Map<string, ZoneOfRun>();

  for (const decision of decisions) {
    const kind = practiceTypeOf(decision.tourId);
    const key = zoneMapKey(decision.zoneId, kind);
    const zone = zones.get(key);
    if (zone) {
      zone.changed = zone.changed || decision.rerouteSegments || decision.regenerateFiche;
      continue;
    }
    zones.set(key, {
      zoneId: decision.zoneId,
      kind,
      changed: decision.rerouteSegments || decision.regenerateFiche,
    });
  }

  return [...zones.values()]
    .sort((a, b) => a.zoneId.localeCompare(b.zoneId) || compareKinds(a.kind, b.kind))
    .map((zone) => decideZoneMap(zone, state, zoneMapFingerprints, force));
}

function decideZoneMap(
  zone: ZoneOfRun,
  state: GenerationState | undefined,
  zoneMapFingerprints: Readonly<Record<string, string | undefined>>,
  force: boolean,
): ZoneDecision {
  const decision = (regenerateZoneMap: boolean, reason: ZoneReason): ZoneDecision => ({
    zoneId: zone.zoneId,
    kind: zone.kind,
    regenerateZoneMap,
    reason,
  });

  const key = zoneMapKey(zone.zoneId, zone.kind);
  const onDisk = zoneMapFingerprints[key];
  const recorded = state?.zoneMaps[key];

  if (force) {
    return decision(true, 'forced');
  }
  if (zone.changed) {
    return decision(true, 'parcours-changed');
  }
  if (!onDisk) {
    return decision(true, 'missing-zone-map');
  }
  // The state knows no fingerprint for the map: it was never rendered, or
  // the last render failed. The map must be rendered again.
  if (!recorded) {
    return decision(true, 'no-zone-map-state');
  }
  if (recorded !== onDisk) {
    return decision(true, 'zone-map-changed');
  }

  return decision(false, 'up-to-date');
}

/** The overview maps of a Zone, the bike one first, like the zone packs. */
function compareKinds(a: PracticeType, b: PracticeType): number {
  if (a === b) {
    return 0;
  }
  return a === 'V' ? -1 : 1;
}
