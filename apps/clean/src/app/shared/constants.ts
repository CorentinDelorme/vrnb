import { Position } from 'geojson';

import { ZONES } from '../zones';

export interface MeetingPoint {
  readonly name: string;
  readonly coordinates: Position;
}

/**
 * Central meeting point for all tours (start/end shuttles, GeoVelo links, fallbacks).
 * Change these two values to move the starting point — no other code change needed.
 *
 * @deprecated Use the meeting point of the tour's zone (`getZone(zoneId).meetingPoint`) instead.
 */
export const MEETING_POINT: MeetingPoint = ZONES[0].meetingPoint;
