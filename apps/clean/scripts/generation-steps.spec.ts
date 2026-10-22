import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { perfReportPath, writePerfReport } from './generation-helpers';
import { buildPerfReport } from './generation-perf';
import { GENERATION_STATE_VERSION } from './generation-state';
import {
  GENERATION_STEPS,
  readGenerationStateOrWarn,
  readStepReports,
  selectGenerationSteps,
  stepLabel,
} from './generation-steps';

/**
 * The steps of the generation pipeline (ticket #26): the orchestrators
 * hand the same steps, the same filters and the same `--force` flag to
 * every step of a run.
 */

describe('selectGenerationSteps', () => {
  it('should run the three steps of the pipeline by default', () => {
    expect(selectGenerationSteps({ skipRoutes: false, skipTours: false })).toEqual([
      'generate-start-end-gpx.ts',
      'generate-tours.ts',
      'generate-pdfs.ts',
    ]);
  });

  it('should leave the routing out when it is skipped', () => {
    expect(selectGenerationSteps({ skipRoutes: true, skipTours: false })).toEqual([
      'generate-tours.ts',
      'generate-pdfs.ts',
    ]);
  });

  it('should leave the catalogue out when it is skipped', () => {
    expect(selectGenerationSteps({ skipRoutes: false, skipTours: true })).toEqual([
      'generate-start-end-gpx.ts',
      'generate-pdfs.ts',
    ]);
  });

  it('should always render the Fiches', () => {
    expect(selectGenerationSteps({ skipRoutes: true, skipTours: true })).toEqual([
      'generate-pdfs.ts',
    ]);
  });

  it('should run the same steps as a full generation', () => {
    expect(selectGenerationSteps({ skipRoutes: false, skipTours: false })).toEqual([
      ...GENERATION_STEPS,
    ]);
  });
});

describe('stepLabel', () => {
  it('should name the steps of the pipeline as the commands the referent runs', () => {
    expect(stepLabel('generate-start-end-gpx.ts')).toBe('generate:routes');
    expect(stepLabel('generate-tours.ts')).toBe('generate:tours');
    expect(stepLabel('generate-pdfs.ts')).toBe('generate:pdfs');
  });
});

describe('readStepReports', () => {
  const fixtures: string[] = [];

  afterEach(() => {
    for (const rootDir of fixtures.splice(0)) {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should read the reports of the steps of a run', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vrnb-steps-'));
    fixtures.push(rootDir);
    mkdirSync(join(rootDir, 'scripts/output/perf'), { recursive: true });
    writePerfReport(
      perfReportPath(rootDir, 'generate-pdfs'),
      buildPerfReport({
        script: 'generate-pdfs',
        totalMs: 1_000,
        steps: [],
        tiles: { fromCache: 10, downloaded: 2 },
        subjects: [],
        parcours: { changed: [], unchanged: [] },
      }),
    );

    const reports = readStepReports(rootDir, ['generate-tours.ts', 'generate-pdfs.ts']);

    expect(reports).toHaveLength(1);
    expect(reports[0]?.tiles).toEqual({ fromCache: 10, downloaded: 2 });
  });

  it('should ignore the step that reported nothing', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vrnb-steps-'));
    fixtures.push(rootDir);

    expect(readStepReports(rootDir, ['generate-tours.ts'])).toEqual([]);
  });
});

describe('readGenerationStateOrWarn', () => {
  const fixtures: string[] = [];

  afterEach(() => {
    for (const rootDir of fixtures.splice(0)) {
      rmSync(rootDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('should return the state of the file', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vrnb-steps-'));
    fixtures.push(rootDir);
    const statePath = join(rootDir, 'generation-state.json');
    writeFileSync(
      statePath,
      JSON.stringify({ version: GENERATION_STATE_VERSION, parcours: {}, zoneMaps: {} }),
    );

    expect(readGenerationStateOrWarn(statePath)).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {},
      zoneMaps: {},
    });
  });

  it('should warn when the state file exists but cannot be read', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vrnb-steps-'));
    fixtures.push(rootDir);
    const statePath = join(rootDir, 'generation-state.json');
    writeFileSync(statePath, 'not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(readGenerationStateOrWarn(statePath)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('illisible'));
  });

  it('should not warn when the state file is missing', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vrnb-steps-'));
    fixtures.push(rootDir);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(readGenerationStateOrWarn(join(rootDir, 'generation-state.json'))).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});
