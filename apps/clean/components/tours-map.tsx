'use client';

import type * as L from 'leaflet';

import { getLineCoordinates } from '../src/app/shared/gpx/tour-geojson';
import { loadTourRouteGeoJson } from '../src/app/shared/gpx/tour-geometry';
import { loadLeaflet } from '../src/app/shared/map/leaflet-loader';
import { getZoneBounds, zoneMinZoom } from '../src/app/shared/map/map';
import { addLabelMarker, addStartEndMarkers } from '../src/app/shared/map/map-marker';
import { drawGeoJsonRoute } from '../src/app/shared/map/map-route';
import { LeafletMap } from './leaflet-map';

/**
 * Zone overview map of `/tours/[zoneId]/[type]` — port of the legacy Angular
 * `ToursMap` component (spec #3): one colored polyline per tour, small start/end
 * markers, a label at the middle of each trace, and the view fitted to all
 * traces. The 20-color palette is kept verbatim from the legacy component for
 * visual parity.
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

interface ToursMapProps {
  readonly zoneId: string;
  /** Tour names of the zone for the practice type, in display order. */
  readonly tours: readonly string[];
}

export function ToursMap({ zoneId, tours }: ToursMapProps) {
  const drawTours = async (map: L.Map): Promise<void> => {
    const leaflet = await loadLeaflet();

    // The zone's bounds (meeting point + all traces) are resolved by the shared
    // helper, so the map is clamped to the whole zone with a margin.
    const zoneBounds = await getZoneBounds(zoneId);
    if (!zoneBounds) return;

    for (const [index, tourId] of tours.entries()) {
      const color = TOUR_COLORS[index % TOUR_COLORS.length];
      const geoJson = await loadTourRouteGeoJson({ zoneId, tourId });
      if (!geoJson) continue;

      try {
        // 1. Draw the colored route.
        await drawGeoJsonRoute(geoJson, map, { color, weight: 4 });

        // 2. Start/end markers (small size for the overview map).
        const coords = getLineCoordinates(geoJson);
        const start = coords[0];
        const end = coords[coords.length - 1];
        if (start && end) {
          await addStartEndMarkers(start, end, map, 'small');

          // 3. Label marker at the middle of the trace.
          const midCoord = coords[Math.floor(coords.length / 2)];
          await addLabelMarker(
            { position: leaflet.latLng(midCoord[1], midCoord[0]), text: tourId, color },
            map,
          );
        }
      } catch (err) {
        console.error(`Error processing GPX for ${tourId}:`, err);
      }
    }

    // Clamp panning to this zone's traces plus a margin all around, so a
    // visitor on one zone's map can't pan into a neighboring zone
    // (e.g. bruz-sud reaching ker-lann). fitBounds centers the view on the
    // traces; setMaxBounds keeps the map inside them with padding.
    const padded = zoneBounds.pad(0.2);
    map.setMaxBounds(padded);
    // Prevent zooming out beyond the zone (a slack level so it doesn't stick
    // to the screen edges).
    map.setMinZoom(zoneMinZoom(map, padded));
    map.fitBounds(zoneBounds);
  };

  return <LeafletMap onReady={drawTours} />;
}
