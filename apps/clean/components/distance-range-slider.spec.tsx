import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { DistanceRangeSlider } from './distance-range-slider';

/** Controlled harness so the slider re-renders and `aria-valuenow` follows. */
function Harness({
  label,
  min,
  max,
  step,
  initial,
}: {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly initial: { readonly min: number; readonly max: number };
}) {
  const [value, setValue] = useState(initial);
  return (
    <DistanceRangeSlider
      label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={setValue}
    />
  );
}

const minHandle = () => screen.getAllByRole('slider')[0];
const maxHandle = () => screen.getAllByRole('slider')[1];

function hasText(text: string): boolean {
  return screen.queryByText(text) !== null;
}

describe('DistanceRangeSlider', () => {
  it('renders two tabable ARIA slider handles with min/max/now attributes', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 4 }}
      />,
    );

    const handles = screen.getAllByRole('slider');
    expect(handles).toHaveLength(2);
    for (const handle of handles) {
      expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
      expect(handle.getAttribute('aria-valuemin')).toBe('0.5');
      expect(handle.getAttribute('aria-valuemax')).toBe('4');
      expect(handle.getAttribute('tabindex')).toBe('0');
    }
    expect(minHandle().getAttribute('aria-valuenow')).toBe('0.5');
    expect(maxHandle().getAttribute('aria-valuenow')).toBe('4');
  });

  it('shows "tout" as the live value label when the interval covers the whole axis', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 4 }}
      />,
    );
    expect(hasText('tout')).toBe(true);
  });

  it('shows a formatted French interval label otherwise', () => {
    render(
      <Harness label="Distance totale" min={2} max={11} step={1} initial={{ min: 1, max: 4 }} />,
    );
    expect(hasText('1 km – 4 km')).toBe(true);
  });

  it('moves the min handle by one axis step on ArrowRight', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 4 }}
      />,
    );
    fireEvent.keyDown(minHandle(), { key: 'ArrowRight' });
    expect(minHandle().getAttribute('aria-valuenow')).toBe('1');
  });

  it('moves the max handle by one axis step on ArrowLeft', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 4 }}
      />,
    );
    fireEvent.keyDown(maxHandle(), { key: 'ArrowLeft' });
    expect(maxHandle().getAttribute('aria-valuenow')).toBe('3.5');
  });

  it('clamps the min handle at the axis minimum', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 4 }}
      />,
    );
    fireEvent.keyDown(minHandle(), { key: 'ArrowLeft' });
    expect(minHandle().getAttribute('aria-valuenow')).toBe('0.5');
  });

  it('clamps the max handle at the axis maximum', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 4 }}
      />,
    );
    fireEvent.keyDown(maxHandle(), { key: 'ArrowRight' });
    expect(maxHandle().getAttribute('aria-valuenow')).toBe('4');
  });

  it('clamps mutually so min ≤ max (pushing the min handle past the max)', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 3.5, max: 4 }}
      />,
    );
    fireEvent.keyDown(minHandle(), { key: 'ArrowRight' });
    expect(minHandle().getAttribute('aria-valuenow')).toBe('4');
    expect(maxHandle().getAttribute('aria-valuenow')).toBe('4');
  });

  it('clamps mutually so min ≤ max (pushing the max handle below the min)', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 1 }}
      />,
    );
    fireEvent.keyDown(maxHandle(), { key: 'ArrowLeft' });
    expect(maxHandle().getAttribute('aria-valuenow')).toBe('0.5');
    expect(minHandle().getAttribute('aria-valuenow')).toBe('0.5');
  });

  it('moves the min handle to the axis minimum on Home', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 3, max: 4 }}
      />,
    );
    fireEvent.keyDown(minHandle(), { key: 'Home' });
    expect(minHandle().getAttribute('aria-valuenow')).toBe('0.5');
  });

  it('moves the max handle to the axis maximum on End', () => {
    render(
      <Harness
        label="Distance de nettoyage"
        min={0.5}
        max={4}
        step={0.5}
        initial={{ min: 0.5, max: 1 }}
      />,
    );
    fireEvent.keyDown(maxHandle(), { key: 'End' });
    expect(maxHandle().getAttribute('aria-valuenow')).toBe('4');
  });

  it('renders one graduation tick and one label per axis step', () => {
    render(
      <Harness label="Distance totale" min={2} max={11} step={1} initial={{ min: 2, max: 11 }} />,
    );
    // 2 → 11 km step 1: ten ticks (2, 3, …, 11).
    const ticks = screen.getAllByTestId('tick');
    expect(ticks).toHaveLength(10);
    expect(hasText('2 km')).toBe(true);
    expect(hasText('11 km')).toBe(true);
  });
});
