import { describe, expect, it, vi } from 'vitest';

import type { RawInscriptionEntry } from '../src/app/inscriptions/public-state';
import { createUpstashInscriptionsStore, inscriptionKey } from '../src/app/inscriptions/upstash-kv';
import {
  buildSuiviSheets,
  collectInscriptions,
  extractSuiviSheets,
  parseInscriptionBinome,
  type CatalogueTour,
  type SuiviSheet,
  type SuiviSheetSink,
} from './inscriptions-extract';

/**
 * Pure extraction core of the referent script (ticket #19): BINOME parsing of
 * the stored values, key-truth collection over the `InscriptionsStore` port and
 * the « Suivi » sheets (the printed tracking sheets, one per Zone and practice
 * type, with the binômes of the registered Parcours). The sheets are written
 * through an in-memory sink and the REST path is scripted with a recording
 * fetch (Upstash `{"result": …}` envelopes), so no network runs. The CLI-side
 * helpers live in `extract-inscriptions-cli.spec.ts`.
 */

const EDITION = { actionDate: '2027-02-14', year: 2027 } as const;

/**
 * The (Zone, Parcours) pairs the fake catalogue knows — every other pair is
 * unknown and must be skipped (never a Fiche de suivi).
 */
const KNOWN_PAIRS = new Set([
  'bruz-ker-lann:P3',
  'unknown-zone-2:V1',
  'bruz-sud:Corrupt',
  'bruz-sud:V1',
  'zh:BadJson',
  'zh:Kept',
  'zh:PartlyFilled',
  'zh:T3',
  'zh:V1',
  'zi:T2',
]);

/** The fake catalogue lookup: only the pairs it knows exist. */
const parcours = (zoneId: string, tourId: string): boolean =>
  KNOWN_PAIRS.has(`${zoneId}:${tourId}`);

/** Scripted raw entry built through the #16 key builder, keyed with its value. */
function entry(year: number, zoneId: string, tourId: string, value: string): RawInscriptionEntry {
  return { key: inscriptionKey(year, zoneId, tourId), value };
}

function binomeValue(
  firstName1: string,
  lastName1: string,
  firstName2: string,
  lastName2: string,
): string {
  return JSON.stringify({
    engaged: true,
    firstName1,
    firstName2,
    lastName1,
    lastName2,
    honeypot: '',
  });
}

/** In-memory sink recording the written sheets, per file name. */
function createMemorySink(): {
  readonly sink: SuiviSheetSink;
  readonly files: Map<string, SuiviSheet>;
  readonly dirEnsured: string[];
} {
  const files = new Map<string, SuiviSheet>();
  const dirEnsured: string[] = [];
  return {
    dirEnsured,
    files,
    sink: {
      ensureDir: async (dir) => {
        dirEnsured.push(dir);
      },
      saveSheet: async (dir, sheet) => {
        files.set(`${dir}/${sheet.fileName}`, sheet);
        return `${dir}/${sheet.fileName}`;
      },
    },
  };
}

const OUT_DIR = '/local/output/inscriptions/2027';

/** Registration of one binome as stored by the POST side (ticket #17). */
function storedInscription(
  zoneId: string,
  tourId: string,
  names: readonly [string, string, string, string],
): RawInscriptionEntry {
  return entry(2027, zoneId, tourId, binomeValue(...names));
}

// --- Binôme parsing ---

