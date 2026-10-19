/**
 * Download links of the Menu drawer shown on the zone map routes
 * (`/tours/[zoneId]/[type]`), ported from the legacy Angular `tours-drawer`
 * component, which parsed the router URL (spec #3, US 8-13).
 *
 * Pure data module: components map `kind` to an icon, so this file stays
 * framework-free and unit-testable.
 */

/** Which drawer download a link points to. */
export type MenuLinkKind = 'pdf-suivi' | 'pdf-carte';

export interface MenuLink {
  readonly kind: MenuLinkKind;
  readonly href: string;
  /** Exact French copy of the legacy drawer template. */
  readonly label: string;
}

const SUIVI_LABEL = 'Télécharger le PDF de suivi';
const CARTE_LABEL = 'Télécharger le PDF de la carte';

/** Zone PDF file names per practice type (P = à pied, V = à vélo). */
const PRACTICE_FILES: Record<string, { readonly suivi: string; readonly carte: string }> = {
  V: { suivi: 'Suivi_parcours_a_velo.pdf', carte: 'Carte_parcours_a_velo.pdf' },
  P: { suivi: 'Suivi_parcours_a_pied.pdf', carte: 'Carte_parcours_a_pied.pdf' },
};

/**
 * Zone PDF links for a `/tours/<zone>/<type>` pair. Returns no links for an
 * invalid practice type (invalid params reach `notFound()` anyway, spec #3).
 */
export function toursMenuLinks(zoneId: string, type: string): readonly MenuLink[] {
  const files = PRACTICE_FILES[type];
  if (!files) return [];
  return [
    { kind: 'pdf-suivi', href: `/pdf/${zoneId}/${files.suivi}`, label: SUIVI_LABEL },
    { kind: 'pdf-carte', href: `/pdf/${zoneId}/${files.carte}`, label: CARTE_LABEL },
  ];
}

/** Drawer links for a pathname; empty outside the zone-map routes. */
export function menuLinks(pathname: string): readonly MenuLink[] {
  const match = /^\/tours\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return [];
  return toursMenuLinks(match[1], match[2]);
}
