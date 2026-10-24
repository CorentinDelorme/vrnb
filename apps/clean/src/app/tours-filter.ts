import type { Tour, TourType } from './tours-queries';

/** The Type de parcours filter: every type, or only walking (P) / bike (V). */
export type TourFilterType = 'all' | TourType;

/** One inclusive distance interval on a slider axis. */
export interface DistanceInterval {
  readonly min: number;
  readonly max: number;
}

/** The two distance filter families: Distance de nettoyage and Distance totale. */
export interface TourDistanceFilter {
  readonly cleaning: DistanceInterval;
  readonly total: DistanceInterval;
}

/** Distance de nettoyage axis: 0.5 → 4 km, step 0.5. */
export const CLEANING_DISTANCE_AXIS = { min: 0.5, max: 4, step: 0.5 };

/** Distance totale axis: 2 → 11 km, step 1 (real bounds rounded down/up to the half). */
export const TOTAL_DISTANCE_AXIS = { min: 2, max: 11, step: 1 };

/** Default filter: both families span the whole axis → inactive ("no filter"). */
export const DEFAULT_TOUR_DISTANCE_FILTER: TourDistanceFilter = {
  cleaning: { min: CLEANING_DISTANCE_AXIS.min, max: CLEANING_DISTANCE_AXIS.max },
  total: { min: TOTAL_DISTANCE_AXIS.min, max: TOTAL_DISTANCE_AXIS.max },
};

/** Whether an interval covers its axis entirely: the family is then inactive. */
export function isFullAxis(
  interval: DistanceInterval,
  axis: { min: number; max: number },
): boolean {
  return interval.min === axis.min && interval.max === axis.max;
}

/** Whether at least one filter family is active (touches the results). */
export function isFilterTouched(
  type: TourFilterType,
  cleaning: DistanceInterval,
  total: DistanceInterval,
): boolean {
  return (
    type !== 'all' ||
    !isFullAxis(cleaning, CLEANING_DISTANCE_AXIS) ||
    !isFullAxis(total, TOTAL_DISTANCE_AXIS)
  );
}

/** Inclusive membership test: value inside [min, max]. */
function inInterval(value: number, interval: DistanceInterval): boolean {
  return value >= interval.min && value <= interval.max;
}

/**
 * Filter tours by the two distance intervals (Distance de nettoyage and
 * Distance totale). A family spanning its whole axis is inactive (no filter).
 * Intervals are inclusive: a tour exactly on a bound is kept.
 */
export function filterToursByDistance(tours: readonly Tour[], filter: TourDistanceFilter): Tour[] {
  return tours.filter((tour) => {
    const cleaningOk =
      isFullAxis(filter.cleaning, CLEANING_DISTANCE_AXIS) ||
      inInterval(tour.distance, filter.cleaning);
    const totalOk =
      isFullAxis(filter.total, TOTAL_DISTANCE_AXIS) || inInterval(tour.totalDistance, filter.total);
    return cleaningOk && totalOk;
  });
}

/**
 * Filter the tours of a single practice list by the active type filter.
 *
 * The `Tour` type carries no practice field — a tour's type is implicit in
 * the `V_TOURS` / `P_TOURS` array it comes from — so `listType` names the
 * practice of every tour in `tours`:
 * - `all`     → every tour of the list
 * - `listType` → every tour of the list (the filter matches this list)
 * - the other → no tour (this list is filtered out)
 */
export function filterToursByType(
  tours: readonly Tour[],
  listType: TourType,
  filter: TourFilterType,
): Tour[] {
  if (filter === 'all' || filter === listType) {
    return tours.slice();
  }
  return [];
}
