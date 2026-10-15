import { Position } from 'geojson';

export interface MeetingPoint {
  readonly name: string;
  readonly coordinates: Position;
}

/**
 * Central meeting point for all tours (start/end shuttles, GeoVelo links, fallbacks).
 * Change these two values to move the starting point — no other code change needed.
 */
export const MEETING_POINT: MeetingPoint = {
  name: `Place du Dr Joly`,
  coordinates: [-1.747083, 48.024417],
};
