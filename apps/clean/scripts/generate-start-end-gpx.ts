import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { getZone } from '../src/app/zones';
import { createNetworkScheduler } from './network-scheduler';
import { createRouterClient } from './router-client';
import { buildSegmentGpx } from './segment-gpx';

import type { ParcoursEntry } from './generation-helpers';
import {
  errorMessage,
  gpxRootDir,
  listParcours,
  parseForceFlag,
  parseGenerationFilters,
  perfReportPath,
  writeFileIfChanged,
  writePerfReport,
} from './generation-helpers';
import type { PerfRecorder } from './generation-perf';
import {
  buildPerfReport,
  countersFromDecisions,
  createPerfRecorder,
  formatPerfReport,
} from './generation-perf';
import type { GenerationPlan, ParcoursDecision, PlanCandidate } from './generation-plan';
import { planGeneration } from './generation-plan';
import type { ParcoursStateUpdate } from './generation-state';
import {
  GENERATION_STATE_VERSION,
  fingerprintParcoursFiles,
  generationStatePath,
  meetingPointFingerprint,
  nextGenerationState,
  parcoursStateKey,
} from './generation-state';
import { readGenerationStateOrWarn, writeGenerationStateOrFail } from './generation-steps';
import type { LonLat, ParcoursRoute } from './route-parcours';
import {
  PARCOURS_ROUTING_CONCURRENCY,
  ROUTING_MIN_INTERVAL_MS,
  parcoursSegments,
  profileForParcours,
  routeParcours,
} from './route-parcours';

const rootDir = join(import.meta.dirname, '..');

/** Name of the script, as the `[perf]` block of the run shows it. */
const SCRIPT_NAME = 'generate-start-end-gpx';

/**
 * Maximum number of simultaneous requests to a routing server: two, like
 * the tile server.
 */
const MAX_CONCURRENT_REQUESTS_PER_HOST = 2;

function getTourEndpoints(entry: ParcoursEntry): { start: LonLat; end: LonLat } | undefined {
  const gpxPath = entry.tracePath;
  if (!existsSync(gpxPath)) {
    return undefined;
  }

  const content = readFileSync(gpxPath, 'utf-8');
  const parsedGpx = new DOMParser().parseFromString(content, 'application/xml');
  const geoJson = gpx(parsedGpx);
  const feature = geoJson.features[0];

  if (!feature || feature.geometry.type !== 'LineString') {
    return undefined;
  }

  const coords = feature.geometry.coordinates;
  if (coords.length === 0) {
    return undefined;
  }

  const first = coords[0];
  const last = coords[coords.length - 1];
  return { start: [first[0], first[1]], end: [last[0], last[1]] };
}

/**
 * The fingerprints of the Point de rendez-vous of the Zones of the run.
 *
 * The segments of a Parcours start and end at the Point de rendez-vous of
 * its Zone: a Point de rendez-vous that changed invalidates them. The
 * fingerprint is the sha256 of the name and of the coordinates of the
 * Point de rendez-vous.
 */
function meetingPointFingerprintsOf(zoneIds: readonly string[]): Map<string, string> {
  const fingerprints = new Map<string, string>();

  for (const zoneId of zoneIds) {
    fingerprints.set(zoneId, meetingPointFingerprint(getZone(zoneId).meetingPoint));
  }

  return fingerprints;
}

/** The fingerprints of the files of a Parcours, as they are on the disk. */
function toCandidate(entry: ParcoursEntry, meetingPoint: string | undefined): PlanCandidate {
  return {
    zoneId: entry.zoneId,
    tourId: entry.tourId,
    fingerprints: { ...fingerprintParcoursFiles(entry), fiche: undefined },
    meetingPoint,
  };
}

/** The key of a Parcours in the generation state. */
function keyOf(decision: ParcoursDecision): string {
  return parcoursStateKey(decision.zoneId, decision.tourId);
}

