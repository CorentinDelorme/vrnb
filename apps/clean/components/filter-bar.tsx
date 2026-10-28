'use client';

import type { DistanceInterval, TourFilterType } from '../src/app/tours-filter';
import { DistanceRangeSlider } from './distance-range-slider';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

/** One option of the Type de parcours segmented control. */
interface TypeChoice {
  readonly value: TourFilterType;
  readonly label: string;
}

/** The three options of the Type de parcours segmented control, "Tous" first. */
const TYPE_CHOICES: readonly TypeChoice[] = [
  { value: 'all', label: 'Tous' },
  { value: 'P', label: 'À pied' },
  { value: 'V', label: 'À vélo' },
];

interface FilterBarProps {
  /** The currently selected filter type ("Tous" by default). */
  readonly type: TourFilterType;
  /** Called when the user picks another type. */
  readonly onTypeChange: (type: TourFilterType) => void;
  /** Distance de nettoyage interval (inactive when it spans the whole axis). */
  readonly cleaning: DistanceInterval;
  /** Called when the user moves a cleaning-distance handle. */
  readonly onCleaningChange: (value: DistanceInterval) => void;
  /** Distance totale interval (inactive when it spans the whole axis). */
  readonly total: DistanceInterval;
  /** Called when the user moves a total-distance handle. */
  readonly onTotalChange: (value: DistanceInterval) => void;
  /** How many tours match the current filters. */
  readonly displayedCount: number;
  /** Whether at least one filter family is active (touches the results). */
  readonly filterTouched: boolean;
  /** Resets every filter to its inactive state (no permanent reset button). */
  readonly onReset: () => void;
}

/**
 * Filter bar sitting in the flow just above the zone accordions. It is
 * `position: sticky` (`top: 0`) so it sticks to the top of the viewport once
 * the scroll reaches it, and releases at the bottom of its list wrapper —
 * plain CSS, no IntersectionObserver, no JS.
 *
 * The Type de parcours filter is a single-selection shadcn/ui `ToggleGroup`
 * (`variant="outline"`, `spacing={0}` for the attached segmented look):
 * `[Tous | À pied | À vélo]`, with "Tous" pressed by default and the
 * `aria-pressed` state carried by the items. Pressing a pressed toggle
 * unpresses it, which keeps the previous filter instead of allowing "no type"
 * (the group always filters). The two distance slider families (Distance de
 * nettoyage and Distance totale) sit below the type control. Each is a
 * dual-handle range slider; an interval covering its whole axis means the
 * family is off.
 *
 * When at least one filter touches, a discreet counter ("X parcours
 * affichés", singular "1 parcours affiché") is shown; when zero tours match,
 * an empty-state message with a "Réinitialiser les filtres" button is shown
 * instead. No permanent reset button lives in the bar.
 */
export function FilterBar({
  type,
  onTypeChange,
  cleaning,
  onCleaningChange,
  total,
  onTotalChange,
  displayedCount,
  filterTouched,
  onReset,
}: FilterBarProps) {
  return (
    <Card className="sticky top-0 z-10" aria-label="Filtres de parcours">
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 md:gap-16">
          <div className="md:flex-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-full mb-2 block">
              Type de parcours
            </span>
            {/* Single-selection toggle group: one pressed item at a time;
                unpressing the pressed one keeps the previous filter (the
                fallback below ignores the empty array). */}
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[type]}
              aria-label="Type de parcours"
              onValueChange={(next) => {
                if (next.length > 0) onTypeChange(next[0] as TourFilterType);
              }}
            >
              {TYPE_CHOICES.map((choice) => (
                <ToggleGroupItem
                  key={choice.value}
                  value={choice.value}
                  // Pressed state in primary (override of the muted default,
                  // tailwind-merge drops the variant's aria-pressed:bg-muted).
                  className="aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary"
                >
                  {choice.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <fieldset className="border-0 max-md:px-2 md:flex-1" aria-label="Distance de nettoyage">
            <DistanceRangeSlider
              label="Distance de nettoyage"
              min={0.5}
              max={4}
              step={0.5}
              value={cleaning}
              onChange={onCleaningChange}
            />
          </fieldset>

          <fieldset className="border-0 max-md:px-2 md:flex-1" aria-label="Distance totale">
            <DistanceRangeSlider
              label="Distance totale"
              min={2}
              max={11}
              step={1}
              value={total}
              onChange={onTotalChange}
            />
          </fieldset>
        </div>

        {/* Counter or empty-state message, plus a reset button whenever at
            least one filter touches (permanent reset button). */}
        {filterTouched ? (
          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            {displayedCount === 0 ? (
              <p className="text-sm font-medium text-muted-foreground">
                Aucun parcours ne correspond à ces filtres
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                {displayedCount === 1
                  ? '1 parcours affiché'
                  : `${displayedCount} parcours affichés`}
              </p>
            )}
            <Button type="button" variant="outline" onClick={onReset}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
