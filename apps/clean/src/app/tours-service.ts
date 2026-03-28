import { Injectable } from '@angular/core';
import { toursData } from './tours-data';

export interface Tour {
  name: string;
  distance: number;
  startDistance: number;
  endDistance: number;
}

@Injectable({ providedIn: 'root' })
export class ToursService {
  readonly vTours: Tour[] = toursData.vTours;
  readonly pTours: Tour[] = toursData.pTours;
  readonly allTours: Tour[] = [...this.vTours, ...this.pTours];
}
