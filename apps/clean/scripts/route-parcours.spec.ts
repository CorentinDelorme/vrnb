import { describe, expect, it } from 'vitest';

import { createNetworkScheduler } from './network-scheduler';
import {
  ROUTING_MIN_INTERVAL_MS,
  parcoursSegments,
  profileForParcours,
  routeParcours,
} from './route-parcours';
import { createRouterClient } from './router-client';

import type { SchedulerClock, SchedulerFetch } from './network-scheduler';
import type {
  LonLat,
  ParcoursProfile,
  ParcoursRoute,
  RouteSegment,
  RoutedPath,
} from './route-parcours';

/**
 * Routing of the Parcours (ticket #25, spec #21) — the seam is the public
 * API of `scripts/route-parcours.ts`:
 *
 * - `routeParcours(parcours, options)` → `Promise<ParcoursRoutingResult>`
 *   routes two Parcours at a time, isolates a failing Parcours from the
 *   others and reports the failures;
 * - `profileForParcours(tourId)` gives the routing profile of a Parcours.
 *
 * The router is injected, so the suite never touches the network.
 */

/** The path a fake router answers. */
const ANSWER: RoutedPath = { coords: [[0, 0]], distanceM: 10, source: 'osrm' };

/**
 * Build Parcours whose segments are identified by the index of the Parcours,
 * so a test can tell which Parcours are in flight.
 */
function buildParcours(tourIds: readonly string[]): ParcoursRoute[] {
  return tourIds.map((tourId, index) => ({
    tourId,
    profile: profileForParcours(tourId),
    segments: {
      start: { from: [index, 0], to: [index, 1] },
      end: { from: [index, 2], to: [index, 3] },
    },
  }));
}

/** A router answering after a tick, counting the calls running at the same time. */
function createSlowRouter(): {
  readonly routeSegment: (segment: RouteSegment, profile: ParcoursProfile) => Promise<RoutedPath>;
  /** Highest number of calls running at the same time. */
  readonly maxActive: number;
  /** The Parcours whose segment was called, in call order. */
  readonly called: number[];
} {
  let active = 0;
  let maxActive = 0;
  const called: number[] = [];

  const routeSegment = async (segment: RouteSegment): Promise<RoutedPath> => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    called.push(segment.from[0]);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    active -= 1;
    return ANSWER;
  };

  return {
    routeSegment,
    get maxActive() {
      return maxActive;
    },
    called,
  };
}

describe('routeParcours', () => {
  it('should route two parcours at the same time', async () => {
    const router = createSlowRouter();

    const result = await routeParcours(buildParcours(['V1', 'V2', 'V3', 'V4']), {
      routeSegment: router.routeSegment,
    });

    // A Parcours routes its two segments one after the other, so the number
    // of simultaneous calls is the number of simultaneous Parcours.
    expect(router.maxActive).toBe(2);
    expect(result.routed.map((outcome) => outcome.tourId)).toEqual(['V1', 'V2', 'V3', 'V4']);
  });

  it('should not route three parcours at the same time', async () => {
    const router = createSlowRouter();

    await routeParcours(buildParcours(['V1', 'V2', 'V3', 'V4', 'V5']), {
      routeSegment: router.routeSegment,
    });

    expect(router.maxActive).toBe(2);
  });

  it('should route the other parcours when one of them fails', async () => {
    const routeSegment = async (segment: RouteSegment): Promise<RoutedPath> => {
      if (segment.from[0] === 1) {
        throw new Error('no route from either router');
      }
      return ANSWER;
    };

    const result = await routeParcours(buildParcours(['V1', 'V2', 'V3']), { routeSegment });

    expect(result.routed.map((outcome) => outcome.tourId)).toEqual(['V1', 'V3']);
  });

  it('should report the failed parcours', async () => {
    const routeSegment = async (segment: RouteSegment): Promise<RoutedPath> => {
      if (segment.from[0] === 1) {
        throw new Error('no route from either router');
      }
      return ANSWER;
    };
    const reported: { tourId: string; message: string }[] = [];

    const result = await routeParcours(buildParcours(['V1', 'V2', 'V3']), {
      routeSegment,
      onFailure: (failure) => {
        reported.push({
          tourId: failure.tourId,
          message: failure.error instanceof Error ? failure.error.message : String(failure.error),
        });
      },
    });

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.tourId).toBe('V2');
    expect(reported).toEqual([{ tourId: 'V2', message: 'no route from either router' }]);
  });
});

describe('profileForParcours', () => {
  it('should route a bike parcours as cycling', () => {
    expect(profileForParcours('V1')).toEqual({
      osrm: 'bicycle',
      costing: 'bicycle',
      gpxType: 'cycling',
    });
  });

  it('should route a walking parcours on foot', () => {
    expect(profileForParcours('P3')).toEqual({
      osrm: 'foot',
      costing: 'pedestrian',
      gpxType: 'walking',
    });
  });
});

describe('parcoursSegments', () => {
  it('should link the meeting point to the parcours and back', () => {
    const meetingPoint: LonLat = [-1.747083, 48.024417];
    const endpoints = { start: [-1.7, 48.02] as LonLat, end: [-1.71, 48.03] as LonLat };

    const segments = parcoursSegments(meetingPoint, endpoints);

    expect(segments.start).toEqual({ from: meetingPoint, to: endpoints.start });
    expect(segments.end).toEqual({ from: endpoints.end, to: meetingPoint });
  });
});

describe('routeParcours with the router client', () => {
  /**
   * Virtual clock: the time only moves when the scheduler decides to wait,
   * so the recorded request starts are the times the scheduler planned.
   */
  function createVirtualClock(): SchedulerClock {
    let time = 0;
    return {
      now: () => time,
      sleep: async (ms: number) => {
        const deadline = time + ms;
        await Promise.resolve();
        time = Math.max(time, deadline);
      },
    };
  }

  it('should keep the request rate of each routing server unchanged', async () => {
    const clock = createVirtualClock();
    const starts: { host: string; at: number }[] = [];
    const fetchImpl: SchedulerFetch = async (url: string) => {
      starts.push({ host: new URL(url).host, at: clock.now() });
      return new Response(
        url.includes('valhalla')
          ? JSON.stringify({
              trip: { status: 0, summary: { length: 0.9 }, legs: [{ shape: '_ibe?' }] },
            })
          : JSON.stringify({
              code: 'Ok',
              routes: [{ geometry: { coordinates: [[-1.74, 48.02]] }, distance: 1200 }],
            }),
      );
    };
    const scheduler = createNetworkScheduler({
      clock,
      fetch: fetchImpl,
      minIntervalMs: ROUTING_MIN_INTERVAL_MS,
    });
    const client = createRouterClient({ scheduler });

    await routeParcours(buildParcours(['V1', 'V2']), { routeSegment: client.routeSegment });

    // Two Parcours, two segments each: four requests per server, still one
    // request every 400 ms per server, the rate the pipeline always had.
    const osrmStarts = starts
      .filter((start) => start.host === 'router.project-osrm.org')
      .map((start) => start.at);
    const valhallaStarts = starts
      .filter((start) => start.host === 'valhalla1.openstreetmap.de')
      .map((start) => start.at);

    expect(osrmStarts).toEqual([0, 400, 800, 1200]);
    expect(valhallaStarts).toEqual([0, 400, 800, 1200]);
  });
});
