import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  registrationKey,
  type RegistrationRecord,
} from '../src/app/registration/registration-contract';
import { toursData } from '../src/app/tours-data';
import {
  collectRegistrations,
  isDirectRun,
  parseCliArgs,
  parseRegistrationKey,
  parseRegistrationValue,
  readKvConfig,
  rowsForZoneType,
  scanRegistrationKeys,
  writeTrackingSheets,
  type FetchLike,
  type KvConfig,
  type TourEntry,
} from './extract-inscriptions';

const YEAR = 2027;
const ZONE = 'bruz-sud';
const CONFIG: KvConfig = { url: 'https://kv.example', token: 'test-token' };

function record(overrides: Partial<RegistrationRecord> = {}): RegistrationRecord {
  return {
    firstName1: 'Marie',
    lastName1: 'Dupont',
    firstName2: 'Luc',
    lastName2: 'Martin',
    year: YEAR,
    zoneId: ZONE,
    tourName: 'V1',
    ...overrides,
  };
}

describe('parseRegistrationKey', () => {
  it('extrait année, zone et parcours', () => {
    expect(parseRegistrationKey('inscriptions:2027:bruz-sud:V1')).toEqual({
      year: 2027,
      zoneId: 'bruz-sud',
      tourName: 'V1',
    });
  });

  it.each([
    'inscriptions:2027:bruz-sud',
    'inscriptions:2027:bruz-sud:V1:extra',
    'binome:2027:bruz-sud:V1',
    'inscriptions:20X7:bruz-sud:V1',
    'inscriptions:2027::V1',
    'inscriptions:2027:bruz-sud:',
  ])('rejette « %s »', (key) => {
    expect(parseRegistrationKey(key)).toBeNull();
  });
});

describe('parseRegistrationValue', () => {
  it('lit une valeur complète', () => {
    expect(parseRegistrationValue(JSON.stringify(record()))).toEqual(record());
  });

  it.each([
    ['un JSON invalide', '{"firstName1":'],
    ['un JSON non-objet', '"texte"'],
    ['un champ identité manquant', JSON.stringify({ year: 2027, zoneId: ZONE, tourName: 'V1' })],
    ['une identité vide', JSON.stringify({ ...record(), firstName1: '   ' })],
    ['une année non numérique', JSON.stringify({ ...record(), year: '2027' })],
  ])('rejette %s', (_label, raw) => {
    expect(parseRegistrationValue(raw)).toBeNull();
  });
});

describe('collectRegistrations', () => {
  it('conserve les inscriptions valides', () => {
    const valid = record();
    const { records, warnings } = collectRegistrations(YEAR, [
      { key: registrationKey(YEAR, ZONE, 'V1'), value: JSON.stringify(valid) },
    ]);

    expect(records).toEqual([valid]);
    expect(warnings).toEqual([]);
  });

  it('ignore les clés illisibles et ne recopie jamais la valeur stockée', () => {
    const leakedValue = '{"firstName1":"Camille" mauvaise fin';
    const { records, warnings } = collectRegistrations(YEAR, [
      { key: 'binome:2027:bruz-sud:V1', value: JSON.stringify(record({ tourName: 'V1' })) },
      { key: registrationKey(YEAR, ZONE, 'V2'), value: leakedValue },
      { key: registrationKey(YEAR, ZONE, 'V3'), value: null },
    ]);

    expect(records).toEqual([]);
    expect(warnings).toHaveLength(3);
    expect(warnings.join(' ')).toContain('inscriptions:2027:bruz-sud:V2');
    expect(warnings.join(' ')).not.toContain('Camille');
  });

  it('ignore une valeur dont le contexte ne correspond pas à la clé', () => {
    const { records, warnings } = collectRegistrations(YEAR, [
      {
        key: registrationKey(YEAR, ZONE, 'V1'),
        value: JSON.stringify(record({ tourName: 'V2' })),
      },
      { key: registrationKey(YEAR, ZONE, 'V3'), value: JSON.stringify(record({ year: 2026 })) },
    ]);

    expect(records).toEqual([]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/incohérent/);
  });

  it('ignore les clés d’une autre année', () => {
    const { records, warnings } = collectRegistrations(YEAR, [
      { key: registrationKey(2026, ZONE, 'V1'), value: JSON.stringify(record({ year: 2026 })) },
    ]);

    expect(records).toEqual([]);
    expect(warnings[0]).toMatch(/année 2026/);
  });
});

describe('rowsForZoneType', () => {
  const allTours: readonly TourEntry[] = [...toursData.vTours, ...toursData.pTours];

  it('liste les parcours de la zone et du type en ordre, avec les binômes inscrits', () => {
    const rows = rowsForZoneType(allTours, [record({ tourName: 'V2' })], ZONE, 'V');

    const expectedTours = toursData.vTours
      .filter((tour) => tour.zoneId === ZONE)
      .map((tour) => tour.name);
    expect(rows.map((row) => row.tourName)).toEqual(expectedTours);

    const row = (tourName: string) => rows.find((candidate) => candidate.tourName === tourName);
    expect(row('V2')).toEqual({ tourName: 'V2', member1: 'Marie DUPONT', member2: 'Luc MARTIN' });
    expect(row('V1')).toEqual({ tourName: 'V1', member1: '', member2: '' });
  });

  it('laisse les parcours non inscrits en blanc et ne mélange ni zones ni types', () => {
    const records = [
      record({ zoneId: 'bruz-vau-gaillard', tourName: 'V1' }),
      record({ tourName: 'P1' }),
    ];
    const rows = rowsForZoneType(allTours, records, ZONE, 'V');

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.member1 === '' && row.member2 === '')).toBe(true);
  });
});

