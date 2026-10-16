import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Position } from 'geojson';
import type * as L from 'leaflet';

import { LocationTrackingOptions } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapLocationService {
  readonly currentPosition = signal<L.LatLng | null>(null);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private positionCircle: L.Circle | null = null;
  private map: L.Map | null = null;
  private debugIntervalId: number | undefined = undefined;
  private debugCoordIndex = 0;
  private trackingOptions: LocationTrackingOptions | null = null;

  async getMockLocation(
    coords: Position[],
    currentIndex: number,
  ): Promise<{ latlng: L.LatLng; nextIndex: number }> {
    const L = await import('leaflet');
    if (coords.length === 0) {
      return { latlng: L.latLng(48.013572, -1.749696), nextIndex: currentIndex };
    }

    const pos = coords[currentIndex];
    const nextIndex = currentIndex < coords.length - 1 ? currentIndex + 1 : currentIndex;

    return { latlng: L.latLng(pos[1], pos[0]), nextIndex };
  }

  startTracking(map: L.Map, options: LocationTrackingOptions): void {
    if (!this.isBrowser) return;
    this.stopTracking();
    this.map = map;
    this.trackingOptions = options;
    this.debugCoordIndex = 0;

    map.on('locationfound', this.onLocationFound);
    map.on('locationerror', this.onLocationError);

    if (options.debug) {
      this.debugIntervalId = window.setInterval(() => {
        void this.fireMockLocation();
      }, options.debugTimeout);
    } else {
      map.locate({ setView: true, maxZoom: options.maxZoom, watch: true });
    }
  }

  stopTracking(): void {
    if (this.debugIntervalId !== undefined) {
      clearInterval(this.debugIntervalId);
      this.debugIntervalId = undefined;
    }

    if (this.map) {
      this.map.stopLocate();
      this.map.off('locationfound', this.onLocationFound);
      this.map.off('locationerror', this.onLocationError);
    }

    if (this.positionCircle && this.map) {
      this.map.removeLayer(this.positionCircle);
    }
    this.positionCircle = null;
    this.map = null;
    this.trackingOptions = null;
    this.debugCoordIndex = 0;
  }

  private readonly onLocationFound = async (e: L.LocationEvent): Promise<void> => {
    if (!this.map) return;

    this.currentPosition.set(e.latlng);

    if (this.positionCircle) {
      this.positionCircle.setLatLng(e.latlng);
    } else {
      const L = await import('leaflet');
      if (!this.map) return;
      this.positionCircle = L.circle(e.latlng, {
        radius: e.accuracy || 30,
        color: '#00bafe',
        fillColor: '#00bafe',
      }).addTo(this.map);
    }
  };

  private readonly onLocationError = (e: L.ErrorEvent): void => {
    console.error('Location error:', e.message);
  };

  private async fireMockLocation(): Promise<void> {
    if (!this.map || !this.trackingOptions) return;

    const coords = this.trackingOptions.debugCoords ?? [];
    const result = await this.getMockLocation(coords, this.debugCoordIndex);
    this.debugCoordIndex = result.nextIndex;

    this.map.fire('locationfound', { latlng: result.latlng } as unknown as L.LocationEvent);
    this.map.setView(result.latlng, 16);
  }
}
