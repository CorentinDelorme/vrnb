'use client';

import { useEffect, useState } from 'react';

import type { SavedTour } from '../src/app/tour-storage';
import { loadSavedTour } from '../src/app/tour-storage';
import { findTour } from '../src/app/tours-queries';
import { getZone } from '../src/app/zones';
import { TourPlayButton } from './tour-play-button';
import { Card, CardContent } from './ui/card';

/**
 * Resume banner — port of the legacy Angular `tours-list` saved-tour block
 * (spec #3, ticket #6). The `vrnb_tour` entry is read from localStorage in an
 * effect (never during SSR, so the page stays static) and the banner only
 * appears when the saved tour actually exists — a stale or corrupted entry
 * stays hidden instead of linking to a dead `/tour/…` URL.
 */
export function ResumeTourBanner() {
  const [saved, setSaved] = useState<SavedTour | null>(null);

  useEffect(() => {
    const stored = loadSavedTour();
    if (stored && findTour(stored.zoneId, stored.tourId)) {
      setSaved(stored);
    }
  }, []);

  if (!saved) return null;

  return (
    <Card className="shadow-md border mb-4 sm:mb-8">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center">
          <div className="text-base-content/60 text-base font-light sm:text-xl">
            Reprendre le parcours {getZone(saved.zoneId).name} - {saved.tourId} (étape{' '}
            {saved.step + 1}/3)
          </div>
          <div className="list-col-grow flex justify-end">
            <TourPlayButton tour={saved} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
