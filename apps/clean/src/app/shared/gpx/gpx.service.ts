import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { gpx } from '@tmcw/togeojson';
import { FeatureCollection, Position } from 'geojson';
import { firstValueFrom, Observable } from 'rxjs';
import { PARC_AN_2000 } from '../constants';
import { MapLocationService } from '../map/map-location.service';
import { StartEndPoints, TourGeoJsonSet } from '../map/map.types';

@Injectable({ providedIn: 'root' })
export class GpxService {
  private readonly http = inject(HttpClient);
  private readonly mapLocationService = inject(MapLocationService);

  readonly geoJson = signal<TourGeoJsonSet | null>(null);

  readonly links = signal<{ toStart: string; fromEnd: string }>({
    toStart: '',
    fromEnd: '',
  });

  loadGpxFile(tourId: string, type?: 'start' | 'end'): Observable<string> {
    return this.http.get(`/gpx/${tourId}/${tourId}${type ? `_${type}` : ''}.gpx`, {
      responseType: 'text',
    });
  }

  getGeoJsonFromGpx(gpxStr: string): FeatureCollection {
    const parsedGpx = new DOMParser().parseFromString(gpxStr, 'application/xml');
    return gpx(parsedGpx);
  }

  setAllGeoJson(start: string, tour: string, end: string): void {
    this.geoJson.set({
      start: this.getGeoJsonFromGpx(start),
      tour: this.getGeoJsonFromGpx(tour),
      end: this.getGeoJsonFromGpx(end),
    });
  }

  async getCoordinatesFromGpx(tourId: string, type: 'start' | 'tour' | 'end'): Promise<Position[]> {
    const gpxStr = await firstValueFrom(
      this.loadGpxFile(tourId, type === 'tour' ? undefined : type),
    );
    if (!gpxStr) return [];
    const geoJsonData = this.getGeoJsonFromGpx(gpxStr);
    const feature = geoJsonData.features[0];
    if (!feature || feature.geometry.type !== 'LineString') {
      return [];
    }
    return feature.geometry.coordinates;
  }

  getStartAndEndPointsFromGeoJson(geoJson: FeatureCollection): StartEndPoints | undefined {
    if (!geoJson?.features.length) return undefined;

    const firstFeature = geoJson.features[0];
    const geometry = firstFeature.geometry;

    if (!geometry) return undefined;

    if (geometry.type === 'LineString') {
      const coords = geometry.coordinates;
      if (coords.length === 0) return undefined;

      return {
        start: coords[0],
        end: coords[coords.length - 1],
      };
    }

    if (geometry.type === 'MultiLineString') {
      const lines = geometry.coordinates;
      if (!lines.length || !lines[0].length) return undefined;

      const firstLine = lines[0];
      const lastLine = lines[lines.length - 1];

      return {
        start: firstLine[0],
        end: lastLine[lastLine.length - 1],
      };
    }

    return undefined;
  }

  generateGeoVeloLinks(): void {
    const currentGeoJson = this.geoJson();
    if (!currentGeoJson) return;

    const points = this.getStartAndEndPointsFromGeoJson(currentGeoJson.tour);
    if (!points) return;

    const parcLat = PARC_AN_2000[0];
    const parcLon = PARC_AN_2000[1];

    const startLat = points.start[0];
    const startLon = points.start[1];

    const endLat = points.end[0];
    const endLon = points.end[1];

    this.links.set({
      // Parc de l'An 2000 -> GPX start
      toStart: `${this.getGeoVeloBaseUrl()}&from=${parcLat},${parcLon}&to=${startLat},${startLon}`,

      // GPX end -> Parc de l'An 2000
      fromEnd: `${this.getGeoVeloBaseUrl()}&from=${endLat},${endLon}&to=${parcLat},${parcLon}`,
    });
  }

  readonly geoVeloToParcAn2000Link = computed(() => {
    const parcLat = PARC_AN_2000[0];
    const parcLon = PARC_AN_2000[1];
    const pos = this.mapLocationService.currentPosition();
    const fromParam = pos ? `&from=${pos.lng},${pos.lat}` : '';

    return `${this.getGeoVeloBaseUrl()}&to=${parcLat},${parcLon}${fromParam}`;
  });

  private getGeoVeloBaseUrl(): string {
    const baseUrl = 'https://geovelo.app/fr/route/';
    const params = new URLSearchParams({
      'bike-type': 'own',
      'e-bike': 'false',
      zone: 'rennes',
    });

    return `${baseUrl}?${params.toString()}`;
  }
}
