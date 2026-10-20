import type { Feature, FeatureCollection, Position } from 'geojson';

import { DEFAULT_ZONE_ID } from '../../zones';
import type { TourGeoJsonSet } from '../map/map.types';

/** Segment of a parcours identified in a precomputed GeoJSON asset. */
export type TourGeoJsonRole = 'start' | 'tour' | 'end';

export interface TourGeoJsonSegments {
  readonly start?: FeatureCollection;
  readonly tour?: FeatureCollection;
  readonly end?: FeatureCollection;
}

/**
 * Build the precomputed GeoJSON asset for a parcours: one FeatureCollection
 * holding the features of each segment, every feature tagged with its role so
 * the runtime can rebuild the segment set the maps derive from GPX files.
 */
export function buildTourGeoJsonAsset(segments: TourGeoJsonSegments): FeatureCollection {
  const features: Feature[] = [];

  for (const role of ['start', 'tour', 'end'] as const) {
    const collection = segments[role];
    if (!collection) continue;
    for (const feature of collection.features) {
      features.push({ ...feature, properties: { ...feature.properties, role } });
    }
  }

  return { type: 'FeatureCollection', features };
}

const TOUR_GEO_JSON_ROLES: readonly TourGeoJsonRole[] = ['start', 'tour', 'end'];

function isFeatureCollection(value: unknown): value is FeatureCollection {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { type?: unknown; features?: unknown };
  return candidate.type === 'FeatureCollection' && Array.isArray(candidate.features);
}

function isTourGeoJsonRole(value: unknown): value is TourGeoJsonRole {
  return TOUR_GEO_JSON_ROLES.includes(value as TourGeoJsonRole);
}

/**
 * Rebuild the segment set from a precomputed GeoJSON asset. Returns null when
 * the payload is not a FeatureCollection (missing or corrupted asset).
 */
export function parseTourGeoJsonAsset(asset: unknown): TourGeoJsonSet | null {
  if (!isFeatureCollection(asset)) return null;

  const featuresByRole: Record<TourGeoJsonRole, Feature[]> = { start: [], tour: [], end: [] };

  for (const feature of asset.features) {
    const role = (feature.properties as Record<string, unknown> | null | undefined)?.['role'];
    if (isTourGeoJsonRole(role)) {
      featuresByRole[role].push(feature);
    }
  }

  return {
    start: { type: 'FeatureCollection', features: featuresByRole.start },
    tour: { type: 'FeatureCollection', features: featuresByRole.tour },
    end: { type: 'FeatureCollection', features: featuresByRole.end },
  };
}

/** Zone-scoped URL of the precomputed GeoJSON asset for a parcours. */
function tourGeoJsonAssetUrl(zoneId: string, tourId: string): string {
  return `/geojson/${zoneId}/${tourId}.geojson`;
}

/** Legacy (pre-zone) flat-layout URL of the precomputed GeoJSON asset. */
function legacyTourGeoJsonAssetUrl(tourId: string): string {
  return `/geojson/${tourId}.geojson`;
}

interface FetchedAsset {
  readonly url: string;
  readonly json: unknown;
}

async function requestAsset(url: string): Promise<FetchedAsset | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return { url, json: await response.json() };
  } catch {
    // Treat network failures like a missing asset (fall through to legacy layout).
    return null;
  }
}

/**
 * Fetch the precomputed GeoJSON asset from the zone-scoped layout, falling
 * back to the legacy flat layout. Returns null when no asset exists.
 */
async function fetchTourGeoJsonAsset(tourId: string, zoneId: string): Promise<FetchedAsset | null> {
  return (
    (await requestAsset(tourGeoJsonAssetUrl(zoneId, tourId))) ??
    (await requestAsset(legacyTourGeoJsonAssetUrl(tourId)))
  );
}

/**
 * Fetch the precomputed GeoJSON for a parcours and rebuild the segment set the
 * maps derive from GPX files. Returns null when no asset exists so callers can
 * fall back to GPX parsing; throws when the asset exists but is malformed.
 */
export async function fetchTourGeoJsonSet(
  tourId: string,
  zoneId: string = DEFAULT_ZONE_ID,
): Promise<TourGeoJsonSet | null> {
  const asset = await fetchTourGeoJsonAsset(tourId, zoneId);
  if (!asset) return null;

  const set = parseTourGeoJsonAsset(asset.json);
  if (!set) {
    throw new Error(`Invalid tour GeoJSON asset: ${asset.url}`);
  }
  return set;
}

/**
 * Fetch only the tour-route features of the precomputed GeoJSON asset, as
 * used by the zone overview map. Returns null when no asset exists or when it
 * holds no tour-route feature.
 */
export async function fetchTourRouteGeoJson(
  tourId: string,
  zoneId: string = DEFAULT_ZONE_ID,
): Promise<FeatureCollection | null> {
  const set = await fetchTourGeoJsonSet(tourId, zoneId);
  if (!set || set.tour.features.length === 0) return null;
  return set.tour;
}

/**
 * Coordinates of the first LineString feature (the drawn route), or an empty
 * array when the collection holds no route geometry.
 */
export function getLineCoordinates(geoJson: FeatureCollection): Position[] {
  for (const feature of geoJson.features) {
    if (feature.geometry?.type === 'LineString') {
      return feature.geometry.coordinates;
    }
  }
  return [];
}
