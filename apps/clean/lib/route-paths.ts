/**
 * Pathname matchers for the two dynamic route shapes, the single source for
 * the URL contract frozen by the printed QR codes (spec #3). Shared by page
 * titles (`lib/route-meta`), Menu drawer links (`lib/menu-links`) and the
 * tour drawer (`components/tour-drawer-links`) instead of each parsing the
 * pathname with its own copy of the regex.
 */

/** Params carried by a `/tours/<zoneId>/<type>` pathname. */
export interface ZoneMapPath {
  readonly zoneId: string;
  readonly type: string;
}

/** Params carried by a `/tour/<zoneId>/<id>` pathname. */
export interface TourPath {
  readonly zoneId: string;
  readonly id: string;
}

const ZONE_MAP_PATH_PATTERN = /^\/tours\/([^/]+)\/([^/]+)\/?$/;
const TOUR_PATH_PATTERN = /^\/tour\/([^/]+)\/([^/]+)\/?$/;

/** The zone-map params of a pathname, or null outside `/tours/<zone>/<type>`. */
export function matchZoneMapPath(pathname: string): ZoneMapPath | null {
  const match = ZONE_MAP_PATH_PATTERN.exec(pathname);
  return match ? { zoneId: match[1], type: match[2] } : null;
}

/** The tour params of a pathname, or null outside `/tour/<zone>/<id>`. */
export function matchTourPath(pathname: string): TourPath | null {
  const match = TOUR_PATH_PATTERN.exec(pathname);
  return match ? { zoneId: match[1], id: match[2] } : null;
}
