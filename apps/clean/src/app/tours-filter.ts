import type { Tour, TourType } from './tours-queries';

/** The Type de parcours filter: every type, or only walking (P) / bike (V). */
export type TourFilterType = 'all' | TourType;

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
