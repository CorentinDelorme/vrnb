import { computed, inject, Injectable, signal } from '@angular/core';
import { FeatureCollection } from 'geojson';

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
import { fetchTourGeoJsonSet } from './tour-geojson';

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

  /**
   * Load the map data for a parcours: the precomputed GeoJSON asset when it
   * exists, otherwise the GPX files fetched and parsed at runtime.
   */
  async loadTourGeoJson(tourId: string, zoneId?: string): Promise<TourGeoJsonSet | null> {
    const zone = zoneId ?? this.zoneId();

    const precomputed = await fetchTourGeoJsonSet(tourId, zone);
    if (precomputed) return precomputed;

    const [start, tour, end] = await Promise.all([
      fetchGpxFile(tourId, 'start', zone),
      fetchGpxFile(tourId, undefined, zone),
      fetchGpxFile(tourId, 'end', zone),
    ]);
    return {
      start: getGeoJsonFromGpx(start),
      tour: getGeoJsonFromGpx(tour),
      end: getGeoJsonFromGpx(end),
    };
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
