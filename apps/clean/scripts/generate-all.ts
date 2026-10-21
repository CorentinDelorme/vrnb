import { join } from 'path';

import { GENERATION_STEPS, runGenerationSteps } from './generation-steps';

const rootDir = join(import.meta.dirname, '..');

/**
 * The full generation run: the three steps of the pipeline, with the
 * filters and the `--force` flag of the command line handed to each of
 * them.
 *
 * `bun run generate:all -- --force` regenerates everything the filters
 * select, whatever the generation state says.
 */
function main(): void {
  runGenerationSteps(GENERATION_STEPS, process.argv.slice(2), rootDir);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
