import type { TourType } from '../src/app/tours-queries';
import { isTourType } from '../src/app/tours-queries';
import { matchZoneMapPath } from './route-paths';

/**
 * Download links of the Menu drawer shown on the zone map routes
 * (`/tours/[zoneId]/[type]`), ported from the legacy Angular `tours-drawer`
 * component, which parsed the router URL (spec #3, US 8-13).
 *
 * Pure data module: components map `kind` to an icon, so this file stays
 * framework-free and unit-testable.
 */

/** Which drawer download a link points to. */
export type MenuLinkKind = 'pdf-carte';

export interface MenuLink {
  readonly kind: MenuLinkKind;
  readonly href: string;
  /** Exact French copy of the legacy drawer template. */
  readonly label: string;
}

const CARTE_LABEL = 'Télécharger le PDF de la carte';

/** Zone PDF file names per practice type (P = à pied, V = à vélo). */
const PRACTICE_FILES: Record<TourType, { readonly carte: string }> = {
  V: { carte: 'Carte_parcours_a_velo.pdf' },
  P: { carte: 'Carte_parcours_a_pied.pdf' },
};

/**
 * Zone PDF links for a `/tours/<zone>/<type>` pair. Returns no links for an
 * invalid practice type (invalid params reach `notFound()` anyway, spec #3).
 *
 * The tracking sheet (« PDF de suivi ») is gone: the « Fiches de suivi » are
 * now generated from the real inscriptions by the referent script
 * (`scripts/extract-inscriptions.ts`), outside the site.
 */
export function toursMenuLinks(zoneId: string, type: string): readonly MenuLink[] {
  if (!isTourType(type)) return [];
  const files = PRACTICE_FILES[type];
  return [{ kind: 'pdf-carte', href: `/pdf/${zoneId}/${files.carte}`, label: CARTE_LABEL }];
}

/** Drawer links for a pathname; empty outside the zone-map routes. */
export function menuLinks(pathname: string): readonly MenuLink[] {
  const zoneMap = matchZoneMapPath(pathname);
  if (!zoneMap) return [];
  return toursMenuLinks(zoneMap.zoneId, zoneMap.type);
}
