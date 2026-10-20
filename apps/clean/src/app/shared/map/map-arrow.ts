import type { Position } from 'geojson';
import type * as L from 'leaflet';

import { loadLeaflet } from './leaflet-loader';
import type { ArrowOptions } from './map.types';

/** Distance (in meters) between direction arrows, based on the route length. */
export function computeFrequency(distanceKm: number): number {
  const totalDistanceMeters = distanceKm * 1000;

  if (totalDistanceMeters < 1000) {
    return 125;
  } else if (totalDistanceMeters < 1500) {
    return 200;
  } else if (totalDistanceMeters < 2000) {
    return 250;
  }
  return 300;
}

export async function addArrows(
  coords: Position[],
  layerGroup: L.LayerGroup,
  options: ArrowOptions,
): Promise<void> {
  const L = await loadLeaflet();
  await import('leaflet-arrowheads');
  const polyline = L.polyline(coords.map((c) => L.latLng(c[1], c[0]))).addTo(layerGroup);
  const frequency = computeFrequency(options.distanceKm);

  polyline.arrowheads({
    frequency: `${frequency}m`,
    size: '25%',
    fill: true,
  });
}
