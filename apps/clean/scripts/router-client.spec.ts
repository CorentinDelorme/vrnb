import { describe, expect, it } from 'vitest';

import { createNetworkScheduler } from './network-scheduler';
import { createRouterClient } from './router-client';

import type { SchedulerClock, SchedulerFetch } from './network-scheduler';
import type { ParcoursProfile, RouteSegment } from './route-parcours';

/**
 * Router client (ticket #25, spec #21) — the seam is the public API of
 * `scripts/router-client.ts`:
 *
 * - `createRouterClient(options)` → `RouterClient`
 *   - `routeSegment(segment, profile)` → `Promise<RoutedPath>` queries OSRM
 *     and Valhalla at the same time for the same segment and keeps the
 *     shortest path.
 *
 * The requests go through the real scheduler, with an injected clock and an
 * injected fetch: the suite never touches the network.
 */

/** A segment to route: the Point de rendez-vous and the start of a Parcours. */
const SEGMENT: RouteSegment = {
  from: [-1.747083, 48.024417],
  to: [-1.73, 48.02],
};

/** The routing profile of a bike Parcours. */
const PROFILE: ParcoursProfile = {
  osrm: 'bicycle',
  costing: 'bicycle',
  gpxType: 'cycling',
};

/**
 * Virtual clock: the time only moves when the scheduler decides to wait, so
 * the recorded request starts are exactly the times the scheduler planned.
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

/** Let every pending microtask run: the scheduler is promise-driven. */
function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

interface RecordedCall {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
  readonly startedAt: number;
  resolve(response: Response): void;
  reject(error: unknown): void;
}

/** A fetch that records every call and lets the test settle it by hand. */
function createRecordingFetch(clock: SchedulerClock): {
  fetch: SchedulerFetch;
  calls: RecordedCall[];
  /** Highest number of calls running at the same time. */
  readonly maxActive: number;
} {
  const calls: RecordedCall[] = [];
  let active = 0;
  let maxActive = 0;
  const fetchImpl: SchedulerFetch = (url: string, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body,
        startedAt: clock.now(),
        resolve: (response: Response) => {
          active -= 1;
          resolve(response);
        },
        reject: (error: unknown) => {
          active -= 1;
          reject(error);
        },
      });
    });
  return {
    fetch: fetchImpl,
    calls,
    get maxActive() {
      return maxActive;
    },
  };
}

/** The body the OSRM demo server answers for a segment. */
function osrmResponse(distance: number): Response {
  return new Response(
    JSON.stringify({
      code: 'Ok',
      routes: [{ geometry: { coordinates: [[-1.74, 48.02]] }, distance }],
    }),
  );
}

/** The body the Valhalla server answers for a segment. */
function valhallaResponse(distanceKm: number): Response {
  return new Response(
    JSON.stringify({
      trip: { status: 0, summary: { length: distanceKm }, legs: [{ shape: '_ibe?' }] },
    }),
  );
}

describe('createRouterClient', () => {
  it('should query OSRM and Valhalla at the same time for the same segment', async () => {
    const clock = createVirtualClock();
    const recorder = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: recorder.fetch });
    const client = createRouterClient({ scheduler });

    const pending = client.routeSegment(SEGMENT, PROFILE);
    await flush();

    // Both routers are asked before either of them answered.
    expect(recorder.calls.map((call) => call.url)).toEqual([
      'https://router.project-osrm.org/route/v1/bicycle/-1.747083,48.024417;-1.73,48.02?overview=full&geometries=geojson',
      'https://valhalla1.openstreetmap.de/route',
    ]);
    expect(recorder.maxActive).toBe(2);

    recorder.calls[0]?.resolve(osrmResponse(1200));
    recorder.calls[1]?.resolve(valhallaResponse(0.9));
    await pending;
  });

  it('should send the Valhalla request as a POST with the locations and the costing', async () => {
    const clock = createVirtualClock();
    const recorder = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: recorder.fetch });
    const client = createRouterClient({ scheduler });

    const pending = client.routeSegment(SEGMENT, PROFILE);
    await flush();

    const valhallaCall = recorder.calls[1];
    expect(valhallaCall?.method).toBe('POST');
    expect(JSON.parse(String(valhallaCall?.body))).toEqual({
      locations: [
        { lon: -1.747083, lat: 48.024417 },
        { lon: -1.73, lat: 48.02 },
      ],
      costing: 'bicycle',
    });

    recorder.calls[0]?.resolve(osrmResponse(1200));
    recorder.calls[1]?.resolve(valhallaResponse(0.9));
    await pending;
  });

  it('should keep the shortest path between the two routers', async () => {
    const clock = createVirtualClock();
    const recorder = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: recorder.fetch });
    const client = createRouterClient({ scheduler });

    const pending = client.routeSegment(SEGMENT, PROFILE);
    await flush();

    recorder.calls[0]?.resolve(osrmResponse(1200));
    recorder.calls[1]?.resolve(valhallaResponse(0.9));

    const path = await pending;
    expect(path.source).toBe('valhalla');
    expect(path.distanceM).toBe(900);
    expect(path.coords).toEqual([[0, 0.1]]);
  });

  it('should keep the OSRM path when it is the shortest', async () => {
    const clock = createVirtualClock();
    const recorder = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: recorder.fetch });
    const client = createRouterClient({ scheduler });

    const pending = client.routeSegment(SEGMENT, PROFILE);
    await flush();

    recorder.calls[0]?.resolve(osrmResponse(800));
    recorder.calls[1]?.resolve(valhallaResponse(0.9));

    const path = await pending;
    expect(path.source).toBe('osrm');
    expect(path.distanceM).toBe(800);
  });

  it('should fall back to the router that answered when the other one fails', async () => {
    const clock = createVirtualClock();
    const recorder = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: recorder.fetch });
    const client = createRouterClient({ scheduler });

    const pending = client.routeSegment(SEGMENT, PROFILE);
    await flush();

    recorder.calls[0]?.resolve(new Response('nope', { status: 500 }));
    recorder.calls[1]?.resolve(valhallaResponse(0.9));

    const path = await pending;
    expect(path.source).toBe('valhalla');
    expect(path.distanceM).toBe(900);
  });

  it('should fail when neither router answered', async () => {
    const clock = createVirtualClock();
    const recorder = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: recorder.fetch });
    const client = createRouterClient({ scheduler });

    const pending = client.routeSegment(SEGMENT, PROFILE);
    await flush();

    recorder.calls[0]?.resolve(new Response('nope', { status: 500 }));
    recorder.calls[1]?.resolve(new Response('nope', { status: 503 }));

    await expect(pending).rejects.toThrow('No route from either router');
  });
});
