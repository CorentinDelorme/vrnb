import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { ZONES } from '../src/app/zones';

import { listParcours, tourPdfPath } from './generation-helpers';
import type { GenerationState, ParcoursGenerationRecord } from './generation-state';
import {
  GENERATION_STATE_VERSION,
  fingerprintDocument,
  fingerprintFile,
  fingerprintParcoursArtefacts,
  fingerprintParcoursFiles,
  generationStatePath,
  meetingPointFingerprint,
  nextGenerationState,
  parcoursStateKey,
  parseParcoursStateKey,
  readGenerationState,
  withFicheFingerprint,
  withMissingFicheFingerprints,
  withMissingMeetingPointFingerprints,
  withMissingZoneMapFingerprints,
  writeGenerationState,
  zoneMapKey,
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

/** A record of the state, with the fingerprints the test does not care about. */
function record(overrides: Partial<ParcoursGenerationRecord> = {}): ParcoursGenerationRecord {
  return {
    trace: undefined,
    startSegment: undefined,
    endSegment: undefined,
    fiche: undefined,
    meetingPoint: undefined,
    ...overrides,
  };
}

/** A state, with the records and the zone maps the test does not care about. */
function state(overrides: Partial<GenerationState> = {}): GenerationState {
  return { version: GENERATION_STATE_VERSION, parcours: {}, zoneMaps: {}, ...overrides };
}

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

describe('meetingPointFingerprint', () => {
  const MEETING_POINT = { name: 'Place du Dr Joly', coordinates: [-1.747083, 48.024417] };

  it('should return the same fingerprint for the same Point de rendez-vous', () => {
    expect(meetingPointFingerprint(MEETING_POINT)).toBe(meetingPointFingerprint(MEETING_POINT));
  });

  it('should return a different fingerprint when the name of the Point de rendez-vous changed', () => {
    expect(meetingPointFingerprint({ ...MEETING_POINT, name: 'Place de la Mairie' })).not.toBe(
      meetingPointFingerprint(MEETING_POINT),
    );
  });

  it('should return a different fingerprint when the coordinates of the Point de rendez-vous changed', () => {
    expect(
      meetingPointFingerprint({ ...MEETING_POINT, coordinates: [-1.747084, 48.024418] }),
    ).not.toBe(meetingPointFingerprint(MEETING_POINT));
  });
});

describe('parcoursStateKey', () => {
  it('should build the key of a Parcours of the state', () => {
    expect(parcoursStateKey('bruz-sud', 'V1')).toBe('bruz-sud/V1');
  });
});

describe('zoneMapKey', () => {
  it('should build the key of an overview map of the state', () => {
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
    const known = record({ trace: 'trace', startSegment: 'start', endSegment: 'end' });

    expect(withFicheFingerprint(known, 'fiche')).toEqual({
      trace: 'trace',
      startSegment: 'start',
      endSegment: 'end',
      fiche: 'fiche',
      meetingPoint: undefined,
    });
  });

  it('should drop the Fiche of a Parcours that failed to render', () => {
    const known = record({
      trace: 'trace',
      startSegment: 'start',
      endSegment: 'end',
      fiche: 'old',
    });

    expect(withFicheFingerprint(known, undefined)).toEqual({
      trace: 'trace',
      startSegment: 'start',
      endSegment: 'end',
      fiche: undefined,
      meetingPoint: undefined,
    });
  });

  it('should record the Fiche of a Parcours the state knows nothing about', () => {
    expect(withFicheFingerprint(undefined, 'fiche')).toEqual({
      trace: undefined,
      startSegment: undefined,
      endSegment: undefined,
      fiche: 'fiche',
      meetingPoint: undefined,
    });
  });
});

describe('withMissingFicheFingerprints', () => {
  it('should record the Fiche of the Parcours the state knows nothing about', () => {
    const known = state({ parcours: { 'bruz-sud/V1': record({ trace: 'trace' }) } });

    expect(withMissingFicheFingerprints(known, { 'bruz-sud/V1': 'fiche' })).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': record({ trace: 'trace', fiche: 'fiche' }),
      },
      zoneMaps: {},
    });
  });

  it('should never overwrite the Fiche the state recorded', () => {
    const known = state({
      parcours: { 'bruz-sud/V1': record({ trace: 'trace', fiche: 'recorded' }) },
    });

    expect(withMissingFicheFingerprints(known, { 'bruz-sud/V1': 'other' })).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': record({ trace: 'trace', fiche: 'recorded' }),
      },
      zoneMaps: {},
    });
  });

  it('should leave a Parcours without a Fiche on the disk without one', () => {
    const known = state({ parcours: { 'bruz-sud/V1': record({ trace: 'trace' }) } });

    expect(withMissingFicheFingerprints(known, {}).parcours['bruz-sud/V1']).toEqual(
      record({ trace: 'trace' }),
    );
  });
});

