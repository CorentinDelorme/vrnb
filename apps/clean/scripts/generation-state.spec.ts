import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { listParcours, tourPdfPath } from './generation-helpers';
import {
  GENERATION_STATE_VERSION,
  fingerprintDocument,
  fingerprintFile,
  fingerprintParcoursArtefacts,
  fingerprintParcoursFiles,
  generationStatePath,
  nextGenerationState,
  readGenerationState,
  withFicheFingerprint,
  withMissingFicheFingerprints,
  writeGenerationState,
} from './generation-state';

/**
 * The versioned generation state (ticket #26): the fingerprints of the
 * files the pipeline reads and writes, and the state file itself. The
 * module is checked here against a temporary tree, without any process
 * and without any network.
 */

const fixtures: string[] = [];

/** Build a temporary tree of files. */
function createFixture(files: Record<string, string>): string {
  const rootDir = mkdtempSync(join(tmpdir(), 'vrnb-generation-state-'));
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

describe('fingerprintFile', () => {
  it('should return the sha256 of the content of the file', () => {
    const rootDir = createFixture({ 'V1.gpx': 'hello' });

    expect(fingerprintFile(join(rootDir, 'V1.gpx'))).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('should return a different fingerprint for a different content', () => {
    const rootDir = createFixture({ 'V1.gpx': 'hello', 'V2.gpx': 'hello!' });

    expect(fingerprintFile(join(rootDir, 'V1.gpx'))).not.toBe(
      fingerprintFile(join(rootDir, 'V2.gpx')),
    );
  });

  it('should return undefined when the file does not exist', () => {
    const rootDir = createFixture({});

    expect(fingerprintFile(join(rootDir, 'V1.gpx'))).toBeUndefined();
  });

  it('should return undefined when the file cannot be read', () => {
    const rootDir = createFixture({});
    mkdirSync(join(rootDir, 'V1.gpx'));

    expect(fingerprintFile(join(rootDir, 'V1.gpx'))).toBeUndefined();
  });
});

describe('generationStatePath', () => {
  it('should point to the state file of the scripts folder', () => {
    expect(generationStatePath('/app')).toBe(join('/app', 'scripts/generation-state.json'));
  });
});

describe('fingerprintDocument', () => {
  it('should return the fingerprint of the document', () => {
    const rootDir = createFixture({ 'V1.pdf': 'hello' });

    expect(fingerprintDocument(join(rootDir, 'V1.pdf'))).toBe(
      fingerprintFile(join(rootDir, 'V1.pdf')),
    );
  });

  it('should return undefined when the document is missing', () => {
    const rootDir = createFixture({});

    expect(fingerprintDocument(join(rootDir, 'V1.pdf'))).toBeUndefined();
  });

  it('should return undefined when the document is empty', () => {
    const rootDir = createFixture({ 'V1.pdf': '' });

    expect(fingerprintDocument(join(rootDir, 'V1.pdf'))).toBeUndefined();
  });

  it('should return undefined when the document cannot be read', () => {
    const rootDir = createFixture({});
    mkdirSync(join(rootDir, 'V1.pdf'));

    expect(fingerprintDocument(join(rootDir, 'V1.pdf'))).toBeUndefined();
  });
});

describe('fingerprintParcoursArtefacts', () => {
  it('should fingerprint the trace, the segments and the Fiche of a Parcours', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': 'trace',
      'public/gpx/bruz-sud/V1/V1_start.gpx': 'start',
      'public/gpx/bruz-sud/V1/V1_end.gpx': 'end',
      'public/pdf/bruz-sud/V1.pdf': 'fiche',
    });

    expect(fingerprintParcoursArtefacts(rootDir, 'bruz-sud', 'V1')).toEqual({
      trace: fingerprintFile(join(rootDir, 'public/gpx/bruz-sud/V1/V1.gpx')),
      startSegment: fingerprintFile(join(rootDir, 'public/gpx/bruz-sud/V1/V1_start.gpx')),
      endSegment: fingerprintFile(join(rootDir, 'public/gpx/bruz-sud/V1/V1_end.gpx')),
      fiche: fingerprintFile(join(rootDir, 'public/pdf/bruz-sud/V1.pdf')),
    });
  });

  it('should tell a missing Fiche from a known one', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': 'trace',
      'public/gpx/bruz-sud/V1/V1_start.gpx': 'start',
      'public/gpx/bruz-sud/V1/V1_end.gpx': 'end',
    });

    expect(fingerprintParcoursArtefacts(rootDir, 'bruz-sud', 'V1').fiche).toBeUndefined();
  });
});

