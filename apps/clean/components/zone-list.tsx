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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

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
      <AccordionItem key={zone.id} value={zone.id} aria-label={`Zone ${zone.name}`}>
        <AccordionTrigger className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-secondary text-2xl font-bold tracking-wide sm:text-4xl">
            {zone.name}
          </h2>
          <Badge variant="secondary">{bikeTours.length + walkingTours.length} parcours</Badge>
        </AccordionTrigger>
        <AccordionContent className="pt-2 sm:pt-4">
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
        </AccordionContent>
      </AccordionItem>
    );
  });

  const handleReset = () => {
    setFilterType('all');
    setCleaning(DEFAULT_TOUR_DISTANCE_FILTER.cleaning);
    setTotal(DEFAULT_TOUR_DISTANCE_FILTER.total);
  };

  return (
    <div>
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
      <Card className="mt-4 sm:mt-6">
        <CardContent>
          <Accordion defaultValue={ZONES.map((zone) => zone.id)}>{zoneSections}</Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
