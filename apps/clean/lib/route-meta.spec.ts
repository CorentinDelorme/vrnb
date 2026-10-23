import { describe, expect, it } from 'vitest';

import { HOME_TITLE, headerFlags, pageTitle } from './route-meta';

/**
 * The route-derived page title must equal what the Angular `Title` service set
 * on each route (exact strings asserted by the E2E suite, see e2e/tests.md).
 */
describe('pageTitle', () => {
  it('returns the home title on the home route', () => {
    expect(pageTitle('/')).toBe('Action ramassage des déchets');
  });

  it('returns the home title on an empty path', () => {
    expect(pageTitle('')).toBe('Action ramassage des déchets');
  });

  it('returns the manual title on /manual', () => {
    expect(pageTitle('/manual')).toBe("Action ramassage des déchets - Mode d'emploi");
  });

  it('returns the bike map title for a zone', () => {
    expect(pageTitle('/tours/bruz-sud/V')).toBe('Bruz Sud - Parcours à vélo');
  });

  it('returns the walking map title for another zone', () => {
    expect(pageTitle('/tours/bruz-ker-lann/P')).toBe('Bruz Ker Lann - Parcours à pied');
  });

  it('returns the tour title for a tour route', () => {
    expect(pageTitle('/tour/bruz-vau-gaillard/V100')).toBe('Bruz Vau Gaillard - Parcours V100');
  });

  it('falls back to the home title for an unknown path', () => {
    expect(pageTitle('/does-not-exist')).toBe(HOME_TITLE);
  });

  it('falls back to the home title for an unknown zone (invalid param, notFound)', () => {
    expect(pageTitle('/tours/nowhere/V')).toBe('Action ramassage des déchets');
    expect(pageTitle('/tour/nowhere/V1')).toBe('Action ramassage des déchets');
  });

  it('falls back to the home title for an unknown practice type', () => {
    expect(pageTitle('/tours/bruz-sud/X')).toBe('Action ramassage des déchets');
  });
});

/**
 * Header conditions mirror the legacy root template (`app.html`): back button on
 * every non-home URL, VRNB logo on home and on /manual, Menu drawer on /tour/ and /tours/.
 */
describe('headerFlags', () => {
  it('shows only the logo on home', () => {
    expect(headerFlags('/')).toEqual({ showBack: false, showLogo: true, menu: null });
  });

  it('shows the back button and the logo on the manual page', () => {
    expect(headerFlags('/manual')).toEqual({ showBack: true, showLogo: true, menu: null });
  });

  it('shows the back button and the tours menu on a zone map', () => {
    expect(headerFlags('/tours/bruz-sud/V')).toEqual({
      showBack: true,
      showLogo: false,
      menu: 'tours',
    });
  });

  it('shows the back button and the tour menu on a tour page', () => {
    expect(headerFlags('/tour/bruz-sud/V1')).toEqual({
      showBack: true,
      showLogo: false,
      menu: 'tour',
    });
  });

  it('shows the back button and no menu on an unknown path', () => {
    expect(headerFlags('/does-not-exist')).toEqual({
      showBack: true,
      showLogo: false,
      menu: null,
    });
  });
});
