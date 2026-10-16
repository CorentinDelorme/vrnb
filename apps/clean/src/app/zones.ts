import { Position } from 'geojson';

export interface ZoneMeetingPoint {
  readonly name: string;
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
 * add its GPX files under `public/gpx/<zone-id>/`, then run `bun run generate:tours`.
 */
export const ZONES: readonly Zone[] = [
  {
    id: 'bruz-sud',
    name: 'Bruz Sud',
    meetingPoint: {
      name: `Place du Dr Joly`,
      coordinates: [-1.747083, 48.024417],
    },
  },
  {
    id: 'bruz-vau-gaillard',
    name: 'Bruz Vau Gaillard',
    meetingPoint: {
      name: `Place du Dr Joly`,
      coordinates: [-1.747083, 48.024417],
    },
  },
];

export const DEFAULT_ZONE_ID = ZONES[0].id;

export function getZone(zoneId: string | null | undefined): Zone {
  return ZONES.find((zone) => zone.id === zoneId) ?? ZONES[0];
}
