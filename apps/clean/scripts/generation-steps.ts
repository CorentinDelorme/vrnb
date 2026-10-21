/**
 * The steps of the generation pipeline (ticket #26).
 *
 * The pipeline is made of three side-effecting scripts, run one after the
 * other: the start and end segments (the network calls), the catalogue and
 * the precomputed GeoJSON assets, then the Fiches.
 *
 * The orchestrators (`generate-all.ts` and `generate-one.ts`) share the
 * list of the steps and the way they are run, so both hand the same
 * filters and the same `--force` flag to every step.
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

/** The steps of the pipeline, in the order they must run. */
export const GENERATION_STEPS = [
  'generate-start-end-gpx.ts',
  'generate-tours.ts',
  'generate-pdfs.ts',
] as const;

/**
 * The steps of a run that skips some of them.
 *
 * A single Parcours or a single Zone runs the same steps as a full
 * generation, minus the ones the referent asked to skip.
 */
export function selectGenerationSteps(options: {
  /** Whether the routing of the start and end segments is skipped. */
  readonly skipRoutes: boolean;
  /** Whether the refresh of the catalogue is skipped. */
  readonly skipTours: boolean;
}): string[] {
  const steps: string[] = [];
  if (!options.skipRoutes) {
    steps.push('generate-start-end-gpx.ts');
  }
  if (!options.skipTours) {
    steps.push('generate-tours.ts');
  }
  steps.push('generate-pdfs.ts');
  return steps;
}

/**
 * Run the steps of the pipeline, one after the other, streaming their
 * output.
 *
 * A failing step stops the run: the next steps would work on artefacts
 * that were not produced.
 */
export function runGenerationSteps(
  steps: readonly string[],
  args: readonly string[],
  rootDir: string,
): void {
  for (const script of steps) {
    console.log(`\n=== ${script} ${args.join(' ')} ===`);
    const result = spawnSync('bun', ['tsx', join(rootDir, 'scripts', script), ...args], {
      cwd: rootDir,
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      throw new Error(`Step failed: ${script}`);
    }
  }
}
