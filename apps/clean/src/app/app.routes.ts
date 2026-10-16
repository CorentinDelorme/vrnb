import { Routes } from '@angular/router';
import { Manual } from './manual/manual';
import { Tour } from './tour/tour';
import { ToursList } from './tours-list/tours-list';
import { ToursMap } from './tours-map/tours-map';

export const routes: Routes = [
  {
    path: 'manual',
    component: Manual,
    title: "Action ramassage des déchets - Mode d'emploi",
  },
  {
    path: 'tours/:zoneId/:type',
    component: ToursMap,
  },
  {
    path: 'tour/:zoneId/:id',
    component: Tour,
  },
  {
    path: '',
    component: ToursList,
    title: 'Action ramassage des déchets',
  },
];