describe('readKvConfig', () => {
  it('préfère les variables UPSTASH_* à KV_REST_API_*', () => {
    expect(
      readKvConfig({
        UPSTASH_REDIS_REST_URL: 'https://upstash.example',
        UPSTASH_REDIS_REST_TOKEN: 'upstash-token',
        KV_REST_API_URL: 'https://kv.example',
        KV_REST_API_TOKEN: 'kv-token',
      }),
    ).toEqual({ url: 'https://upstash.example', token: 'upstash-token' });
  });

  it('retombe sur KV_REST_API_* et retire le slash final', () => {
    expect(
      readKvConfig({ KV_REST_API_URL: 'https://kv.example/', KV_REST_API_TOKEN: 'kv-token' }),
    ).toEqual({ url: 'https://kv.example', token: 'kv-token' });
  });

  it('renvoie null dès qu’une variable manque', () => {
    expect(readKvConfig({ UPSTASH_REDIS_REST_URL: 'https://upstash.example' })).toBeNull();
    expect(readKvConfig({})).toBeNull();
  });
});

describe('scanRegistrationKeys', () => {
  it('suit le curseur SCAN jusqu’au bout, sur le préfixe de l’année', async () => {
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (input) => {
      calls.push(input);
      const result =
        calls.length === 1
          ? ['17', ['inscriptions:2027:bruz-sud:V1']]
          : ['0', ['inscriptions:2027:bruz-sud:V2']];
      return new Response(JSON.stringify({ result }), { status: 200 });
    };

    const keys = await scanRegistrationKeys(CONFIG, YEAR, fetchImpl);

    expect(keys).toEqual(['inscriptions:2027:bruz-sud:V1', 'inscriptions:2027:bruz-sud:V2']);
    expect(calls[0]).toBe('https://kv.example/scan/0/match/inscriptions:2027:*/count/100');
    expect(calls[1]).toBe('https://kv.example/scan/17/match/inscriptions:2027:*/count/100');
  });

  it('remonte une erreur explicite sans exposer le jeton', async () => {
    const fetchImpl: FetchLike = async () =>
      new Response(JSON.stringify({ error: 'WRONGPASS invalid or missing auth token' }), {
        status: 401,
      });

    const error = await scanRegistrationKeys(CONFIG, YEAR, fetchImpl).then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/jeton standard/);
    expect((error as Error).message).not.toContain(CONFIG.token);
  });

  it('remonte une erreur si le KV est injoignable', async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };

    await expect(scanRegistrationKeys(CONFIG, YEAR, fetchImpl)).rejects.toThrow(/KV injoignable/);
  });

  it('borne chaque appel REST par un délai d’expiration', async () => {
    let seenInit: { readonly signal?: AbortSignal } | undefined;
    const fetchImpl: FetchLike = async (_input, init) => {
      seenInit = init;
      return new Response(JSON.stringify({ result: ['0', []] }), { status: 200 });
    };

    await scanRegistrationKeys(CONFIG, YEAR, fetchImpl);

    expect(seenInit?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('parseCliArgs', () => {
  it('utilise l’année par défaut sans argument', () => {
    expect(parseCliArgs([], 2027)).toEqual({ year: 2027, outDir: null });
  });

  it('accepte --year et --out-dir', () => {
    expect(parseCliArgs(['--year=2026'], 2027)).toEqual({ year: 2026, outDir: null });
    expect(parseCliArgs(['--out-dir=/tmp/fiches'], 2027)).toEqual({
      year: 2027,
      outDir: '/tmp/fiches',
    });
  });

  it('refuse une année invalide ou un argument inconnu', () => {
    expect(() => parseCliArgs(['--year=vingt'], 2027)).toThrow(/Année invalide/);
    expect(() => parseCliArgs(['--zone=bruz-sud'], 2027)).toThrow(/Argument inconnu/);
  });
});

describe('isDirectRun', () => {
  it('reconnaît l’exécution directe, pas l’import par Vitest', () => {
    expect(isDirectRun(['bun', 'scripts/extract-inscriptions.ts'])).toBe(true);
    expect(
      isDirectRun(['bun', '/repo/apps/clean/scripts/extract-inscriptions.ts', '--year=2027']),
    ).toBe(true);
    expect(isDirectRun(['node', '/repo/node_modules/vitest/vitest.mjs', 'run'])).toBe(false);
    expect(isDirectRun(['bun'])).toBe(false);
  });
});

describe('writeTrackingSheets', () => {
  it('écrit une fiche par zone et par type dans le dossier demandé', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'fiches-suivi-'));
    try {
      const paths = writeTrackingSheets([record()], outDir);

      expect(paths).toContain(join(outDir, ZONE, 'Suivi_parcours_a_velo.pdf'));
      expect(paths).toContain(join(outDir, ZONE, 'Suivi_parcours_a_pied.pdf'));
      expect(new Set(paths).size).toBe(paths.length);
      for (const path of paths) {
        expect(path.startsWith(`${outDir}/`)).toBe(true);
        expect(existsSync(path)).toBe(true);
      }
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
