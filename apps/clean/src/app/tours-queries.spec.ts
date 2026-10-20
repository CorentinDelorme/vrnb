import { describe, expect, it } from 'vitest';

import { findTour, findZoneTours } from './tours-queries';
import { getZone } from './zones';

describe('getZone', () => {
  it('should return the requested zone', () => {
    expect(getZone('bruz-ker-lann').name).toBe('Bruz Ker Lann');
  });

  it('should fall back to the first zone for unknown or missing ids', () => {
    expect(getZone('unknown-zone').id).toBe('bruz-sud');
    expect(getZone(undefined).id).toBe('bruz-sud');
    expect(getZone(null).id).toBe('bruz-sud');
  });
});

describe('findZoneTours', () => {
  it('should return the 15 bike tours of Bruz Sud starting at V1', () => {
    const tours = findZoneTours('bruz-sud', 'V');

    expect(tours).toHaveLength(15);
    expect(tours[0].name).toBe('V1');
    expect(tours.every((tour) => tour.zoneId === 'bruz-sud')).toBe(true);
  });

  it('should return the 13 walking tours of Bruz Sud', () => {
    const tours = findZoneTours('bruz-sud', 'P');

    expect(tours).toHaveLength(13);
    expect(tours.every((tour) => tour.zoneId === 'bruz-sud')).toBe(true);
  });

  it('should fall back to the default zone for unknown or missing ids', () => {
    expect(findZoneTours(undefined, 'V')).toEqual(findZoneTours('bruz-sud', 'V'));
  });
});

describe('findTour', () => {
  it('should find a tour by zone and name', () => {
    expect(findTour('bruz-sud', 'V1')?.name).toBe('V1');
  });

  it('should not find a tour of another zone', () => {
    expect(findTour('bruz-ker-lann', 'V1')).toBeUndefined();
  });

  it('should return undefined when the name is missing', () => {
    expect(findTour('bruz-sud', undefined)).toBeUndefined();
  });
});
