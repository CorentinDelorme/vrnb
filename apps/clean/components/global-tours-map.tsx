'use client';

import type * as L from 'leaflet';

import { getLineCoordinates } from '../src/app/shared/gpx/tour-geojson';
import { loadTourRouteGeoJson } from '../src/app/shared/gpx/tour-geometry';
import { loadLeaflet } from '../src/app/shared/map/leaflet-loader';
import { addLabelMarker, addStartEndMarkers } from '../src/app/shared/map/map-marker';
import { drawGeoJsonRoute } from '../src/app/shared/map/map-route';
import { LeafletMap } from './leaflet-map';
import { findZoneTours, type Tour } from '../src/app/tours-queries';
import { ZONES } from '../src/app/zones';

/**
 * Global overview map of `/tours` — all tours from all zones and types
 * on one map, using the same per-zone color assignment as the zone maps
 * (so V1 and V200 both get the first color, V2 and V201 the second, etc.).
 */

// Parity exception: Leaflet consumes literal colors only (no CSS variables),
// so the legacy per-trace palette stays verbatim instead of DaisyUI tokens.
const TOUR_COLORS: readonly string[] = [
  'rgb(239, 68, 68)', // warm - red
  'rgb(59, 130, 246)', // cool - blue
  'rgb(249, 115, 22)', // warm - orange
  'rgb(20, 184, 184)', // cool - teal
  'rgb(245, 158, 11)', // warm - amber
  'rgb(67, 56, 202)', // cool - indigo
  'rgb(234, 179, 8)', // warm - yellow
  'rgb(16, 185, 129)', // cool - emerald
  'rgb(236, 72, 153)', // warm - pink
  'rgb(14, 165, 233)', // cool - sky
  'rgb(219, 39, 119)', // warm - rose
  'rgb(6, 182, 212)', // cool - cyan
  'rgb(250, 204, 21)', // warm - gold
  'rgb(34, 197, 94)', // cool - green
  'rgb(244, 114, 182)', // warm - coral
  'rgb(168, 85, 247)', // cool - violet
  'rgb(153, 101, 21)', // warm - brown
  'rgb(126, 34, 206)', // cool - fuchsia
  'rgb(255, 99, 71)', // warm - tomato
  'rgb(132, 204, 22)', // cool/warm - lime
];

interface GlobalTourEntry {
  readonly tour: Tour;
  readonly zoneIndex: number; // index within its zone for its type (for color)
}

export function GlobalToursMap() {
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
      const color = TOUR_COLORS[entry.zoneIndex % TOUR_COLORS.length];
      const geoJson = await loadTourRouteGeoJson({ zoneId: entry.tour.zoneId, tourId: entry.tour.name });
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