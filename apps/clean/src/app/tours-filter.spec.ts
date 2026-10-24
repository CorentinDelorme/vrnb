import { describe, expect, it } from 'vitest';

import { toursData } from './tours-data';
import {
  CLEANING_DISTANCE_AXIS,
  DEFAULT_TOUR_DISTANCE_FILTER,
  filterToursByDistance,
  filterToursByType,
  TOTAL_DISTANCE_AXIS,
  type DistanceInterval,
  type TourDistanceFilter,
  type TourFilterType,
} from './tours-filter';
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

describe('filterToursByDistance', () => {
  const inInterval = (min: number, max: number): DistanceInterval => ({ min, max });
  const fullFilter: TourDistanceFilter = DEFAULT_TOUR_DISTANCE_FILTER;

  it('keeps every tour when both families span their whole axis (no filter)', () => {
    const tours = [V1, P2];
    expect(filterToursByDistance(tours, fullFilter)).toEqual(tours);
  });

  it('filters by the Distance de nettoyage interval (inclusive bounds)', () => {
    // V1: distance 1.1; P2: distance 0.8.
    const filter: TourDistanceFilter = { ...fullFilter, cleaning: inInterval(1, 2) };
    const kept = filterToursByDistance([V1, P2], filter);
    expect(kept.map((tour) => tour.name)).toEqual(['V1']);
  });

  it('keeps a tour exactly on a bound (inclusive interval)', () => {
    // P10: distance 0.5, the cleaning axis minimum.
    const P10 = toursData.pTours.find((tour) => tour.name === 'P10')!;
    const filter: TourDistanceFilter = { ...fullFilter, cleaning: inInterval(0.5, 1) };
    const kept = filterToursByDistance([P10], filter);
    expect(kept.map((tour) => tour.name)).toEqual(['P10']);
  });

  it('filters by the Distance totale interval (inclusive bounds)', () => {
    // V1: total 4.2; P2: total 2.5.
    const filter: TourDistanceFilter = { ...fullFilter, total: inInterval(2, 3) };
    const kept = filterToursByDistance([V1, P2], filter);
    expect(kept.map((tour) => tour.name)).toEqual(['P2']);
  });

  it('keeps a tour exactly on the total axis minimum bound (2)', () => {
    const filter: TourDistanceFilter = { ...fullFilter, total: inInterval(2, 3) };
    // P1: totalDistance 2.3, inside; none exactly 2 in the fixture, so use a tour at 2.
    const atTwo = aTour({ name: 'AT', totalDistance: 2, distance: 1 });
    const kept = filterToursByDistance([atTwo], filter);
    expect(kept.map((tour) => tour.name)).toEqual(['AT']);
  });

  it('treats a family spanning its whole axis as inactive', () => {
    // Only cleaning is active (1 → 2 km); total spans the whole axis.
    const filter: TourDistanceFilter = {
      ...fullFilter,
      cleaning: inInterval(1, 2),
      total: { min: TOTAL_DISTANCE_AXIS.min, max: TOTAL_DISTANCE_AXIS.max },
    };
    const kept = filterToursByDistance([V1, P2], filter);
    // V1: distance 1.1 (kept by cleaning), total 4.2 (total inactive → ok).
    // P2: distance 0.8 (rejected by cleaning).
    expect(kept.map((tour) => tour.name)).toEqual(['V1']);
  });

  it('combines the two families in ET (AND)', () => {
    const filter: TourDistanceFilter = {
      cleaning: inInterval(1, 2),
      total: inInterval(4, 6),
    };
    // V1: distance 1.1 (cleaning ok) AND total 4.2 (total ok) → kept.
    // P2: distance 0.8 (cleaning rejected) → dropped even though total 2.5 is out anyway.
    const kept = filterToursByDistance([V1, P2], filter);
    expect(kept.map((tour) => tour.name)).toEqual(['V1']);
  });

  it('does not mutate the input list', () => {
    const tours = [V1, P2];
    filterToursByDistance(tours, { ...fullFilter, cleaning: inInterval(1, 2) });
    expect(tours).toHaveLength(2);
  });

  it('uses the declared axes (cleaning 0.5 → 4, total 2 → 11)', () => {
    expect(CLEANING_DISTANCE_AXIS).toEqual({ min: 0.5, max: 4, step: 0.5 });
    expect(TOTAL_DISTANCE_AXIS).toEqual({ min: 2, max: 11, step: 1 });
  });
});
