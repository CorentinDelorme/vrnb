import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import type * as L from 'leaflet';

import { loadLeaflet } from './leaflet-loader';
import { LabelMarkerOptions, MarkerSize } from './map.types';

interface IconSizeConfig {
  readonly iconSize: [number, number];
  readonly iconAnchor: [number, number];
}

@Injectable({ providedIn: 'root' })
export class MapMarkerService {
  private readonly ICON_SIZES: Record<MarkerSize, IconSizeConfig> = {
    normal: { iconSize: [33, 45], iconAnchor: [16, 45] },
    small: { iconSize: [22, 30], iconAnchor: [11, 30] },
  };

  async addStartEndMarkers(
    start: Position,
    end: Position,
    target: L.Map | L.LayerGroup,
    size: MarkerSize = 'normal',
  ): Promise<void> {
    await this.addMarker(start[1], start[0], 'start', target, size);
    await this.addMarker(end[1], end[0], 'end', target, size);
  }

  async addLabelMarker(options: LabelMarkerOptions, target: L.Map | L.LayerGroup): Promise<void> {
    const L = await loadLeaflet();
    const labelHtml = `<div style="background:${options.color};color:#fff;padding:2px 6px;border-radius:4px;font-size:14px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${options.text}</div>`;
    const dIcon = L.divIcon({ className: 'tour-label', html: labelHtml, iconSize: undefined });

    L.marker(options.position, { interactive: false, icon: dIcon }).addTo(target);
  }

  private async addMarker(
    lat: number,
    lng: number,
    type: 'start' | 'end',
    target: L.Map | L.LayerGroup,
    size: MarkerSize,
  ): Promise<void> {
    const L = await loadLeaflet();
    const sizeConfig = this.ICON_SIZES[size];
    const iconUrl = type === 'start' ? '/media/pin-icon-start.png' : '/media/pin-icon-end.png';

    L.marker([lat, lng], {
      icon: L.icon({
        iconUrl,
        iconSize: sizeConfig.iconSize,
        iconAnchor: sizeConfig.iconAnchor,
      }),
    }).addTo(target);
  }
}
