import { describe, expect, it } from 'vitest';

import type { Tour } from '../src/app/tours-queries';
import {
  getFallbackRouteCoords,
  getSegmentForStep,
  getStepDistance,
  parseDebugParams,
} from './tour-map';

describe('getSegmentForStep', () => {
  it('should map step 0 to the start segment', () => {
    expect(getSegmentForStep(0)).toBe('start');
  });

  it('should map step 1 to the tour segment', () => {
    expect(getSegmentForStep(1)).toBe('tour');
  });

  it('should map step 2 to the end segment', () => {
    expect(getSegmentForStep(2)).toBe('end');
  });

  it('should fall back to the tour segment outside the 0-2 range', () => {
    expect(getSegmentForStep(-1)).toBe('tour');
    expect(getSegmentForStep(3)).toBe('tour');
  });
});

describe('getStepDistance', () => {
  const tour: Tour = {
    name: 'V1',
    zoneId: 'bruz-sud',
    distance: 3.2,
    startDistance: 1.1,
    endDistance: 0.8,
  };

  it('should return the start distance for step 0', () => {
    expect(getStepDistance(tour, 0)).toBe(1.1);
  });

  it('should return the tour distance for step 1', () => {
    expect(getStepDistance(tour, 1)).toBe(3.2);
  });

  it('should return the end distance for step 2', () => {
    expect(getStepDistance(tour, 2)).toBe(0.8);
  });

  it('should return 0 when the tour is unknown', () => {
    expect(getStepDistance(undefined, 0)).toBe(0);
  });
});

describe('getFallbackRouteCoords', () => {
  const meeting: [number, number] = [-1.747083, 48.024417];
  const points = {
    start: [-1.75, 48.03] as [number, number],
    end: [-1.74, 48.02] as [number, number],
  };

  it('should link the meeting point to the start for the start segment', () => {
    expect(getFallbackRouteCoords('start', meeting, points)).toEqual([meeting, points.start]);
  });

  it('should link the end to the meeting point for the end segment', () => {
    expect(getFallbackRouteCoords('end', meeting, points)).toEqual([points.end, meeting]);
  });

  it('should link the end to the meeting point for the tour segment', () => {
    expect(getFallbackRouteCoords('tour', meeting, points)).toEqual([points.end, meeting]);
  });
});

describe('parseDebugParams', () => {
  it('should be inactive with default timeout when no query params', () => {
    expect(parseDebugParams('')).toEqual({ debug: false, timeout: 500 });
  });

  it('should activate debug with the default timeout', () => {
    expect(parseDebugParams('?debug=true')).toEqual({ debug: true, timeout: 500 });
  });

  it('should read the timeout query param', () => {
    expect(parseDebugParams('?debug=true&timeout=100')).toEqual({ debug: true, timeout: 100 });
  });

  it('should ignore a falsy timeout value', () => {
    expect(parseDebugParams('?debug=true&timeout=0')).toEqual({ debug: true, timeout: 500 });
  });

  it('should only activate on the exact "true" value', () => {
    expect(parseDebugParams('?debug=TRUE')).toEqual({ debug: false, timeout: 500 });
  });
});
