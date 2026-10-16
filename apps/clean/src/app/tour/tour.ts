import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import confetti from 'canvas-confetti';
import { Position } from 'geojson';
import type * as L from 'leaflet';
import { forkJoin } from 'rxjs';
import { FinishModal } from '../finish-modal/finish-modal';
import { GpxService } from '../shared/gpx/gpx.service';
import { loadLeaflet } from '../shared/map/leaflet-loader';
import { MapArrowService } from '../shared/map/map-arrow.service';
import { MapLocationService } from '../shared/map/map-location.service';
import { MapMarkerService } from '../shared/map/map-marker.service';
import { MapRouteService } from '../shared/map/map-route.service';
import { MapService } from '../shared/map/map.service';
import { TourStorageService } from '../tour-storage.service';
import { ToursService } from '../tours-service';
import { TourService } from './tour-service';

@Component({
  selector: 'app-tour',
  standalone: true,
  imports: [FinishModal],
  templateUrl: './tour.html',
})
export class Tour implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly mapService = inject(MapService);
  private readonly mapRouteService = inject(MapRouteService);
  private readonly mapMarkerService = inject(MapMarkerService);
  private readonly mapArrowService = inject(MapArrowService);
  private readonly mapLocationService = inject(MapLocationService);
  readonly gpxService = inject(GpxService);
  private readonly tourStorage = inject(TourStorageService);
  private readonly tourService = inject(TourService);
  private readonly toursService = inject(ToursService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private map?: L.Map;
  private layerGroup?: L.LayerGroup;
  private mapInitialized = false;
  private readonly zoneId: string;
  step = signal(0);
  private readonly debug = {
    active: false,
    timeout: 500,
  };

  // Read route params and restore saved step
  constructor() {
    const zone = this.toursService.getZone(this.route.snapshot.paramMap.get('zoneId'));
    this.zoneId = zone.id;
    this.gpxService.zoneId.set(this.zoneId);
    this.tourService.tourId.set(this.route.snapshot.paramMap.get('id'));
    const currentTourId = this.tourService.tourId();
    this.title.setTitle(`${zone.name} - Parcours ${currentTourId}`);
    this.debug.active = this.route.snapshot.queryParamMap.get('debug') === 'true';
    this.debug.timeout = Number(this.route.snapshot.queryParamMap.get('timeout')) || 500;

    if (this.isBrowser) {
      const savedTour = this.tourStorage.savedTour();
      if (savedTour && savedTour.tourId === currentTourId && savedTour.zoneId === this.zoneId) {
        this.step.set(savedTour.step);
      } else if (currentTourId) {
        this.tourStorage.save(currentTourId, 0, this.zoneId);
      }

      this.loadGpxFiles();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    void this.initMap();
  }

  // Load the 3 GPX files
  private loadGpxFiles(): void {
    const tourId = this.tourService.tourId();
    if (!tourId) return;

    forkJoin({
      start: this.gpxService.loadGpxFile(tourId, 'start', this.zoneId),
      tour: this.gpxService.loadGpxFile(tourId, undefined, this.zoneId),
      end: this.gpxService.loadGpxFile(tourId, 'end', this.zoneId),
    }).subscribe({
      next: (files: { start: string; tour: string; end: string }) => {
        this.gpxService.setAllGeoJson(files.start, files.tour, files.end);
        this.gpxService.generateGeoVeloLinks();
        if (this.mapInitialized) {
          void this.updateMapContent();
        } else {
          void this.initMap();
        }
      },
      error: (err: Error) => console.error('Error loading GPX files:', err),
    });
  }

  private async initMap(): Promise<void> {
    if (this.mapInitialized || !this.gpxService.geoJson()?.tour) return;

    try {
      this.map = await this.mapService.createMap({
        elementId: 'map',
        minZoom: 13,
        maxBounds: this.mapService.maxBounds,
        fullscreen: true,
      });
    } catch (error) {
      console.error('Error creating map:', error);
      return;
    }

    this.layerGroup = await this.mapService.createLayerGroup(this.map);
    this.mapInitialized = true;
    await this.updateMapContent();
  }

  private async updateMapContent(): Promise<void> {
    if (!this.map || !this.gpxService.geoJson()?.tour || !this.layerGroup) return;

    this.layerGroup = await this.mapService.clearLayers(this.map, this.layerGroup);
    this.mapLocationService.stopTracking();

    if (this.step() === 0) {
      await this.updateMap('start');
    } else if (this.step() === 2) {
      await this.updateMap('end');
    } else {
      await this.updateMap('tour');
    }
  }

  private async updateMap(gpxType: 'start' | 'tour' | 'end'): Promise<void> {
    const geoJsonSet = this.gpxService.geoJson();
    if (!this.map || !geoJsonSet || !this.layerGroup) return;

    const points = this.gpxService.getStartAndEndPointsFromGeoJson(geoJsonSet[gpxType]);
    if (!points) return;

    await this.mapMarkerService.addStartEndMarkers(points.start, points.end, this.layerGroup);

    const routeCoords = await this.gpxService.getCoordinatesFromGpx(
      this.tourService.tourId()!,
      gpxType,
      this.zoneId,
    );

    if (routeCoords && routeCoords.length > 0) {
      await this.mapRouteService.drawCoordinatesRoute(
        routeCoords,
        this.layerGroup,
        this.mapRouteService.getDefaultRouteStyle(),
      );
      await this.mapArrowService.addArrows(routeCoords, this.layerGroup, {
        distanceKm: this.getCurrentTourDistance(this.step()),
      });
      await this.fitBoundsFromCoords(routeCoords);
    } else {
      const meetingCoords = this.toursService.getZone(this.zoneId).meetingPoint.coordinates;
      const fallbackCoords =
        gpxType === 'start' ? [meetingCoords, points.start] : [points.end, meetingCoords];
      await this.mapRouteService.drawCoordinatesRoute(
        fallbackCoords,
        this.layerGroup,
        this.mapRouteService.getDashedRouteStyle(),
      );
      await this.fitBoundsFromCoords(fallbackCoords);
    }

    this.startLocationTracking();
  }

  nextStep(): void {
    if (this.step() < 2) {
      this.setStep(this.step() + 1);
    }
  }

  prevStep(): void {
    if (this.step() > 0) {
      this.setStep(this.step() - 1);
    }
  }

  finish(): void {
    // @ts-expect-error Open the modal using ID.showModal() method
    finish_modal.showModal();
    this.throwConfetti();
    this.tourStorage.clear();
  }

  ngOnDestroy(): void {
    this.mapLocationService.stopTracking();
  }

  // --- Private helpers ---

  private setStep(step: number): void {
    this.step.set(step);

    if (this.mapInitialized) {
      void this.updateMapContent();
    }

    const tourId = this.tourService.tourId();
    if (tourId) {
      this.tourStorage.save(tourId, this.step(), this.zoneId);
    }
  }

  private getCurrentTourDistance(step: number): number {
    const tour = this.toursService.getTour(this.zoneId, this.tourService.tourId());
    if (!tour) return 0;

    const distances = [tour.startDistance, tour.distance, tour.endDistance] as const;
    return distances[step];
  }

  private async fitBoundsFromCoords(coords: Position[]): Promise<void> {
    if (!this.map) return;
    const L = await loadLeaflet();
    const bounds = L.latLngBounds(coords.map((c) => [c[1], c[0]] as [number, number]));
    this.map.fitBounds(bounds);
  }

  private startLocationTracking(): void {
    if (!this.map) return;

    const currentGeoJson = this.gpxService.geoJson();
    let debugCoords: Position[] = [];

    if (this.debug.active && currentGeoJson) {
      const geoJsonForStep =
        this.step() === 0
          ? currentGeoJson.start
          : this.step() === 2
            ? currentGeoJson.end
            : currentGeoJson.tour;

      if (geoJsonForStep?.features[0]?.geometry.type === 'LineString') {
        debugCoords = geoJsonForStep.features[0].geometry.coordinates;
      }
    }

    this.mapLocationService.startTracking(this.map, {
      debug: this.debug.active,
      debugTimeout: this.debug.timeout,
      maxZoom: 16,
      debugCoords,
    });
  }

  private throwConfetti(): void {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }
}
