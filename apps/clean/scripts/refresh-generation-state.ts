/**
 * Refresh the generation state from the artefacts of the working copy
 * (ticket #27).
 *
 * The state records the fingerprint of the Fiche of every Parcours: a
 * working copy whose Fiches are committed but whose state does not know
 * them yet would render every Fiche again, one tile download at a time.
 * This script reads the Fiches of `public/pdf/` and records them.
 *
 * It never overwrites a fingerprint the state already holds: the state
 * must not claim a Fiche is up to date when it was rendered from another
 * trace. Run it on a fresh clone, or after the Fiches were replaced by
 * hand.
 *
 * Local operation: the script only reads the files of the working copy,
 * it never reaches the network.
 */

import { join } from 'path';

import { tourPdfPath } from './generation-helpers';
import {
  fingerprintDocument,
  generationStatePath,
  readGenerationState,
  withMissingFicheFingerprints,
  writeGenerationState,
} from './generation-state';

const rootDir = join(import.meta.dirname, '..');

function main(): void {
  const statePath = generationStatePath(rootDir);
  const state = readGenerationState(statePath);
  if (!state) {
    throw new Error(`Generation state not found: ${statePath}`);
  }

  const fingerprints: Record<string, string | undefined> = {};
  for (const key of Object.keys(state.parcours)) {
    const [zoneId, tourId] = key.split('/');
    fingerprints[key] = fingerprintDocument(tourPdfPath(rootDir, zoneId, tourId));
  }

  const written = writeGenerationState(
    statePath,
    withMissingFicheFingerprints(state, fingerprints),
  );
  console.log(written ? `Updated: ${statePath}` : `Nothing to update: ${statePath}`);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
