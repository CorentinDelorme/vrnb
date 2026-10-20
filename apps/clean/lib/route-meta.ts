import type { TourType } from '../src/app/tours-queries';
import { isTourType } from '../src/app/tours-queries';
import { ZONES } from '../src/app/zones';
import { matchTourPath, matchZoneMapPath } from './route-paths';

/**
 * Route-derived page metadata, equivalent of the legacy Angular `Title` service
 * and the URL conditions of the root template (`app.html`), see spec #3.
 *
 * `pageTitle` feeds both `<title>` (via `generateMetadata` in each route) and the
 * visible `<h1>` rendered by the header. `headerFlags` drives which header controls
 * the current route shows. The exact title strings are asserted by the E2E suite.
 */

/** Home title, also the default document title. */
export const HOME_TITLE = 'Action ramassage des déchets';

const MANUAL_TITLE = `${HOME_TITLE} - Mode d'emploi`;

/** `P` = à pied, `V` = à vélo (see GLOSSARY: Type de parcours). */
const PRACTICE_LABELS: Record<TourType, string> = {
  P: 'à pied',
  V: 'à vélo',
};

/** Which Menu drawer a route opens. */
export type MenuVariant = 'tour' | 'tours';

export interface HeaderFlags {
  /** Back button, shown on every URL except home (legacy `router.url !== '/'`). */
  readonly showBack: boolean;
  /** VRNB logo, shown on home and on /manual. */
  readonly showLogo: boolean;
  /** Menu drawer for zone map (`/tours/…`) and tour (`/tour/…`) routes. */
  readonly menu: MenuVariant | null;
}

/**
 * Title for a pathname, mirroring the route titles of the Angular router:
 * - `/` → `Action ramassage des déchets`
 * - `/manual` → `Action ramassage des déchets - Mode d'emploi`
 * - `/tours/<zone>/<P|V>` → `<Zone> - Parcours à pied|à vélo`
 * - `/tour/<zone>/<id>` → `<Zone> - Parcours <id>`
 *
 * Unknown paths and invalid params fall back to the home title; the page itself
 * is responsible for calling `notFound()` (spec #3: invalid param → 404).
 */
export function pageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '') {
    return HOME_TITLE;
  }
  if (pathname === '/manual') {
    return MANUAL_TITLE;
  }

  const zoneMap = matchZoneMapPath(pathname);
  if (zoneMap) {
    const zone = ZONES.find((candidate) => candidate.id === zoneMap.zoneId);
    const practice = isTourType(zoneMap.type) ? PRACTICE_LABELS[zoneMap.type] : undefined;
    if (zone && practice) {
      return `${zone.name} - Parcours ${practice}`;
    }
    return HOME_TITLE;
  }

  const tourPath = matchTourPath(pathname);
  if (tourPath) {
    const zone = ZONES.find((candidate) => candidate.id === tourPath.zoneId);
    if (zone) {
      return `${zone.name} - Parcours ${tourPath.id}`;
    }
    return HOME_TITLE;
  }

  return HOME_TITLE;
}

/** Header controls for a pathname, mirroring the legacy root template conditions. */
export function headerFlags(pathname: string): HeaderFlags {
  const isHome = pathname === '/' || pathname === '';
  return {
    showBack: !isHome,
    showLogo: isHome || pathname.startsWith('/manual'),
    menu: pathname.startsWith('/tours/') ? 'tours' : pathname.startsWith('/tour/') ? 'tour' : null,
  };
}
