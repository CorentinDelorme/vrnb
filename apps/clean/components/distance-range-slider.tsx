'use client';

import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { useMemo } from 'react';

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

const THUMB_CLASS =
  'relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 ' +
  'transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 ' +
  'focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none ' +
  'disabled:opacity-50';

/**
 * Dual-handle range slider built on the shadcn/ui slider (Base UI
 * `@base-ui/react/slider`), with the graduation marks, the tick labels and the
 * header of the filter families layered on top.
 *
 * - Two thumbs from a two-value controlled array (`[min, max]`); the pointer,
 *   touch and keyboard behaviour (arrows, Home/End, PageUp/PageDown, mutual
 *   clamping `min ≤ max`) is the Base UI slider's, not hand-rolled here.
 * - Each thumb is named `aria-label` ("borne minimale" / "borne maximale") and
 *   reads its value through `getAriaValueText` so screen readers hear the
 *   French formatted distance; the visible family label lives above the track.
 * - Graduations (ticks) + a labels row under the track, and a live value
 *   label in the header ("tout" when the interval covers the axis). They are
 *   decorative for screen readers (`aria-hidden`): each thumb already carries
 *   its formatted value.
 */
export function DistanceRangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: DistanceRangeSliderProps) {
  /** Number of steps spanning the whole axis. */
  const totalSteps = useMemo(() => Math.round((max - min) / step), [max, min, step]);
  /** One axis value per step, drift-free (integer step math). */
  const ticks = useMemo(
    () =>
      Array.from({ length: totalSteps + 1 }, (_, index) => Number((min + index * step).toFixed(5))),
    [min, step, totalSteps],
  );

  const handleValueChange: SliderPrimitive.Root.Props['onValueChange'] = (next) => {
    const [lo, hi] = Array.isArray(next) ? next : [next, next];
    onChange({ min: lo, max: hi });
  };

  const fullAxis = value.min === min && value.max === max;
  const valueLabel = fullAxis
    ? 'Tout'
    : `${formatDistance(value.min)} – ${formatDistance(value.max)}`;

  return (
    <div className="flex flex-col gap-2" aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
          {valueLabel}
        </span>
      </div>

      {/* Repère horizontal commun au slider et aux graduations */}
      <div className="relative px-2">
        <SliderPrimitive.Root
          value={[value.min, value.max]}
          min={min}
          max={max}
          step={step}
          onValueChange={handleValueChange}
          className="w-full"
        >
          <SliderPrimitive.Control className="relative mt-1 flex w-full touch-none items-center select-none">
            <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-muted select-none">
              <SliderPrimitive.Indicator className="h-full rounded-full bg-primary select-none" />
            </SliderPrimitive.Track>

            <SliderPrimitive.Thumb
              index={0}
              getAriaLabel={() => `${label} (borne minimale)`}
              getAriaValueText={(_formatted, thumbValue) => formatDistance(thumbValue)}
              className={THUMB_CLASS}
            />

            <SliderPrimitive.Thumb
              index={1}
              getAriaLabel={() => `${label} (borne maximale)`}
              getAriaValueText={(_formatted, thumbValue) => formatDistance(thumbValue)}
              className={THUMB_CLASS}
            />
          </SliderPrimitive.Control>
        </SliderPrimitive.Root>

        {/* Graduations calées sur la largeur du slider */}
        <div className="relative mt-1 h-5" aria-hidden="true">
          {ticks.map((tick, index) => {
            const percent = (index * 100) / totalSteps;
            const isFirst = index === 0;
            const isLast = index === totalSteps;

            return (
              <span key={tick}>
                <span
                  data-testid="tick"
                  className="absolute top-0 h-1 w-0.5 bg-muted-foreground/30"
                  style={{
                    left: `${percent}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
                <span
                  className="absolute top-2 whitespace-nowrap text-[10px] leading-none text-muted-foreground/60"
                  style={{
                    left: `${percent}%`,
                    transform: isFirst
                      ? 'translateX(0)'
                      : isLast
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                  }}
                >
                  {tick.toString().replace('.', ',')}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
