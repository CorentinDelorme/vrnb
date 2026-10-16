import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

import { toursData } from './tours-data';
import { ZONES } from './zones';

const TOUR_TYPES = ['P', 'V'] as const;

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'manual',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'tours/:zoneId/:type',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams(): Promise<Record<string, string>[]> {
      return ZONES.flatMap((zone) => TOUR_TYPES.map((type) => ({ zoneId: zone.id, type })));
    },
  },
  {
    path: 'tour/:zoneId/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams(): Promise<Record<string, string>[]> {
      return [...toursData.vTours, ...toursData.pTours].map((tour) => ({
        zoneId: tour.zoneId,
        id: tour.name,
      }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
