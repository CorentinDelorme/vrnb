'use client';

import { BicycleIcon, PlayIcon, WalkingIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type * as React from 'react';

import type { Tour, TourType } from '../src/app/tours-queries';

/**
 * Tour list section — port of the legacy Angular `tour-list-section` component
 * (spec #3, ticket #6): the practice header (bike/walking icon, title, count
 * badge, "Voir tous les parcours" map link) and one `list-row` per tour with
 * its distance and play button. The legacy `app-tour-list-section` selector is
 * kept as the wrapper element because the E2E suite scopes its locators on it.
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

interface TourListSectionProps {
  readonly title: string;
  readonly tours: readonly Tour[];
  readonly type: TourType;
  readonly zoneId: string;
}

export function TourListSection({ title, tours, type, zoneId }: TourListSectionProps) {
  const router = useRouter();
  const typeIcon = type === 'V' ? BicycleIcon : WalkingIcon;

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
            <div className="list-col-grow flex justify-end">
              <button
                className="btn btn-square btn-ghost"
                aria-label="Lancer le parcours"
                onClick={() => router.push(`/tour/${zoneId}/${tour.name}`)}
              >
                <HugeiconsIcon className="text-primary-content" icon={PlayIcon} strokeWidth={1.5} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </app-tour-list-section>
  );
}
