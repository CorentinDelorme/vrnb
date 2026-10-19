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
    expect(names).toHaveLength(13);
    expect(names).toContain('P1');
    expect(names).toContain('P13');
    expect(names.every((name) => name.startsWith('P'))).toBe(true);
  });

  it('returns the bike tour names of another zone', () => {
    const names = zoneMapTours('bruz-vau-gaillard', 'V');
    expect(names).toEqual(['V20', 'V21', 'V22', 'V23', 'V24', 'V25']);
  });

  it('returns no names for a zone without tours of that type', () => {
    expect(zoneMapTours('bruz-vau-gaillard', 'P')).toEqual([]);
  });
});
