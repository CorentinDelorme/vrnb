import { Injectable, signal } from '@angular/core';

export interface SavedTour {
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
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  save(tourId: string, step: number): void {
    const data: SavedTour = { tourId, step };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this._savedTour.set(data);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._savedTour.set(null);
  }
}
