import { Routes } from '@angular/router';
import { Tour } from './tour/tour';
import { ToursList } from './tours-list/tours-list';
import { ToursMap } from './tours-map/tours-map';

export const routes: Routes = [
  {
    path: 'tours/:zoneId/:type',
    component: ToursMap,
  },
  {
    // Legacy URL (pre-zone): defaults to the Bruz Sud zone.
    path: 'tours/:type',
    component: ToursMap,
  },
  {
    path: 'tour/:zoneId/:id',
    component: Tour,
  },
  {
    // Legacy URL (pre-zone): defaults to the Bruz Sud zone.
    path: 'tour/:id',
    component: Tour,
  },
  {
    path: '',
    component: ToursList,
    title: 'Action ramassage des déchets',
  },
];
