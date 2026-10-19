import { Injectable, signal } from '@angular/core';
import { Position } from 'geojson';
import type * as L from 'leaflet';

import { createLocationTracker, getMockLocation, MockLocation } from './map-location';
import { LocationTrackingOptions } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapLocationService {
  readonly currentPosition = signal<L.LatLng | null>(null);

  private readonly tracker = createLocationTracker({
    onPositionFound: (latlng) => this.currentPosition.set(latlng),
  });

  getMockLocation(coords: Position[], currentIndex: number): Promise<MockLocation> {
    return getMockLocation(coords, currentIndex);
  }

  startTracking(map: L.Map, options: LocationTrackingOptions): void {
    this.tracker.startTracking(map, options);
  }

  stopTracking(): void {
    this.tracker.stopTracking();
  }
}
