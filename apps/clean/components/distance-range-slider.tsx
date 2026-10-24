'use client';

import { useCallback, useMemo } from 'react';

import { formatDistance } from '../src/app/tours-format';

export interface DistanceRangeSliderProps {
  /** French family label, e.g. "Distance de nettoyage" / "Distance totale". */
  readonly label: string;
  /** Axis minimum (inclusive). */
  readonly min: number;
  /** Axis maximum (inclusive). */
  readonly max: number;
  /** Axis step. */
  readonly step: number;
  /** Current interval (controlled by the parent). */
  readonly value: Readonly<{ readonly min: number; readonly max: number }>;
  /** Called when the user moves a handle. */
  readonly onChange: (value: { min: number; max: number }) => void;
}

/** Index of a value on the stepped axis (integer math avoids float drift). */
function stepsBetween(value: number, { min, step }: { min: number; step: number }): number {
  return Math.round((value - min) / step);
}

function valueFromSteps(steps: number, { min, step }: { min: number; step: number }): number {
  return min + steps * step;
}

/**
 * Reusable dual-handle slider following the ARIA "slider" pattern.
 *
 * - Two handles `role="slider"`, tabable, `aria-valuemin/max/now`,
 *   `aria-orientation="horizontal"`, `touch-action: none`.
 * - Arrow keys move the focused handle by one axis step; Home/End go to the
 *   axis extremes. Clamped mutually so min ≤ max at all times.
 * - Three track segments: the middle segment between the handles is highlighted.
 * - Graduations (ticks) + a labels row under the track, and a live value
 *   label above ("1 km – 4 km", or "tout" when the interval covers the axis).
 */
export function DistanceRangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: DistanceRangeSliderProps) {
  const totalSteps = stepsBetween(max, { min, step });
  const minSteps = stepsBetween(value.min, { min, step });
  const maxSteps = stepsBetween(value.max, { min, step });
  const minPercent = (minSteps / totalSteps) * 100;
  const maxPercent = (maxSteps / totalSteps) * 100;

  const fullAxis = value.min === min && value.max === max;
  const valueLabel = fullAxis
    ? 'tout'
    : `${formatDistance(value.min)} – ${formatDistance(value.max)}`;

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, handle: 'min' | 'max') => {
      let delta = 0;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          delta = 1;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          delta = -1;
          break;
        case 'Home':
          delta = handle === 'min' ? -minSteps : -maxSteps;
          break;
        case 'End':
          delta = handle === 'min' ? totalSteps - minSteps : totalSteps - maxSteps;
          break;
        default:
          return;
      }
      event.preventDefault();

      let lo = minSteps;
      let hi = maxSteps;
      if (handle === 'min') {
        // The min handle cannot move past the max handle (mutual clamp min ≤ max).
        lo = Math.min(Math.max(lo + delta, 0), hi);
      } else {
        // The max handle cannot move below the min handle.
        hi = Math.min(Math.max(hi + delta, lo), totalSteps);
      }
      onChange({
        min: valueFromSteps(lo, { min, step }),
        max: valueFromSteps(hi, { min, step }),
      });
    },
    [min, step, minSteps, maxSteps, totalSteps, onChange],
  );

  const tickValues = useMemo(() => {
    const values: number[] = [];
    for (let v = min; v <= max + 1e-9; v += step) {
      values.push(v);
    }
    return values;
  }, [min, max, step]);

  const handle = (which: 'min' | 'max', steps: number, percent: number) => {
    const isMin = which === 'min';
    return (
      <div
        key={which}
        className="absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary border-2 border-base-100 shadow-sm"
        style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
        role="slider"
        aria-orientation="horizontal"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={isMin ? value.min : value.max}
        aria-valuetext={formatDistance(isMin ? value.min : value.max)}
        aria-label={isMin ? `${label} (borne minimale)` : `${label} (borne maximale)`}
        tabIndex={0}
        onKeyDown={(event) => onKeyDown(event, which)}
      />
    );
  };

  return (
    <div className="space-y-2" aria-label={label}>
      <span className="label text-sm font-medium">{label}</span>
      <span className="text-xs font-medium text-base-content/70">{valueLabel}</span>

      <div className="relative h-10 w-full touch-none">
        {/* Base track (full axis). */}
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-full rounded-full bg-base-300" />
        {/* Highlighted middle segment between the two handles. */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-primary"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        {handle('min', minSteps, minPercent)}
        {handle('max', maxSteps, maxPercent)}

        {/* Graduations: one tick per axis step. */}
        <div className="absolute bottom-1 left-0 right-0 h-2">
          {tickValues.map((tick) => {
            const pct = (stepsBetween(tick, { min, step }) / totalSteps) * 100;
            return (
              <div
                key={tick}
                data-testid="tick"
                className="absolute w-0.5 h-1 bg-base-content/30"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
              />
            );
          })}
        </div>

        {/* Labels row under the graduations. */}
        <div className="absolute bottom-4 left-0 right-0">
          {tickValues.map((tick) => {
            const pct = (stepsBetween(tick, { min, step }) / totalSteps) * 100;
            return (
              <div
                key={tick}
                className="absolute text-[10px] text-base-content/60 leading-none"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
              >
                {formatDistance(tick)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
