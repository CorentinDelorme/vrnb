'use client';

import type { FeatureCollection } from 'geojson';
import type * as L from 'leaflet';

import { fetchGpxFile, getGeoJsonFromGpx } from '../src/app/shared/gpx/gpx';
import { fetchTourRouteGeoJson, getLineCoordinates } from '../src/app/shared/gpx/tour-geojson';
import { loadLeaflet } from '../src/app/shared/map/leaflet-loader';
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
    const allBounds = leaflet.latLngBounds([]);

    for (const [index, tourId] of tours.entries()) {
      const color = TOUR_COLORS[index % TOUR_COLORS.length];
      const geoJson = await loadTourGeoJson(tourId, zoneId);
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
            { position: leaflet.latLng(midCoord[1], midCoord[0]), text: tourId, color },
            map,
          );
        }

        // 4. Grow the bounds of every trace, fitted once all tours are drawn.
        allBounds.extend(geojsonLayer.getBounds());
      } catch (err) {
        console.error(`Error processing GPX for ${tourId}:`, err);
      }
    }

    if (allBounds.isValid()) {
      map.fitBounds(allBounds);
    }
  };

  return <LeafletMap onReady={drawTours} />;
}

/** Precomputed GeoJSON first, GPX parsing fallback (same as the legacy map). */
async function loadTourGeoJson(tourId: string, zoneId: string): Promise<FeatureCollection | null> {
  try {
    const geoJson = await fetchTourRouteGeoJson(tourId, zoneId);
    if (geoJson) return geoJson;
  } catch (err) {
    console.error(`Error loading precomputed GeoJSON for ${tourId}:`, err);
  }

  try {
    const gpxStr = await fetchGpxFile(tourId, undefined, zoneId);
    return getGeoJsonFromGpx(gpxStr);
  } catch (err) {
    console.error(`Error processing GPX for ${tourId}:`, err);
    return null;
  }
}
