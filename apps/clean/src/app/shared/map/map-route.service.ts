import { Injectable } from '@angular/core';
import { FeatureCollection, Position } from 'geojson';
import type * as L from 'leaflet';

import { RouteStyle } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapRouteService {
  getDefaultRouteStyle(): RouteStyle {
    return { color: '#0058ca', weight: 4 };
  }

  getDashedRouteStyle(): RouteStyle {
    return { color: '#0058ca', weight: 4, dashArray: '10, 10' };
  }

  createRouteLine(coords: Position[]): GeoJSON.Feature {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    };
  }

  async drawGeoJsonRoute(
    geoJson: FeatureCollection | GeoJSON.Feature,
    target: L.Map | L.LayerGroup,
    style: RouteStyle,
  ): Promise<L.GeoJSON> {
    const L = await import('leaflet');
    const layer = L.geoJSON(geoJson as GeoJSON.GeoJsonObject, {
      style: () => style,
    }).addTo(target);
    return layer;
  }

  async drawCoordinatesRoute(
    coords: Position[],
    target: L.Map | L.LayerGroup,
    style: RouteStyle,
  ): Promise<L.GeoJSON> {
    const routeLine = this.createRouteLine(coords);
    return this.drawGeoJsonRoute(routeLine, target, style);
  }
}
