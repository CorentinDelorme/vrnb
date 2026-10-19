import { gpx as gpxToGeoJson } from '@tmcw/togeojson';
import { FeatureCollection, Position } from 'geojson';

import { DEFAULT_ZONE_ID } from '../../zones';
import { StartEndPoints } from '../map/map.types';

export interface GeoVeloLinks {
  readonly toStart: string;
  readonly fromEnd: string;
}

/** Convert a GPX document into a GeoJSON FeatureCollection. */
export function getGeoJsonFromGpx(gpxStr: string): FeatureCollection {
  const parsedGpx = new DOMParser().parseFromString(gpxStr, 'application/xml');
  return gpxToGeoJson(parsedGpx);
}

/** Extract the first and last positions of a LineString or MultiLineString route. */
export function getStartAndEndPointsFromGeoJson(
  geoJson: FeatureCollection,
): StartEndPoints | undefined {
  if (!geoJson?.features.length) return undefined;

  const firstFeature = geoJson.features[0];
  const geometry = firstFeature.geometry;

  if (!geometry) return undefined;

  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates;
    if (coords.length === 0) return undefined;

    return {
      start: coords[0],
      end: coords[coords.length - 1],
    };
  }

  if (geometry.type === 'MultiLineString') {
    const lines = geometry.coordinates;
    if (!lines.length || !lines[0].length) return undefined;

    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];

    return {
      start: firstLine[0],
      end: lastLine[lastLine.length - 1],
    };
  }

  return undefined;
}

/**
 * Fetch a GPX file as text from the zone-scoped layout, falling back to the
 * legacy flat layout (pre-zone files) when the zone-scoped file is missing.
 */
export async function fetchGpxFile(
  tourId: string,
  type?: 'start' | 'end',
  zoneId: string = DEFAULT_ZONE_ID,
): Promise<string> {
  const fileName = `${tourId}${type ? `_${type}` : ''}.gpx`;

  try {
    const response = await fetch(`/gpx/${zoneId}/${tourId}/${fileName}`);
    if (response.ok) return await response.text();
  } catch {
    // Fall through to the legacy flat layout (pre-zone files).
  }

  const legacyResponse = await fetch(`/gpx/${tourId}/${fileName}`);
  if (!legacyResponse.ok) {
    throw new Error(`Failed to load GPX file: /gpx/${tourId}/${fileName}`);
  }
  return legacyResponse.text();
}

/**
 * Build the GeoVelo links for a tour: meeting point -> tour start, and tour
 * end -> meeting point. Returns undefined when the tour route is unknown.
 */
export function generateGeoVeloLinks(
  tourGeoJson: FeatureCollection | null | undefined,
  meetingPoint: Position,
): GeoVeloLinks | undefined {
  if (!tourGeoJson) return undefined;

  const points = getStartAndEndPointsFromGeoJson(tourGeoJson);
  if (!points) return undefined;

  const meetingLon = meetingPoint[0];
  const meetingLat = meetingPoint[1];

  const startLon = points.start[0];
  const startLat = points.start[1];

  const endLon = points.end[0];
  const endLat = points.end[1];

  return {
    // Meeting point -> GPX start
    toStart: `${getGeoVeloBaseUrl()}&from=${meetingLon},${meetingLat}&to=${startLon},${startLat}`,

    // GPX end -> Meeting point
    fromEnd: `${getGeoVeloBaseUrl()}&from=${endLon},${endLat}&to=${meetingLon},${meetingLat}`,
  };
}

/** GeoVelo link to the meeting point, optionally from the current position. */
export function buildGeoVeloToMeetingPointLink(
  meetingPoint: Position,
  fromPosition?: { lat: number; lng: number } | null,
): string {
  const meetingLon = meetingPoint[0];
  const meetingLat = meetingPoint[1];
  const fromParam = fromPosition ? `&from=${fromPosition.lng},${fromPosition.lat}` : '';

  return `${getGeoVeloBaseUrl()}&to=${meetingLon},${meetingLat}${fromParam}`;
}

function getGeoVeloBaseUrl(): string {
  const baseUrl = 'https://geovelo.app/fr/route/';
  const params = new URLSearchParams({
    'bike-type': 'own',
    'e-bike': 'false',
    zone: 'rennes',
  });

  return `${baseUrl}?${params.toString()}`;
}
