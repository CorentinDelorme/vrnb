import { spawnSync } from 'child_process';
import { join } from 'path';

import { parseFilterValues } from './generation-helpers';

const rootDir = join(import.meta.dirname, '..');

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function printUsage(): void {
  console.log(`Usage: bun tsx scripts/generate-one.ts --tour=V1[,V2] [--zone=bruz-sud] [--skip-routes] [--skip-tours]

Regenerate a single tour or a whole zone without rebuilding everything:
  routes (OSRM/Valhalla) -> tours data -> tour PDFs.

Options:
  --tour=V1,V2    Only these tours (required, unless --zone is set).
  --zone=<zoneId> Only this zone (required, unless --tour is set).
  --skip-routes   Skip start/end GPX routing (network calls).
  --skip-tours    Skip tours-data refresh (distances).
`);
}

function runStep(script: string, filterArgs: string[]): void {
  console.log(`\n=== ${script} ${filterArgs.join(' ')} ===`);
  const result = spawnSync('bun', ['tsx', join(rootDir, 'scripts', script), ...filterArgs], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`Step failed: ${script}`);
  }
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

  if (!hasFlag('--skip-routes')) {
    runStep('generate-start-end-gpx.ts', filterArgs);
  }
  if (!hasFlag('--skip-tours')) {
    runStep('generate-tours.ts', filterArgs);
  }
  runStep('generate-pdfs.ts', filterArgs);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
