/**
 * Map container of the tour page — the seam left open for ticket #11 (route
 * drawing, arrowheads, GPS tracking, debug simulation). It renders the exact
 * legacy markup (`tour.html`: `div#map` with the same height classes) so the
 * E2E selectors and layout keep working while the Leaflet wiring lands.
 *
 * #11 receives the parcours context through `zoneId`/`tourId`/`step` (the
 * step drives which segment — start / tour / end — is drawn) and owns the
 * client-side Leaflet lifecycle; nothing else on this page touches the map.
 */
interface TourMapProps {
  readonly zoneId: string;
  readonly tourId: string;
  /** Current step of the 3-step state machine (0 = Début, 1 = Nettoyage, 2 = Fin). */
  readonly step: number;
}

export function TourMap({ zoneId, tourId, step }: TourMapProps) {
  return (
    <div
      className="z-0 h-[calc(100dvh-208px)] w-full overflow-hidden sm:h-[calc(100vh-296px)]"
      data-zone-id={zoneId}
      data-step={step}
      data-tour-id={tourId}
      id="map"
    />
  );
}
