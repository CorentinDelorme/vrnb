import { describe, expect, it } from 'vitest';

import {
  aggregatePerfReports,
  buildPerfReport,
  countersFromDecisions,
  countersFromIds,
  countersFromZoneDecisions,
  createPerfRecorder,
  formatDuration,
  formatPerfReport,
} from './generation-perf';

/**
 * The `[perf]` block of a generation run (ticket #28): the durations and
 * the counters every generation script shows at the end of its run.
 *
 * The module is pure: it builds the block from the durations and the
 * counters it is given, so the block is checked here with fake numbers.
 */

describe('formatDuration', () => {
  it('should show a duration under a second in milliseconds', () => {
    expect(formatDuration(950)).toBe('950 ms');
  });

  it('should show a duration under a minute in seconds', () => {
    expect(formatDuration(12_300)).toBe('12.3 s');
  });

  it('should show a duration over a minute in minutes and seconds', () => {
    expect(formatDuration(72_000)).toBe('1 m 12 s');
  });
});

describe('formatPerfReport', () => {
  it('should show the total duration, the duration of each step and the counters of the run', () => {
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 72_000,
      steps: [
        { name: 'Fiches', durationMs: 65_000 },
        { name: 'zone maps', durationMs: 7_000 },
      ],
      tiles: { fromCache: 120, downloaded: 8 },
      parcours: { regenerated: ['bruz-sud/V1'], skipped: ['bruz-sud/V2'] },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-pdfs',
      '  total duration: 1 m 12 s',
      '  step Fiches: 1 m 05 s',
      '  step zone maps: 7.0 s',
      '  tiles: 120 from cache, 8 downloaded',
      '  Parcours: 1 regenerated, 1 skipped',
    ]);
  });

  it('should tell a run that changed nothing from a run that did something', () => {
    const report = buildPerfReport({
      script: 'generate-start-end-gpx',
      totalMs: 300,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      parcours: { regenerated: [], skipped: ['bruz-sud/V1', 'bruz-sud/V2'] },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-start-end-gpx',
      '  total duration: 300 ms',
      '  tiles: 0 from cache, 0 downloaded',
      '  Parcours: 0 regenerated, 2 skipped',
      '  nothing changed: no Parcours was regenerated',
    ]);
  });

  it('should show the overview maps of the run when it holds some', () => {
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      parcours: { regenerated: ['bruz-sud/V1'], skipped: [] },
      zoneMaps: { regenerated: ['bruz-sud/V'], skipped: ['bruz-sud/P'] },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-pdfs',
      '  total duration: 1.0 s',
      '  tiles: 0 from cache, 0 downloaded',
      '  Parcours: 1 regenerated, 0 skipped',
      '  zone maps: 1 regenerated, 1 skipped',
    ]);
  });

  it('should show the packs the run wrote, and the documents they hold', () => {
    const report = buildPerfReport({
      script: 'generate-zone-pdf',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      parcours: { regenerated: [], skipped: ['bruz-sud/V1'] },
      packs: { written: ['bruz-sud'], documents: 12 },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-zone-pdf',
      '  total duration: 1.0 s',
      '  tiles: 0 from cache, 0 downloaded',
      '  Parcours: 0 regenerated, 1 skipped',
      '  packs: 1 written, 12 documents',
    ]);
  });

  it('should not tell a run that wrote packs changed nothing', () => {
    const report = buildPerfReport({
      script: 'generate-zone-pdf',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      parcours: { regenerated: [], skipped: ['bruz-sud/V1'] },
      packs: { written: ['bruz-sud'], documents: 12 },
    });

    expect(formatPerfReport(report).some((line) => line.includes('nothing changed'))).toBe(false);
  });
});