describe('parseInscriptionBinome', () => {
  it('should read the four identity fields and tolerate unknown extra keys', () => {
    const stored = JSON.stringify({
      createdAt: '2027-01-05T10:00:00.000Z',
      engaged: true,
      firstName1: 'Léa',
      firstName2: 'Yann',
      honeypot: '',
      lastName1: 'Dupont',
      lastName2: 'Tanguy',
    });
    expect(parseInscriptionBinome(stored)).toEqual({
      firstName1: 'Léa',
      firstName2: 'Yann',
      lastName1: 'Dupont',
      lastName2: 'Tanguy',
    });
  });

  it('should trim stray whitespace around the names', () => {
    const stored =
      '{"firstName1":" Léa ","lastName1":"Dupont","firstName2":"Yann","lastName2":"Tanguy"}';
    expect(parseInscriptionBinome(stored)?.firstName1).toBe('Léa');
  });

  it('should reject a value missing, blank, or mistyped for any of the four fields', () => {
    expect(parseInscriptionBinome('{"firstName1":"Léa"}')).toBeNull();
    expect(
      parseInscriptionBinome(
        '{"firstName1":"Léa","lastName1":"Dupont","firstName2":"Yann","lastName2":"  "}',
      ),
    ).toBeNull();
    expect(
      parseInscriptionBinome(
        '{"firstName1":42,"lastName1":"Dupont","firstName2":"Yann","lastName2":"Tanguy"}',
      ),
    ).toBeNull();
  });

  it('should reject garbage, arrays and non-JSON values', () => {
    expect(parseInscriptionBinome('garbage{{')).toBeNull();
    expect(parseInscriptionBinome('[]')).toBeNull();
    expect(parseInscriptionBinome('null')).toBeNull();
    expect(parseInscriptionBinome('"string"')).toBeNull();
  });
});

// --- Collection over the raw listing (key truth) ---

describe('collectInscriptions', () => {
  it('should keep the Édition inscriptions only, mapping the key context', () => {
    const collected = collectInscriptions(
      [
        storedInscription('zh', 'T3', ['Léa', 'Dupont', 'Yann', 'Tanguy']),
        entry(2026, 'zh', 'Stale', binomeValue('Anaïs', 'Martin', 'Hugo', 'Bernard')),
        { key: 'sessions:2027:zh:V1', value: binomeValue('Anaïs', 'Martin', 'Hugo', 'Bernard') },
        {
          key: 'inscriptions:twenty:zh:V1',
          value: binomeValue('Anaïs', 'Martin', 'Hugo', 'Bernard'),
        },
        storedInscription('zi', 'T2', ['Claire', 'Lenoir', 'Marc', 'Ferry']),
      ],
      2027,
      parcours,
    );
    expect(collected.inscriptions).toEqual([
      expect.objectContaining({
        firstName1: 'Léa',
        key: 'inscriptions:2027:zh:T3',
        tourId: 'T3',
        zoneId: 'zh',
      }),
      expect.objectContaining({
        firstName1: 'Claire',
        key: 'inscriptions:2027:zi:T2',
        tourId: 'T2',
        zoneId: 'zi',
      }),
    ]);
    expect(collected.warnings).toEqual([
      'clé ignorée (format inattendu) : sessions:2027:zh:V1',
      'clé ignorée (format inattendu) : inscriptions:twenty:zh:V1',
    ]);
  });

  it('should skip a malformed value with a key-only warning and keep going', () => {
    const collected = collectInscriptions(
      [
        storedInscription('zh', 'Kept', ['Léa', 'Dupont', 'Yann', 'Tanguy']),
        { key: inscriptionKey(2027, 'zh', 'BadJson'), value: 'garbage{{' },
        { key: inscriptionKey(2027, 'zh', 'PartlyFilled'), value: '{"firstName1":"Léa"}' },
      ],
      2027,
      parcours,
    );
    expect(collected.inscriptions).toHaveLength(1);
    expect(collected.warnings).toEqual([
      'clé ignorée (valeur illisible ou Binôme incomplet) : inscriptions:2027:zh:BadJson',
      'clé ignorée (valeur illisible ou Binôme incomplet) : inscriptions:2027:zh:PartlyFilled',
    ]);
    expect(JSON.stringify(collected.warnings)).not.toContain('Léa');
  });

  it('should skip a pair unknown to the catalogue, with a key-only warning', () => {
    const collected = collectInscriptions(
      [
        storedInscription('zh', 'Kept', ['Léa', 'Dupont', 'Yann', 'Tanguy']),
        // A typo of a real Parcours id: an unknown pair never becomes a
        // Fiche de suivi.
        storedInscription('zh', 'v1', ['Claire', 'Lenoir', 'Marc', 'Ferry']),
        storedInscription('unknown-zone', 'V1', ['Anaïs', 'Martin', 'Hugo', 'Bernard']),
      ],
      2027,
      parcours,
    );

    expect(collected.inscriptions).toHaveLength(1);
    expect(collected.unknownParcoursCount).toBe(2);
    expect(collected.warnings).toEqual([
      'clé ignorée (parcours inconnu du catalogue) : inscriptions:2027:zh:v1',
      'clé ignorée (parcours inconnu du catalogue) : inscriptions:2027:unknown-zone:V1',
    ]);
    // The warning names the key only: no personal data leaks.
    expect(JSON.stringify(collected.warnings)).not.toContain('Claire');
  });

  it('should warn on unparseable keys and skip keys of other Éditions silently', () => {
    const collected = collectInscriptions(
      [
        { key: 'inscriptions', value: '{}' },
        {
          key: inscriptionKey(2029, 'zh', 'Future'),
          value: binomeValue('Léa', 'Dupont', 'Yann', 'Tanguy'),
        },
      ],
      2027,
      parcours,
    );
    expect(collected.inscriptions).toEqual([]);
    expect(collected.warnings).toEqual(['clé ignorée (format inattendu) : inscriptions']);
  });

  it('should keep the first value of a duplicate SCAN key with a warning', () => {
    const collected = collectInscriptions(
      [
        storedInscription('zh', 'V1', ['Léa', 'Dupont', 'Yann', 'Tanguy']),
        storedInscription('zh', 'V1', ['Claire', 'Lenoir', 'Marc', 'Ferry']),
      ],
      2027,
      parcours,
    );
    expect(collected.inscriptions).toHaveLength(1);
    expect(collected.inscriptions[0]?.firstName1).toBe('Léa');
    expect(collected.warnings).toEqual(['clé en double ignorée : inscriptions:2027:zh:V1']);
  });
});

