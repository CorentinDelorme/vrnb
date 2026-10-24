import { toursData } from './tours-data';
import { getZone } from './zones';

export interface Tour {
  readonly name: string;
  readonly distance: number;
  readonly startDistance: number;
  readonly endDistance: number;
  /**
   * Distance totale (GLOSSARY): the sum of the three Étapes (Début +
   * Nettoyage + Fin), emitted by the generation pipeline (`total` field of
   * `tours-data.ts`, never recomputed at runtime).
   */
  readonly total: number;
  readonly zoneId: string;
}

export type TourType = 'P' | 'V';

/** Zone + tour pair, travelled together by storage, maps and play buttons. */
export interface TourRef {
  readonly tourId: string;
  readonly zoneId: string;
}

/** The 3-step state machine of a Parcours (0 = Début, 1 = Nettoyage, 2 = Fin). */
export type TourStep = 0 | 1 | 2;

/** Whether a raw URL param denotes a real practice type. */
export function isTourType(value: string): value is TourType {
  return value === 'P' || value === 'V';
}

export const V_TOURS: Tour[] = toursData.vTours;
export const P_TOURS: Tour[] = toursData.pTours;
export const ALL_TOURS: Tour[] = [...V_TOURS, ...P_TOURS];

/** All tours of a zone for a practice type (P = walking, V = bike). */
export function findZoneTours(zoneId: string | null | undefined, type: TourType): Tour[] {
  const zone = getZone(zoneId);
  const tours = type === 'V' ? V_TOURS : P_TOURS;
  return tours.filter((tour) => tour.zoneId === zone.id);
}

/** A single tour of a zone, by name. */
export function findTour(
  zoneId: string | null | undefined,
  name: string | null | undefined,
): Tour | undefined {
  if (!name) return undefined;
  const zone = getZone(zoneId);
  return ALL_TOURS.find((tour) => tour.zoneId === zone.id && tour.name === name);
}

/**
 * The strict (Zone, Parcours) lookup: a Parcours belongs to its Zone, so
 * BOTH must match the generated catalogue. Unlike `findTour`, an unknown Zone
 * never falls back to the default one — that fallback serves the UI, while
 * this one validates (a registration must name a real Parcours of a real
 * Zone, never a Parcours of another Zone).
 */
export function findParcours(zoneId: string, tourId: string): Tour | undefined {
  return ALL_TOURS.find((tour) => tour.zoneId === zoneId && tour.name === tourId);
}

/**
 * Whether the (Zone, Parcours) pair exists in the generated catalogue — the
 * production implementation of the Inscriptions catalogue lookup (a
 * registration may only cover a real Parcours of a real Zone).
 */
export function parcoursExists(zoneId: string, tourId: string): boolean {
  return findParcours(zoneId, tourId) !== undefined;
}
