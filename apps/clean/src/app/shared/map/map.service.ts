import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { FullScreen } from 'leaflet.fullscreen';
import { MapInitOptions } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapService {
  readonly maxBounds: L.LatLngBoundsExpression = L.latLngBounds(
    [47.974278, -1.789123], // Southwest corner
    [48.032512, -1.697445], // Northeast corner
  );

  createMap(options: MapInitOptions): L.Map {
    const map = new L.Map(options.elementId);

    new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://www.osm.org">OpenStreetMap</a>',
      minZoom: options.minZoom,
      zIndex: 0,
    }).addTo(map);

    if (options.fullscreen) {
      map.addControl(
        new FullScreen({
          position: 'topleft',
        }),
      );
    }

    map.setMaxBounds(options.maxBounds);

    return map;
  }

  createLayerGroup(map: L.Map): L.LayerGroup {
    const layerGroup = new L.LayerGroup();
    layerGroup.addTo(map);
    return layerGroup;
  }

  clearLayers(map: L.Map, layerGroup: L.LayerGroup): L.LayerGroup {
    map.removeLayer(layerGroup);
    return this.createLayerGroup(map);
  }
}
