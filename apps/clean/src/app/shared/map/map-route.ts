import { FeatureCollection, Position } from 'geojson';
import type * as L from 'leaflet';

import { loadLeaflet } from './leaflet-loader';
import { RouteStyle } from './map.types';

export function getDefaultRouteStyle(): RouteStyle {
  return { color: '#0058ca', weight: 4 };
}

export function getDashedRouteStyle(): RouteStyle {
  return { color: '#0058ca', weight: 4, dashArray: '10, 10' };
}

export function createRouteLine(coords: Position[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
  };
}

export async function drawGeoJsonRoute(
  geoJson: FeatureCollection | GeoJSON.Feature,
  target: L.Map | L.LayerGroup,
  style: RouteStyle,
): Promise<L.GeoJSON> {
  const L = await loadLeaflet();
  const layer = L.geoJSON(geoJson as GeoJSON.GeoJsonObject, {
    style: () => style,
  }).addTo(target);
  return layer;
}

export async function drawCoordinatesRoute(
  coords: Position[],
  target: L.Map | L.LayerGroup,
  style: RouteStyle,
): Promise<L.GeoJSON> {
  const routeLine = createRouteLine(coords);
  return drawGeoJsonRoute(routeLine, target, style);
}