// --- Suivi sheets (the printed tracking sheets) ---

describe('buildSuiviSheets', () => {
  const CATALOGUE: readonly CatalogueTour[] = [
    { practice: 'V', tourId: 'V1', zoneId: 'bruz-sud' },
    { practice: 'V', tourId: 'V2', zoneId: 'bruz-sud' },
    { practice: 'P', tourId: 'P1', zoneId: 'bruz-sud' },
    { practice: 'V', tourId: 'V30', zoneId: 'bruz-ker-lann' },
  ];

  const LEA = {
    firstName1: 'Léa',
    firstName2: 'Yann',
    key: inscriptionKey(2027, 'bruz-sud', 'V1'),
    lastName1: 'Dupont',
    lastName2: 'Tanguy',
    tourId: 'V1',
    zoneId: 'bruz-sud',
  } as const;

  it('should build one sheet per Zone and practice type of the catalogue', () => {
    const sheets = buildSuiviSheets(CATALOGUE, [LEA], EDITION);

    expect(sheets.map((sheet) => [sheet.zoneId, sheet.practice, sheet.fileName])).toEqual([
      ['bruz-sud', 'V', 'Suivi_parcours_a_velo.pdf'],
      ['bruz-sud', 'P', 'Suivi_parcours_a_pied.pdf'],
      ['bruz-ker-lann', 'V', 'Suivi_parcours_a_velo.pdf'],
    ]);
    expect(sheets[0]?.zoneName).toBe('Bruz Sud');
    expect(sheets[0]?.edition).toEqual(EDITION);
  });

  it('should list every tour of the Zone, in the catalogue order', () => {
    const sheets = buildSuiviSheets(CATALOGUE, [LEA], EDITION);
    expect(sheets[0]?.rows.map((row) => row.tourId)).toEqual(['V1', 'V2']);
    expect(sheets[1]?.rows.map((row) => row.tourId)).toEqual(['P1']);
  });

  it('should fill the two name columns of the registered Parcours only', () => {
    const sheets = buildSuiviSheets(CATALOGUE, [LEA], EDITION);

    expect(sheets[0]?.rows[0]).toEqual({
      member1: 'Léa DUPONT',
      member2: 'Yann TANGUY',
      tourId: 'V1',
    });
    // A free Parcours keeps its two empty name columns.
    expect(sheets[0]?.rows[1]).toEqual({ member1: '', member2: '', tourId: 'V2' });
    // The walking sheet has no binôme at all.
    expect(sheets[1]?.rows[0]).toEqual({ member1: '', member2: '', tourId: 'P1' });
  });

  it('should fall back to the raw zone id for an unknown Zone', () => {
    const sheets = buildSuiviSheets(
      [{ practice: 'V', tourId: 'V1', zoneId: 'unknown-zone' }],
      [],
      EDITION,
    );
    expect(sheets[0]?.zoneName).toBe('unknown-zone');
  });
});

