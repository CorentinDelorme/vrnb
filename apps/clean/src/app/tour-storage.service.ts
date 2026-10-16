import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { DEFAULT_ZONE_ID } from './zones';

export interface SavedTour {
  tourId: string;
  step: number;
  zoneId: string;
}

const STORAGE_KEY = 'vrnb_tour';

@Injectable({ providedIn: 'root' })
export class TourStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private _savedTour = signal<SavedTour | null>(this.load());

  readonly savedTour = this._savedTour.asReadonly();

  private load(): SavedTour | null {
    if (!this.isBrowser) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data) as SavedTour;
      return parsed;
    } catch {
      return null;
    }
  }

  save(tourId: string, step: number, zoneId: string = DEFAULT_ZONE_ID): void {
    if (!this.isBrowser) return;
    const data: SavedTour = { tourId, step, zoneId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this._savedTour.set(data);
  }

  clear(): void {
    if (!this.isBrowser) {
      this._savedTour.set(null);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    this._savedTour.set(null);
  }
}
