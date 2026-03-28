import { Routes } from '@angular/router';
import { Tour } from './tour/tour';
import { ToursList } from './tours-list/tours-list';
import { ToursMap } from './tours-map/tours-map';

export const routes: Routes = [
  {
    path: 'tours/:type',
    component: ToursMap,
  },
  {
    path: 'tour/:id',
    component: Tour,
  },
  {
    path: '',
    component: ToursList,
    title: 'Action ramassage des déchets',
  },
];
