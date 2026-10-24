'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
 * - Handles and track can be moved with the mouse or touch (click the track
 *   to jump the nearest handle, drag a handle to slide it).
 * - Three track segments: the middle segment between the handles is highlighted.
 * - Graduations (ticks) + a labels row under the track, and a live value
 *   label above ("1 km – 4 km", or "tout" when the interval covers the axis).
 * - The visible label is provided by the parent (`<legend>`); this component
 *   exposes the family name through `aria-label` on its root and on each
 *   handle, so screen readers stay informed without a duplicate visible label.
 */
export function DistanceRangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: DistanceRangeSliderProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  /** Number of steps spanning the whole axis. */
  const totalSteps = useMemo(() => stepsBetween(max, { min, step }), [min, max, step]);
  /** Steps for the current bounds (recomputed when value changes). */
  const stepsForValue = useCallback(
    (val: number): number => stepsBetween(val, { min, step }),
    [min, step],
  );

  /** Axis value at a given horizontal client position. */
  const valueFromClientX = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) {
        return value.min;
      }
      let percent = (clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      const steps = Math.round(percent * totalSteps);
      return valueFromSteps(steps, { min, step });
    },
    [totalSteps, min, step, value.min],
  );

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
          delta = handle === 'min' ? -stepsForValue(value.min) : -stepsForValue(value.max);
          break;
        case 'End':
          delta =
            handle === 'min'
              ? totalSteps - stepsForValue(value.min)
              : totalSteps - stepsForValue(value.max);
          break;
        default:
          return;
      }
      event.preventDefault();

      const minSteps = stepsForValue(value.min);
      const maxSteps = stepsForValue(value.max);
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
    [min, step, totalSteps, value.min, value.max, stepsForValue, onChange],
  );

  const minSteps = stepsForValue(value.min);
  const maxSteps = stepsForValue(value.max);
  const minPercent = (minSteps / totalSteps) * 100;
  const maxPercent = (maxSteps / totalSteps) * 100;

  /** Start dragging a handle: capture the pointer so moves are followed even outside the component. */
  const onPointerDownHandle = useCallback((event: React.PointerEvent, which: 'min' | 'max') => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(which);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  /** Click the track: jump the nearest handle to the clicked position. */
  const onPointerDownTrack = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const targetValue = valueFromClientX(event.clientX);
      const currentMin = valueRef.current.min;
      const currentMax = valueRef.current.max;
      const minDist = Math.abs(targetValue - currentMin);
      const maxDist = Math.abs(targetValue - currentMax);
      if (minDist <= maxDist) {
        const lo = Math.min(Math.max(stepsForValue(targetValue), 0), stepsForValue(currentMax));
        onChangeRef.current({
          min: valueFromSteps(lo, { min, step }),
          max: currentMax,
        });
      } else {
        const hi = Math.min(
          Math.max(stepsForValue(targetValue), stepsForValue(currentMin)),
          totalSteps,
        );
        onChangeRef.current({
          min: currentMin,
          max: valueFromSteps(hi, { min, step }),
        });
      }
    },
    [valueFromClientX, stepsForValue, totalSteps, min, step],
  );

  /** Drag a handle: clamp it mutually so min ≤ max at all times. */
  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging || !trackRef.current) {
        return;
      }
      const targetValue = valueFromClientX(event.clientX);
      const currentMin = valueRef.current.min;
      const currentMax = valueRef.current.max;
      const minS = stepsForValue(currentMin);
      const maxS = stepsForValue(currentMax);
      let lo = minS;
      let hi = maxS;
      if (dragging === 'min') {
        lo = Math.min(Math.max(stepsForValue(targetValue), 0), hi);
      } else {
        hi = Math.min(Math.max(stepsForValue(targetValue), lo), totalSteps);
      }
      onChangeRef.current({
        min: valueFromSteps(lo, { min, step }),
        max: valueFromSteps(hi, { min, step }),
      });
    },
    [dragging, stepsForValue, totalSteps, min, step, valueFromClientX],
  );

  const onPointerUp = useCallback((event: PointerEvent) => {
    setDragging(null);
    if (trackRef.current) {
      try {
        trackRef.current.releasePointerCapture(event.pointerId);
      } catch {
        // The capture may already have been released.
      }
    }
  }, []);

  useEffect(() => {
    if (dragging === null) {
      return;
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragging, onPointerMove, onPointerUp]);

  const handle = (which: 'min' | 'max', steps: number, percent: number) => {
    const isMin = which === 'min';
    return (
      <div
        key={which}
        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary border-2 border-base-100 shadow-sm"
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
        onPointerDown={(event) => onPointerDownHandle(event, which)}
      />
    );
  };

  return (
    <div className="space-y-2" aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-medium text-base-content/70">{valueLabel}</span>
      </div>

      <div
        className="relative h-10 w-full touch-none"
        ref={trackRef}
        onPointerDown={onPointerDownTrack}
      >
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
          {useMemo(
            () => [...Array.from({ length: totalSteps + 1 }, (_, i) => min + i * step)],
            [totalSteps, min, step],
          ).map((tick) => {
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
          {useMemo(
            () => [...Array.from({ length: totalSteps + 1 }, (_, i) => min + i * step)],
            [totalSteps, min, step],
          ).map((tick) => {
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
