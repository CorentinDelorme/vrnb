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
 * « Binôme inscrit » badge once the statuses have loaded after hydration (the
 * public state carries no names); uncovered rows and the loading/error states
 * render exactly like before. The badge stands where the register button
 * would be — next to the play button — so a covered row reads as a single
 * action slot: the state of the Parcours, then its play button.
 *
 * Ticket #17: every uncovered Parcours row also shows the register button
 * right before the play button. While the statuses are loading (or on a
 * fetch error) the coverage is unknown, and the unknown tours stay open for
 * registration — exactly the badge-less state of #16, so a late-covered row
 * is resolved by the modal's own 409 race guard. The gating hides the button
 * through a prop (rather than unmounting the component) so a modal opened
 * while a row was uncoverable keeps displaying its confirmation or conflict
 * message once the row turns covered.
 *
 * Ticket #18: a closed registration window (the window closes 3 days before
 * the action date) hides the register button — the organizers need that time
 * to print the tracking sheets and organize the day. A covered Parcours
 * loses its button too, replaced by the « Binôme inscrit » badge.
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
 * Whether the row offers its register button (ticket #18): a covered Parcours
 * loses it, and so does a closed registration window (the caller also checks
 * the window).
 */
function isUncovered(status: InscriptionsStatus, zoneId: string, tourId: string): boolean {
  return !isCoveredInscriptions(status, zoneId, tourId);
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
  /**
   * Whether the coverage of the rows is known: the action slot (badge or
   * register button) stays empty until the public state answered, so the
   * register button never turns into a « Binôme inscrit » badge under the
   * volunteer's eyes. A failed request leaves the state unknown too, so
   * neither the badge nor the button is shown: the site never offers a
   * registration it cannot honor.
   */
  const statusKnown = status.status === 'success';
  /**
   * Whether the registration window is open, as the server answers it: the
   * window closes 3 days before the action date (the organizers need that
   * time to print the tracking sheets and organize the day), and the register
   * button disappears with it.
   */
  const windowOpen = statusKnown && status.state.registrationOpen;

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
            <div className="text-base-content text-xl font-medium sm:text-3xl">{tour.name}</div>
            <div className="text-base-content/70 text-base font-light sm:text-xl">
              {formatDistance(tour.distance)}
            </div>
            <div className="list-col-grow flex items-center justify-end gap-2">
              {statusKnown && isCoveredInscriptions(status, zoneId, tour.name) ? (
                <span className="badge badge-success badge-sm sm:badge-md">Binôme inscrit</span>
              ) : null}
              <TourRegisterButton
                available={statusKnown && windowOpen && isUncovered(status, zoneId, tour.name)}
                tour={{ tourId: tour.name, zoneId }}
              />
              <TourPlayButton tour={{ tourId: tour.name, zoneId }} />
            </div>
          </li>
        ))}
      </ul>
    </app-tour-list-section>
  );
}
