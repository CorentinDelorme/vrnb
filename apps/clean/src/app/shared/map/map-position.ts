/**
 * Current GPS position shared between the tour map (writer, through the
 * location tracker) and the tour drawer's GeoVelo "depuis ma position" link
 * (reader) — React port of the legacy Angular `MapLocationService.currentPosition`
 * singleton signal (spec #3): a tiny framework-agnostic store the components
 * subscribe to with `useSyncExternalStore`.
 */

export interface CurrentPosition {
  readonly lat: number;
  readonly lng: number;
}

type Listener = () => void;

let currentPosition: CurrentPosition | null = null;
const listeners = new Set<Listener>();

/** Publish a new tracked position (or `null` to clear it). */
export function setCurrentPosition(position: CurrentPosition | null): void {
  currentPosition = position;
  for (const listener of listeners) listener();
}

/** Last tracked position, or `null` when nothing was tracked yet. */
export function getCurrentPosition(): CurrentPosition | null {
  return currentPosition;
}

/** Subscribe to position changes; returns the unsubscribe function. */
export function subscribeCurrentPosition(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
