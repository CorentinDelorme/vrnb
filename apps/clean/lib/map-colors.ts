/**
 * Shared color palette for tour tracks — used by both the web map (Leaflet)
 * and the PDF generator (jsPDF).
 *
 * Parity exception: Leaflet and jsPDF consume literal colors only (no CSS variables),
 * so the legacy per-trace palette stays verbatim instead of DaisyUI tokens.
 * The colors must match the Angular app exactly for visual parity (spec #3).
 */

export const MAP_COLORS: readonly (readonly [number, number, number])[] = [
  [239, 68, 68], // warm - red
  [59, 130, 246], // cool - blue
  [249, 115, 22], // warm - orange
  [20, 184, 184], // cool - teal
  [245, 158, 11], // warm - amber
  [67, 56, 202], // cool - indigo
  [234, 179, 8], // warm - yellow
  [16, 185, 129], // cool - emerald
  [236, 72, 153], // warm - pink
  [14, 165, 233], // cool - sky
  [219, 39, 119], // warm - rose
  [6, 182, 212], // cool - cyan
  [250, 204, 21], // warm - gold
  [34, 197, 94], // cool - green
  [244, 114, 182], // warm - coral
  [168, 85, 247], // cool - violet
  [153, 101, 21], // warm - brown
  [126, 34, 206], // cool - fuchsia
  [255, 99, 71], // warm - tomato
  [132, 204, 22], // cool/warm - lime
] as const;

/** RGB color string for Leaflet (e.g. 'rgb(239, 68, 68)'). */
export function getTrackColorRgb(zoneLocalIndex: number): string {
  const [r, g, b] = MAP_COLORS[zoneLocalIndex % MAP_COLORS.length];
  return `rgb(${r}, ${g}, ${b})`;
}

/** RGB tuple for jsPDF (e.g. [239, 68, 68]). */
export function getTrackColorTuple(zoneLocalIndex: number): readonly [number, number, number] {
  return MAP_COLORS[zoneLocalIndex % MAP_COLORS.length];
}
