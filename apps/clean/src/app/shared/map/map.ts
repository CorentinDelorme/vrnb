import type * as L from 'leaflet';

import { findZoneTours } from '../../tours-queries';
import { getZone } from '../../zones';
import { getLineCoordinates } from '../gpx/tour-geojson';
import { loadTourRouteGeoJson } from '../gpx/tour-geometry';
import { loadLeaflet } from './leaflet-loader';
import type { MapInitOptions, TourGeoJsonSet } from './map.types';

/** Map bounds covering the whole Bruz area. */
export const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [47.974278, -1.789123], // Southwest corner
  [48.062, -1.697445], // Northeast corner
];

export async function createMap(options: MapInitOptions): Promise<L.Map> {
  const leaflet = await loadLeaflet();
  const map = new leaflet.Map(options.elementId);

  new leaflet.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>',
    minZoom: options.minZoom,
    zIndex: 0,
  }).addTo(map);

  if (options.fullscreen) {
    const { FullScreen } = await import('leaflet.fullscreen');
    map.addControl(
      new FullScreen({
        position: 'topleft',
      }),
    );
  }

  map.setMaxBounds(options.maxBounds);

  return map;
}

export async function createLayerGroup(map: L.Map): Promise<L.LayerGroup> {
  const leaflet = await loadLeaflet();
  const layerGroup = new leaflet.LayerGroup();
  layerGroup.addTo(map);
  return layerGroup;
}

export async function clearLayers(map: L.Map, layerGroup: L.LayerGroup): Promise<L.LayerGroup> {
  map.removeLayer(layerGroup);
  return createLayerGroup(map);
}

/**
 * Bounds of a single parcours, built from its own start / tour / end segments
 * (not the whole zone). Resolved from the loaded GeoJSON segment set, so it
 * reflects the actual drawn geometry rather than a hardcoded rectangle.
 */
export async function getTourBounds(
  geoJsonSet: TourGeoJsonSet,
): Promise<L.LatLngBounds | null> {
  const leaflet = await loadLeaflet();
  const allBounds = leaflet.latLngBounds([]);

  for (const segment of [geoJsonSet.start, geoJsonSet.tour, geoJsonSet.end]) {
    for (const c of getLineCoordinates(segment)) {
      allBounds.extend([c[1], c[0]] as [number, number]);
    }
  }

  return allBounds.isValid() ? allBounds : null;
}

/**
 * Bounds covering every trace of a zone (both practice types), without padding.
 * Resolved by loading each tour's precomputed GeoJSON, so it reflects the
 * actual drawn routes rather than a hardcoded rectangle.
 */
export async function getZoneBounds(zoneId: string): Promise<L.LatLngBounds | null> {
  const leaflet = await loadLeaflet();
  const allBounds = leaflet.latLngBounds([]);

  // The zone's meeting point may be far from the traces (e.g. outside the
  // zone). It must be included: step 1 (Départ) leads there, and the visitor
  // must be able to see it without being blocked by maxBounds.
  const zone = getZone(zoneId);
  const [mlng, mlat] = zone.meetingPoint.coordinates;
  allBounds.extend([mlat, mlng]);

  for (const type of ['P', 'V'] as const) {
    for (const tour of findZoneTours(zoneId, type)) {
      const geoJson = await loadTourRouteGeoJson({ zoneId, tourId: tour.name });
      if (!geoJson) continue;
      for (const c of getLineCoordinates(geoJson)) {
        allBounds.extend([c[1], c[0]] as [number, number]);
      }
    }
  }

  return allBounds.isValid() ? allBounds : null;
}

/**
 * Min zoom so the zone still fills the view (a slack level so it doesn't
 * stick to the edges). Depends on container size, so resolved after map
 * creation.
 */
export function zoneMinZoom(map: L.Map, bounds: L.LatLngBounds): number {
  const fit = map.getBoundsZoom(bounds);
  return Math.max(map.getMinZoom(), fit - 1);
}
