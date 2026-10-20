import * as L from 'leaflet';
import { describe, expect, it } from 'vitest';

import { getMockLocation } from './map-location';

describe('getMockLocation', () => {
  it('should return default position for empty coords', async () => {
    const result = await getMockLocation([], 0);
    expect(result.latlng.lat).toBeCloseTo(48.013572);
    expect(result.latlng.lng).toBeCloseTo(-1.749696);
    expect(result.nextIndex).toBe(0);
  });

  it('should return correct position and increment index', async () => {
    const coords = [
      [-1.746, 48.016],
      [-1.747, 48.017],
      [-1.748, 48.018],
    ];
    const result = await getMockLocation(coords, 0);
    expect(result.latlng).toEqual(L.latLng(48.016, -1.746));
    expect(result.nextIndex).toBe(1);
  });

  it('should stay at last index when at end of coords', async () => {
    const coords = [
      [-1.746, 48.016],
      [-1.747, 48.017],
    ];
    const result = await getMockLocation(coords, 1);
    expect(result.latlng).toEqual(L.latLng(48.017, -1.747));
    expect(result.nextIndex).toBe(1);
  });

  it('should return correct position for middle index', async () => {
    const coords = [
      [-1.746, 48.016],
      [-1.747, 48.017],
      [-1.748, 48.018],
    ];
    const result = await getMockLocation(coords, 1);
    expect(result.latlng).toEqual(L.latLng(48.017, -1.747));
    expect(result.nextIndex).toBe(2);
  });
});
