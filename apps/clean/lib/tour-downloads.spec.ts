import { describe, expect, it } from 'vitest';

import { tourGpxUrl, tourPdfUrl } from './tour-downloads';

describe('tour download URLs', () => {
  it('builds the tour fiche PDF URL', () => {
    expect(tourPdfUrl('bruz-sud', 'V1')).toBe('/pdf/bruz-sud/V1.pdf');
    expect(tourPdfUrl('bruz-ker-lann', 'P3')).toBe('/pdf/bruz-ker-lann/P3.pdf');
  });

  it('builds the tour GPX URL (no segment)', () => {
    expect(tourGpxUrl('bruz-sud', 'V1')).toBe('/gpx/bruz-sud/V1/V1.gpx');
    expect(tourGpxUrl('bruz-sud', 'P3')).toBe('/gpx/bruz-sud/P3/P3.gpx');
  });

  it('builds the start and end GPX URLs', () => {
    expect(tourGpxUrl('bruz-sud', 'V1', 'start')).toBe('/gpx/bruz-sud/V1/V1_start.gpx');
    expect(tourGpxUrl('bruz-sud', 'V1', 'end')).toBe('/gpx/bruz-sud/V1/V1_end.gpx');
  });
});
