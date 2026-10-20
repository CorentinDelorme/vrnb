'use client';

import type { Position } from 'geojson';
import type * as L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import {
  getFallbackRouteCoords,
  getSegmentForStep,
  getStepDistance,
  parseDebugParams,
} from '../lib/tour-map';
import { getStartAndEndPointsFromGeoJson } from '../src/app/shared/gpx/gpx';
import { getLineCoordinates } from '../src/app/shared/gpx/tour-geojson';
import { loadTourGeoJsonSet } from '../src/app/shared/gpx/tour-geometry';
import { loadLeaflet } from '../src/app/shared/map/leaflet-loader';
import { createLayerGroup } from '../src/app/shared/map/map';
import { addArrows } from '../src/app/shared/map/map-arrow';
import type { LocationTracker } from '../src/app/shared/map/map-location';
import { createLocationTracker } from '../src/app/shared/map/map-location';
import { addStartEndMarkers } from '../src/app/shared/map/map-marker';
import { setCurrentPosition } from '../src/app/shared/map/map-position';
import {
  drawCoordinatesRoute,
  getDashedRouteStyle,
  getDefaultRouteStyle,
} from '../src/app/shared/map/map-route';
import type { TourGeoJsonSet } from '../src/app/shared/map/map.types';
import type { TourStep } from '../src/app/tours-queries';
import { findTour } from '../src/app/tours-queries';
import { getZone } from '../src/app/zones';
import { LeafletMap } from './leaflet-map';

/**
 * Map of the tour page — port of the legacy Angular `tour/tour.ts` map wiring
 * (spec #3, ticket #11): draws the segment of the current step (Début → start,
 * Nettoyage → tour, Fin → end) with its start/end markers, direction arrows and
 * a dashed fallback to the meeting point when the segment has no route
 * coordinates; then tracks the GPS position (watch `map.locate` with an
 * accuracy circle) or simulates it in debug mode (`?debug=true&timeout=<ms>`),
 * walking along the step's coordinates.
 */

/**
 * Container height of the legacy tour template (`tour.html`), on mobile: main
 * paddings + the two-line mobile header + steps row + gaps, clearing the fixed
 * dock (16 + 72 + 16 + 48 + 16 + 16 + 48 = 232). The desktop `sm:` offset is
 * the legacy one (single-line title).
 */
const TOUR_MAP_CLASS = 'z-0 h-[calc(100dvh-232px)] w-full overflow-hidden sm:h-[calc(100vh-296px)]';

/** Max zoom of the automatic view-following on each located position. */
const TRACKING_MAX_ZOOM = 16;

interface TourMapProps {
  readonly zoneId: string;
  readonly tourId: string;
  /** Current step of the 3-step state machine (Début, Nettoyage, Fin). */
  readonly step: TourStep;
}

/** Fit the view to the drawn route (parity with the Angular fitBounds helper). */
async function fitBoundsToCoords(map: L.Map, coords: Position[]): Promise<void> {
  const leaflet = await loadLeaflet();
  const bounds = leaflet.latLngBounds(coords.map((c) => [c[1], c[0]] as [number, number]));
  map.fitBounds(bounds);
}

export function TourMap({ zoneId, tourId, step }: TourMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [geoJsonSet, setGeoJsonSet] = useState<TourGeoJsonSet | null>(null);

  // One tracker for the component's lifetime, mirroring the Angular root
  // service singleton; it publishes positions to the shared store read by the
  // tour drawer's GeoVelo "depuis ma position" link.
  const trackerRef = useRef<LocationTracker | null>(null);
  if (trackerRef.current === null) {
    trackerRef.current = createLocationTracker({
      onPositionFound: (latlng) => setCurrentPosition({ lat: latlng.lat, lng: latlng.lng }),
    });
  }
  const tracker = trackerRef.current;

  // Load the parcours geometry once per tour.
  useEffect(() => {
    let cancelled = false;

    void loadTourGeoJsonSet({ zoneId, tourId })
      .then((set) => {
        if (!cancelled && set.tour) setGeoJsonSet(set);
      })
      .catch((err: Error) => console.error('Error loading tour geometry:', err));

    return () => {
      cancelled = true;
    };
  }, [tourId, zoneId]);

  // Draw the current step's segment and (re)start tracking whenever the map,
  // the geometry or the step changes (parity with Angular updateMapContent).
  useEffect(() => {
    if (!map || !geoJsonSet) return;

    let cancelled = false;
    let layerGroup: L.LayerGroup | null = null;

    void (async () => {
      const segment = getSegmentForStep(step);
      const segmentGeoJson = geoJsonSet[segment];
      const points = getStartAndEndPointsFromGeoJson(segmentGeoJson);
      if (!points) return;

      const group = await createLayerGroup(map);
      if (cancelled) {
        map.removeLayer(group);
        return;
      }
      layerGroup = group;
      tracker.stopTracking();

      try {
        // 1. Start/end markers of the drawn segment.
        await addStartEndMarkers(points.start, points.end, group);

        // 2. Solid route + direction arrows, or dashed fallback to the
        //    meeting point when the segment holds no route coordinates.
        const routeCoords = getLineCoordinates(segmentGeoJson);
        const hasRoute = routeCoords.length > 0;
        const drawnCoords = hasRoute
          ? routeCoords
          : getFallbackRouteCoords(segment, getZone(zoneId).meetingPoint.coordinates, points);

        await drawCoordinatesRoute(
          drawnCoords,
          group,
          hasRoute ? getDefaultRouteStyle() : getDashedRouteStyle(),
        );
        if (hasRoute) {
          const tour = findTour(zoneId, tourId);
          await addArrows(routeCoords, group, { distanceKm: getStepDistance(tour, step) });
        }

        // 3. Fit the view to the drawn route.
        await fitBoundsToCoords(map, drawnCoords);
        if (cancelled) return;

        // 4. GPS tracking, or debug simulation walking along the route.
        const { debug, timeout } = parseDebugParams(window.location.search);
        tracker.startTracking(map, {
          debug,
          debugTimeout: timeout,
          maxZoom: TRACKING_MAX_ZOOM,
          debugCoords: routeCoords,
        });
      } catch (err) {
        console.error('Error drawing tour map:', err);
      }
    })();

    return () => {
      cancelled = true;
      tracker.stopTracking();
      if (layerGroup) map.removeLayer(layerGroup);
    };
  }, [map, geoJsonSet, step, tracker, zoneId, tourId]);

  return <LeafletMap className={TOUR_MAP_CLASS} minZoom={13} onReady={setMap} />;
}
