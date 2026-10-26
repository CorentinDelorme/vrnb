'use client';

import { GoalIcon, MapsLocationIcon, Pdf02Icon, Route02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { matchTourPath } from '../lib/route-paths';
import { tourGpxUrl, tourPdfUrl } from '../lib/tour-downloads';
import {
  buildGeoVeloToMeetingPointLink,
  generateGeoVeloLinks,
  type GeoVeloLinks,
} from '../src/app/shared/gpx/gpx';
import { loadTourRouteGeoJson } from '../src/app/shared/gpx/tour-geometry';
import { getCurrentPosition, subscribeCurrentPosition } from '../src/app/shared/map/map-position';
import { DEFAULT_ZONE_ID, getZone } from '../src/app/zones';
import { Separator } from './ui/separator';

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
export function TourDrawerLinks() {
  const pathname = usePathname();
  // The zone and tour id are parsed from the pathname exactly like the Angular
  // drawer did from `router.url`; the DEFAULT_ZONE_ID fallback only applies
  // off a `/tour/…` route, where the header mounts no drawer anyway.
  const tourPath = matchTourPath(pathname);
  const zoneId = tourPath?.zoneId ?? DEFAULT_ZONE_ID;
  const id = tourPath?.id;
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
      const tourGeoJson = await loadTourRouteGeoJson({ zoneId, tourId: id });
      if (!tourGeoJson || cancelled) return;
      setRouteLinks(generateGeoVeloLinks(tourGeoJson, meetingPoint.coordinates) ?? null);
    })().catch(() => {
      // Missing geometry: the two route links simply stay hidden (legacy `@if`).
    });

    return () => {
      cancelled = true;
    };
  }, [id, zoneId, meetingPoint.coordinates]);

  return (
    <div className="space-y-3">
      {id ? (
        <li>
          <a
            download
            href={tourPdfUrl(zoneId, id)}
            rel="noopener noreferrer"
            target="_blank"
            className="flex items-center gap-2"
          >
            <HugeiconsIcon icon={Pdf02Icon} strokeWidth={1.5} />
            Télécharger le PDF
          </a>
        </li>
      ) : null}

      <Separator className="mx-0 my-4" />

      {id ? (
        <li>
          <a
            download
            href={tourGpxUrl(zoneId, id, 'start')}
            rel="noopener noreferrer"
            target="_blank"
            className="flex items-center gap-2"
          >
            <HugeiconsIcon icon={Route02Icon} strokeWidth={1.5} />
            Télécharger le GPX vers le point de départ
          </a>
        </li>
      ) : null}
      {id ? (
        <li>
          <a
            download
            href={tourGpxUrl(zoneId, id)}
            rel="noopener noreferrer"
            target="_blank"
            className="flex items-center gap-2"
          >
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
            className="flex items-center gap-2"
          >
            <HugeiconsIcon icon={GoalIcon} strokeWidth={1.5} />
            Télécharger le GPX pour retourner au lieu de rendez-vous
          </a>
        </li>
      ) : null}

      <Separator className="mx-0 my-4" />

      <div className="flex justify-center mb-3">
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
          className="flex items-center gap-2"
        >
          <HugeiconsIcon icon={GoalIcon} strokeWidth={1.5} />
          Retourner au lieu de rendez-vous depuis ma position
        </a>
      </li>

      {routeLinks?.toStart ? (
        <li>
          <a
            href={routeLinks.toStart}
            rel="noopener noreferrer"
            target="_blank"
            className="flex items-center gap-2"
          >
            <HugeiconsIcon icon={Route02Icon} strokeWidth={1.5} />
            Itinéraire vers le point de départ
          </a>
        </li>
      ) : null}
      {routeLinks?.fromEnd ? (
        <li>
          <a
            href={routeLinks.fromEnd}
            rel="noopener noreferrer"
            target="_blank"
            className="flex items-center gap-2"
          >
            <HugeiconsIcon icon={GoalIcon} strokeWidth={1.5} />
            Itinéraire pour retourner au lieu de rendez-vous
          </a>
        </li>
      ) : null}
    </div>
  );
}
