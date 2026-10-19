'use client';

import { MapsLocationIcon, Pdf02Icon, Route02Icon, Tree06Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { tourGpxUrl, tourPdfUrl } from '../lib/tour-downloads';
import {
  buildGeoVeloToMeetingPointLink,
  fetchGpxFile,
  generateGeoVeloLinks,
  getGeoJsonFromGpx,
  type GeoVeloLinks,
} from '../src/app/shared/gpx/gpx';
import { fetchTourRouteGeoJson } from '../src/app/shared/gpx/tour-geojson';
import { getCurrentPosition, subscribeCurrentPosition } from '../src/app/shared/map/map-position';
import { DEFAULT_ZONE_ID, getZone } from '../src/app/zones';

/**
 * Download links of the "Menu" drawer on `/tour/<zone>/<id>` — port of the
 * legacy Angular `tour-drawer` template (spec #3): the fiche PDF, the three
 * GPX traces, and the GeoVelo section (route links appear once the tour
 * geometry is loaded, the meeting-point link is always there).
 *
 * The zone and tour id are parsed from the pathname exactly like the Angular
 * drawer did from `router.url`; the component is only mounted by the header
 * on `/tour/…` routes (see `headerFlags`).
 */

/** Zone and tour id parsed from the current "/tour/:zoneId/:id" pathname. */
function parseTourPath(pathname: string): { zoneId: string; id?: string } {
  const match = pathname.match(/\/tour\/([^/]+)\/([^/?]+)/);
  return { zoneId: match?.[1] ?? DEFAULT_ZONE_ID, id: match?.[2] };
}

export function TourDrawerLinks() {
  const pathname = usePathname();
  const { zoneId, id } = parseTourPath(pathname);
  const meetingPoint = getZone(zoneId).meetingPoint;

  // Last GPS position tracked by the tour map (parity with the Angular
  // MapLocationService signal): the meeting-point link departs from it once
  // available. The server snapshot is always "no position".
  const currentPosition = useSyncExternalStore(
    subscribeCurrentPosition,
    getCurrentPosition,
    () => null,
  );

  // GeoVelo route links derive from the tour geometry (loaded client-side).
  const [routeLinks, setRouteLinks] = useState<GeoVeloLinks | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    void (async () => {
      // Precomputed asset first, GPX runtime fallback (parity with GpxService).
      const tourGeoJson =
        (await fetchTourRouteGeoJson(id, zoneId)) ??
        getGeoJsonFromGpx(await fetchGpxFile(id, undefined, zoneId));
      const links = generateGeoVeloLinks(tourGeoJson, meetingPoint.coordinates);
      if (!cancelled) setRouteLinks(links ?? null);
    })().catch(() => {
      // Missing geometry: the two route links simply stay hidden (legacy `@if`).
    });

    return () => {
      cancelled = true;
    };
  }, [id, zoneId, meetingPoint.coordinates]);

  return (
    <>
      {id ? (
        <li>
          <a download href={tourPdfUrl(zoneId, id)} rel="noopener noreferrer" target="_blank">
            <HugeiconsIcon icon={Pdf02Icon} strokeWidth={1.5} />
            Télécharger le PDF
          </a>
        </li>
      ) : null}

      <div className="divider m-0" />

      {id ? (
        <li>
          <a
            download
            href={tourGpxUrl(zoneId, id, 'start')}
            rel="noopener noreferrer"
            target="_blank"
          >
            <HugeiconsIcon icon={Route02Icon} strokeWidth={1.5} />
            Télécharger le GPX vers le point de départ
          </a>
        </li>
      ) : null}
      {id ? (
        <li>
          <a download href={tourGpxUrl(zoneId, id)} rel="noopener noreferrer" target="_blank">
            <HugeiconsIcon icon={MapsLocationIcon} strokeWidth={1.5} />
            Télécharger le GPX du parcours
          </a>
        </li>
      ) : null}
      {id ? (
        <li>
          <a
            download
            href={tourGpxUrl(zoneId, id, 'end')}
            rel="noopener noreferrer"
            target="_blank"
          >
            <HugeiconsIcon icon={Tree06Icon} strokeWidth={1.5} />
            Télécharger le GPX pour retourner au lieu de rendez-vous
          </a>
        </li>
      ) : null}

      <div className="divider m-0" />

      <div className="flex justify-center">
        <img
          alt="GeoVelo"
          className="h-8.5 w-45.5 sm:h-11.75 sm:w-63.75"
          src="/icons/geovelo.svg"
        />
      </div>

      <li>
        <a
          href={buildGeoVeloToMeetingPointLink(meetingPoint.coordinates, currentPosition)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <HugeiconsIcon icon={Tree06Icon} strokeWidth={1.5} />
          Retourner au lieu de rendez-vous depuis ma position
        </a>
      </li>

      {routeLinks?.toStart ? (
        <li>
          <a href={routeLinks.toStart} rel="noopener noreferrer" target="_blank">
            <HugeiconsIcon icon={Route02Icon} strokeWidth={1.5} />
            Itinéraire vers le point de départ
          </a>
        </li>
      ) : null}
      {routeLinks?.fromEnd ? (
        <li>
          <a href={routeLinks.fromEnd} rel="noopener noreferrer" target="_blank">
            <HugeiconsIcon icon={Tree06Icon} strokeWidth={1.5} />
            Itinéraire pour retourner au lieu de rendez-vous
          </a>
        </li>
      ) : null}
    </>
  );
}
