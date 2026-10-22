/**
 * Refresh the generation state from the artefacts of the working copy
 * (ticket #27).
 *
 * The state records the fingerprint of the Fiche of every Parcours, the
 * fingerprint of the Point de rendez-vous of every Zone and the
 * fingerprint of every overview map: a working copy whose artefacts are
 * committed but whose state does not know them yet would render every
 * Fiche and every overview map again, one tile download at a time. This
 * script reads the artefacts of `public/` and records them.
 *
 * It never overwrites a fingerprint the state already holds: the state
 * must not claim an artefact is up to date when it was produced from
 * another trace. Run it on a fresh clone, or after the artefacts were
 * replaced by hand.
 *
 * Local operation: the script only reads the files of the working copy,
 * it never reaches the network.
 */

import { join } from 'path';

import { ZONES } from '../src/app/zones';

import { errorMessage, tourPdfPath, zoneMapPdfPath } from './generation-helpers';
import type { GenerationState } from './generation-state';
import {
  fingerprintDocument,
  generationStatePath,
  meetingPointFingerprint,
  parseParcoursStateKey,
  readGenerationState,
  withMissingFicheFingerprints,
  withMissingMeetingPointFingerprints,
  withMissingZoneMapFingerprints,
  writeGenerationState,
  zoneMapKey,
} from './generation-state';

const rootDir = join(import.meta.dirname, '..');

/** The fingerprint of the Point de rendez-vous of every Zone, keyed by Zone. */
function meetingPointFingerprints(): Record<string, string> {
  const fingerprints: Record<string, string> = {};

  for (const zone of ZONES) {
    fingerprints[zone.id] = meetingPointFingerprint(zone.meetingPoint);
  }

  return fingerprints;
}

/** The Zones the state knows, from the keys of its records. */
function zoneIdsOf(state: GenerationState): string[] {
  const zoneIds = new Set<string>();

  for (const key of Object.keys(state.parcours)) {
    const parsed = parseParcoursStateKey(key);
    if (parsed) {
      zoneIds.add(parsed.zoneId);
    }
  }

  return [...zoneIds];
}

/** The fingerprint of every overview map of the Zones, keyed by `<zone>/<kind>`. */
function zoneMapFingerprints(zoneIds: readonly string[]): Record<string, string | undefined> {
  const fingerprints: Record<string, string | undefined> = {};

  for (const zoneId of zoneIds) {
    for (const kind of ['V', 'P'] as const) {
      fingerprints[zoneMapKey(zoneId, kind)] = fingerprintDocument(
        zoneMapPdfPath(rootDir, zoneId, kind),
      );
    }
  }

  return fingerprints;
}

function main(): void {
  const statePath = generationStatePath(rootDir);
  const read = readGenerationState(statePath);

  if (read.status === 'missing') {
    throw new Error(`État de génération introuvable : ${statePath}`);
  }
  if (read.status === 'unreadable') {
    throw new Error(`État de génération illisible : ${statePath} (${read.reason})`);
  }

  const state = read.state;

  const ficheFingerprints: Record<string, string | undefined> = {};
  for (const key of Object.keys(state.parcours)) {
    const parsed = parseParcoursStateKey(key);
    if (!parsed) {
      continue;
    }
    ficheFingerprints[key] = fingerprintDocument(
      tourPdfPath(rootDir, parsed.zoneId, parsed.tourId),
    );
  }

  const zoneIds = zoneIdsOf(state);

  const refreshed = withMissingZoneMapFingerprints(
    withMissingMeetingPointFingerprints(
      withMissingFicheFingerprints(state, ficheFingerprints),
      meetingPointFingerprints(),
    ),
    zoneMapFingerprints(zoneIds),
  );

  let written: boolean;
  try {
    written = writeGenerationState(statePath, refreshed);
  } catch (error) {
    throw new Error(
      `impossible d'écrire l'état de génération (${statePath}) : ${errorMessage(error)}`,
    );
  }
  console.log(written ? `Mis à jour : ${statePath}` : `Rien à mettre à jour : ${statePath}`);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
