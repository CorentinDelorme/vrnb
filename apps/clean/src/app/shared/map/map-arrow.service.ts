import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import * as L from 'leaflet';
import 'leaflet-arrowheads';
import { ArrowOptions } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapArrowService {
  computeFrequency(distanceKm: number): number {
    const totalDistanceMeters = distanceKm * 1000;

    if (totalDistanceMeters < 1000) {
      return 125;
    } else if (totalDistanceMeters < 1500) {
      return 200;
    } else if (totalDistanceMeters < 2000) {
      return 250;
    }
    return 300;
  }

  addArrows(coords: Position[], layerGroup: L.LayerGroup, options: ArrowOptions): void {
    const polyline = L.polyline(coords.map((c) => L.latLng(c[1], c[0]))).addTo(layerGroup);
    const frequency = this.computeFrequency(options.distanceKm);

    polyline.arrowheads({
      frequency: `${frequency}m`,
      size: '25%',
      fill: true,
    });
  }
}
