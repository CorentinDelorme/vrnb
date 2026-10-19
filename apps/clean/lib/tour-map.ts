import { Position } from 'geojson';

import { TourGeoJsonRole } from '../src/app/shared/gpx/tour-geojson';
import { StartEndPoints } from '../src/app/shared/map/map.types';
import { Tour } from '../src/app/tours-queries';

/**
 * Pure helpers of the tour page map (`components/tour-map.tsx`) — port of the
 * legacy Angular `tour/tour.ts` derivations (spec #3): which GeoJSON segment
 * the current step draws, the arrow-distance source, the dashed meeting-point
 * fallback and the `?debug=true&timeout=<ms>` query params.
 */

/** Debug simulation settings parsed from the URL query params. */
export interface DebugParams {
  readonly debug: boolean;
  readonly timeout: number;
}

/** Default interval (ms) between simulated positions, parity with Angular. */
export const DEFAULT_DEBUG_TIMEOUT = 500;

/**
 * Segment drawn for a step of the 3-step state machine (0 = Début, 1 =
 * Nettoyage, 2 = Fin): the start segment, the parcours itself, or the end
 * segment. Steps outside 0–2 draw the tour segment (legacy `else` branch).
 */
export function getSegmentForStep(step: number): TourGeoJsonRole {
  if (step === 0) return 'start';
  if (step === 2) return 'end';
  return 'tour';
}

/** Distance (km) of the segment drawn at a step, for the arrow frequency. */
export function getStepDistance(tour: Tour | undefined, step: number): number {
  if (!tour) return 0;
  const distances = [tour.startDistance, tour.distance, tour.endDistance] as const;
  return distances[step] ?? 0;
}

/**
 * Dashed fallback drawn when a segment has no route coordinates: the meeting
 * point linked to the segment's start (Début), or to its end (Nettoyage/Fin —
 * legacy ternary, which also covers the tour segment).
 */
export function getFallbackRouteCoords(
  segment: TourGeoJsonRole,
  meetingPoint: Position,
  points: StartEndPoints,
): Position[] {
  return segment === 'start' ? [meetingPoint, points.start] : [points.end, meetingPoint];
}

/**
 * Parse the debug simulation query params (`?debug=true&timeout=<ms>`), parity
 * with the Angular constructor: debug is active only on the exact value
 * "true", and the timeout falls back to 500 ms for any falsy value.
 */
export function parseDebugParams(search: string): DebugParams {
  const params = new URLSearchParams(search);
  return {
    debug: params.get('debug') === 'true',
    timeout: Number(params.get('timeout')) || DEFAULT_DEBUG_TIMEOUT,
  };
}
