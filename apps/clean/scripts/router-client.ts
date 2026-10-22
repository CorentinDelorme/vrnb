/**
 * Router client — the OSRM and Valhalla servers, queried through the network
 * scheduler (ticket #25, spec #21).
 *
 * The two routers are asked at the same time for the same segment: they
 * live on two different hosts, so the scheduler gives each of them its own
 * rate bucket (one request every 400 ms) and they never wait for each
 * other. The shortest of the two answers wins; when one of them fails, the
 * other one is enough.
 *
 * Pure module: no import-time side effect, no console output. The scheduler
 * is injected, so the unit suite checks the requests without touching the
 * network.
 */

import type { NetworkScheduler } from './network-scheduler';
import type { LonLat, ParcoursProfile, RouteSegment, RoutedPath } from './route-parcours';

/** The OSRM demo server. */
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

/** The Valhalla server. */
const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

/** Timeout of a request to a router, in milliseconds. */
const REQUEST_TIMEOUT_MS = 30_000;

/** The user agent the routing servers are asked with. */
const USER_AGENT = 'vrnb-clean/generate-start-end-gpx';

/** Options of the router client. */
export interface RouterClientOptions {
  /** Scheduler performing the network calls (rate, concurrency, de-duplication). */
  readonly scheduler: NetworkScheduler;
  /** Base URL of the OSRM server. */
  readonly osrmBaseUrl?: string;
  /** URL of the Valhalla server. */
  readonly valhallaUrl?: string;
  /** Timeout of a request, in milliseconds. */
  readonly timeoutMs?: number;
  /** User agent sent to the routing servers. */
  readonly userAgent?: string;
}

/** The router client: the routing servers, asked through the scheduler. */
export interface RouterClient {
  /**
   * Route one segment: OSRM and Valhalla are asked at the same time and the
   * shortest path wins. Rejects when neither router answered.
   */
  routeSegment(segment: RouteSegment, profile: ParcoursProfile): Promise<RoutedPath>;
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: { geometry?: { coordinates?: number[][] }; distance?: number }[];
}

interface ValhallaResponse {
  trip?: {
    status?: number;
    status_message?: string;
    summary?: { length?: number };
    legs?: { shape?: string }[];
  };
}

/**
 * Create a router client.
 */
export function createRouterClient(options: RouterClientOptions): RouterClient {
  const osrmBaseUrl = options.osrmBaseUrl ?? OSRM_BASE_URL;
  const valhallaUrl = options.valhallaUrl ?? VALHALLA_URL;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const userAgent = options.userAgent ?? USER_AGENT;

  /** Route with OSRM, through the scheduler. */
  async function fetchOsrm(segment: RouteSegment, profile: ParcoursProfile): Promise<RoutedPath> {
    const url =
      `${osrmBaseUrl}/${profile.osrm}/${segment.from[0]},${segment.from[1]};` +
      `${segment.to[0]},${segment.to[1]}?overview=full&geometries=geojson`;
    const { response } = await options.scheduler.request({
      url,
      method: 'GET',
      init: () => ({
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(timeoutMs),
      }),
    });
    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status} for ${url}`);
    }
    const json = (await response.json()) as OsrmResponse;
    const route = json.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (json.code !== 'Ok' || !coords || coords.length === 0) {
      throw new Error(`OSRM error: ${json.code}${json.message ? ` (${json.message})` : ''}`);
    }
    return {
      coords: coords.map(([lon, lat]) => [lon, lat] as LonLat),
      distanceM: route?.distance ?? 0,
      source: 'osrm',
    };
  }

  /**
   * Route with Valhalla, through the scheduler.
   *
   * Unlike the OSRM demo server, Valhalla does not force pedestrians and
   * contraflow cyclists onto detours: one-way streets that are legally
   * usable on foot (or by bike in 30 km/h zones, e.g. Rue Gaudrine in
   * Bruz) don't trigger a loop around the block.
   */
  async function fetchValhalla(
    segment: RouteSegment,
    profile: ParcoursProfile,
  ): Promise<RoutedPath> {
    const body = JSON.stringify({
      locations: [
        { lon: segment.from[0], lat: segment.from[1] },
        { lon: segment.to[0], lat: segment.to[1] },
      ],
      costing: profile.costing,
    });
    const { response } = await options.scheduler.request({
      url: valhallaUrl,
      method: 'POST',
      bodyKey: body,
      init: () => ({
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      }),
    });
    if (!response.ok) {
      throw new Error(`Valhalla HTTP ${response.status}`);
    }
    const json = (await response.json()) as ValhallaResponse;
    const trip = json.trip;
    const shape = trip?.legs?.[0]?.shape;
    const lengthKm = trip?.summary?.length;
    if (trip?.status !== 0 || typeof shape !== 'string' || shape.length === 0) {
      throw new Error(`Valhalla error: ${trip?.status_message ?? 'no route'}`);
    }
    const coords = decodePolyline(shape);
    if (coords.length === 0) {
      throw new Error('Valhalla error: empty shape');
    }
    return { coords, distanceM: (lengthKm ?? 0) * 1000, source: 'valhalla' };
  }

  return {
    async routeSegment(segment: RouteSegment, profile: ParcoursProfile): Promise<RoutedPath> {
      const outcomes = await Promise.allSettled([
        fetchOsrm(segment, profile),
        fetchValhalla(segment, profile),
      ]);
      const fulfilled = outcomes
        .filter(
          (outcome): outcome is PromiseFulfilledResult<RoutedPath> =>
            outcome.status === 'fulfilled',
        )
        .map((outcome) => outcome.value);
      if (fulfilled.length === 0) {
        const reasons = outcomes
          .filter((outcome) => outcome.status === 'rejected')
          .map((outcome) => String((outcome as PromiseRejectedResult).reason))
          .join(' | ');
        throw new Error(`No route from either router: ${reasons}`);
      }
      return fulfilled.reduce((best, candidate) =>
        candidate.distanceM < best.distanceM ? candidate : best,
      );
    },
  };
}

/**
 * Decode a polyline-encoded shape (Valhalla uses precision 6 by default).
 * Returns [lon, lat] pairs.
 */
function decodePolyline(encoded: string, precision = 6): LonLat[] {
  const coords: LonLat[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const factor = 10 ** precision;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lon / factor, lat / factor]);
  }

  return coords;
}
