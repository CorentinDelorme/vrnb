import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  forEachConcurrently,
  geoJsonAssetPath,
  gpxTracePath,
  isFilterActive,
  isRecord,
  legacyGpxTracePath,
  listParcours,
  matchesFilters,
  parcoursStateKey,
  parseFilterValues,
  parseForceFlag,
  parseGenerationFilters,
  parseParcoursStateKey,
  perfReportPath,
  practiceTypeOf,
  readPerfReport,
  resolveGpxTracePath,
  tourPdfPath,
  writeFileIfChanged,
  writePerfReport,
  zoneMapKey,
  zoneMapPdfPath,
  zonePackFiles,
  zonePackParcours,
} from './generation-helpers';
import { buildPerfReport } from './generation-perf';

/**
 * Shared helpers of the data-generation scripts (ticket #23): the CLI filter
 * parsing, the Zone/Parcours inventory and the paths of the generated
 * artefacts. The pure module is checked here without any process and
 * without any network.
 */

const fixtures: string[] = [];

/**
 * Build a temporary tree of empty files: the helpers only look at the
 * names, never at the content.
 */
function createFixture(files: Record<string, string>): string {
  const rootDir = mkdtempSync(join(tmpdir(), 'vrnb-generation-'));
  fixtures.push(rootDir);
  for (const [path, content] of Object.entries(files)) {
    const filePath = join(rootDir, path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  return rootDir;
}

afterEach(() => {
  for (const rootDir of fixtures.splice(0)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe('parseFilterValues', () => {
  it('should return undefined when the flag is absent', () => {
    expect(parseFilterValues(['--zone=bruz-sud'], '--tour')).toBeUndefined();
  });

  it('should return an empty list when the flag is present but holds no value', () => {
    expect(parseFilterValues(['--tour='], '--tour')).toEqual([]);
    expect(parseFilterValues(['--tour= , '], '--tour')).toEqual([]);
  });

  it('should split the values on commas, trim them and drop the empty ones', () => {
    expect(parseFilterValues(['--tour=V1, V2 ,,P3'], '--tour')).toEqual(['V1', 'V2', 'P3']);
  });

  it('should keep the first argument matching the flag', () => {
    expect(parseFilterValues(['--tour=V1', '--tour=V2'], '--tour')).toEqual(['V1']);
  });

  it('should ignore the other flags', () => {
    expect(parseFilterValues(['--zone=bruz-sud', '--skip-routes'], '--tour')).toBeUndefined();
  });
});

describe('parseGenerationFilters', () => {
  it('should leave both filters undefined when no flag is given', () => {
    expect(parseGenerationFilters([])).toEqual({ tourIds: undefined, zoneIds: undefined });
  });

  it('should read the tour and zone filters as sets of ids', () => {
    const filters = parseGenerationFilters(['--tour=V1,V2', '--zone=bruz-sud']);

    expect([...(filters.tourIds ?? [])]).toEqual(['V1', 'V2']);
    expect([...(filters.zoneIds ?? [])]).toEqual(['bruz-sud']);
  });

  it('should tell an absent filter from an empty one', () => {
    const filters = parseGenerationFilters(['--tour=']);

    expect(filters.tourIds).toBeDefined();
    expect(filters.tourIds?.size).toBe(0);
    expect(filters.zoneIds).toBeUndefined();
  });
});

describe('isFilterActive', () => {
  it('should treat an absent filter and an empty one as no filter at all', () => {
    expect(isFilterActive(undefined)).toBe(false);
    expect(isFilterActive(new Set())).toBe(false);
    expect(isFilterActive(new Set(['V1']))).toBe(true);
  });
});

describe('parseForceFlag', () => {
  it('should tell a forced run from a regular one', () => {
    expect(parseForceFlag(['--tour=V1', '--force'])).toBe(true);
    expect(parseForceFlag(['--tour=V1'])).toBe(false);
  });
});

describe('writeFileIfChanged', () => {
  it('should leave a file holding the same content untouched', () => {
    const rootDir = createFixture({ 'tours-data.ts': 'same' });

    const written = writeFileIfChanged(join(rootDir, 'tours-data.ts'), 'same');

    expect(written).toBe(false);
    expect(readFileSync(join(rootDir, 'tours-data.ts'), 'utf-8')).toBe('same');
  });

  it('should write a file whose content changed', () => {
    const rootDir = createFixture({ 'tours-data.ts': 'old' });

    const written = writeFileIfChanged(join(rootDir, 'tours-data.ts'), 'new');

    expect(written).toBe(true);
    expect(readFileSync(join(rootDir, 'tours-data.ts'), 'utf-8')).toBe('new');
  });

  it('should create a file that does not exist yet', () => {
    const rootDir = createFixture({});

    const written = writeFileIfChanged(join(rootDir, 'tours-data.ts'), 'new');

    expect(written).toBe(true);
    expect(readFileSync(join(rootDir, 'tours-data.ts'), 'utf-8')).toBe('new');
  });
});

describe('matchesFilters', () => {
  it('should keep the Parcours matching both filters', () => {
    const filters = parseGenerationFilters(['--tour=V1', '--zone=bruz-sud']);

    expect(matchesFilters(filters, 'bruz-sud', 'V1')).toBe(true);
    expect(matchesFilters(filters, 'bruz-sud', 'V2')).toBe(false);
    expect(matchesFilters(filters, 'bruz-ker-lann', 'V1')).toBe(false);
  });

  it('should keep every Parcours when a filter holds no value', () => {
    const filters = parseGenerationFilters(['--tour=', '--zone=']);

    expect(matchesFilters(filters, 'bruz-ker-lann', 'V30')).toBe(true);
  });
});

describe('gpxTracePath', () => {
  it('should point to the trace of a Parcours in the zoned layout', () => {
    expect(gpxTracePath('/app', 'bruz-sud', 'V1', '')).toBe(
      join('/app', 'public/gpx/bruz-sud/V1/V1.gpx'),
    );
  });

  it('should point to the start and end segments of a Parcours', () => {
    expect(gpxTracePath('/app', 'bruz-sud', 'V1', '_start')).toBe(
      join('/app', 'public/gpx/bruz-sud/V1/V1_start.gpx'),
    );
    expect(gpxTracePath('/app', 'bruz-sud', 'V1', '_end')).toBe(
      join('/app', 'public/gpx/bruz-sud/V1/V1_end.gpx'),
    );
  });
});

describe('legacyGpxTracePath', () => {
  it('should point to the trace of a Parcours in the legacy flat layout', () => {
    expect(legacyGpxTracePath('/app', 'V1', '')).toBe(join('/app', 'public/gpx/V1/V1.gpx'));
  });
});

describe('resolveGpxTracePath', () => {
  it('should fall back to the legacy flat layout when the zoned trace is missing', () => {
    const rootDir = createFixture({
      'public/gpx/V1/V1.gpx': '',
    });

    expect(resolveGpxTracePath(rootDir, 'bruz-sud', 'V1', '')).toBe(
      join(rootDir, 'public/gpx/V1/V1.gpx'),
    );
  });

  it('should keep the zoned trace when it exists', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': '',
      'public/gpx/V1/V1.gpx': '',
    });

    expect(resolveGpxTracePath(rootDir, 'bruz-sud', 'V1', '')).toBe(
      join(rootDir, 'public/gpx/bruz-sud/V1/V1.gpx'),
    );
  });
});

describe('geoJsonAssetPath', () => {
  it('should point to the precomputed GeoJSON asset of a Parcours', () => {
    expect(geoJsonAssetPath('/app', 'bruz-sud', 'V1')).toBe(
      join('/app', 'public/geojson/bruz-sud/V1.geojson'),
    );
  });
});

describe('tourPdfPath', () => {
  it('should point to the Fiche of a Parcours', () => {
    expect(tourPdfPath('/app', 'bruz-sud', 'V1')).toBe(join('/app', 'public/pdf/bruz-sud/V1.pdf'));
  });
});

describe('zoneMapPdfPath', () => {
  it('should point to the overview map of a Zone, per practice type', () => {
    expect(zoneMapPdfPath('/app', 'bruz-sud', 'V')).toBe(
      join('/app', 'public/pdf/bruz-sud/Carte_parcours_a_velo.pdf'),
    );
    expect(zoneMapPdfPath('/app', 'bruz-sud', 'P')).toBe(
      join('/app', 'public/pdf/bruz-sud/Carte_parcours_a_pied.pdf'),
    );
  });
});

describe('zonePackFiles', () => {
  it('should list the overview maps first, then the Fiches of the Parcours', () => {
    const rootDir = createFixture({
      'public/pdf/bruz-sud/Carte_parcours_a_velo.pdf': '',
      'public/pdf/bruz-sud/Carte_parcours_a_pied.pdf': '',
      'public/pdf/bruz-sud/V1.pdf': '',
      'public/pdf/bruz-sud/P2.pdf': '',
    });

    expect(zonePackFiles(rootDir, 'bruz-sud')).toEqual([
      join(rootDir, 'public/pdf/bruz-sud/Carte_parcours_a_velo.pdf'),
      join(rootDir, 'public/pdf/bruz-sud/Carte_parcours_a_pied.pdf'),
      join(rootDir, 'public/pdf/bruz-sud/P2.pdf'),
      join(rootDir, 'public/pdf/bruz-sud/V1.pdf'),
    ]);
  });

  it('should pick up the Fiche that was not rendered again', () => {
    const rootDir = createFixture({
      'public/pdf/bruz-sud/V1.pdf': '',
      'public/pdf/bruz-sud/V2.pdf': '',
    });

    expect(zonePackFiles(rootDir, 'bruz-sud')).toEqual([
      join(rootDir, 'public/pdf/bruz-sud/V1.pdf'),
      join(rootDir, 'public/pdf/bruz-sud/V2.pdf'),
    ]);
  });

  it('should leave out the documents that are not Fiches nor overview maps', () => {
    const rootDir = createFixture({
      'public/pdf/bruz-sud/V1.pdf': '',
      'public/pdf/bruz-sud/Suivi_parcours_a_pied.pdf': '',
    });

    expect(zonePackFiles(rootDir, 'bruz-sud')).toEqual([
      join(rootDir, 'public/pdf/bruz-sud/V1.pdf'),
    ]);
  });

  it('should return nothing when the Zone has no document', () => {
    const rootDir = createFixture({});

    expect(zonePackFiles(rootDir, 'bruz-sud')).toEqual([]);
  });
});

describe('listParcours', () => {
  it('should list the Zones and the Parcours of a multi-Zone layout', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': '',
      'public/gpx/bruz-sud/P1/P1.gpx': '',
      'public/gpx/bruz-sud/V2/V2.gpx': '',
      'public/gpx/bruz-ker-lann/V30/V30.gpx': '',
    });

    const inventory = listParcours(rootDir);

    expect(inventory.zoneIds).toEqual(['bruz-ker-lann', 'bruz-sud']);
    expect(inventory.zones.map((zone) => zone.zoneId)).toEqual(['bruz-ker-lann', 'bruz-sud']);
    expect(inventory.parcours.map((entry) => parcoursStateKey(entry.zoneId, entry.tourId))).toEqual(
      ['bruz-ker-lann/V30', 'bruz-sud/P1', 'bruz-sud/V1', 'bruz-sud/V2'],
    );
  });

  it('should point to the GPX traces of every Parcours', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': '',
    });

    const entry = listParcours(rootDir).parcours[0];

    expect(entry?.dir).toBe(join(rootDir, 'public/gpx/bruz-sud/V1'));
    expect(entry?.tracePath).toBe(join(rootDir, 'public/gpx/bruz-sud/V1/V1.gpx'));
    expect(entry?.startSegmentPath).toBe(join(rootDir, 'public/gpx/bruz-sud/V1/V1_start.gpx'));
    expect(entry?.endSegmentPath).toBe(join(rootDir, 'public/gpx/bruz-sud/V1/V1_end.gpx'));
  });

  it('should keep only the Parcours of the --tour filter', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': '',
      'public/gpx/bruz-sud/V2/V2.gpx': '',
      'public/gpx/bruz-ker-lann/V1/V1.gpx': '',
    });

    const inventory = listParcours(rootDir, parseGenerationFilters(['--tour=V2']));

    expect(inventory.parcours.map((entry) => parcoursStateKey(entry.zoneId, entry.tourId))).toEqual(
      ['bruz-sud/V2'],
    );
    expect(inventory.zones.map((zone) => zone.zoneId)).toEqual(['bruz-sud']);
    // The Zones are not filtered by the --tour filter: a Zone without any
    // matching Parcours still exists.
    expect(inventory.zoneIds).toEqual(['bruz-ker-lann', 'bruz-sud']);
  });

  it('should keep only the Zones of the --zone filter', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': '',
      'public/gpx/bruz-ker-lann/V30/V30.gpx': '',
    });

    const inventory = listParcours(rootDir, parseGenerationFilters(['--zone=bruz-ker-lann']));

    expect(inventory.zoneIds).toEqual(['bruz-ker-lann']);
    expect(inventory.parcours.map((entry) => parcoursStateKey(entry.zoneId, entry.tourId))).toEqual(
      ['bruz-ker-lann/V30'],
    );
  });

  it('should attribute the Parcours of the legacy flat layout to the default Zone', () => {
    const rootDir = createFixture({
      'public/gpx/V1/V1.gpx': '',
      'public/gpx/P1/P1.gpx': '',
    });

    const inventory = listParcours(rootDir);

    expect(inventory.zoneIds).toEqual(['bruz-sud']);
    expect(inventory.parcours.map((entry) => parcoursStateKey(entry.zoneId, entry.tourId))).toEqual(
      ['bruz-sud/P1', 'bruz-sud/V1'],
    );
    expect(inventory.parcours[1]?.dir).toBe(join(rootDir, 'public/gpx/V1'));
    expect(inventory.parcours[1]?.tracePath).toBe(join(rootDir, 'public/gpx/V1/V1.gpx'));
  });

  it('should skip the legacy flat layout when the --zone filter excludes the default Zone', () => {
    const rootDir = createFixture({
      'public/gpx/V1/V1.gpx': '',
      'public/gpx/bruz-ker-lann/V30/V30.gpx': '',
    });

    const inventory = listParcours(rootDir, parseGenerationFilters(['--zone=bruz-ker-lann']));

    expect(inventory.zoneIds).toEqual(['bruz-ker-lann']);
    expect(inventory.parcours.map((entry) => entry.tourId)).toEqual(['V30']);
  });

  it('should list a Zone without any Parcours', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-ker-lann/V30/V30.gpx': '',
      'public/gpx/bruz-sud/README.md': '',
    });

    const inventory = listParcours(rootDir);

    expect(inventory.zoneIds).toEqual(['bruz-ker-lann', 'bruz-sud']);
    expect(inventory.zones.map((zone) => zone.zoneId)).toEqual(['bruz-ker-lann']);
  });

  it('should return an empty inventory when the GPX folder is missing', () => {
    const rootDir = createFixture({});

    expect(listParcours(rootDir)).toEqual({ zoneIds: [], zones: [], parcours: [] });
  });
});