// --- Whole extraction through the store port and the sheet sink ---

describe('extractSuiviSheets', () => {
  it('should write one sheet per Zone and practice type, in a folder per Zone', async () => {
    const { sink, files, dirEnsured } = createMemorySink();
    const outcome = await extractSuiviSheets({
      edition: EDITION,
      outputDir: OUT_DIR,
      parcours,
      sink,
      store: {
        listAll: async () => [
          storedInscription('bruz-sud', 'V1', ['Léa', 'Dupont', 'Yann', 'Tanguy']),
          storedInscription('bruz-ker-lann', 'P3', ['Anaïs', 'Martin', 'Hugo', 'Bernard']),
        ],
      },
      tours: [
        { practice: 'V', tourId: 'V1', zoneId: 'bruz-sud' },
        { practice: 'V', tourId: 'V30', zoneId: 'bruz-ker-lann' },
      ],
    });

    expect(dirEnsured).toEqual([`${OUT_DIR}/bruz-sud`, `${OUT_DIR}/bruz-ker-lann`]);
    expect([...files.keys()]).toEqual([
      `${OUT_DIR}/bruz-sud/Suivi_parcours_a_velo.pdf`,
      `${OUT_DIR}/bruz-ker-lann/Suivi_parcours_a_velo.pdf`,
    ]);
    expect(outcome.sheets).toEqual([
      expect.objectContaining({
        fileName: 'Suivi_parcours_a_velo.pdf',
        inscriptionCount: 1,
        path: `${OUT_DIR}/bruz-sud/Suivi_parcours_a_velo.pdf`,
        practice: 'V',
        zoneId: 'bruz-sud',
      }),
      expect.objectContaining({
        fileName: 'Suivi_parcours_a_velo.pdf',
        inscriptionCount: 0,
        path: `${OUT_DIR}/bruz-ker-lann/Suivi_parcours_a_velo.pdf`,
        practice: 'V',
        zoneId: 'bruz-ker-lann',
      }),
    ]);
  });

  it('should keep going with malformed entries and still write the sheets', async () => {
    const { sink, files } = createMemorySink();
    const outcome = await extractSuiviSheets({
      edition: EDITION,
      outputDir: OUT_DIR,
      parcours,
      sink,
      store: {
        listAll: async () => [
          { key: inscriptionKey(2027, 'bruz-sud', 'Corrupt'), value: 'not json at all' },
          storedInscription('bruz-sud', 'V1', ['Léa', 'Dupont', 'Yann', 'Tanguy']),
        ],
      },
      tours: [{ practice: 'V', tourId: 'V1', zoneId: 'bruz-sud' }],
    });

    expect(outcome.warnings).toEqual([
      'clé ignorée (valeur illisible ou Binôme incomplet) : inscriptions:2027:bruz-sud:Corrupt',
    ]);
    expect(outcome.sheets).toHaveLength(1);
    expect(files.get(`${OUT_DIR}/bruz-sud/Suivi_parcours_a_velo.pdf`)?.rows[0]?.member1).toBe(
      'Léa DUPONT',
    );
  });

  it('should warn about a Zone the catalogue does not know', async () => {
    const { sink } = createMemorySink();
    const outcome = await extractSuiviSheets({
      edition: EDITION,
      outputDir: OUT_DIR,
      parcours,
      sink,
      store: {
        listAll: async () => [
          storedInscription('unknown-zone-2', 'V1', ['Anaïs', 'Martin', 'Hugo', 'Bernard']),
        ],
      },
      tours: [{ practice: 'V', tourId: 'V1', zoneId: 'unknown-zone-2' }],
    });

    expect(outcome.warnings).toHaveLength(1);
    expect(outcome.warnings[0]).toContain('Zone inconnue');
    // The warning names the key only: no personal data leaks.
    expect(JSON.stringify(outcome.warnings)).not.toContain('Anaïs');
  });
});

