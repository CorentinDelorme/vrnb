'use client';

import { useState } from 'react';

import { filterToursByType, type TourFilterType } from '../src/app/tours-filter';
import { findZoneTours } from '../src/app/tours-queries';
import { ZONES } from '../src/app/zones';
import { FilterBar } from './filter-bar';
import { TourListSection } from './tour-list-section';

/**
 * Client wrapper above the zone list carrying the Type de parcours filter
 * state. The home page stays a server component; this client component holds
 * the ephemeral filter state (`useState`, not persisted), computes the filtered
 * tours per zone and passes them to the `TourListSection`s.
 *
 * - The filter bar card sticks to the top of the viewport once scrolled to.
 * - A zone disappears entirely once all its tours are filtered out.
 * - Within a zone, an empty "à vélo" / "à pied" block is not rendered.
 * - Section titles and "N parcours" badges follow the filtered counts.
 */
export function ZoneList() {
  const [filterType, setFilterType] = useState<TourFilterType>('all');

  const zoneSections = ZONES.map((zone) => {
    const bikeTours = filterToursByType(findZoneTours(zone.id, 'V'), 'V', filterType);
    const walkingTours = filterToursByType(findZoneTours(zone.id, 'P'), 'P', filterType);
    const hasBike = bikeTours.length > 0;
    const hasWalking = walkingTours.length > 0;
    const hasTours = hasBike || hasWalking;
    const hasBothTypes = hasBike && hasWalking;

    // A zone with no matching tour disappears entirely.
    if (!hasTours) {
      return null;
    }

    return (
      <details
        className="collapse collapse-arrow bg-base-100 border border-base-300 mb-4 shadow-md sm:mb-8"
        aria-label={`Zone ${zone.name}`}
        key={zone.id}
        open
      >
        <summary className="collapse-title flex items-center gap-3 sm:gap-4">
          <h2 className="text-secondary text-2xl font-bold tracking-wide sm:text-4xl">
            {zone.name}
          </h2>
          <span className="badge badge-secondary badge-md sm:badge-lg">
            {bikeTours.length + walkingTours.length} parcours
          </span>
        </summary>
        <div className="collapse-content">
          <div
            className={`grid grid-cols-1 gap-4 pt-2 sm:gap-8${
              hasBothTypes ? ' lg:grid-cols-2' : ''
            }`}
          >
            {hasBike ? (
              <TourListSection
                title="Parcours à vélo"
                tours={bikeTours}
                type="V"
                zoneId={zone.id}
              />
            ) : null}
            {hasWalking ? (
              <TourListSection
                title="Parcours à pied"
                tours={walkingTours}
                type="P"
                zoneId={zone.id}
              />
            ) : null}
          </div>
        </div>
      </details>
    );
  });

  return (
    <div>
      <FilterBar type={filterType} onTypeChange={setFilterType} />
      {zoneSections}
    </div>
  );
}