describe('withMissingMeetingPointFingerprints', () => {
  it('should record the Point de rendez-vous of the Parcours the state knows nothing about', () => {
    const known = state({ parcours: { 'bruz-sud/V1': record({ trace: 'trace' }) } });

    expect(withMissingMeetingPointFingerprints(known, { 'bruz-sud': 'meeting' })).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': record({ trace: 'trace', meetingPoint: 'meeting' }),
      },
      zoneMaps: {},
    });
  });

  it('should never overwrite the Point de rendez-vous the state recorded', () => {
    const known = state({
      parcours: { 'bruz-sud/V1': record({ trace: 'trace', meetingPoint: 'recorded' }) },
    });

    expect(withMissingMeetingPointFingerprints(known, { 'bruz-sud': 'other' })).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': record({ trace: 'trace', meetingPoint: 'recorded' }),
      },
      zoneMaps: {},
    });
  });
});

describe('withMissingZoneMapFingerprints', () => {
  it('should record the overview map the state knows nothing about', () => {
    const known = state();

    expect(
      withMissingZoneMapFingerprints(known, { [zoneMapKey('bruz-sud', 'V')]: 'zone-map' }).zoneMaps,
    ).toEqual({ 'bruz-sud/V': 'zone-map' });
  });

  it('should never overwrite the overview map the state recorded', () => {
    const known = state({ zoneMaps: { 'bruz-sud/V': 'recorded' } });

    expect(
      withMissingZoneMapFingerprints(known, { [zoneMapKey('bruz-sud', 'V')]: 'other' }).zoneMaps,
    ).toEqual({ 'bruz-sud/V': 'recorded' });
  });

  it('should leave out the overview map that was never rendered', () => {
    const known = state();

    expect(withMissingZoneMapFingerprints(known, { 'bruz-sud/V': undefined }).zoneMaps).toEqual({});
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
    const next = nextGenerationState(
      state({ parcours: { 'bruz-sud/V1': record({ trace: 'old' }) } }),
      [{ key: 'bruz-sud/V1', record: record({ trace: 'new', startSegment: 'start' }) }],
    );

    expect(next.parcours['bruz-sud/V1']).toEqual(record({ trace: 'new', startSegment: 'start' }));
  });

  it('should drop a Parcours the run failed on, so the next run tries it again', () => {
    const next = nextGenerationState(
      state({ parcours: { 'bruz-sud/V1': record({ trace: 'old' }) } }),
      [{ key: 'bruz-sud/V1', record: undefined }],
    );

    expect(next.parcours['bruz-sud/V1']).toBeUndefined();
  });

  it('should leave the Parcours the run did not touch untouched', () => {
    const next = nextGenerationState(
      state({ parcours: { 'bruz-sud/V2': record({ trace: 'kept' }) } }),
      [{ key: 'bruz-sud/V1', record: record({ trace: 'new' }) }],
    );

    expect(next.parcours['bruz-sud/V2']).toEqual(record({ trace: 'kept' }));
    expect(next.parcours['bruz-sud/V1']).toEqual(record({ trace: 'new' }));
  });

  it('should write the current version of the state', () => {
    const next = nextGenerationState(undefined, []);

    expect(next.version).toBe(GENERATION_STATE_VERSION);
    expect(next.parcours).toEqual({});
    expect(next.zoneMaps).toEqual({});
  });

  it('should record the fingerprint of an overview map the run rendered', () => {
    const next = nextGenerationState(state(), [], [{ key: 'bruz-sud/V', fingerprint: 'zone-map' }]);

    expect(next.zoneMaps).toEqual({ 'bruz-sud/V': 'zone-map' });
  });

  it('should drop the fingerprint of an overview map the run failed to render', () => {
    const next = nextGenerationState(
      state({ zoneMaps: { 'bruz-sud/V': 'zone-map' } }),
      [],
      [{ key: 'bruz-sud/V', fingerprint: undefined }],
    );

    expect(next.zoneMaps).toEqual({});
  });
});

describe('writeGenerationState', () => {
  it('should write the version and the records of every Parcours', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');

    writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': record({
          trace: 'trace-v1',
          startSegment: 'start-v1',
          endSegment: 'end-v1',
        }),
      },
      zoneMaps: {},
    });

    expect(JSON.parse(readFileSync(statePath, 'utf-8'))).toEqual({
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': { trace: 'trace-v1', startSegment: 'start-v1', endSegment: 'end-v1' },
      },
      zoneMaps: {},
    });
  });

  it('should leave out the fingerprints the state does not know yet', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');

    writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': record({ trace: 'trace-v1' }) },
      zoneMaps: {},
    });

    expect(JSON.parse(readFileSync(statePath, 'utf-8')).parcours['bruz-sud/V1']).toEqual({
      trace: 'trace-v1',
    });
  });

  it('should leave the state file untouched when the state did not change', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');
    const known = {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': record({ trace: 'trace-v1' }) },
      zoneMaps: {},
    };

    writeGenerationState(statePath, known);
    const written = writeGenerationState(statePath, known);

    expect(written).toBe(false);
  });

  it('should write the state file when the state changed', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');

    writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': record({ trace: 'trace-v1' }) },
      zoneMaps: {},
    });
    const written = writeGenerationState(statePath, {
      version: GENERATION_STATE_VERSION,
      parcours: { 'bruz-sud/V1': record({ trace: 'trace-v2' }) },
      zoneMaps: {},
    });

    expect(written).toBe(true);
  });
});

