'use client';

import { BicycleIcon, WalkingIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import type * as React from 'react';

import type { Tour, TourType } from '../src/app/tours-queries';
import type { InscriptionsStatus } from './inscriptions-status-provider';
import { useInscriptionsStatus } from './inscriptions-status-provider';
import { TourPlayButton } from './tour-play-button';
import { TourRegisterButton } from './tour-register-button';

/**
 * Tour list section — port of the legacy Angular `tour-list-section` component
 * (spec #3, ticket #6): the practice header (bike/walking icon, title, count
 * badge, "Voir tous les parcours" map link) and one `list-row` per tour with
 * its distance and play button. The legacy `app-tour-list-section` selector is
 * kept as the wrapper element because the E2E suite scopes its locators on it.
 *
 * Ticket #16: a Parcours covered by the Édition's inscriptions shows the
 * « Binôme inscrit » badge next to its title once the statuses have loaded
 * after hydration (the public state carries no names); uncovered rows and the
 * loading/error states render exactly like before.
 *
 * Ticket #17: every uncovered Parcours row whose registration window is open
 * also shows the register button right before the play button. While the
 * statuses are loading (or on a fetch error) the coverage is unknown, and the
 * unknown tours stay open for registration — exactly the badge-less state of
 * #16, so a late-covered row is resolved by the modal's own 409 race guard.
 */

declare module 'react' {
  // Namespace merge is the only way to declare a custom element in React 19 types.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      /** Legacy Angular selector kept as the section wrapper (E2E DOM contract). */
      'app-tour-list-section': React.HTMLAttributes<HTMLElement>;
    }
  }
}

/** French distance label, parity with the Angular template: "800 m" or "1,1 km". */
function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  }
  return `${distance.toString().replace('.', ',')} km`;
}

/** Whether the loaded inscriptions cover the given (zone, Parcours) pair. */
function isCoveredInscriptions(
  status: InscriptionsStatus,
  zoneId: string,
  tourId: string,
): boolean {
  return (
    status.status === 'success' &&
    status.state.inscriptions.some(
      (inscription) => inscription.zoneId === zoneId && inscription.tourId === tourId,
    )
  );
}

/**
 * Whether registering is allowed for a row of unknown status. Once loaded, a
 * closed window answer hides the buttons of every uncovered row; before that
 * (loading or error) the coverage is unknown and the button stays offered.
 */
function isRegisteringOpen(status: InscriptionsStatus): boolean {
  return status.status !== 'success' || status.state.registrationOpen;
}

interface TourListSectionProps {
  readonly title: string;
  readonly tours: readonly Tour[];
  readonly type: TourType;
  readonly zoneId: string;
}

export function TourListSection({ title, tours, type, zoneId }: TourListSectionProps) {
  const typeIcon = type === 'V' ? BicycleIcon : WalkingIcon;
  const status = useInscriptionsStatus();

  return (
    <app-tour-list-section>
      <ul className="list bg-base-200 rounded-box border-2 border-secondary/20 shadow-lg">
        <li className="flex items-center justify-between gap-3 border-b-2 border-base-300 p-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-content flex items-center justify-center rounded-full p-2 sm:p-2.5">
              <HugeiconsIcon className="sm:h-10 sm:w-10" icon={typeIcon} strokeWidth={1.5} />
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-secondary text-xl font-bold tracking-wide sm:text-2xl">
                {title}
              </h2>
              <span className="badge badge-secondary badge-sm sm:badge-md">
                {tours.length} parcours
              </span>
            </div>
          </div>

          <Link
            className="btn btn-primary btn-sm max-sm:hidden sm:btn-md shrink-0"
            href={`/tours/${zoneId}/${type}`}
          >
            Voir tous les parcours
          </Link>
        </li>

        {tours.map((tour) => (
          <li
            className="list-row items-center bg-base-100 border-base-200 rounded-lg border"
            key={tour.name}
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base-content text-xl font-medium sm:text-3xl">{tour.name}</div>
              {isCoveredInscriptions(status, zoneId, tour.name) ? (
                <span className="badge badge-success badge-sm sm:badge-md">Binôme inscrit</span>
              ) : null}
            </div>
            <div className="text-base-content/70 text-base font-light sm:text-xl">
              {formatDistance(tour.distance)}
            </div>
            <div className="list-col-grow flex justify-end">
              {!isCoveredInscriptions(status, zoneId, tour.name) && isRegisteringOpen(status) ? (
                <TourRegisterButton tour={{ tourId: tour.name, zoneId }} />
              ) : null}
              <TourPlayButton tour={{ tourId: tour.name, zoneId }} />
            </div>
          </li>
        ))}
      </ul>
    </app-tour-list-section>
  );
}
