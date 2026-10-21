import { join } from 'path';

import { parseFilterValues } from './generation-helpers';
import { runGenerationSteps } from './generation-steps';

const rootDir = join(import.meta.dirname, '..');

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function printUsage(): void {
  console.log(`Usage: bun tsx scripts/generate-one.ts --tour=V1[,V2] [--zone=bruz-sud] [--skip-routes] [--skip-tours] [--force]

Regenerate a single tour or a whole zone without rebuilding everything:
  routes (OSRM/Valhalla) -> tours data -> tour PDFs.

Options:
  --tour=V1,V2    Only these tours (required, unless --zone is set).
  --zone=<zoneId> Only this zone (required, unless --tour is set).
  --skip-routes   Skip start/end GPX routing (network calls).
  --skip-tours    Skip tours-data refresh (distances).
  --force         Regenerate everything the filters select, whatever the
                  generation state says.
`);
}

/**
 * The steps of the run: the same ones as a full generation, minus the
 * skipped ones. The filters and the `--force` flag are handed to every
 * step, so a single Parcours follows the same logic as a full run.
 */
function selectedSteps(): string[] {
  const steps: string[] = [];
  if (!hasFlag('--skip-routes')) {
    steps.push('generate-start-end-gpx.ts');
  }
  if (!hasFlag('--skip-tours')) {
    steps.push('generate-tours.ts');
  }
  steps.push('generate-pdfs.ts');
  return steps;
}

function main(): void {
  const tours = parseFilterValues(process.argv, '--tour') ?? [];
  const zones = parseFilterValues(process.argv, '--zone') ?? [];

  if (tours.length === 0 && zones.length === 0) {
    printUsage();
    throw new Error('Nothing to generate: pass --tour=<id> and/or --zone=<zoneId>.');
  }

  const filterArgs: string[] = [];
  if (tours.length > 0) filterArgs.push(`--tour=${tours.join(',')}`);
  if (zones.length > 0) filterArgs.push(`--zone=${zones.join(',')}`);
  if (hasFlag('--force')) filterArgs.push('--force');

  runGenerationSteps(selectedSteps(), filterArgs, rootDir);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
