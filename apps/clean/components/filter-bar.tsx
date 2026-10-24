'use client';

import type { TourFilterType } from '../src/app/tours-filter';

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
 */
export function FilterBar({ type, onTypeChange }: FilterBarProps) {
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
      </div>
    </section>
  );
}
