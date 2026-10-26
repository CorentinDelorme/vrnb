'use client';

import { BicycleIcon, WalkingIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import type * as React from 'react';

import { formatDistance } from '../src/app/tours-format';
import type { Tour, TourType } from '../src/app/tours-queries';
import type { InscriptionsStatus } from './inscriptions-status-provider';
import { useInscriptionsStatus } from './inscriptions-status-provider';
import { isRegistrationWindowOpen } from './inscriptions-status-provider';
import { TourPlayButton } from './tour-play-button';
import { TourRegisterButton } from './tour-register-button';
import { Badge } from './ui/badge';
import { buttonVariants } from './ui/button';
import { Item } from './ui/item';

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
 * right before the play button. The action slot stays EMPTY while the
 * statuses are loading and on a fetch error: the coverage is then unknown,
 * and the site never offers a registration it cannot honor — the same
 * degraded state as the badge of #16. The gating hides the button through a
 * prop (rather than unmounting the component) so a modal opened while a row
 * was uncoverable keeps displaying its confirmation or conflict message once
 * the row turns covered.
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

/** Both distances of a Parcours row, French format:
 *  "1,1 km nettoyage · 4,2 km total" ("800 m" sous 1 km for each distance). */
function formatTourDistances(tour: Tour): string {
  return `${formatDistance(tour.distance)} nettoyage · ${formatDistance(tour.totalDistance)} total`;
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
   * Whether the registration window is open, from the ONE rule of the provider
   * (the server's answer when the public state loaded, the local clock
   * otherwise): the window closes 3 days before the action date (the
   * organizers need that time to print the tracking sheets and organize the
   * day), and the register button disappears with it.
   */
  const windowOpen = isRegistrationWindowOpen(status, new Date());

  return (
    <app-tour-list-section>
      <ul className="border-2 border-secondary/20 shadow-lg">
        <li className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border p-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground flex items-center justify-center rounded-full p-2 sm:p-2.5">
              <HugeiconsIcon className="sm:h-10 sm:w-10" icon={typeIcon} strokeWidth={1.5} />
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-secondary text-xl font-bold tracking-wide sm:text-2xl">
                {title}
              </h2>
              <Badge variant="secondary">{tours.length} parcours</Badge>
            </div>
          </div>

          {/* Legacy contract (tests.md): the map link is a link, styled with
              the primary button look. */}
          <Link
            href={`/tours/${zoneId}/${type}`}
            className={`${buttonVariants({ variant: 'default', size: 'sm' })} max-sm:w-full shrink-0`}
          >
            Voir tous les parcours
          </Link>
        </li>

        {tours.map((tour) => (
          <Item
            render={(props) => <li {...props} />}
            variant="outline"
            size="sm"
            className="list-row"
            data-testid="tour-row"
            key={tour.name}
          >
            <div className="text-foreground text-xl font-medium sm:text-3xl">{tour.name}</div>
            <div className="text-muted-foreground/70 text-base font-light sm:text-xl">
              {formatTourDistances(tour)}
            </div>
            <div className="flex items-center justify-end gap-2">
              {statusKnown && isCoveredInscriptions(status, zoneId, tour.name) ? (
                <Badge variant="secondary">Binôme inscrit</Badge>
              ) : null}
              <TourRegisterButton
                available={
                  statusKnown && windowOpen && !isCoveredInscriptions(status, zoneId, tour.name)
                }
                tour={{ tourId: tour.name, zoneId }}
              />
              <TourPlayButton tour={{ tourId: tour.name, zoneId }} />
            </div>
          </Item>
        ))}
      </ul>
    </app-tour-list-section>
  );
}