describe('writePerfReport', () => {
  it('should write the report of a step and read it back', () => {
    const rootDir = createFixture({});
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 1_000,
      steps: [{ name: 'Fiches', durationMs: 900 }],
      tiles: { fromCache: 10, downloaded: 2 },
      subjects: [
        {
          id: 'fiche',
          label: 'Fiche',
          plural: 'Fiches',
          unit: { singular: 'Fiche', plural: 'Fiches' },
          changed: { singular: 'regénérée', plural: 'regénérées' },
          unchanged: { singular: 'ignorée', plural: 'ignorées' },
        },
      ],
      parcours: {
        changed: [
          {
            id: 'fiche/bruz-sud/V1',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'parcours-changed',
          },
        ],
        unchanged: [
          {
            id: 'fiche/bruz-sud/V2',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V2',
            reason: 'up-to-date',
          },
        ],
      },
    });

    expect(writePerfReport(perfReportPath(rootDir, 'generate-pdfs'), report)).toBe(true);
    expect(readPerfReport(perfReportPath(rootDir, 'generate-pdfs'))).toEqual(report);
  });

  it('should return undefined when the report of a step is missing', () => {
    const rootDir = createFixture({});

    expect(readPerfReport(perfReportPath(rootDir, 'generate-pdfs'))).toBeUndefined();
  });

  it('should return undefined when the report of a step is unreadable', () => {
    const rootDir = createFixture({ 'scripts/output/perf/generate-pdfs.json': 'not json' });

    expect(readPerfReport(perfReportPath(rootDir, 'generate-pdfs'))).toBeUndefined();
  });
});

