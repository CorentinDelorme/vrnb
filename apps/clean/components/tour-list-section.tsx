'use client';

import { BicycleIcon, WalkingIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import type * as React from 'react';

import { formatDistance } from '../src/app/tours-format';
import type { Tour, TourType } from '../src/app/tours-queries';
import type { InscriptionsStatus } from './inscriptions-status-provider';
import { isRegistrationWindowOpen, useInscriptionsStatus } from './inscriptions-status-provider';
import { TourPlayButton } from './tour-play-button';
import { TourRegisterButton } from './tour-register-button';
import { Badge } from './ui/badge';
import { buttonVariants } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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

/** Both distances of a Parcours row, French format ("800 m" sous 1 km).
 *  No separator dot anywhere: on desktop the two spans sit inline with a gap,
 *  on mobile they stack on two lines. */
function formatTourDistances(tour: Tour): { cleaning: string; total: string } {
  return {
    cleaning: `${formatDistance(tour.distance)} nettoyage`,
    total: `${formatDistance(tour.totalDistance)} total`,
  };
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
      <Card className="py-0 gap-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 bg-muted py-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground flex items-center justify-center rounded-full p-2 sm:p-2.5">
              <HugeiconsIcon className="sm:h-10 sm:w-10" icon={typeIcon} strokeWidth={1.5} />
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-secondary text-xl font-bold tracking-wide sm:text-2xl">
                {title}
              </CardTitle>
              <Badge variant="secondary">{tours.length} parcours</Badge>
            </div>
          </div>

          {/* Legacy contract (tests.md): the map link is a link, styled with
              the primary button look. */}
          <Link
            href={`/tours/${zoneId}/${type}`}
            className={`${buttonVariants({ variant: 'default' })} shrink-0 whitespace-normal`}
          >
            Voir tous les parcours
          </Link>
        </CardHeader>
        <CardContent className="-mx-(--card-spacing)">
          <ul className="divide-y divide-border">
            {tours.map((tour) => (
              <Item
                render={(props) => <li {...props} />}
                variant="outline"
                size="sm"
                className="list-row rounded-none"
                data-testid="tour-row"
                key={tour.name}
              >
                {/* Row layout.
                    Mobile:  [name] [distances stacked on 2 lines + register/badge below] [play →]
                    Desktop: 3 ALIGNED columns shared by every row
                             [name 5rem] [cleaning 11rem] [total 1fr] [actions →]
                             Fixed name & cleaning tracks keep each column left
                             edge identical across rows regardless of badge /
                             register presence (auto actions track). */}
                <div className="flex-1 flex items-center gap-3 min-w-0 sm:grid sm:grid-cols-[5rem_11rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                  {/* Name — never truncated (fixed width track on desktop) */}
                  <div className="shrink-0 text-foreground text-2xl font-medium sm:text-3xl whitespace-nowrap">
                    {tour.name}
                  </div>

                  {/* Distances wrapper: flex-1 block on mobile (spans stacked),
                      display:contents on desktop so both spans become the
                      column 2 and column 3 grid items. */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1 sm:contents">
                    <span className="text-muted-foreground/70 text-base font-light sm:text-xl">
                      {formatTourDistances(tour).cleaning}
                    </span>
                    <span className="text-muted-foreground/70 text-base font-light sm:text-xl">
                      {formatTourDistances(tour).total}
                    </span>
                    {/* Mobile only: register/badge as 3rd line, under the distances */}
                    <div className="flex sm:hidden items-center gap-2">
                      {statusKnown && isCoveredInscriptions(status, zoneId, tour.name) ? (
                        <Badge variant="secondary">Binôme inscrit</Badge>
                      ) : null}
                      <TourRegisterButton
                        available={
                          statusKnown &&
                          windowOpen &&
                          !isCoveredInscriptions(status, zoneId, tour.name)
                        }
                        tour={{ tourId: tour.name, zoneId }}
                      />
                    </div>
                  </div>

                  {/* Mobile only: play button in the flex row */}
                  <div className="sm:hidden shrink-0">
                    <TourPlayButton tour={{ tourId: tour.name, zoneId }} />
                  </div>

                  {/* Desktop only: register/badge left of the play button,
                      together in the last (auto) grid column */}
                  <div className="hidden sm:flex items-center justify-end gap-2">
                    {statusKnown && isCoveredInscriptions(status, zoneId, tour.name) ? (
                      <Badge variant="secondary">Binôme inscrit</Badge>
                    ) : null}
                    <TourRegisterButton
                      available={
                        statusKnown &&
                        windowOpen &&
                        !isCoveredInscriptions(status, zoneId, tour.name)
                      }
                      tour={{ tourId: tour.name, zoneId }}
                    />
                    {/* Play button — always far right */}
                    <TourPlayButton tour={{ tourId: tour.name, zoneId }} />
                  </div>
                </div>
              </Item>
            ))}
          </ul>
        </CardContent>
      </Card>
    </app-tour-list-section>
  );
}
