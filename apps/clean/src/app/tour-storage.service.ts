import { Injectable, signal } from '@angular/core';

import { clearSavedTour, loadSavedTour, SavedTour, saveTour } from './tour-storage';
import { DEFAULT_ZONE_ID } from './zones';

@Injectable({ providedIn: 'root' })
export class TourStorageService {
  private _savedTour = signal<SavedTour | null>(loadSavedTour());

  readonly savedTour = this._savedTour.asReadonly();

  save(tourId: string, step: number, zoneId: string = DEFAULT_ZONE_ID): void {
    const data = saveTour(tourId, step, zoneId);
    if (data) this._savedTour.set(data);
  }

  clear(): void {
    clearSavedTour();
    this._savedTour.set(null);
  }
}
