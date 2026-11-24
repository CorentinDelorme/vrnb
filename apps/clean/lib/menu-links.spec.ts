import { describe, expect, it } from 'vitest';

import { menuLinks, toursMenuLinks } from './menu-links';

/**
 * The zone-map Menu drawer links point to the zone map PDFs. The tracking
 * sheet (« PDF de suivi ») is gone: the « Fiches de suivi » are generated from
 * the real inscriptions by the referent script, outside the site.
 */
describe('toursMenuLinks', () => {
  it('returns the bike (V) PDF links for a zone', () => {
    expect(toursMenuLinks('bruz-sud', 'V')).toEqual([
      {
        kind: 'pdf-carte',
        href: '/pdf/bruz-sud/Carte_parcours_a_velo.pdf',
        label: 'Télécharger le PDF de la carte',
      },
    ]);
  });

  it('returns the walking (P) PDF links for another zone', () => {
    expect(toursMenuLinks('bruz-ker-lann', 'P')).toEqual([
      {
        kind: 'pdf-carte',
        href: '/pdf/bruz-ker-lann/Carte_parcours_a_pied.pdf',
        label: 'Télécharger le PDF de la carte',
      },
    ]);
  });

  it('returns no links for an invalid practice type', () => {
    expect(toursMenuLinks('bruz-sud', 'X')).toEqual([]);
  });
});

describe('menuLinks', () => {
  it('derives the drawer links from a /tours pathname', () => {
    const links = menuLinks('/tours/bruz-sud/P');
    expect(links.map((link) => link.href)).toEqual(['/pdf/bruz-sud/Carte_parcours_a_pied.pdf']);
  });

  it('ignores a trailing slash', () => {
    expect(menuLinks('/tours/bruz-sud/V/')).toEqual(toursMenuLinks('bruz-sud', 'V'));
  });

  it('returns home menu links on home page', () => {
    const links = menuLinks('/');
    // In test env NODE_ENV is not 'development', so only 1 link
    expect(links.length).toBe(1);
    expect(links.map((link) => link.href)).toContain('/tours');
    expect(links.find((link) => link.href === '/tours')?.label).toBe('Voir tous les parcours');
  });

  it('returns global map PDF link on /tours', () => {
    const links = menuLinks('/tours');
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('/pdf/Carte_tous_les_parcours.pdf');
    expect(links[0].label).toBe('Télécharger le PDF de la carte');
  });

  it('returns no links on manual or tour routes', () => {
    expect(menuLinks('/manual')).toEqual([]);
    expect(menuLinks('/tour/bruz-sud/V1')).toEqual([]);
  });
});
