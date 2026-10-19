import { Injectable } from '@angular/core';
import type * as L from 'leaflet';

import { clearLayers, createLayerGroup, createMap, MAX_BOUNDS } from './map';
import type { MapInitOptions } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapService {
  readonly maxBounds: L.LatLngBoundsExpression = MAX_BOUNDS;

  createMap(options: MapInitOptions): Promise<L.Map> {
    return createMap(options);
  }

  createLayerGroup(map: L.Map): Promise<L.LayerGroup> {
    return createLayerGroup(map);
  }

  clearLayers(map: L.Map, layerGroup: L.LayerGroup): Promise<L.LayerGroup> {
    return clearLayers(map, layerGroup);
  }
}
