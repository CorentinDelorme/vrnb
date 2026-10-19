import { Injectable } from '@angular/core';
import { FeatureCollection, Position } from 'geojson';
import type * as L from 'leaflet';

import {
  createRouteLine,
  drawCoordinatesRoute,
  drawGeoJsonRoute,
  getDashedRouteStyle,
  getDefaultRouteStyle,
} from './map-route';
import { RouteStyle } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapRouteService {
  getDefaultRouteStyle(): RouteStyle {
    return getDefaultRouteStyle();
  }

  getDashedRouteStyle(): RouteStyle {
    return getDashedRouteStyle();
  }

  createRouteLine(coords: Position[]): GeoJSON.Feature {
    return createRouteLine(coords);
  }

  drawGeoJsonRoute(
    geoJson: FeatureCollection | GeoJSON.Feature,
    target: L.Map | L.LayerGroup,
    style: RouteStyle,
  ): Promise<L.GeoJSON> {
    return drawGeoJsonRoute(geoJson, target, style);
  }

  drawCoordinatesRoute(
    coords: Position[],
    target: L.Map | L.LayerGroup,
    style: RouteStyle,
  ): Promise<L.GeoJSON> {
    return drawCoordinatesRoute(coords, target, style);
  }
}
