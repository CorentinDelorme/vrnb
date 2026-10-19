import { describe, expect, it } from 'vitest';

import { createRouteLine, getDashedRouteStyle, getDefaultRouteStyle } from './map-route';

describe('getDefaultRouteStyle', () => {
  it('should return default route style', () => {
    const style = getDefaultRouteStyle();
    expect(style.color).toBe('#0058ca');
    expect(style.weight).toBe(4);
    expect(style.dashArray).toBeUndefined();
  });
});

describe('getDashedRouteStyle', () => {
  it('should return dashed route style', () => {
    const style = getDashedRouteStyle();
    expect(style.color).toBe('#0058ca');
    expect(style.weight).toBe(4);
    expect(style.dashArray).toBe('10, 10');
  });
});

describe('createRouteLine', () => {
  it('should create a valid GeoJSON Feature from coordinates', () => {
    const coords = [
      [-1.746, 48.016],
      [-1.747, 48.017],
    ];
    const feature = createRouteLine(coords);

    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('LineString');
    if (feature.geometry.type === 'LineString') {
      expect(feature.geometry.coordinates).toEqual(coords);
    }
  });
});
