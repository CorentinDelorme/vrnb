import type { FeatureCollection } from 'geojson';

import type { TourRef } from '../../tours-queries';
import type { TourGeoJsonSet } from '../map/map.types';
import { fetchGpxFile, getGeoJsonFromGpx } from './gpx';
import { fetchTourGeoJsonSet, fetchTourRouteGeoJson } from './tour-geojson';

/**
 * Shared « precomputed GeoJSON first, GPX runtime fallback » loaders (parity
 * with the legacy `GpxService.loadTourGeoJson`), used by the tour map, the
 * zone overview map and the tour drawer links so the fallback shape lives in
 * exactly one place.
 */

/**
 * Full segment set (start/tour/end) of a parcours. Rejects when geometry is
 * missing (the caller logs the failure and hides the map).
 */
export async function loadTourGeoJsonSet(tour: TourRef): Promise<TourGeoJsonSet> {
  const precomputed = await fetchTourGeoJsonSet(tour.tourId, tour.zoneId);
  if (precomputed) return precomputed;

  const [start, tourGpx, end] = await Promise.all([
    fetchGpxFile(tour.tourId, 'start', tour.zoneId),
    fetchGpxFile(tour.tourId, undefined, tour.zoneId),
    fetchGpxFile(tour.tourId, 'end', tour.zoneId),
  ]);
  return {
    start: getGeoJsonFromGpx(start),
    tour: getGeoJsonFromGpx(tourGpx),
    end: getGeoJsonFromGpx(end),
  };
}

/**
 * Tour-route features only, as needed by the overview map and the GeoVelo
 * links. Degrades to null (instead of throwing) when neither the precomputed
 * asset nor the GPX fallback yields geometry, logging the failing stage.
 */
export async function loadTourRouteGeoJson(tour: TourRef): Promise<FeatureCollection | null> {
  try {
    const geoJson = await fetchTourRouteGeoJson(tour.tourId, tour.zoneId);
    if (geoJson) return geoJson;
  } catch (err) {
    console.error(`Error loading precomputed GeoJSON for ${tour.tourId}:`, err);
  }

  try {
    const gpxStr = await fetchGpxFile(tour.tourId, undefined, tour.zoneId);
    return getGeoJsonFromGpx(gpxStr);
  } catch (err) {
    console.error(`Error processing GPX for ${tour.tourId}:`, err);
    return null;
  }
}
