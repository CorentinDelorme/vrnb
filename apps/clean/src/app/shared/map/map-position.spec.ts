import { describe, expect, it, vi } from 'vitest';

import { getCurrentPosition, setCurrentPosition, subscribeCurrentPosition } from './map-position';

describe('map-position store', () => {
  it('should start without a position', () => {
    setCurrentPosition(null);
    expect(getCurrentPosition()).toBeNull();
  });

  it('should return the last set position', () => {
    setCurrentPosition({ lat: 48.0244, lng: -1.7471 });
    expect(getCurrentPosition()).toEqual({ lat: 48.0244, lng: -1.7471 });
    setCurrentPosition(null);
  });

  it('should notify subscribers on every change', () => {
    setCurrentPosition(null);
    const listener = vi.fn();
    const unsubscribe = subscribeCurrentPosition(listener);

    setCurrentPosition({ lat: 48.01, lng: -1.75 });
    expect(listener).toHaveBeenCalledTimes(1);

    setCurrentPosition(null);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('should stop notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCurrentPosition(listener);
    unsubscribe();

    setCurrentPosition({ lat: 48.01, lng: -1.75 });
    expect(listener).not.toHaveBeenCalled();
    setCurrentPosition(null);
  });
});
