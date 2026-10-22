import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The console of the generation pipeline speaks French (spec #21).
 *
 * The referent reads the console of the scripts, not their code: every
 * message they print is French. The name of the scripts stays English, and
 * so do the technical tokens (paths, flags, router names, `osrm` and
 * `valhalla`).
 *
 * The spec reads the source of the scripts and pins the English fragments
 * that must never come back.
 */

/**
 * The source of a script of the generation pipeline.
 *
 * The path is built from the folder of the spec: the scripts read their
 * own folder the same way.
 */
function sourceOf(file: string): string {
  return readFileSync(join(import.meta.dirname, file), 'utf-8');
}

/**
 * The English messages each script must not print anymore: the fragments
 * the referent used to read in English.
 */
const ENGLISH_FRAGMENTS: Readonly<Record<string, readonly string[]>> = {
  'generate-all.ts': [],
  'generate-one.ts': [
    'Usage: bun tsx scripts/generate-one.ts',
    'Regenerate a single tour or a whole zone without rebuilding everything:',
    'routes (OSRM/Valhalla) -> tours data -> tour PDFs.',
    'Options:',
    'Only these tours (required, unless --zone is set).',
    'Only this zone (required, unless --tour is set).',
    'Skip start/end GPX routing (network calls).',
    'Skip tours-data refresh (distances).',
    'Regenerate everything the filters select, whatever the',
    'Nothing to generate: pass --tour=<id> and/or --zone=<zoneId>.',
  ],
  'generate-pdfs.ts': [
    'logo not found: ${logoPath}',
    'logo failed: ${error instanceof Error ? error.message : error}',
    'QR code failed: ${error instanceof Error ? error.message : error}',
    'cannot chmod ${outputPath}: ${error instanceof Error ? error.message : error}',
    'tile ${zoom}/${x}/${y} unavailable: ${error instanceof Error ? error.message : error}',
    'map background failed: ${error instanceof Error ? error.message : error}',
    'addImage failed: ${error instanceof Error ? error.message : error}',
    'cannot write ${outputPath}: ${errorMessage(error)}',
    'Generated: ${outputPath}',
    'no map view for ${zoneId} ${kind}',
    'cannot prepare the output folders: ${errorMessage(error)}',
    'Force mode requested: every Fiche of the selection is rendered.',
    'No tours match the --tour/--zone filter.',
    'fail ${tour.name}: ${error instanceof Error ? error.message : error}',
    'fail ${decision.zoneId} map: ${error instanceof Error ? error.message : error}',
    '${failures} Fiche(s) failed.',
  ],
  'generate-start-end-gpx.ts': [
    'GPX directory not found: ${gpxRoot}',
    'No tours found to process.',
    'Nothing to route: every Parcours of the run is up to date.',
    'Zone ${zoneId} — meeting point: ${meetingPoint.name}',
    'Generating start/end GPX for ${zoneEntries.length} tours...',
    'fail ${entry.tourId}: cannot read endpoints from ${entry.tourId}/${entry.tourId}.gpx',
    'Unknown parcours: ${outcome.tourId}',
    'cannot write the segments of ${outcome.tourId}: ${errorMessage(error)}',
    '(${outcome.profile.osrm}): start ${outcome.start.coords.length} pts',
    'end ${outcome.end.coords.length} pts',
    '${Math.round(outcome.end.distanceM)}m [${outcome.end.source}]',
    'fail ${failure.tourId}: ${failure.error instanceof Error ? failure.error.message : failure.error}',
    '${failures} tour(s) failed.',
    'Done. Run `bun run generate:tours` to refresh distances.',
  ],
  'generate-tours.ts': [
    'cannot emit ${parcoursStateKey(entry.zoneId, entry.tourId)}.geojson: ${error instanceof Error ? error.message : error}',
    'Force mode: the catalogue and the GeoJSON assets are regenerated anyway.',
    'No zones match the --tour/--zone filter.',
    'No tours match the --tour/--zone filter.',
    'fail ${entry.tourId}: ${error instanceof Error ? error.message : error}',
    '${emitFailures} GeoJSON asset(s) failed to emit.',
    'Updated src/app/tours-data.ts.',
    'Tours data unchanged: src/app/tours-data.ts left as is.',
    'cannot write ${outputFile}: ${error instanceof Error ? error.message : error}',
    'Generated tours data: ${vTours.length} bike tours, ${pTours.length} walking tours',
    "|| 'no zones'",
    'Emitted ${emitted} precomputed GeoJSON file(s) under public/geojson/ (${inventory.parcours.length} computed)',
  ],
  'generate-zone-pdf.ts': [
    'skip ${zoneId}: no PDFs found under public/pdf/${zoneId}/',
    'cannot write ${outputPath}: ${errorMessage(error)}',
    'Generated: ${outputPath} (${merged.getPageCount()} pages)',
    'No zones match the --zone filter.',
  ],
  'generation-steps.ts': [
    'Step failed: ${script}',
    'Warning: the generation state is unreadable (${read.reason}), everything will be regenerated.',
    'cannot write the generation state (${statePath}): ${errorMessage(error)}',
  ],
  'refresh-generation-state.ts': [
    'Generation state not found: ${statePath}',
    'Generation state is unreadable: ${statePath} (${read.reason})',
    'cannot write the generation state (${statePath}): ${errorMessage(error)}',
    'Updated: ${statePath}',
    'Nothing to update: ${statePath}',
  ],
};

describe('the console output of the generation scripts', () => {
  for (const [file, fragments] of Object.entries(ENGLISH_FRAGMENTS)) {
    it(`should not print the English messages of ${file} anymore`, () => {
      const source = sourceOf(file);

      expect(fragments.filter((fragment) => source.includes(fragment))).toEqual([]);
    });
  }

  it('should leave the console of generate-all.ts to the error handler', () => {
    expect(sourceOf('generate-all.ts')).not.toMatch(/console\.(log|warn)\(/);
  });
});
