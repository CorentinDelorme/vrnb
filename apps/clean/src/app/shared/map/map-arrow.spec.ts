import { describe, expect, it } from 'vitest';

import { computeFrequency } from './map-arrow';

describe('computeFrequency', () => {
  it('should return 125 for distances under 1km', () => {
    expect(computeFrequency(0.5)).toBe(125);
    expect(computeFrequency(0.9)).toBe(125);
  });

  it('should return 200 for distances between 1km and 1.5km', () => {
    expect(computeFrequency(1.0)).toBe(200);
    expect(computeFrequency(1.4)).toBe(200);
  });

  it('should return 250 for distances between 1.5km and 2km', () => {
    expect(computeFrequency(1.5)).toBe(250);
    expect(computeFrequency(1.9)).toBe(250);
  });

  it('should return 300 for distances 2km and above', () => {
    expect(computeFrequency(2.0)).toBe(300);
    expect(computeFrequency(5.0)).toBe(300);
  });
});
