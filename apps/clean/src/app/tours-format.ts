/** French distance label, parity with the Angular template: "800 m" or "1,1 km". */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  }
  return `${distance.toString().replace('.', ',')} km`;
}
