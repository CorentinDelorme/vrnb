import { computed, inject, Injectable, signal } from '@angular/core';
import { FeatureCollection, Position } from 'geojson';
import { from, Observable } from 'rxjs';

import { DEFAULT_ZONE_ID, getZone } from '../../zones';
import { MapLocationService } from '../map/map-location.service';
import { StartEndPoints, TourGeoJsonSet } from '../map/map.types';
import {
  buildGeoVeloToMeetingPointLink,
  fetchGpxFile,
  generateGeoVeloLinks,
  GeoVeloLinks,
  getGeoJsonFromGpx,
  getStartAndEndPointsFromGeoJson,
} from './gpx';

@Injectable({ providedIn: 'root' })
export class GpxService {
  private readonly mapLocationService = inject(MapLocationService);

  readonly geoJson = signal<TourGeoJsonSet | null>(null);

  /** Zone context for meeting-point-dependent links. Set by the current view. */
  readonly zoneId = signal<string>(DEFAULT_ZONE_ID);

  private readonly meetingPoint = computed(() => getZone(this.zoneId()).meetingPoint);

  readonly links = signal<GeoVeloLinks>({
    toStart: '',
    fromEnd: '',
  });

  loadGpxFile(tourId: string, type?: 'start' | 'end', zoneId?: string): Observable<string> {
    return from(fetchGpxFile(tourId, type, zoneId ?? this.zoneId()));
  }

  getGeoJsonFromGpx(gpxStr: string): FeatureCollection {
    return getGeoJsonFromGpx(gpxStr);
  }

  setAllGeoJson(start: string, tour: string, end: string): void {
    this.geoJson.set({
      start: this.getGeoJsonFromGpx(start),
      tour: this.getGeoJsonFromGpx(tour),
      end: this.getGeoJsonFromGpx(end),
    });
  }

  async getCoordinatesFromGpx(
    tourId: string,
    type: 'start' | 'tour' | 'end',
    zoneId?: string,
  ): Promise<Position[]> {
    const gpxStr = await fetchGpxFile(tourId, type === 'tour' ? undefined : type, zoneId);
    if (!gpxStr) return [];
    const geoJsonData = this.getGeoJsonFromGpx(gpxStr);
    const feature = geoJsonData.features[0];
    if (!feature || feature.geometry.type !== 'LineString') {
      return [];
    }
    return feature.geometry.coordinates;
  }

  getStartAndEndPointsFromGeoJson(geoJson: FeatureCollection): StartEndPoints | undefined {
    return getStartAndEndPointsFromGeoJson(geoJson);
  }

  generateGeoVeloLinks(): void {
    const links = generateGeoVeloLinks(this.geoJson()?.tour, this.meetingPoint().coordinates);
    if (links) this.links.set(links);
  }

  readonly geoVeloToMeetingPointLink = computed(() =>
    buildGeoVeloToMeetingPointLink(
      this.meetingPoint().coordinates,
      this.mapLocationService.currentPosition(),
    ),
  );
}