describe('withFicheFingerprint', () => {
  it('should record the Fiche of a Parcours, keeping the other fingerprints', () => {
    const record = { trace: 'trace', startSegment: 'start', endSegment: 'end' };

    expect(withFicheFingerprint(record, 'fiche')).toEqual({
      trace: 'trace',
      startSegment: 'start',
      endSegment: 'end',
      fiche: 'fiche',
    });
  });

  it('should drop the Fiche of a Parcours that failed to render', () => {
    const record = { trace: 'trace', startSegment: 'start', endSegment: 'end', fiche: 'old' };

    expect(withFicheFingerprint(record, undefined)).toEqual({
      trace: 'trace',
      startSegment: 'start',
      endSegment: 'end',
      fiche: undefined,
    });
  });

  it('should record the Fiche of a Parcours the state knows nothing about', () => {
    expect(withFicheFingerprint(undefined, 'fiche')).toEqual({ fiche: 'fiche' });
  });
});

describe('withMissingFicheFingerprints', () => {
  it('should record the Fiche of the Parcours the state knows nothing about', () => {
    const state = {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace' } },
    };

    expect(withMissingFicheFingerprints(state, { 'bruz-sud/V1': 'fiche' })).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace', fiche: 'fiche' } },
    });
  });

  it('should never overwrite the Fiche the state recorded', () => {
    const state = {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace', fiche: 'recorded' } },
    };

    expect(withMissingFicheFingerprints(state, { 'bruz-sud/V1': 'other' })).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace', fiche: 'recorded' } },
    });
  });

  it('should leave a Parcours without a Fiche on the disk without one', () => {
    const state = {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace' } },
    };

    expect(withMissingFicheFingerprints(state, {}).parcours['bruz-sud/V1']).toEqual({
      trace: 'trace',
      fiche: undefined,
    });
  });
});

describe('fingerprintParcoursFiles', () => {
  it('should fingerprint the trace and the two segments of a Parcours', () => {
    const rootDir = createFixture({
      'public/gpx/bruz-sud/V1/V1.gpx': 'trace',
      'public/gpx/bruz-sud/V1/V1_start.gpx': 'start',
      'public/gpx/bruz-sud/V1/V1_end.gpx': 'end',
    });
    const entry = listParcours(rootDir).parcours[0];

    expect(fingerprintParcoursFiles(entry!)).toEqual({
      trace: fingerprintFile(join(rootDir, 'public/gpx/bruz-sud/V1/V1.gpx')),
      startSegment: fingerprintFile(join(rootDir, 'public/gpx/bruz-sud/V1/V1_start.gpx')),
      endSegment: fingerprintFile(join(rootDir, 'public/gpx/bruz-sud/V1/V1_end.gpx')),
    });
  });

  it('should tell a missing segment from a known one', () => {
    const rootDir = createFixture({ 'public/gpx/bruz-sud/V1/V1.gpx': 'trace' });
    const entry = listParcours(rootDir).parcours[0];

    expect(fingerprintParcoursFiles(entry!).startSegment).toBeUndefined();
    expect(fingerprintParcoursFiles(entry!).trace).toBeDefined();
  });
});

describe('nextGenerationState', () => {
  it('should record the fingerprints of a Parcours the run regenerated', () => {
    const state = nextGenerationState(
      { version: GENERATION_STATE_VERSION, parcours: { 'bruz-sud/V1': { trace: 'old' } } },
      [{ key: 'bruz-sud/V1', record: { trace: 'new', startSegment: 'start', endSegment: 'end' } }],
    );

    expect(state.parcours['bruz-sud/V1']).toEqual({
      trace: 'new',
      startSegment: 'start',
      endSegment: 'end',
    });
  });

  it('should drop a Parcours the run failed on, so the next run tries it again', () => {
    const state = nextGenerationState(
      { version: GENERATION_STATE_VERSION, parcours: { 'bruz-sud/V1': { trace: 'old' } } },
      [{ key: 'bruz-sud/V1' }],
    );

    expect(state.parcours['bruz-sud/V1']).toBeUndefined();
  });

  it('should leave the Parcours the run did not touch untouched', () => {
    const state = nextGenerationState(
      { version: GENERATION_STATE_VERSION, parcours: { 'bruz-sud/V2': { trace: 'kept' } } },
      [{ key: 'bruz-sud/V1', record: { trace: 'new' } }],
    );

    expect(state.parcours['bruz-sud/V2']).toEqual({ trace: 'kept' });
    expect(state.parcours['bruz-sud/V1']).toEqual({ trace: 'new' });
  });

  it('should write the current version of the state', () => {
    const state = nextGenerationState(undefined, []);

    expect(state.version).toBe(GENERATION_STATE_VERSION);
    expect(state.parcours).toEqual({});
  });
});