describe('parcoursStateKey', () => {
  it('should build the key of a Parcours', () => {
    expect(parcoursStateKey('bruz-sud', 'V1')).toBe('bruz-sud/V1');
  });
});

describe('zoneMapKey', () => {
  it('should build the key of an overview map of a Zone', () => {
    expect(zoneMapKey('bruz-sud', 'V')).toBe('bruz-sud/V');
  });
});

describe('parseParcoursStateKey', () => {
  it('should read the Zone and the Parcours of a key', () => {
    expect(parseParcoursStateKey('bruz-sud/V1')).toEqual({ zoneId: 'bruz-sud', tourId: 'V1' });
  });

  it('should return undefined when the key holds no Zone and no Parcours', () => {
    expect(parseParcoursStateKey('bruz-sud')).toBeUndefined();
    expect(parseParcoursStateKey('bruz-sud/V1/extra')).toBeUndefined();
    expect(parseParcoursStateKey('/V1')).toBeUndefined();
  });
});

describe('zonePackParcours', () => {
  it('should list the Parcours whose Fiche is part of the pack of a Zone', () => {
    const rootDir = createFixture({
      'public/pdf/bruz-sud/V1.pdf': '',
      'public/pdf/bruz-sud/P1.pdf': '',
      'public/pdf/bruz-sud/Carte_parcours_a_velo.pdf': '',
    });

    expect(zonePackParcours(rootDir, 'bruz-sud')).toEqual(['bruz-sud/P1', 'bruz-sud/V1']);
  });

  it('should return an empty list when the Zone holds no document', () => {
    const rootDir = createFixture({});

    expect(zonePackParcours(rootDir, 'bruz-sud')).toEqual([]);
  });
});

