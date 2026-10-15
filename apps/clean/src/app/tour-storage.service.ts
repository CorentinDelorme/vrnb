import { Injectable, signal } from '@angular/core';

import { DEFAULT_ZONE_ID } from './zones';

export interface SavedTour {
  tourId: string;
  step: number;
  zoneId: string;
}

/** Legacy save format, before zones were introduced (implicitly Bruz Sud). */
interface LegacySavedTour {
  tourId: string;
  step: number;
}

const STORAGE_KEY = 'vrnb_tour';

@Injectable({ providedIn: 'root' })
export class TourStorageService {
  private _savedTour = signal<SavedTour | null>(this.load());

  readonly savedTour = this._savedTour.asReadonly();

  private load(): SavedTour | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data) as SavedTour | LegacySavedTour;
      // Migrate legacy saves (no zoneId) to the default zone.
      if (!('zoneId' in parsed) || typeof parsed.zoneId !== 'string') {
        return { tourId: parsed.tourId, step: parsed.step, zoneId: DEFAULT_ZONE_ID };
      }
      return parsed;
    } catch {
      return null;
    }
  }

  save(tourId: string, step: number, zoneId: string = DEFAULT_ZONE_ID): void {
    const data: SavedTour = { tourId, step, zoneId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this._savedTour.set(data);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._savedTour.set(null);
  }
}