describe('writeGenerationState', () => {
  it('should write the version and the records of every Parcours', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');

    writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': { trace: 'trace-v1', startSegment: 'start-v1', endSegment: 'end-v1' },
      },
    });

    expect(JSON.parse(readFileSync(statePath, 'utf-8'))).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': { trace: 'trace-v1', startSegment: 'start-v1', endSegment: 'end-v1' },
      },
    });
  });

  it('should leave out the fingerprints the state does not know yet', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');

    writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace-v1' } },
    });

    expect(JSON.parse(readFileSync(statePath, 'utf-8')).parcours['bruz-sud/V1']).toEqual({
      trace: 'trace-v1',
    });
  });

  it('should leave the state file untouched when the state did not change', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');
    const state = {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace-v1' } },
    };

    writeGenerationState(statePath, state);
    const written = writeGenerationState(statePath, state);

    expect(written).toBe(false);
  });

  it('should write the state file when the state changed', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');

    writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace-v1' } },
    });
    const written = writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': { trace: 'trace-v2' } },
    });

    expect(written).toBe(true);
  });
});

describe('readGenerationState', () => {
  it('should read back the state that was written', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');
    const state = {
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': { trace: 'trace-v1', startSegment: 'start-v1', endSegment: 'end-v1' },
        'bruz-ker-lann/V30': { trace: 'trace-v30' },
      },
    };

    writeGenerationState(statePath, state);

    expect(readGenerationState(statePath)).toEqual(state);
  });

  it('should keep the fingerprint of the Fiche the state may already hold', () => {
    const rootDir = createFixture({
      'generation-state.json': JSON.stringify({
        version: GENERATION_STATE_VERSION,
        parcours: { 'bruz-sud/V1': { trace: 'trace-v1', fiche: 'fiche-v1' } },
      }),
    });

    expect(
      readGenerationState(join(rootDir, 'generation-state.json'))?.parcours['bruz-sud/V1'],
    ).toEqual({ trace: 'trace-v1', fiche: 'fiche-v1' });
  });

  it('should return undefined when the state file does not exist', () => {
    const rootDir = createFixture({});

    expect(readGenerationState(join(rootDir, 'generation-state.json'))).toBeUndefined();
  });

  it('should return undefined when the state file is not readable JSON', () => {
    const rootDir = createFixture({ 'generation-state.json': 'not json' });

    expect(readGenerationState(join(rootDir, 'generation-state.json'))).toBeUndefined();
  });

  it('should return undefined when the state file holds no version', () => {
    const rootDir = createFixture({
      'generation-state.json': JSON.stringify({ parcours: { 'bruz-sud/V1': { trace: 'a' } } }),
    });

    expect(readGenerationState(join(rootDir, 'generation-state.json'))).toBeUndefined();
  });

  it('should read the records of a state holding no Parcours', () => {
    const rootDir = createFixture({
      'generation-state.json': JSON.stringify({ version: GENERATION_STATE_VERSION }),
    });

    expect(readGenerationState(join(rootDir, 'generation-state.json'))).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {},
    });
  });
});

describe('the committed generation state', () => {
  it('should record the fingerprint of every Fiche committed in public/pdf', () => {
    const rootDir = join(import.meta.dirname, '..');
    const state = readGenerationState(generationStatePath(rootDir));

    expect(state).toBeDefined();

    for (const [key, record] of Object.entries(state?.parcours ?? {})) {
      const [zoneId, tourId] = key.split('/');
      const fingerprint = fingerprintDocument(tourPdfPath(rootDir, zoneId, tourId));

      expect(record.fiche, `no Fiche fingerprint recorded for ${key}`).toBeDefined();
      expect(record.fiche).toBe(fingerprint);
    }
  });
});