describe('createPerfRecorder', () => {
  it('should measure the duration of each step with the injected clock', async () => {
    let now = 1_000;
    const recorder = createPerfRecorder({ now: () => now });

    await recorder.measure('Fiches', async () => {
      now = 4_500;
    });
    await recorder.measure('zone maps', () => {
      now = 5_000;
    });

    expect(recorder.steps).toEqual([
      { name: 'Fiches', durationMs: 3_500 },
      { name: 'zone maps', durationMs: 500 },
    ]);
    expect(recorder.totalMs()).toBe(4_000);
  });

  it('should keep the duration of a step that failed', async () => {
    let now = 0;
    const recorder = createPerfRecorder({ now: () => now });

    await expect(
      recorder.measure('Fiches', () => {
        now = 800;
        throw new Error('router down');
      }),
    ).rejects.toThrow('router down');

    expect(recorder.steps).toEqual([{ name: 'Fiches', durationMs: 800 }]);
  });
});

describe('countersFromDecisions', () => {
  it('should count the Parcours the run regenerated and the ones it left alone', () => {
    const counters = countersFromDecisions(
      [
        { zoneId: 'bruz-sud', tourId: 'V1' },
        { zoneId: 'bruz-sud', tourId: 'V2' },
      ],
      (decision) => decision.tourId === 'V1',
    );

    expect(counters).toEqual({
      regenerated: ['bruz-sud/V1'],
      skipped: ['bruz-sud/V2'],
    });
  });

  it('should count only the Parcours of the run, never the whole catalogue', () => {
    const counters = countersFromDecisions([{ zoneId: 'bruz-sud', tourId: 'V1' }], () => true);

    expect(counters).toEqual({ regenerated: ['bruz-sud/V1'], skipped: [] });
  });
});

describe('countersFromZoneDecisions', () => {
  it('should count the overview maps the run rendered and the ones it left alone', () => {
    const counters = countersFromZoneDecisions(
      [
        { zoneId: 'bruz-sud', kind: 'V' },
        { zoneId: 'bruz-sud', kind: 'P' },
      ],
      (decision) => decision.kind === 'V',
    );

    expect(counters).toEqual({
      regenerated: ['bruz-sud/V'],
      skipped: ['bruz-sud/P'],
    });
  });
});

describe('countersFromIds', () => {
  it('should count the Parcours left alone as the scope minus the regenerated ones', () => {
    const counters = countersFromIds(['bruz-sud/V1'], ['bruz-sud/V1', 'bruz-sud/V2']);

    expect(counters).toEqual({
      regenerated: ['bruz-sud/V1'],
      skipped: ['bruz-sud/V2'],
    });
  });

  it('should count a run that regenerated nothing as a run that skipped them all', () => {
    const counters = countersFromIds([], ['bruz-sud/V1']);

    expect(counters).toEqual({ regenerated: [], skipped: ['bruz-sud/V1'] });
  });
});

describe('aggregatePerfReports', () => {
  it('should merge the tiles of the steps of a run', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [{ name: 'generate:pdfs', durationMs: 60_000 }],
      reports: [
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 10, downloaded: 2 },
          parcours: { regenerated: [], skipped: [] },
        }),
      ],
    });

    expect(report.tiles).toEqual({ fromCache: 10, downloaded: 2 });
  });

  it('should count a Parcours regenerated by a step as regenerated, not as skipped', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-start-end-gpx',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          parcours: { regenerated: [], skipped: ['bruz-sud/V1'] },
        }),
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          parcours: { regenerated: ['bruz-sud/V1'], skipped: [] },
        }),
      ],
    });

    expect(report.parcours).toEqual({ regenerated: ['bruz-sud/V1'], skipped: [] });
  });

  it('should merge the packs of the steps of a run', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-zone-pdf',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          parcours: { regenerated: [], skipped: [] },
          packs: { written: ['bruz-sud'], documents: 12 },
        }),
      ],
    });

    expect(report.packs).toEqual({ written: ['bruz-sud'], documents: 12 });
  });

  it('should hold no pack when no step wrote one', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          parcours: { regenerated: [], skipped: [] },
        }),
      ],
    });

    expect(report.packs).toBeUndefined();
  });
});
