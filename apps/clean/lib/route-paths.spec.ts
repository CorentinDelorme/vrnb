import { describe, expect, it } from 'vitest';

import { matchTourPath, matchZoneMapPath } from './route-paths';

/**
 * The two matchers are the single source of the pathname-parsing contract;
 * their consumers (`route-meta`, `menu-links`, the tour drawer) assert the
 * derived titles/links in their own specs.
 */
describe('matchZoneMapPath', () => {
  it('extracts the zone and practice type', () => {
    expect(matchZoneMapPath('/tours/bruz-sud/V')).toEqual({ zoneId: 'bruz-sud', type: 'V' });
  });

  it('ignores a trailing slash', () => {
    expect(matchZoneMapPath('/tours/bruz-sud/P/')).toEqual({ zoneId: 'bruz-sud', type: 'P' });
  });

  it('rejects paths with fewer or more segments', () => {
    expect(matchZoneMapPath('/tours/bruz-sud')).toBeNull();
    expect(matchZoneMapPath('/tours/bruz-sud/V/extra')).toBeNull();
  });

  it('rejects non zone-map paths', () => {
    expect(matchZoneMapPath('/')).toBeNull();
    expect(matchZoneMapPath('/tour/bruz-sud/V1')).toBeNull();
    expect(matchZoneMapPath('/tours')).toBeNull();
  });
});

describe('matchTourPath', () => {
  it('extracts the zone and tour id', () => {
    expect(matchTourPath('/tour/bruz-sud/V1')).toEqual({ zoneId: 'bruz-sud', id: 'V1' });
  });

  it('ignores a trailing slash', () => {
    expect(matchTourPath('/tour/bruz-ker-lann/P13/')).toEqual({
      zoneId: 'bruz-ker-lann',
      id: 'P13',
    });
  });

  it('rejects paths with fewer or more segments', () => {
    expect(matchTourPath('/tour/bruz-sud')).toBeNull();
    expect(matchTourPath('/tour/bruz-sud/V1/extra')).toBeNull();
  });

  it('rejects non tour paths', () => {
    expect(matchTourPath('/')).toBeNull();
    expect(matchTourPath('/tours/bruz-sud/V')).toBeNull();
    expect(matchTourPath('/tour')).toBeNull();
  });
});
