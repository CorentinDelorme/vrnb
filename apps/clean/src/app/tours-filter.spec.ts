import { describe, expect, it } from 'vitest';

import { toursData } from './tours-data';
import { filterToursByType, type TourFilterType } from './tours-filter';
import type { Tour } from './tours-queries';

/** A bike tour of bruz-sud, present in both the V list and any zone list. */
const V1 = toursData.vTours.find((tour) => tour.name === 'V1')!;
/** A walking tour of bruz-sud. */
const P2 = toursData.pTours.find((tour) => tour.name === 'P2')!;

function aTour(overrides: Partial<Tour>): Tour {
  return {
    name: 'T1',
    distance: 1,
    startDistance: 1,
    endDistance: 1,
    totalDistance: 3,
    zoneId: 'bruz-sud',
    ...overrides,
  };
}

describe('filterToursByType', () => {
  it('keeps every tour of the list when the filter is "all"', () => {
    const tours = [V1, P2];
    expect(filterToursByType(tours, 'V', 'all')).toEqual(tours);
    expect(filterToursByType(tours, 'P', 'all')).toEqual(tours);
  });

  it('keeps every tour when the filter matches the list type', () => {
    expect(filterToursByType([V1], 'V', 'V')).toEqual([V1]);
    expect(filterToursByType([P2], 'P', 'P')).toEqual([P2]);
  });

  it('returns no tour when the filter is the other practice type', () => {
    expect(filterToursByType([V1], 'V', 'P')).toEqual([]);
    expect(filterToursByType([P2], 'P', 'V')).toEqual([]);
  });

  it('does not mutate the input list', () => {
    const tours = [V1];
    filterToursByType(tours, 'V', 'P');
    expect(tours).toHaveLength(1);
  });

  it('accepts every TourFilterType value', () => {
    const values: readonly TourFilterType[] = ['all', 'P', 'V'];
    for (const value of values) {
      expect(() => filterToursByType([aTour({ name: 'X' })], 'V', value)).not.toThrow();
    }
  });
});
