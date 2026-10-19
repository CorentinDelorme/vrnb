import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import type * as L from 'leaflet';

import { addLabelMarker, addStartEndMarkers } from './map-marker';
import { LabelMarkerOptions, MarkerSize } from './map.types';

@Injectable({ providedIn: 'root' })
export class MapMarkerService {
  addStartEndMarkers(
    start: Position,
    end: Position,
    target: L.Map | L.LayerGroup,
    size: MarkerSize = 'normal',
  ): Promise<void> {
    return addStartEndMarkers(start, end, target, size);
  }

  addLabelMarker(options: LabelMarkerOptions, target: L.Map | L.LayerGroup): Promise<void> {
    return addLabelMarker(options, target);
  }
}