async function main(): Promise<void> {
  const perf = createPerfRecorder();
  /** The plan of the run, `undefined` when the run failed before it. */
  let plan: GenerationPlan | undefined;
  /** The Parcours that were routed. */
  const routed = new Set<string>();

  try {
    const filters = parseGenerationFilters(process.argv);
    const force = parseForceFlag(process.argv);
    const gpxRoot = gpxRootDir(rootDir);
    if (!existsSync(gpxRoot)) {
      throw new Error(`GPX directory not found: ${gpxRoot}`);
    }

    const inventory = listParcours(rootDir);
    const entries = new Map(
      inventory.parcours.map((entry) => [parcoursStateKey(entry.zoneId, entry.tourId), entry]),
    );

    const statePath = generationStatePath(rootDir);
    const state = readGenerationStateOrWarn(statePath);
    const meetingPoints = meetingPointFingerprintsOf(
      inventory.parcours.map((entry) => entry.zoneId),
    );

    // The plan decides what the run must route: the Parcours whose source
    // trace changed, the Parcours whose Point de rendez-vous changed, and
    // only them.
    plan = planGeneration({
      state,
      currentVersion: GENERATION_STATE_VERSION,
      candidates: inventory.parcours.map((entry) =>
        toCandidate(entry, meetingPoints.get(entry.zoneId)),
      ),
      filters,
      force,
    });

    if (plan.decisions.length === 0) {
      throw new Error('No tours found to process.');
    }

    const toRoute = plan.decisions.filter((decision) => decision.rerouteSegments);
    for (const decision of plan.decisions) {
      if (!decision.rerouteSegments) {
        console.log(`skip ${decision.tourId} (${decision.reason})`);
      }
    }

    if (toRoute.length === 0) {
      console.log('Nothing to route: every Parcours of the run is up to date.');
      return;
    }

    const toRouteKeys = new Set(toRoute.map(keyOf));

    /**
     * The scheduler every routing request goes through: one request every
     * 400 ms and two at a time per server, the rate and the load the
     * pipeline has always had.
     */
    const scheduler = createNetworkScheduler({
      minIntervalMs: ROUTING_MIN_INTERVAL_MS,
      maxConcurrentPerHost: MAX_CONCURRENT_REQUESTS_PER_HOST,
    });

    /** The routing servers: OSRM and Valhalla, asked at the same time. */
    const routerClient = createRouterClient({ scheduler });

    let failures = 0;
    /** The Parcours that failed. */
    const failed = new Set<string>();

    for (const zone of inventory.zones) {
      const zoneId = zone.zoneId;
      const zoneEntries = zone.parcours.filter((entry) =>
        toRouteKeys.has(parcoursStateKey(entry.zoneId, entry.tourId)),
      );
      if (zoneEntries.length === 0) {
        continue;
      }

      const meetingPoint = getZone(zoneId).meetingPoint;
      const meetingCoords: LonLat = [meetingPoint.coordinates[0], meetingPoint.coordinates[1]];

      console.log(
        `Zone ${zoneId} — meeting point: ${meetingPoint.name} (${meetingCoords[1]}, ${meetingCoords[0]})`,
      );
      console.log(`Generating start/end GPX for ${zoneEntries.length} tours...`);

      await perf.measure(zoneId, async () => {
        // The Parcours whose trace cannot be read are reported right away; the
        // other ones are routed two at a time.
        const parcours: ParcoursRoute[] = [];
        for (const entry of zoneEntries) {
          const endpoints = getTourEndpoints(entry);
          if (!endpoints) {
            failures += 1;
            failed.add(parcoursStateKey(entry.zoneId, entry.tourId));
            console.error(
              `fail ${entry.tourId}: cannot read endpoints from ${entry.tourId}/${entry.tourId}.gpx`,
            );
            continue;
          }
          parcours.push({
            tourId: entry.tourId,
            profile: profileForParcours(entry.tourId),
            segments: parcoursSegments(meetingCoords, endpoints),
          });
        }

        await routeParcours(parcours, {
          routeSegment: routerClient.routeSegment,
          concurrency: PARCOURS_ROUTING_CONCURRENCY,
          onRouted: (outcome) => {
            const entry = zoneEntries.find((candidate) => candidate.tourId === outcome.tourId);
            if (!entry) {
              throw new Error(`Unknown parcours: ${outcome.tourId}`);
            }
            try {
              writeFileIfChanged(
                entry.startSegmentPath,
                buildSegmentGpx(
                  `${meetingPoint.name} vers le parcours ${outcome.tourId}`,
                  outcome.profile.gpxType,
                  outcome.start.coords,
                  outcome.start.source,
                ),
              );
              writeFileIfChanged(
                entry.endSegmentPath,
                buildSegmentGpx(
                  `Fin du parcours ${outcome.tourId} vers ${meetingPoint.name}`,
                  outcome.profile.gpxType,
                  outcome.end.coords,
                  outcome.end.source,
                ),
              );
            } catch (error) {
              throw new Error(
                `cannot write the segments of ${outcome.tourId}: ${errorMessage(error)}`,
              );
            }
            routed.add(parcoursStateKey(entry.zoneId, entry.tourId));
            console.log(
              `ok ${outcome.tourId} (${outcome.profile.osrm}): start ${outcome.start.coords.length} pts` +
                ` ${Math.round(outcome.start.distanceM)}m [${outcome.start.source}],` +
                ` end ${outcome.end.coords.length} pts` +
                ` ${Math.round(outcome.end.distanceM)}m [${outcome.end.source}]`,
            );
          },
          onFailure: (failure) => {
            failures += 1;
            failed.add(parcoursStateKey(zoneId, failure.tourId));
            console.error(
              `fail ${failure.tourId}: ${failure.error instanceof Error ? failure.error.message : failure.error}`,
            );
          },
        });
      });
    }

    // The state remembers what the pipeline produced: a Parcours that was
    // routed is up to date, a Parcours that failed is dropped, so the next
    // run routes it again.
    writeGenerationStateOrFail(
      statePath,
      nextGenerationState(state, stateUpdates(entries, toRoute, routed, failed, meetingPoints)),
    );

    if (failures > 0) {
      throw new Error(`${failures} tour(s) failed.`);
    }

    console.log('Done. Run `bun run generate:tours` to refresh distances.');
  } finally {
    reportRun(perf, plan, routed);
  }
}

