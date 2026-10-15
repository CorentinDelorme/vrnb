import { Injectable } from '@angular/core';

import { toursData } from './tours-data';
import { DEFAULT_ZONE_ID, ZONES, Zone } from './zones';

export interface Tour {
  name: string;
  distance: number;
  startDistance: number;
  endDistance: number;
  zoneId: string;
}

export type TourType = 'P' | 'V';

@Injectable({ providedIn: 'root' })
export class ToursService {
  readonly zones: readonly Zone[] = ZONES;
  readonly defaultZoneId = DEFAULT_ZONE_ID;

  readonly vTours: Tour[] = toursData.vTours;
  readonly pTours: Tour[] = toursData.pTours;
  readonly allTours: Tour[] = [...this.vTours, ...this.pTours];

  getZone(zoneId: string | null | undefined): Zone {
    return this.zones.find((zone) => zone.id === zoneId) ?? this.zones[0];
  }

  getZoneTours(zoneId: string | null | undefined, type: TourType): Tour[] {
    const zone = this.getZone(zoneId);
    const tours = type === 'V' ? this.vTours : this.pTours;
    return tours.filter((tour) => tour.zoneId === zone.id);
  }

  getTour(zoneId: string | null | undefined, name: string | null | undefined): Tour | undefined {
    if (!name) return undefined;
    const zone = this.getZone(zoneId);
    return this.allTours.find((tour) => tour.zoneId === zone.id && tour.name === name);
  }
}
