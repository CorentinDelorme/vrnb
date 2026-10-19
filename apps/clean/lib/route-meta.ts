import { ZONES } from '../src/app/zones';

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
const PRACTICE_LABELS: Record<string, string> = {
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

  const zoneMapMatch = /^\/tours\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (zoneMapMatch) {
    const zone = ZONES.find((candidate) => candidate.id === zoneMapMatch[1]);
    const practice = PRACTICE_LABELS[zoneMapMatch[2]];
    if (zone && practice) {
      return `${zone.name} - Parcours ${practice}`;
    }
    return HOME_TITLE;
  }

  const tourMatch = /^\/tour\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (tourMatch) {
    const zone = ZONES.find((candidate) => candidate.id === tourMatch[1]);
    if (zone) {
      return `${zone.name} - Parcours ${tourMatch[2]}`;
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
    menu: pathname.startsWith('/tours/')
      ? 'tours'
      : pathname.startsWith('/tour/')
        ? 'tour'
        : null,
  };
}
