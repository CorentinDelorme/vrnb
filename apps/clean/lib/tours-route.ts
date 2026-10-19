import { findZoneTours, type TourType } from '../src/app/tours-queries';
import { ZONES } from '../src/app/zones';

/**
 * Route contract of `/tours/[zoneId]/[type]` (spec #3): statically generated
 * for every zone × practice type combination, `notFound()` otherwise.
 */

/** The two practice types (Type de parcours, see GLOSSARY). */
export const TOUR_MAP_TYPES: readonly TourType[] = ['P', 'V'];

export interface TourMapParams {
  readonly zoneId: string;
  readonly type: TourType;
}

/** Whether the URL params denote a real zone map route (else `notFound()`). */
export function isTourMapParams(zoneId: string, type: string): type is TourType {
  return (
    ZONES.some((zone) => zone.id === zoneId) && (TOUR_MAP_TYPES as readonly string[]).includes(type)
  );
}

/** `generateStaticParams()` source: ZONES × {P, V}. */
export function zoneMapStaticParams(): TourMapParams[] {
  return ZONES.flatMap((zone) => TOUR_MAP_TYPES.map((type) => ({ zoneId: zone.id, type })));
}

/** Tour names drawn on the zone map, in generation order. */
export function zoneMapTours(zoneId: string, type: TourType): string[] {
  return findZoneTours(zoneId, type).map((tour) => tour.name);
}