// --- REST path: the #16 Upstash adapter behind the extraction, scripted fetch ---

/** One scripted Upstash REST exchange (`{"result": …}` / `{"error": …}`). */
interface ScriptedReply {
  readonly payload?: unknown;
  readonly status?: number;
}

/** Recording fetch consuming one scripted envelope per REST call. */
function createScriptedRestFetch(): {
  readonly calls: { url: string }[];
  readonly enqueue: (...replies: ScriptedReply[]) => void;
  readonly fetchImpl: typeof fetch;
} {
  const calls: { url: string }[] = [];
  const queue: ScriptedReply[] = [];
  const fetchImpl: typeof fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    calls.push({ url: String(input) });
    const reply = queue.shift();
    if (!reply) throw new Error('no scripted REST reply left');
    return new Response(JSON.stringify(reply.payload ?? null), { status: reply.status ?? 200 });
  });
  return { calls, enqueue: (...replies: ScriptedReply[]) => queue.push(...replies), fetchImpl };
}

const scanEnvelope = (keys: string[]) => ({ payload: { result: ['0', keys] } });
const mgetEnvelope = (values: string[]) => ({ payload: { result: values } });
const REST_CONFIG = { token: 'rest-token', url: 'https://rest-upstash.example' } as const;

describe('extractSuiviSheets over the Upstash REST adapter', () => {
  it('should SCAN the édition pattern then MGET the values and write the sheets', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanEnvelope(['inscriptions:2027:bruz-sud:V1', 'inscriptions:2026:bruz-sud:V9']));
    rest.enqueue(
      mgetEnvelope([
        binomeValue('Léa', 'Dupont', 'Yann', 'Tanguy'),
        binomeValue('Anaïs', 'Martin', 'Hugo', 'Bernard'),
      ]),
    );
    const { sink, files } = createMemorySink();

    const outcome = await extractSuiviSheets({
      edition: EDITION,
      outputDir: OUT_DIR,
      parcours,
      sink,
      store: createUpstashInscriptionsStore(REST_CONFIG, rest.fetchImpl),
      tours: [{ practice: 'V', tourId: 'V1', zoneId: 'bruz-sud' }],
    });

    expect(rest.calls[0]?.url).toContain('scan/0/match/inscriptions%3A2027%3A*');
    expect(outcome.inscriptions).toHaveLength(1);
    expect(outcome.sheets).toHaveLength(1);
    expect(files.get(`${OUT_DIR}/bruz-sud/Suivi_parcours_a_velo.pdf`)?.rows[0]).toEqual({
      member1: 'Léa DUPONT',
      member2: 'Yann TANGUY',
      tourId: 'V1',
    });
  });

  it('should leave no output when the KV listing fails', async () => {
    const { sink, files } = createMemorySink();
    const outcome = await extractSuiviSheets({
      edition: EDITION,
      outputDir: OUT_DIR,
      parcours,
      sink,
      store: {
        listAll: async () => {
          throw new Error('KV unreachable');
        },
      },
      tours: [{ practice: 'V', tourId: 'V1', zoneId: 'bruz-sud' }],
    }).catch((error: unknown) => error);

    expect(outcome).toBeInstanceOf(Error);
    // No KV read, no write: the run leaves no partial output.
    expect(files.size).toBe(0);
  });
});
