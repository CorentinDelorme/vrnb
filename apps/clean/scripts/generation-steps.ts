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
