'use client';

import { cn } from '@/components/lib/utils';
import type { DistanceInterval, TourFilterType } from '../src/app/tours-filter';
import { DistanceRangeSlider } from './distance-range-slider';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

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
 * The segmented control is a single-selection group of radio inputs styled as
 * shadcn buttons: `[Tous | À pied | À vélo]`, "Tous" checked by default, one
 * active option at a time. The `aria-label` on each input is the legacy anchor
 * the unit specs scope on (`getByLabelText('Tous' | 'À pied' | 'À vélo')`).
 *
 * The two distance slider families (Distance de nettoyage and Distance
 * totale) sit below the type control. Each is a dual-handle range slider; an
 * interval covering its whole axis means the family is off.
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
    <Card
      className={cn('sticky top-0 z-10', 'has-data-[slot=card-footer]:pb-0')}
      aria-label="Filtres de parcours"
    >
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-16">
          <div className="sm:flex-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-full mb-2 block">
              Type de parcours
            </span>
            <div role="group" aria-label="Type de parcours" className="inline-flex w-fit">
              {TYPE_CHOICES.map((choice, index) => {
                const active = type === choice.value;
                const isFirst = index === 0;
                const isLast = index === TYPE_CHOICES.length - 1;
                return (
                  <label
                    key={choice.value}
                    className={cn(
                      'relative inline-flex items-center justify-center border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-muted hover:text-foreground',
                      isFirst && 'rounded-l-lg',
                      isLast && 'rounded-r-lg',
                      !isFirst && '-ml-px',
                    )}
                    role="radio"
                    aria-checked={active}
                    aria-label={choice.label}
                    title={choice.label}
                    onClick={() => onTypeChange(choice.value)}
                  >
                    <input
                      type="radio"
                      name="tour-type"
                      value={choice.value}
                      checked={active}
                      onChange={() => {}}
                      className="absolute -left-9999"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    {choice.label}
                  </label>
                );
              })}
            </div>
          </div>

          <fieldset className="border-0 max-sm:px-2 sm:flex-1" aria-label="Distance de nettoyage">
            <DistanceRangeSlider
              label="Distance de nettoyage"
              min={0.5}
              max={4}
              step={0.5}
              value={cleaning}
              onChange={onCleaningChange}
            />
          </fieldset>

          <fieldset className="border-0 max-sm:px-2 sm:flex-1" aria-label="Distance totale">
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
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
