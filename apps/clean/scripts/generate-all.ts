import { join } from 'path';

import { clearPerfReports } from './generation-helpers';
import { createPerfRecorder } from './generation-perf';
import { GENERATION_STEPS, reportRun, runGenerationSteps } from './generation-steps';

const rootDir = join(import.meta.dirname, '..');

/** Name of the script, as the `[perf]` block of the run shows it. */
const SCRIPT_NAME = 'generate-all';

/**
 * The full generation run: the three steps of the pipeline, with the
 * filters and the `--force` flag of the command line handed to each of
 * them.
 *
 * `bun run generate:all -- --force` regenerates everything the filters
 * select, whatever the generation state says.
 */
async function main(): Promise<void> {
  const perf = createPerfRecorder();
  // The reports of a previous run must never be mistaken for the ones of
  // this run.
  clearPerfReports(rootDir);

  try {
    await runGenerationSteps(GENERATION_STEPS, process.argv.slice(2), rootDir, perf);
  } finally {
    reportRun({ script: SCRIPT_NAME, rootDir, perf, steps: GENERATION_STEPS });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
