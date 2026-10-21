import { describe, expect, it, vi } from 'vitest';

import type { RawInscriptionEntry } from '../src/app/inscriptions/public-state';
import { createUpstashInscriptionsStore, inscriptionKey } from '../src/app/inscriptions/upstash-kv';
import {
  binomeDisplay,
  collectInscriptions,
  emptyEditionFicheDeSuiviFileName,
  extractInscriptionSheets,
  groupInscriptionsByZone,
  parseInscriptionBinome,
  renderEmptyEditionContent,
  renderZoneInscriptionsContent,
  zoneFicheDeSuiviFileName,
  type BinomeInscription,
  type FicheDeSuiviFileSink,
  type ZoneInscriptionSheet,
} from './inscriptions-extract';

/**
 * Pure extraction core of the referent script (ticket #19): BINOME parsing of
 * the stored values, key-truth collection over the `InscriptionsStore` port,
 * per-Zone markdown « Fiche de suivi » rendering. The fiches are written
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

/** In-memory sink recording (folder, fileName, content) triples. */
function createMemorySink(): {
  readonly sink: FicheDeSuiviFileSink;
  readonly files: Map<string, string>;
  readonly dirEnsured: string[];
} {
  const files = new Map<string, string>();
  const dirEnsured: string[] = [];
  return {
    dirEnsured,
    files,
    sink: {
      ensureDir: async (dir) => {
        dirEnsured.push(dir);
      },
      saveFile: async (dir, fileName, content) => {
        files.set(fileName, content);
        return `${dir}/${fileName}`;
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

// --- Zone grouping ---

describe('groupInscriptionsByZone', () => {
  function inscription(zoneId: string, tourId: string): BinomeInscription {
    return {
      firstName1: 'Léa',
      firstName2: 'Yann',
      key: inscriptionKey(2027, zoneId, tourId),
      lastName1: 'Dupont',
      lastName2: 'Tanguy',
      tourId,
      zoneId,
    };
  }

  it('should group inscriptions per Zone with the French zone name, sorted', () => {
    const grouped = groupInscriptionsByZone([
      inscription('bruz-ker-lann', 'P2'),
      inscription('bruz-sud', 'V1'),
      inscription('bruz-sud', 'P1'),
    ]);
    expect(grouped.sheets.map((sheet) => [sheet.zoneId, sheet.zoneName])).toEqual([
      ['bruz-ker-lann', 'Bruz Ker Lann'],
      ['bruz-sud', 'Bruz Sud'],
    ]);
    expect(grouped.sheets[1]?.inscriptions.map((line) => line.tourId)).toEqual(['P1', 'V1']);
    expect(grouped.warnings).toEqual([]);
  });

  it('should sort Parcours of one Zone numerically (V2 before V10)', () => {
    const grouped = groupInscriptionsByZone([inscription('zh', 'V10'), inscription('zh', 'V2')]);
    expect(grouped.sheets[0]?.inscriptions.map((line) => line.tourId)).toEqual(['V2', 'V10']);
  });

  it('should fall back to the raw zone id for an unknown Zone, with a warning', () => {
    const grouped = groupInscriptionsByZone([inscription('unknown-zone', 'V1')]);
    expect(grouped.sheets[0]?.zoneName).toBe('unknown-zone');
    expect(grouped.warnings).toHaveLength(1);
    expect(grouped.warnings[0]).toContain('Zone inconnue');
  });
});

// --- Fiche rendering ---

describe('binomeDisplay', () => {
  it('should render both members as `Prénom NOM` joined by an em dash', () => {
    expect(
      binomeDisplay({
        firstName1: 'Léa',
        firstName2: 'Yann',
        lastName1: 'Dupont',
        lastName2: 'Tanguy',
      }),
    ).toBe('Léa DUPONT — Yann TANGUY');
  });

  it('should keep the fiche cell safe: escape pipes and collapse newlines', () => {
    expect(
      binomeDisplay({
        firstName1: 'Ana|s',
        firstName2: 'Hugo',
        lastName1: 'Mar\ntin',
        lastName2: 'Bernard',
      }),
    ).toBe('Ana\\|s MAR TIN — Hugo BERNARD');
  });
});

describe('renderZoneInscriptionsContent', () => {
  const LEA_FIELDS = {
    firstName1: 'Léa',
    firstName2: 'Yann',
    lastName1: 'Dupont',
    lastName2: 'Tanguy',
  } as const;
  const sheet: ZoneInscriptionSheet = {
    inscriptions: [
      { ...LEA_FIELDS, key: 'inscriptions:2027:bruz-sud:V1', tourId: 'V1', zoneId: 'bruz-sud' },
    ],
    zoneId: 'bruz-sud',
    zoneName: 'Bruz Sud',
  };

  it('should render the French fiche: Édition year, action date, Zone, Parcours, Binôme', () => {
    const content = renderZoneInscriptionsContent(sheet, EDITION);
    expect(content).toContain('# Fiche de suivi — Bruz Sud');
    expect(content).toContain('Édition : 2027');
    expect(content).toContain("Date de l'action : Dimanche 14 février 2027");
    expect(content).toContain('| Parcours | Binôme |');
    expect(content).toContain('| V1 | Léa DUPONT — Yann TANGUY |');
    expect(content).toContain('90 jours');
  });
});

describe('renderEmptyEditionContent', () => {
  it('should render the French no-inscription message for the Édition', () => {
    const content = renderEmptyEditionContent(EDITION);
    expect(content).toContain("Aucune inscription pour l'édition 2027.");
    expect(content).toContain('Édition : 2027');
    expect(content).not.toContain('Parcours');
  });
});

// --- Whole extraction through the store port and the file sink ---

describe('extractInscriptionSheets', () => {
  it('should write one fiche per covered Zone with the folder layout per zone', async () => {
    const { sink, files, dirEnsured } = createMemorySink();
    const outcome = await extractInscriptionSheets({
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
    });

    expect(dirEnsured).toEqual([OUT_DIR]);
    expect([...files.keys()]).toEqual([
      zoneFicheDeSuiviFileName('bruz-ker-lann', 2027),
      zoneFicheDeSuiviFileName('bruz-sud', 2027),
    ]);
    expect(outcome.fiches).toEqual([
      expect.objectContaining({
        inscriptionCount: 1,
        path: `${OUT_DIR}/${zoneFicheDeSuiviFileName('bruz-ker-lann', 2027)}`,
        zoneId: 'bruz-ker-lann',
      }),
      expect.objectContaining({
        inscriptionCount: 1,
        path: `${OUT_DIR}/${zoneFicheDeSuiviFileName('bruz-sud', 2027)}`,
        zoneId: 'bruz-sud',
      }),
    ]);
    expect(files.get(zoneFicheDeSuiviFileName('bruz-sud', 2027))).toContain('Bruz Sud');
  });

  it('should produce a single empty-Édition fiche when nothing is usable', async () => {
    const { sink, files } = createMemorySink();
    const outcome = await extractInscriptionSheets({
      edition: EDITION,
      outputDir: OUT_DIR,
      parcours,
      sink,
      store: { listAll: async () => [] },
    });

    expect(outcome.inscriptions).toEqual([]);
    expect(outcome.fiches).toHaveLength(1);
    expect(outcome.fiches[0]).toEqual({
      fileName: emptyEditionFicheDeSuiviFileName(2027),
      inscriptionCount: 0,
      path: `${OUT_DIR}/${emptyEditionFicheDeSuiviFileName(2027)}`,
      zoneId: null,
    });
    expect(files.get(emptyEditionFicheDeSuiviFileName(2027))).toContain(
      "Aucune inscription pour l'édition 2027.",
    );
  });

  it('should keep going with malformed entries and still write the Zone fiches', async () => {
    const { sink, files } = createMemorySink();
    const outcome = await extractInscriptionSheets({
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
    });

    expect(outcome.warnings).toEqual([
      'clé ignorée (valeur illisible ou Binôme incomplet) : inscriptions:2027:bruz-sud:Corrupt',
    ]);
    expect(outcome.fiches).toHaveLength(1);
    expect(files.get(zoneFicheDeSuiviFileName('bruz-sud', 2027))).toContain('| V1 |');
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

describe('extractInscriptionSheets over the Upstash REST adapter', () => {
  it('should SCAN the édition pattern then MGET the values and write the fiches', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanEnvelope(['inscriptions:2027:bruz-sud:V1', 'inscriptions:2026:bruz-sud:V9']));
    rest.enqueue(
      mgetEnvelope([
        binomeValue('Léa', 'Dupont', 'Yann', 'Tanguy'),
        binomeValue('Anaïs', 'Martin', 'Hugo', 'Bernard'),
      ]),
    );
    const { sink, files } = createMemorySink();

    const outcome = await extractInscriptionSheets({
      edition: EDITION,
      outputDir: OUT_DIR,
      parcours,
      sink,
      store: createUpstashInscriptionsStore(REST_CONFIG, rest.fetchImpl),
    });

    expect(rest.calls[0]?.url).toBe(
      'https://rest-upstash.example/scan/0/match/inscriptions%3A2027%3A*/count/100',
    );
    expect(outcome.inscriptions).toEqual([
      expect.objectContaining({ firstName1: 'Léa', tourId: 'V1', zoneId: 'bruz-sud' }),
    ]);
    expect([...files.keys()]).toEqual([zoneFicheDeSuiviFileName('bruz-sud', 2027)]);
  });

  it('should fail the extraction on an Upstash error envelope (no partial output)', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue({ payload: { error: 'ERR invalid token' } });
    const { sink, files, dirEnsured } = createMemorySink();

    await expect(
      extractInscriptionSheets({
        edition: EDITION,
        outputDir: OUT_DIR,
        parcours,
        sink,
        store: createUpstashInscriptionsStore(REST_CONFIG, rest.fetchImpl),
      }),
    ).rejects.toThrow('Upstash REST command failed');
    expect(dirEnsured).toEqual([]);
    expect(files.size).toBe(0);
  });
});
