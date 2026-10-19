import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import type * as L from 'leaflet';

import { addArrows, computeFrequency } from './map-arrow';
import { ArrowOptions } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapArrowService {
  computeFrequency(distanceKm: number): number {
    return computeFrequency(distanceKm);
  }

  addArrows(coords: Position[], layerGroup: L.LayerGroup, options: ArrowOptions): Promise<void> {
    return addArrows(coords, layerGroup, options);
  }
}
