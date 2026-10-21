import { join } from 'path';

import { clearPerfReports, perfReportPath, writePerfReport } from './generation-helpers';
import type { PerfRecorder } from './generation-perf';
import { aggregatePerfReports, createPerfRecorder, formatPerfReport } from './generation-perf';
import { GENERATION_STEPS, readStepReports, runGenerationSteps } from './generation-steps';

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
    reportRun(perf, GENERATION_STEPS);
  }
}

/**
 * Show the `[perf]` block of the run: how long it took, how long each step
 * took, and the counters of the steps the run ran.
 */
function reportRun(perf: PerfRecorder, steps: readonly string[]): void {
  const report = aggregatePerfReports({
    script: SCRIPT_NAME,
    totalMs: perf.totalMs(),
    steps: perf.steps,
    reports: readStepReports(rootDir, steps),
  });

  console.log(formatPerfReport(report).join('\n'));
  writePerfReport(perfReportPath(rootDir, SCRIPT_NAME), report);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
