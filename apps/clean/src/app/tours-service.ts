import { Injectable } from '@angular/core';

import {
  ALL_TOURS,
  findTour,
  findZoneTours,
  P_TOURS,
  Tour,
  TourType,
  V_TOURS,
} from './tours-queries';
import { DEFAULT_ZONE_ID, getZone, Zone, ZONES } from './zones';

export type { Tour, TourType } from './tours-queries';

@Injectable({ providedIn: 'root' })
export class ToursService {
  readonly zones: readonly Zone[] = ZONES;
  readonly defaultZoneId = DEFAULT_ZONE_ID;

  readonly vTours: Tour[] = V_TOURS;
  readonly pTours: Tour[] = P_TOURS;
  readonly allTours: Tour[] = ALL_TOURS;

  getZone(zoneId: string | null | undefined): Zone {
    return getZone(zoneId);
  }

  getZoneTours(zoneId: string | null | undefined, type: TourType): Tour[] {
    return findZoneTours(zoneId, type);
  }

  getTour(zoneId: string | null | undefined, name: string | null | undefined): Tour | undefined {
    return findTour(zoneId, name);
  }
}
