import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { getZone } from '../src/app/zones';
import { createNetworkScheduler } from './network-scheduler';
import { createRouterClient } from './router-client';
import { buildSegmentGpx } from './segment-gpx';

import type { ParcoursEntry } from './generation-helpers';
import { gpxRootDir, listParcours, parseGenerationFilters } from './generation-helpers';
import type { LonLat, ParcoursRoute } from './route-parcours';
import {
  PARCOURS_ROUTING_CONCURRENCY,
  ROUTING_MIN_INTERVAL_MS,
  parcoursSegments,
  profileForParcours,
  routeParcours,
} from './route-parcours';

const rootDir = join(import.meta.dirname, '..');

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

async function main(): Promise<void> {
  const filters = parseGenerationFilters(process.argv);
  const gpxRoot = gpxRootDir(rootDir);
  if (!existsSync(gpxRoot)) {
    throw new Error(`GPX directory not found: ${gpxRoot}`);
  }

  const inventory = listParcours(rootDir, filters);
  const zones = inventory.zones;

  if (zones.length === 0 || zones.every((zone) => zone.parcours.length === 0)) {
    throw new Error('No tours found to process.');
  }

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

  for (const zone of zones) {
    const zoneId = zone.zoneId;
    const meetingPoint = getZone(zoneId).meetingPoint;
    const meetingCoords: LonLat = [meetingPoint.coordinates[0], meetingPoint.coordinates[1]];

    console.log(
      `Zone ${zoneId} — meeting point: ${meetingPoint.name} (${meetingCoords[1]}, ${meetingCoords[0]})`,
    );
    console.log(`Generating start/end GPX for ${zone.parcours.length} tours...`);

    // The Parcours whose trace cannot be read are reported right away; the
    // other ones are routed two at a time.
    const entries = new Map<string, ParcoursEntry>();
    const parcours: ParcoursRoute[] = [];
    for (const entry of zone.parcours) {
      const endpoints = getTourEndpoints(entry);
      if (!endpoints) {
        failures += 1;
        console.error(
          `fail ${entry.tourId}: cannot read endpoints from ${entry.tourId}/${entry.tourId}.gpx`,
        );
        continue;
      }
      entries.set(entry.tourId, entry);
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
        const entry = entries.get(outcome.tourId);
        if (!entry) {
          throw new Error(`Unknown parcours: ${outcome.tourId}`);
        }
        writeFileSync(
          entry.startSegmentPath,
          buildSegmentGpx(
            `${meetingPoint.name} vers le parcours ${outcome.tourId}`,
            outcome.profile.gpxType,
            outcome.start.coords,
            outcome.start.source,
          ),
        );
        writeFileSync(
          entry.endSegmentPath,
          buildSegmentGpx(
            `Fin du parcours ${outcome.tourId} vers ${meetingPoint.name}`,
            outcome.profile.gpxType,
            outcome.end.coords,
            outcome.end.source,
          ),
        );
        console.log(
          `ok ${outcome.tourId} (${outcome.profile.osrm}): start ${outcome.start.coords.length} pts` +
            ` ${Math.round(outcome.start.distanceM)}m [${outcome.start.source}],` +
            ` end ${outcome.end.coords.length} pts` +
            ` ${Math.round(outcome.end.distanceM)}m [${outcome.end.source}]`,
        );
      },
      onFailure: (failure) => {
        failures += 1;
        console.error(
          `fail ${failure.tourId}: ${failure.error instanceof Error ? failure.error.message : failure.error}`,
        );
      },
    });
  }

  if (failures > 0) {
    throw new Error(`${failures} tour(s) failed.`);
  }

  console.log('Done. Run `bun run generate:tours` to refresh distances.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
