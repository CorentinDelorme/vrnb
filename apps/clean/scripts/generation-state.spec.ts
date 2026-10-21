import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  GENERATION_STATE_VERSION,
  fingerprintFile,
  generationStatePath,
  readGenerationState,
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
