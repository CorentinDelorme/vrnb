'use client';

import type * as L from 'leaflet';
import type { ReactElement } from 'react';

import { getTrackColorRgb } from '../lib/map-colors';
import { getLineCoordinates } from '../src/app/shared/gpx/tour-geojson';
import { loadTourRouteGeoJson } from '../src/app/shared/gpx/tour-geometry';
import { loadLeaflet } from '../src/app/shared/map/leaflet-loader';
import { addLabelMarker, addStartEndMarkers } from '../src/app/shared/map/map-marker';
import { drawGeoJsonRoute } from '../src/app/shared/map/map-route';
import { findZoneTours, type Tour } from '../src/app/tours-queries';
import { ZONES } from '../src/app/zones';
import { LeafletMap } from './leaflet-map';

/**
 * Global overview map of `/tours` — all tours from all zones and types
 * on one map, using the same per-zone color assignment as the zone maps
 * (so V1 and V200 both get the first color, V2 and V201 the second, etc.).
 */

/**
 * Color assignment uses the shared palette from `lib/map-colors`.
 * Parity exception: Leaflet consumes literal colors only (no CSS variables),
 * so the legacy per-trace palette stays verbatim instead of DaisyUI tokens.
 */

interface GlobalTourEntry {
  readonly tour: Tour;
  readonly zoneIndex: number; // index within its zone for its type (for color)
}

export function GlobalToursMap(): ReactElement {
  // Build the list of all tours with their zone-local index for color assignment
  const allTours: GlobalTourEntry[] = [];

  for (const zone of ZONES) {
    // Bike tours for this zone
    const bikeTours = findZoneTours(zone.id, 'V');
    for (const [index, tour] of bikeTours.entries()) {
      allTours.push({ tour, zoneIndex: index });
    }

    // Walking tours for this zone
    const walkingTours = findZoneTours(zone.id, 'P');
    for (const [index, tour] of walkingTours.entries()) {
      allTours.push({ tour, zoneIndex: index });
    }
  }

  const drawTours = async (map: L.Map): Promise<void> => {
    const leaflet = await loadLeaflet();
    const allBounds = leaflet.latLngBounds([]);

    for (const entry of allTours) {
      const color = getTrackColorRgb(entry.zoneIndex);
      const geoJson = await loadTourRouteGeoJson({
        zoneId: entry.tour.zoneId,
        tourId: entry.tour.name,
      });
      if (!geoJson) continue;

      try {
        // 1. Draw the colored route.
        const geojsonLayer = await drawGeoJsonRoute(geoJson, map, { color, weight: 4 });

        // 2. Start/end markers (small size for the overview map).
        const coords = getLineCoordinates(geoJson);
        const start = coords[0];
        const end = coords[coords.length - 1];
        if (start && end) {
          await addStartEndMarkers(start, end, map, 'small');

          // 3. Label marker at the middle of the trace.
          const midCoord = coords[Math.floor(coords.length / 2)];
          await addLabelMarker(
            { position: leaflet.latLng(midCoord[1], midCoord[0]), text: entry.tour.name, color },
            map,
          );
        }

        // 4. Grow the bounds of every trace, fitted once all tours are drawn.
        allBounds.extend(geojsonLayer.getBounds());
      } catch (err) {
        console.error(`Error processing GPX for ${entry.tour.name}:`, err);
      }
    }

    if (allBounds.isValid()) {
      map.fitBounds(allBounds);
    }
  };

  return <LeafletMap onReady={drawTours} />;
}
