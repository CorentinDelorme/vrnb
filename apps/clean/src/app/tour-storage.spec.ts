import { beforeEach, describe, expect, it } from 'vitest';

import { clearSavedTour, loadSavedTour, saveTour, TOUR_STORAGE_KEY } from './tour-storage';

describe('tour storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist the in-progress tour under the vrnb_tour key', () => {
    saveTour('V1', 1, 'bruz-sud');

    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(
      JSON.stringify({ tourId: 'V1', step: 1, zoneId: 'bruz-sud' }),
    );
  });

  it('should persist the zone provided by the caller', () => {
    saveTour('P2', 2, 'bruz-vau-gaillard');

    expect(loadSavedTour()).toEqual({ tourId: 'P2', step: 2, zoneId: 'bruz-vau-gaillard' });
  });

  it('should return null when nothing was saved', () => {
    expect(loadSavedTour()).toBeNull();
  });

  it('should return null for corrupted stored data', () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'not-json');

    expect(loadSavedTour()).toBeNull();
  });

  it('should remove the stored tour on clear', () => {
    saveTour('V1', 1, 'bruz-sud');

    clearSavedTour();

    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBeNull();
    expect(loadSavedTour()).toBeNull();
  });
});
