import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TourService {
  tourId = signal<string | null>(null);

  clear(): void {
    this.tourId.set(null);
  }
}