/**
 * Show the `[perf]` block of the run: how long it took, how long each Zone
 * took, and how many Parcours were routed again.
 *
 * The routing step reads no tile: the tile counters of a run are the ones
 * of the Fiche step.
 */
function reportRun(
  perf: PerfRecorder,
  plan: GenerationPlan | undefined,
  routed: ReadonlySet<string>,
): void {
  const report = buildPerfReport({
    script: SCRIPT_NAME,
    totalMs: perf.totalMs(),
    steps: perf.steps,
    tiles: { fromCache: 0, downloaded: 0 },
    parcours: plan
      ? countersFromDecisions(
          plan.decisions,
          (decision) =>
            decision.rerouteSegments &&
            routed.has(parcoursStateKey(decision.zoneId, decision.tourId)),
        )
      : { regenerated: [], skipped: [] },
  });

  console.log(formatPerfReport(report).join('\n'));
  writePerfReport(perfReportPath(rootDir, SCRIPT_NAME), report);
}

/**
 * The updates the state of the next run holds: the Parcours that were
 * routed get their new fingerprints, the Parcours that failed get none.
 *
 * A Parcours that was routed has no Fiche fingerprint anymore: its Fiche
 * was rendered from the previous segments, so it is out of date and the
 * Fiche step renders it again. The fingerprint of the Point de rendez-vous
 * is recorded: the Parcours was routed from it.
 */
function stateUpdates(
  entries: ReadonlyMap<string, ParcoursEntry>,
  toRoute: readonly ParcoursDecision[],
  routed: ReadonlySet<string>,
  failed: ReadonlySet<string>,
  meetingPoints: ReadonlyMap<string, string>,
): ParcoursStateUpdate[] {
  return toRoute.map((decision) => {
    const key = keyOf(decision);
    const entry = entries.get(key);
    if (failed.has(key) || !routed.has(key) || !entry) {
      return { key, record: undefined };
    }
    return {
      key,
      record: {
        ...fingerprintParcoursFiles(entry),
        fiche: undefined,
        meetingPoint: meetingPoints.get(entry.zoneId),
      },
    };
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
