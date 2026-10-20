import type { Position } from 'geojson';
import type * as L from 'leaflet';

import { loadLeaflet } from './leaflet-loader';
import type { LocationTrackingOptions } from './map.types';

/** Fallback position used by the debug simulation when no coords are available. */
export const DEFAULT_MOCK_POSITION = { lat: 48.013572, lng: -1.749696 };

export interface MockLocation {
  readonly latlng: L.LatLng;
  readonly nextIndex: number;
}

/**
 * One step of the debug position simulation: the position at `currentIndex`
 * along the given coords (walking [lon, lat] pairs), advancing the index until
 * the end of the track is reached.
 */
export async function getMockLocation(
  coords: Position[],
  currentIndex: number,
): Promise<MockLocation> {
  const L = await loadLeaflet();
  if (coords.length === 0) {
    return {
      latlng: L.latLng(DEFAULT_MOCK_POSITION.lat, DEFAULT_MOCK_POSITION.lng),
      nextIndex: currentIndex,
    };
  }

  const pos = coords[currentIndex];
  const nextIndex = currentIndex < coords.length - 1 ? currentIndex + 1 : currentIndex;

  return { latlng: L.latLng(pos[1], pos[0]), nextIndex };
}

export interface LocationTracker {
  startTracking(map: L.Map, options: LocationTrackingOptions): void;
  stopTracking(): void;
}

export interface LocationTrackerCallbacks {
  onPositionFound: (latlng: L.LatLng) => void;
}

/**
 * GPS position tracking with an accuracy circle, plus a debug mode simulating
 * the position by walking along the step's GPX coords. SSR-safe: tracking is a
 * no-op outside the browser.
 */
export function createLocationTracker(callbacks: LocationTrackerCallbacks): LocationTracker {
  let positionCircle: L.Circle | null = null;
  let map: L.Map | null = null;
  let debugIntervalId: ReturnType<typeof setInterval> | undefined = undefined;
  let debugCoordIndex = 0;
  let trackingOptions: LocationTrackingOptions | null = null;

  const onLocationFound = async (e: L.LocationEvent): Promise<void> => {
    if (!map) return;

    callbacks.onPositionFound(e.latlng);

    if (positionCircle) {
      positionCircle.setLatLng(e.latlng);
    } else {
      const L = await loadLeaflet();
      if (!map) return;
      positionCircle = L.circle(e.latlng, {
        radius: e.accuracy || 30,
        color: '#00bafe',
        fillColor: '#00bafe',
      }).addTo(map);
    }
  };

  const onLocationError = (e: L.ErrorEvent): void => {
    console.error('Location error:', e.message);
  };

  const fireMockLocation = async (): Promise<void> => {
    if (!map || !trackingOptions) return;

    const coords = trackingOptions.debugCoords ?? [];
    const result = await getMockLocation(coords, debugCoordIndex);
    debugCoordIndex = result.nextIndex;

    map.fire('locationfound', { latlng: result.latlng } as unknown as L.LocationEvent);
    map.setView(result.latlng, 16);
  };

  const stopTracking = (): void => {
    if (debugIntervalId !== undefined) {
      clearInterval(debugIntervalId);
      debugIntervalId = undefined;
    }

    if (map) {
      map.stopLocate();
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    }

    if (positionCircle && map) {
      map.removeLayer(positionCircle);
    }
    positionCircle = null;
    map = null;
    trackingOptions = null;
    debugCoordIndex = 0;
  };

  const startTracking = (targetMap: L.Map, options: LocationTrackingOptions): void => {
    if (typeof window === 'undefined') return;
    stopTracking();
    map = targetMap;
    trackingOptions = options;
    debugCoordIndex = 0;

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    if (options.debug) {
      debugIntervalId = setInterval(() => {
        void fireMockLocation();
      }, options.debugTimeout);
    } else {
      map.locate({ setView: true, maxZoom: options.maxZoom, watch: true });
    }
  };

  return { startTracking, stopTracking };
}
