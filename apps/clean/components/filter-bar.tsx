'use client';

import type { DistanceInterval, TourFilterType } from '../src/app/tours-filter';
import { DistanceRangeSlider } from './distance-range-slider';

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
 * Filter bar card (DaisyUI `card bg-base-100`) sitting in the flow just above
 * the zone accordions. It is `position: sticky` (`top: 0`) so it sticks to the
 * top of the viewport only once the scroll reaches it, and releases at the
 * bottom of its list wrapper — plain CSS, no IntersectionObserver, no JS.
 *
 * The segmented control is a DaisyUI `join` of radio-style buttons:
 * `[Tous | À pied | À vélo]`, "Tous" checked by default, one active option at
 * a time.
 *
 * Ticket #52: the two distance slider families (Distance de nettoyage and
 * Distance totale) sit below the type control. Each is a reusable dual-handle
 * ARIA slider; an interval covering its whole axis means the family is off.
 *
 * Ticket #53: when at least one filter touches, a discreet counter ("X
 * parcours affichés", singular "1 parcours affiché") is shown; when zero
 * tours match, an empty-state message with a "Réinitialiser les filtres"
 * button is shown instead. No permanent reset button lives in the bar.
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
    <section
      className="card bg-base-100 shadow-sm sticky top-0 z-10 mb-4"
      aria-label="Filtres de parcours"
    >
      <div className="card-body">
        <fieldset className="border-0 p-0 mb-3">
          <legend className="text-xs font-medium text-base-content/70 uppercase tracking-wider w-full">
            Type de parcours
          </legend>
          <div className="join mt-2">
            {TYPE_CHOICES.map((choice) => {
              const active = type === choice.value;
              return (
                <label
                  key={choice.value}
                  className={`btn btn-sm join-item ${active ? 'btn-active' : ''}`}
                  title={choice.label}
                >
                  <input
                    type="radio"
                    name="tour-type"
                    value={choice.value}
                    checked={active}
                    onChange={() => onTypeChange(choice.value)}
                    className="radio radio-sm"
                    aria-label={choice.label}
                  />
                  {choice.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="border-0 p-0 mb-3">
          <legend className="text-xs font-medium text-base-content/70 uppercase tracking-wider w-full">
            Distance de nettoyage
          </legend>
          <DistanceRangeSlider
            label="Distance de nettoyage"
            min={0.5}
            max={4}
            step={0.5}
            value={cleaning}
            onChange={onCleaningChange}
          />
        </fieldset>

        <fieldset className="border-0 p-0 mb-3">
          <legend className="text-xs font-medium text-base-content/70 uppercase tracking-wider w-full">
            Distance totale
          </legend>
          <DistanceRangeSlider
            label="Distance totale"
            min={2}
            max={11}
            step={1}
            value={total}
            onChange={onTotalChange}
          />
        </fieldset>

        {/* Ticket #53: counter or empty state, only when a filter touches. */}
        {filterTouched ? (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {displayedCount === 0 ? (
              <>
                <p className="text-sm font-medium text-base-content/70">
                  Aucun parcours ne correspond à ces filtres
                </p>
                <button type="button" className="btn btn-xs btn-secondary" onClick={onReset}>
                  Réinitialiser les filtres
                </button>
              </>
            ) : (
              <p className="text-sm font-medium text-base-content/70">
                {displayedCount === 1
                  ? '1 parcours affiché'
                  : `${displayedCount} parcours affichés`}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
