import { AfterViewInit, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { GpxService } from '../shared/gpx/gpx.service';
import { MapMarkerService } from '../shared/map/map-marker.service';
import { MapRouteService } from '../shared/map/map-route.service';
import { MapService } from '../shared/map/map.service';
import { Tour as TourInterface, ToursService } from '../tours-service';

@Component({
  selector: 'app-tours-map',
  standalone: true,
  imports: [],
  templateUrl: './tours-map.html',
})
export class ToursMap implements AfterViewInit {
  private readonly gpxService = inject(GpxService);
  private readonly toursService = inject(ToursService);
  private readonly mapService = inject(MapService);
  private readonly mapRouteService = inject(MapRouteService);
  private readonly mapMarkerService = inject(MapMarkerService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  private map?: L.Map;
  private tours: TourInterface[] = [];

  private readonly colors = [
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

  constructor() {
    const type = this.route.snapshot.paramMap.get('type');
    if (type === 'V') {
      this.tours = this.toursService.vTours;
      this.title.setTitle('Parcours à vélo');
    } else if (type === 'P') {
      this.tours = this.toursService.pTours;
      this.title.setTitle('Parcours à pied');
    }
  }

  ngAfterViewInit(): void {
    this.map = this.mapService.createMap({
      elementId: 'map',
      minZoom: 12,
      maxBounds: this.mapService.maxBounds,
      fullscreen: true,
    });
    this.loadAllTours();
  }

  private loadAllTours(): void {
    if (!this.map) return;

    for (let i = 0; i < this.tours.length; i++) {
      const tourId = this.tours[i].name;
      const color = this.colors[i % this.colors.length];

      this.gpxService.loadGpxFile(tourId).subscribe((gpxStr) => {
        this.addGpxToMap(gpxStr, color, tourId);
      });
    }
  }

  private addGpxToMap(gpxStr: string, color: string, tourId: string): void {
    if (!this.map) return;

    try {
      // 1. Convert GPX to GeoJSON
      const geojson = this.gpxService.getGeoJsonFromGpx(gpxStr);

      // 2. Draw the route
      const geojsonLayer = this.mapRouteService.drawGeoJsonRoute(geojson, this.map, {
        color,
        weight: 4,
      });

      // 3. Extract start/end coords and add markers
      const firstFeature = geojson.features[0];
      if (firstFeature && firstFeature.geometry.type === 'LineString') {
        const coords = firstFeature.geometry.coordinates;
        const start = coords[0];
        const end = coords[coords.length - 1];

        // 4. Add start/end markers (small size for overview)
        this.mapMarkerService.addStartEndMarkers(start, end, this.map, 'small');

        // 5. Calculate label position (midpoint of coordinates)
        const midIdx = Math.floor(coords.length / 2);
        const midCoord = coords[midIdx];
        const labelPos = L.latLng(midCoord[1], midCoord[0]);

        // 6. Add label marker
        this.mapMarkerService.addLabelMarker({ position: labelPos, text: tourId, color }, this.map);
      }

      // 7. Fit bounds
      this.map.fitBounds(geojsonLayer.getBounds());
    } catch (err) {
      console.error(`Error processing GPX for ${tourId}:`, err);
    }
  }
}
