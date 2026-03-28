import { FeatureCollection, Position } from 'geojson';
import * as L from 'leaflet';

export interface MapInitOptions {
  readonly elementId: string;
  readonly minZoom: number;
  readonly maxBounds: L.LatLngBoundsExpression;
  readonly fullscreen: boolean;
}

export interface RouteStyle {
  readonly color: string;
  readonly weight: number;
  readonly dashArray?: string;
}

export interface LabelMarkerOptions {
  readonly position: L.LatLng;
  readonly text: string;
  readonly color: string;
}

export interface ArrowOptions {
  readonly distanceKm: number;
}

export interface LocationTrackingOptions {
  readonly debug: boolean;
  readonly debugTimeout: number;
  readonly maxZoom: number;
  readonly debugCoords?: Position[];
}

export interface TourGeoJsonSet {
  readonly start: FeatureCollection;
  readonly tour: FeatureCollection;
  readonly end: FeatureCollection;
}

export interface StartEndPoints {
  readonly start: Position;
  readonly end: Position;
}

export type MarkerSize = 'normal' | 'small';