describe('readGenerationState', () => {
  it('should read back the state that was written', () => {
    const rootDir = createFixture({});
    const statePath = join(rootDir, 'generation-state.json');
    const known = {
      version: GENERATION_STATE_VERSION,
      parcours: {
        'bruz-sud/V1': record({
          trace: 'trace-v1',
          startSegment: 'start-v1',
          endSegment: 'end-v1',
        }),
        'bruz-ker-lann/V30': record({ trace: 'trace-v30' }),
      },
      zoneMaps: { 'bruz-sud/V': 'zone-map' },
    };

    writeGenerationState(statePath, known);

    expect(readGenerationState(statePath)).toEqual({ status: 'read', state: known });
  });

  it('should keep the fingerprint of the Fiche the state may already hold', () => {
    const rootDir = createFixture({
      'generation-state.json': JSON.stringify({
        version: GENERATION_STATE_VERSION,
        parcours: { 'bruz-sud/V1': { trace: 'trace-v1', fiche: 'fiche-v1' } },
      }),
    });

    const read = readGenerationState(join(rootDir, 'generation-state.json'));

    expect(read.status).toBe('read');
    expect(read.status === 'read' && read.state.parcours['bruz-sud/V1']).toEqual(
      record({ trace: 'trace-v1', fiche: 'fiche-v1' }),
    );
  });

  it('should tell a missing state file from a corrupt one', () => {
    const rootDir = createFixture({ 'generation-state.json': 'not json' });

    expect(readGenerationState(join(rootDir, 'generation-state.json')).status).toBe('unreadable');
    expect(readGenerationState(join(rootDir, 'missing.json')).status).toBe('missing');
  });

  it('should return undefined when the state file is not readable JSON', () => {
    const rootDir = createFixture({ 'generation-state.json': 'not json' });

    expect(readGenerationState(join(rootDir, 'generation-state.json')).status).toBe('unreadable');
  });

  it('should return undefined when the state file holds no version', () => {
    const rootDir = createFixture({
      'generation-state.json': JSON.stringify({ parcours: { 'bruz-sud/V1': { trace: 'a' } } }),
    });

    expect(readGenerationState(join(rootDir, 'generation-state.json')).status).toBe('unreadable');
  });

  it('should read the records of a state holding no Parcours', () => {
    const rootDir = createFixture({
      'generation-state.json': JSON.stringify({ version: GENERATION_STATE_VERSION }),
    });

    expect(readGenerationState(join(rootDir, 'generation-state.json'))).toEqual({
      status: 'read',
      state: { version: GENERATION_STATE_VERSION, parcours: {}, zoneMaps: {} },
    });
  });
});

describe('the committed generation state', () => {
  it('should record the fingerprint of every Fiche committed in public/pdf', () => {
    const rootDir = join(import.meta.dirname, '..');
    const read = readGenerationState(generationStatePath(rootDir));

    expect(read.status).toBe('read');
    if (read.status !== 'read') {
      return;
    }

    for (const [key, record] of Object.entries(read.state.parcours)) {
      const parsed = parseParcoursStateKey(key);
      expect(parsed, `invalid state key: ${key}`).toBeDefined();
      const fingerprint = fingerprintDocument(tourPdfPath(rootDir, parsed!.zoneId, parsed!.tourId));

      expect(record.fiche, `no Fiche fingerprint recorded for ${key}`).toBeDefined();
      expect(record.fiche).toBe(fingerprint);
    }
  });

  it('should record the fingerprint of the Point de rendez-vous of every Parcours', () => {
    const rootDir = join(import.meta.dirname, '..');
    const read = readGenerationState(generationStatePath(rootDir));

    expect(read.status).toBe('read');
    if (read.status !== 'read') {
      return;
    }

    for (const [key, record] of Object.entries(read.state.parcours)) {
      const parsed = parseParcoursStateKey(key);
      const zone = ZONES.find((candidate) => candidate.id === parsed?.zoneId);

      expect(record.meetingPoint, `no meeting point fingerprint recorded for ${key}`).toBeDefined();
      expect(record.meetingPoint).toBe(
        zone ? meetingPointFingerprint(zone.meetingPoint) : undefined,
      );
    }
  });
});
