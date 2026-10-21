/**
 * Routing of the Parcours — the pure orchestration of the start and end
 * segments (ticket #25, spec #21).
 *
 * The routing script used to route one Parcours at a time: the 47 Parcours
 * of the association were routed one after the other, for several minutes,
 * though the result is always the same. Two Parcours are now routed at the
 * same time, which halves the wall time of a run without asking the
 * routing servers for more: the requests still go through the network
 * scheduler (ticket #24), which keeps one request every 400 ms per host.
 *
 * This module owns the decisions of a routing run: how many Parcours are
 * routed at the same time, which segments are routed, in which order, and
 * what happens when a router fails. The network itself lives in
 * `router-client.ts`, and the GPX traces in `segment-gpx.ts`.
 *
 * Pure module: no import-time side effect, no `process.exit`, no console
 * output. The router is injected, so the unit suite checks the behaviour
 * without touching the network.
 */

/** A coordinate pair, `[longitude, latitude]`. */
export type LonLat = [number, number];

/** The router that answered a segment. */
export type RouterSource = 'osrm' | 'valhalla';

/** A routed path, as reported by a router. */
export interface RoutedPath {
  /** The points of the path, from the start to the end of the segment. */
  readonly coords: LonLat[];
  /** The distance of the path, in meters, as reported by the router. */
  readonly distanceM: number;
  /** The router that answered. */
  readonly source: RouterSource;
}

/** The routing profile of a Parcours, from its practice type. */
export interface ParcoursProfile {
  /** The OSRM profile: `bicycle` for the bike Parcours, `foot` for the walking ones. */
  readonly osrm: 'bicycle' | 'foot';
  /** The Valhalla costing model. */
  readonly costing: 'bicycle' | 'pedestrian';
  /** The `<type>` of the GPX trace: `cycling` or `walking`. */
  readonly gpxType: 'cycling' | 'walking';
}

/** A segment to route: the two points to link. */
export interface RouteSegment {
  /** The first point of the segment. */
  readonly from: LonLat;
  /** The second point of the segment. */
  readonly to: LonLat;
}

/** The two segments of a Parcours. */
export interface ParcoursSegments {
  /** From the Point de rendez-vous to the beginning of the Parcours. */
  readonly start: RouteSegment;
  /** From the end of the Parcours back to the Point de rendez-vous. */
  readonly end: RouteSegment;
}

/** A Parcours to route. */
export interface ParcoursRoute {
  /** Id of the Parcours (`V1`, `P13`). */
  readonly tourId: string;
  /** The routing profile of the Parcours. */
  readonly profile: ParcoursProfile;
  /** The two segments to route. */
  readonly segments: ParcoursSegments;
}

/** A Parcours that was routed. */
export interface ParcoursRoutingOutcome {
  /** Id of the Parcours. */
  readonly tourId: string;
  /** The routing profile of the Parcours. */
  readonly profile: ParcoursProfile;
  /** The path of the start segment. */
  readonly start: RoutedPath;
  /** The path of the end segment. */
  readonly end: RoutedPath;
}

/** A Parcours that could not be routed. */
export interface ParcoursRoutingFailure {
  /** Id of the Parcours. */
  readonly tourId: string;
  /** Why the Parcours failed. */
  readonly error: unknown;
}

/** The result of a routing run. */
export interface ParcoursRoutingResult {
  /** The Parcours that were routed, in the order of the run. */
  readonly routed: readonly ParcoursRoutingOutcome[];
  /** The Parcours that failed, in the order of the run. */
  readonly failures: readonly ParcoursRoutingFailure[];
}

/** Options of a routing run. */
export interface RouteParcoursOptions {
  /**
   * Route one segment: resolves with the path of the segment, rejects when
   * no router answered.
   */
  readonly routeSegment: (segment: RouteSegment, profile: ParcoursProfile) => Promise<RoutedPath>;
  /** How many Parcours are routed at the same time. */
  readonly concurrency?: number;
  /** Called when a Parcours was routed. */
  readonly onRouted?: (outcome: ParcoursRoutingOutcome) => void;
  /** Called when a Parcours failed. */
  readonly onFailure?: (failure: ParcoursRoutingFailure) => void;
}

/**
 * Number of Parcours routed at the same time.
 *
 * The routing servers are the bottleneck of a run, not the local work: two
 * Parcours in flight halve the wall time of the run while the scheduler
 * keeps the request rate of each server unchanged. Three would not gain
 * much more, and would ask the servers for more simultaneous connections.
 */
export const PARCOURS_ROUTING_CONCURRENCY = 2;

/**
 * Minimum delay between two requests to the same routing server, in
 * milliseconds: the rate the pipeline has always had (one request every
 * 400 ms per server).
 */
export const ROUTING_MIN_INTERVAL_MS = 400;

/**
 * The routing profile of a Parcours, from its practice type: the bike
 * Parcours are routed as cycling, the walking ones on foot.
 */
export function profileForParcours(tourId: string): ParcoursProfile {
  return tourId.startsWith('V')
    ? { osrm: 'bicycle', costing: 'bicycle', gpxType: 'cycling' }
    : { osrm: 'foot', costing: 'pedestrian', gpxType: 'walking' };
}

/**
 * The two segments of a Parcours: from the Point de rendez-vous to the
 * beginning of the Parcours, and from its end back to the Point de
 * rendez-vous.
 */
export function parcoursSegments(
  meetingPoint: LonLat,
  endpoints: { readonly start: LonLat; readonly end: LonLat },
): ParcoursSegments {
  return {
    start: { from: meetingPoint, to: endpoints.start },
    end: { from: endpoints.end, to: meetingPoint },
  };
}

/**
 * Route the Parcours, two at a time.
 *
 * A Parcours that fails does not stop the others: the failure is reported
 * and the run goes on with the next Parcours.
 */
export async function routeParcours(
  parcours: readonly ParcoursRoute[],
  options: RouteParcoursOptions,
): Promise<ParcoursRoutingResult> {
  const concurrency = Math.max(1, options.concurrency ?? PARCOURS_ROUTING_CONCURRENCY);
  const routed: (ParcoursRoutingOutcome | undefined)[] = new Array(parcours.length);
  const failures: (ParcoursRoutingFailure | undefined)[] = new Array(parcours.length);
  let next = 0;

  const run = async (): Promise<void> => {
    while (next < parcours.length) {
      const index = next;
      next += 1;
      const target = parcours[index];
      try {
        const start = await options.routeSegment(target.segments.start, target.profile);
        const end = await options.routeSegment(target.segments.end, target.profile);
        const outcome: ParcoursRoutingOutcome = {
          tourId: target.tourId,
          profile: target.profile,
          start,
          end,
        };
        options.onRouted?.(outcome);
        routed[index] = outcome;
      } catch (error) {
        const failure: ParcoursRoutingFailure = { tourId: target.tourId, error };
        failures[index] = failure;
        options.onFailure?.(failure);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, parcours.length) }, () => run()));

  return {
    routed: routed.filter((outcome): outcome is ParcoursRoutingOutcome => outcome !== undefined),
    failures: failures.filter(
      (failure): failure is ParcoursRoutingFailure => failure !== undefined,
    ),
  };
}
