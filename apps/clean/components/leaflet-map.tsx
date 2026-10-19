'use client';

import type * as L from 'leaflet';
import { useEffect, useRef } from 'react';

import { createMap, MAX_BOUNDS } from '../src/app/shared/map/map';

/**
 * SSR-safe Leaflet shell (spec #3: Leaflet forced client-side): the component
 * only renders the `#map` container during SSR and creates the map in an
 * effect, the Next equivalent of the legacy `isPlatformBrowser` guard.
 *
 * The zone map and the step-by-step tour page (ticket #10/#11) both mount a
 * Leaflet map through this component — pass `className` and `minZoom` to adapt
 * the container, `onReady` to draw into the map once it exists.
 */

/** Container height of the legacy zone map template (`tours-map.html`). */
export const ZONE_MAP_CLASS = 'z-0 h-[calc(100dvh-80px)] w-full sm:h-[calc(100vh-136px)]';

interface LeafletMapProps {
  /** Element class of the `#map` container (defaults to the zone map height). */
  readonly className?: string;
  readonly minZoom?: number;
  /** Invoked once with the ready map; draw routes/markers here. */
  readonly onReady: (map: L.Map) => void | Promise<void>;
}

export function LeafletMap({ className = ZONE_MAP_CLASS, minZoom = 12, onReady }: LeafletMapProps) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Serializes map creation across React StrictMode's double-invoked effects so
  // two `L.Map` instances never race for the same container element.
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    let map: L.Map | null = null;

    const initialize = async (): Promise<void> => {
      await chainRef.current;
      if (cancelled || typeof window === 'undefined') return;

      const created = await createMap({
        elementId: 'map',
        minZoom,
        maxBounds: MAX_BOUNDS,
        fullscreen: true,
      });

      if (cancelled) {
        created.remove();
        return;
      }

      map = created;
      await onReadyRef.current(created);
    };

    const run = initialize().catch((error) => {
      console.error('Map initialization failed:', error);
    });
    chainRef.current = run;

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [minZoom]);

  return <div className={className} id="map" />;
}
