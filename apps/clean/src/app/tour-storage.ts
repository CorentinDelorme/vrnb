import { DEFAULT_ZONE_ID } from './zones';

export interface SavedTour {
  tourId: string;
  step: number;
  zoneId: string;
}

export const TOUR_STORAGE_KEY = 'vrnb_tour';

/** Read the in-progress tour from localStorage. SSR-safe: returns null server-side. */
export function loadSavedTour(): SavedTour | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const data = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as SavedTour;
  } catch {
    return null;
  }
}

/** Persist the in-progress tour. Returns null (and stores nothing) server-side. */
export function saveTour(
  tourId: string,
  step: number,
  zoneId: string = DEFAULT_ZONE_ID,
): SavedTour | null {
  if (typeof localStorage === 'undefined') return null;
  const data: SavedTour = { tourId, step, zoneId };
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(data));
  return data;
}

/** Remove the in-progress tour. SSR-safe no-op outside the browser. */
export function clearSavedTour(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(TOUR_STORAGE_KEY);
}
