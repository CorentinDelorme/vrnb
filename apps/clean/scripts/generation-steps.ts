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
 *
 * This module also owns the plumbing the steps and the orchestrators
 * share: the reading and the writing of the generation state, and the
 * `[perf]` block every run ends with.
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

import {
  errorMessage,
  perfReportPath,
  readPerfReport,
  writePerfReport,
} from './generation-helpers';
import type { PerfRecorder, PerfReport } from './generation-perf';
import { aggregatePerfReports, formatPerfReport } from './generation-perf';
import type { GenerationState } from './generation-state';
import { readGenerationState, writeGenerationState } from './generation-state';

/** The steps of the pipeline, in the order they must run. */
export const GENERATION_STEPS = [
  'generate-start-end-gpx.ts',
  'generate-tours.ts',
  'generate-pdfs.ts',
] as const;

/**
 * The label of a step of the pipeline, as the referent knows it: the name
 * of the command that runs it.
 */
export function stepLabel(script: string): string {
  switch (script) {
    case 'generate-start-end-gpx.ts':
      return 'generate:routes';
    case 'generate-tours.ts':
      return 'generate:tours';
    case 'generate-pdfs.ts':
      return 'generate:pdfs';
    default:
      return script;
  }
}

/** The name of the script of a step, as its `[perf]` report is named. */
export function stepScriptName(script: string): string {
  return script.replace(/\.ts$/, '');
}

/**
 * The `[perf]` reports of the steps of a run.
 *
 * A step that failed before it could report holds no report: the
 * orchestrator then knows nothing about it.
 */
export function readStepReports(rootDir: string, steps: readonly string[]): PerfReport[] {
  const reports: PerfReport[] = [];

  for (const script of steps) {
    const report = readPerfReport(perfReportPath(rootDir, stepScriptName(script)));
    if (report) {
      reports.push(report);
    }
  }

  return reports;
}

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
 *
 * The duration of each step is measured, so the orchestrator can show how
 * long the run took and how long each step took.
 */
export async function runGenerationSteps(
  steps: readonly string[],
  args: readonly string[],
  rootDir: string,
  recorder: PerfRecorder,
): Promise<void> {
  for (const script of steps) {
    console.log(`\n=== ${script} ${args.join(' ')} ===`);
    await recorder.measure(stepLabel(script), () => {
      const result = spawnSync('bun', ['tsx', join(rootDir, 'scripts', script), ...args], {
        cwd: rootDir,
        stdio: 'inherit',
      });
      if (result.status !== 0) {
        throw new Error(`Étape en échec : ${script}`);
      }
    });
  }
}

/**
 * Read the generation state of a run.
 *
 * `undefined` when the state is missing (the normal state of a fresh
 * copy) or unreadable (a corrupt file): the run then regenerates
 * everything. A corrupt state is reported: the referent must know the
 * pipeline forgot what it had produced.
 */
export function readGenerationStateOrWarn(statePath: string): GenerationState | undefined {
  const read = readGenerationState(statePath);

  if (read.status === 'unreadable') {
    console.warn(
      `Attention : l'état de génération est illisible (${read.reason}), tout sera régénéré.`,
    );
    return undefined;
  }

  return read.status === 'read' ? read.state : undefined;
}

/**
 * Write the generation state of a run.
 *
 * A state that cannot be written is reported: the run did what it had to
 * do, but the next run will not know it.
 */
export function writeGenerationStateOrFail(statePath: string, state: GenerationState): void {
  try {
    writeGenerationState(statePath, state);
  } catch (error) {
    console.error(
      `impossible d'écrire l'état de génération (${statePath}) : ${errorMessage(error)}`,
    );
  }
}

/**
 * Show the `[perf]` block of an orchestrated run: how long it took, how
 * long each step took, and the counters of the steps the run ran.
 */
export function reportRun(options: {
  /** Name of the script, as the `[perf]` block of the run shows it. */
  readonly script: string;
  /** Root of the app, where the reports of the steps are read. */
  readonly rootDir: string;
  /** The recorder that measured the steps of the run. */
  readonly perf: PerfRecorder;
  /** The steps the run ran. */
  readonly steps: readonly string[];
}): void {
  const report = aggregatePerfReports({
    script: options.script,
    totalMs: options.perf.totalMs(),
    steps: options.perf.steps,
    reports: readStepReports(options.rootDir, options.steps),
  });

  console.log(formatPerfReport(report).join('\n'));
  writePerfReport(perfReportPath(options.rootDir, options.script), report);
}
