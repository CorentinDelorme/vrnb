import { describe, expect, it } from 'vitest';

import { isTourMapParams, zoneMapStaticParams, zoneMapTours } from './tours-route';

/**
 * Static generation contract of `/tours/[zoneId]/[type]`: one route per
 * zone × practice type, and `notFound()` for anything else (spec #3).
 */
describe('zoneMapStaticParams', () => {
  it('covers every zone × practice type combination', () => {
    expect(zoneMapStaticParams()).toEqual([
      { zoneId: 'bruz-sud', type: 'P' },
      { zoneId: 'bruz-sud', type: 'V' },
      { zoneId: 'bruz-vau-gaillard', type: 'P' },
      { zoneId: 'bruz-vau-gaillard', type: 'V' },
      { zoneId: 'bruz-ker-lann', type: 'P' },
      { zoneId: 'bruz-ker-lann', type: 'V' },
    ]);
  });
});

describe('isTourMapParams', () => {
  it('accepts a known zone with practice P or V', () => {
    expect(isTourMapParams('bruz-sud', 'P')).toBe(true);
    expect(isTourMapParams('bruz-ker-lann', 'V')).toBe(true);
  });

  it('rejects an unknown zone', () => {
    expect(isTourMapParams('nowhere', 'V')).toBe(false);
  });

  it('rejects an unknown practice type', () => {
    expect(isTourMapParams('bruz-sud', 'X')).toBe(false);
    expect(isTourMapParams('bruz-sud', 'v')).toBe(false);
    expect(isTourMapParams('bruz-sud', '')).toBe(false);
  });
});

describe('zoneMapTours', () => {
  it('returns the walking tour names of a zone', () => {
    const names = zoneMapTours('bruz-sud', 'P');
    expect(names).toHaveLength(15);
    expect(names).toContain('P1');
    expect(names).toContain('P13');
    expect(names.every((name) => name.startsWith('P'))).toBe(true);
  });

  it('returns no bike tours for bruz-vau-gaillard (now only walking tours)', () => {
    const names = zoneMapTours('bruz-vau-gaillard', 'V');
    expect(names).toEqual([]);
  });

  it('returns the walking tour names for bruz-vau-gaillard', () => {
    const names = zoneMapTours('bruz-vau-gaillard', 'P');
    expect(names).toEqual(['P100', 'P101', 'P102', 'P103', 'P104', 'P105']);
  });
});
