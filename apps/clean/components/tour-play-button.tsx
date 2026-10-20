'use client';

import { PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import type { TourRef } from '../src/app/tours-queries';

interface TourPlayButtonProps {
  readonly tour: TourRef;
}

/**
 * « Lancer le parcours » play button, shared by the home tour list rows and
 * the resume banner (spec #3, ticket #6). The `aria-label` is part of the
 * legacy DOM contract asserted by the E2E suite.
 */
export function TourPlayButton({ tour }: TourPlayButtonProps) {
  const router = useRouter();

  return (
    <button
      className="btn btn-square btn-ghost"
      aria-label="Lancer le parcours"
      onClick={() => router.push(`/tour/${tour.zoneId}/${tour.tourId}`)}
    >
      <HugeiconsIcon className="text-primary-content" icon={PlayIcon} strokeWidth={1.5} />
    </button>
  );
}
