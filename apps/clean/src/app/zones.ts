import type { Position } from 'geojson';

export interface ZoneMeetingPoint {
  /** Meeting point name, as displayed on the site. */
  readonly name: string;
  /** Full postal address of the meeting point (geocodable by Google Calendar). */
  readonly address: string;
  readonly coordinates: Position;
}

export interface Zone {
  readonly id: string;
  readonly name: string;
  readonly meetingPoint: ZoneMeetingPoint;
}

/**
 * All touring zones. Existing tours belong to "bruz-sud".
 * To add a new zone, append an entry here,
 * add its GPX files under `public/gpx/<zone-id>/`,
 * then run `bun run generate:all` (see the README).
 */
export const ZONES: readonly Zone[] = [
  {
    id: 'bruz-sud',
    name: 'Bruz Sud',
    meetingPoint: {
      name: `Place du Dr Joly`,
      address: 'Place du Docteur Joly, Pl. du Dr Joly, 35170 Bruz, France',
      coordinates: [-1.747083, 48.024417],
    },
  },
  {
    id: 'bruz-vau-gaillard',
    name: 'Bruz Vau Gaillard',
    meetingPoint: {
      name: `Place du Dr Joly`,
      address: 'Place du Docteur Joly, Pl. du Dr Joly, 35170 Bruz, France',
      coordinates: [-1.747083, 48.024417],
    },
  },
  {
    id: 'bruz-ker-lann',
    name: 'Bruz Ker Lann',
    meetingPoint: {
      name: `Place du Dr Joly`,
      address: 'Place du Docteur Joly, Pl. du Dr Joly, 35170 Bruz, France',
      coordinates: [-1.747083, 48.024417],
    },
  },
];

export const DEFAULT_ZONE_ID = ZONES[0].id;

export function getZone(zoneId: string | null | undefined): Zone {
  return ZONES.find((zone) => zone.id === zoneId) ?? ZONES[0];
}
