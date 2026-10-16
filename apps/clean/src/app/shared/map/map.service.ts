import { Injectable } from '@angular/core';
import type * as L from 'leaflet';

import type { MapInitOptions } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapService {
  readonly maxBounds: L.LatLngBoundsExpression = [
    [47.974278, -1.789123], // Southwest corner
    [48.062, -1.697445], // Northeast corner
  ];

  async createMap(options: MapInitOptions): Promise<L.Map> {
    const L = await import('leaflet');
    const map = new L.Map(options.elementId);

    new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>',
      minZoom: options.minZoom,
      zIndex: 0,
    }).addTo(map);

    if (options.fullscreen) {
      const { FullScreen } = await import('leaflet.fullscreen');
      map.addControl(
        new FullScreen({
          position: 'topleft',
        }),
      );
    }

    map.setMaxBounds(options.maxBounds);

    return map;
  }

  async createLayerGroup(map: L.Map): Promise<L.LayerGroup> {
    const L = await import('leaflet');
    const layerGroup = new L.LayerGroup();
    layerGroup.addTo(map);
    return layerGroup;
  }

  async clearLayers(map: L.Map, layerGroup: L.LayerGroup): Promise<L.LayerGroup> {
    map.removeLayer(layerGroup);
    return this.createLayerGroup(map);
  }
}