describe('isRecord', () => {
  it('should tell a JSON object from the other values', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('text')).toBe(false);
  });
});

describe('practiceTypeOf', () => {
  it('should read the practice type of a Parcours from its id', () => {
    expect(practiceTypeOf('V1')).toBe('V');
    expect(practiceTypeOf('P13')).toBe('P');
  });
});

describe('forEachConcurrently', () => {
  it('should run every item of the list', async () => {
    const done: number[] = [];

    await forEachConcurrently([1, 2, 3], 2, async (item) => {
      done.push(item);
    });

    expect(done.sort()).toEqual([1, 2, 3]);
  });

  it('should never run more workers than the limit', async () => {
    let running = 0;
    let peak = 0;

    await forEachConcurrently([1, 2, 3, 4, 5], 2, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      running -= 1;
    });

    expect(peak).toBe(2);
  });

  it('should tell the index of the item to the worker', async () => {
    const indexes: number[] = [];

    await forEachConcurrently(['a', 'b'], 1, async (_item, index) => {
      indexes.push(index);
    });

    expect(indexes).toEqual([0, 1]);
  });

  it('should do nothing when the list is empty', async () => {
    const worker = async (): Promise<void> => {
      throw new Error('the worker must not run');
    };

    await expect(forEachConcurrently([], 3, worker)).resolves.toBeUndefined();
  });
});
