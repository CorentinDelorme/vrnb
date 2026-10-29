'use client';

import { useState } from 'react';

import {
  DEFAULT_TOUR_DISTANCE_FILTER,
  filterToursByDistance,
  filterToursByType,
  isFilterTouched,
  type DistanceInterval,
  type TourFilterType,
} from '../src/app/tours-filter';

import { findZoneTours } from '../src/app/tours-queries';
import { ZONES } from '../src/app/zones';
import { FilterBar } from './filter-bar';
import { TourListSection } from './tour-list-section';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

/**
 * Client wrapper above the zone list carrying the ephemeral filter state
 * (`useState`, not persisted): Type de parcours plus the two distance
 * families (Distance de nettoyage, Distance totale). It computes the filtered
 * tours per zone and passes them to the `TourListSection`s.
 *
 * - The filter bar card sticks to the top of the viewport once scrolled to.
 * - A zone disappears entirely once all its tours are filtered out.
 * - Within a zone, an empty "à vélo" / "à pied" block is not rendered.
 * - Section titles and "N parcours" badges follow the filtered counts.
 * - The three families combine in ET: type AND cleaning distance AND total
 *   distance. A distance family spanning its whole axis is inactive.
 */
export function ZoneList() {
  const [filterType, setFilterType] = useState<TourFilterType>('all');
  const [cleaning, setCleaning] = useState<DistanceInterval>(DEFAULT_TOUR_DISTANCE_FILTER.cleaning);
  const [total, setTotal] = useState<DistanceInterval>(DEFAULT_TOUR_DISTANCE_FILTER.total);

  const filterTouched = isFilterTouched(filterType, cleaning, total);
  const distanceFilter = { cleaning, total };

  let totalDisplayed = 0;
  const zoneSections = ZONES.map((zone) => {
    const bikeTours = filterToursByType(
      filterToursByDistance(findZoneTours(zone.id, 'V'), distanceFilter),
      'V',
      filterType,
    );
    const walkingTours = filterToursByType(
      filterToursByDistance(findZoneTours(zone.id, 'P'), distanceFilter),
      'P',
      filterType,
    );
    totalDisplayed += bikeTours.length + walkingTours.length;
    const hasBike = bikeTours.length > 0;
    const hasWalking = walkingTours.length > 0;
    const hasTours = hasBike || hasWalking;
    const hasBothTypes = hasBike && hasWalking;

    // A zone with no matching tour disappears entirely.
    if (!hasTours) {
      return null;
    }

    return (
      <Card key={zone.id} className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-secondary text-2xl font-bold tracking-wide sm:text-4xl">
            {zone.name}
          </CardTitle>
          <Badge variant="secondary">{bikeTours.length + walkingTours.length} parcours</Badge>
        </CardHeader>
        <CardContent>
          <div
            className={`grid grid-cols-1 gap-4 sm:gap-8${hasBothTypes ? ' lg:grid-cols-2' : ''}`}
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
        </CardContent>
      </Card>
    );
  });

  const handleReset = () => {
    setFilterType('all');
    setCleaning(DEFAULT_TOUR_DISTANCE_FILTER.cleaning);
    setTotal(DEFAULT_TOUR_DISTANCE_FILTER.total);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <FilterBar
        type={filterType}
        onTypeChange={setFilterType}
        cleaning={cleaning}
        onCleaningChange={setCleaning}
        total={total}
        onTotalChange={setTotal}
        displayedCount={totalDisplayed}
        filterTouched={filterTouched}
        onReset={handleReset}
      />
      <div className="flex flex-col gap-4">{zoneSections}</div>
    </div>
  );
}
