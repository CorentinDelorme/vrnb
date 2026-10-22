import { join } from 'path';

import { clearPerfReports, parseFilterValues } from './generation-helpers';
import { createPerfRecorder } from './generation-perf';
import { reportRun, runGenerationSteps, selectGenerationSteps } from './generation-steps';

const rootDir = join(import.meta.dirname, '..');

/** Name of the script, as the `[perf]` block of the run shows it. */
const SCRIPT_NAME = 'generate-one';

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function printUsage(): void {
  console.log(`Utilisation : bun tsx scripts/generate-one.ts --tour=V1[,V2] [--zone=bruz-sud] [--skip-routes] [--skip-tours] [--force]

Régénérer un seul Parcours ou une seule Zone sans tout reconstruire :
  segments (OSRM/Valhalla) -> données des Parcours -> Fiches PDF.

Options :
  --tour=V1,V2    Ces Parcours uniquement (requis, sauf si --zone est posé).
  --zone=<zoneId> Cette Zone uniquement (requis, sauf si --tour est posé).
  --skip-routes   Ne pas re-router les GPX de début et de fin (appels réseau).
  --skip-tours    Ne pas recalculer les distances (données des Parcours).
  --force         Tout régénérer, quels que soient les filtres et l'état.
`);
}

/**
 * The steps of the run: the same ones as a full generation, minus the
 * skipped ones. The filters and the `--force` flag are handed to every
 * step, so a single Parcours follows the same logic as a full run.
 */
function selectedSteps(): string[] {
  return selectGenerationSteps({
    skipRoutes: hasFlag('--skip-routes'),
    skipTours: hasFlag('--skip-tours'),
  });
}

async function main(): Promise<void> {
  const tours = parseFilterValues(process.argv, '--tour') ?? [];
  const zones = parseFilterValues(process.argv, '--zone') ?? [];

  if (tours.length === 0 && zones.length === 0) {
    printUsage();
    throw new Error('Rien à générer : passez --tour=<id> et/ou --zone=<zoneId>.');
  }

  const filterArgs: string[] = [];
  if (tours.length > 0) filterArgs.push(`--tour=${tours.join(',')}`);
  if (zones.length > 0) filterArgs.push(`--zone=${zones.join(',')}`);
  if (hasFlag('--force')) filterArgs.push('--force');

  const steps = selectedSteps();
  const perf = createPerfRecorder();
  // The reports of a previous run must never be mistaken for the ones of
  // this run.
  clearPerfReports(rootDir);

  try {
    await runGenerationSteps(steps, filterArgs, rootDir, perf);
  } finally {
    reportRun({ script: SCRIPT_NAME, rootDir, perf, steps });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
