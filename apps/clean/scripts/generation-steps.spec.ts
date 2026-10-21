import { describe, expect, it } from 'vitest';

import { GENERATION_STEPS, selectGenerationSteps } from './generation-steps';

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
