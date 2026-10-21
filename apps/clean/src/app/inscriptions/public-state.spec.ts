import { describe, expect, it } from 'vitest';

import type { InscriptionsHandlerDeps, RawInscriptionEntry } from './public-state';
import {
  getInscriptionsState,
  handleInscriptionsGet,
  isValidInscriptionValue,
  readInscriptionEntry,
} from './public-state';
import { inscriptionKey } from './upstash-kv';

/**
 * Pure core of `GET /api/inscriptions` (ticket #16): the public state exposes
 * (zone, tour) pairs only, an empty store stays valid JSON, malformed entries
 * are skipped, and the edition data comes from the injected config. A store
 * outage degrades to a JSON 502.
 */

const EDITION = { actionDate: '2027-02-14', year: 2027 } as const;

/** 2027-02-13 late morning in Paris — registration still open. */
const OPEN_CLOCK = new Date('2027-02-13T09:00:00Z');
/** 2027-02-14 — the action day, registration closed. */
const CLOSED_CLOCK = new Date('2027-02-14T09:00:00Z');

/** Scripted raw store entry, keyed through the adapter's key builder. */
function entry(year: number, zoneId: string, tourId: string, value: string): RawInscriptionEntry {
  return { key: inscriptionKey(year, zoneId, tourId), value };
}

/** Deps injecting a fixed store listing and a fixed clock. */
function deps(
  entries: readonly RawInscriptionEntry[],
  now: Date = OPEN_CLOCK,
): InscriptionsHandlerDeps {
  return { edition: EDITION, now: () => now, store: { listAll: async () => entries } };
}

describe('getInscriptionsState', () => {
  it('should return the covered (zone, tour) pairs, zone first then numeric tour', async () => {
    const state = await getInscriptionsState(
      deps([
        entry(2027, 'zh', 'T3', '{"binome":{}}'),
        entry(2027, 'zi', 'T20', '{"binome":{}}'),
        entry(2027, 'zh', 'T20', '{"binome":{}}'),
        entry(2027, 'zh', 'T11', '{"binome":{}}'),
        entry(2027, 'zh', 'T2', '{"binome":{}}'),
      ]),
    );
    expect(state.inscriptions).toEqual([
      { tourId: 'T2', zoneId: 'zh' },
      { tourId: 'T3', zoneId: 'zh' },
      { tourId: 'T11', zoneId: 'zh' },
      { tourId: 'T20', zoneId: 'zh' },
      { tourId: 'T20', zoneId: 'zi' },
    ]);
  });

  it('should expose zone/tour pairs only — no Binôme identity ever leaks', async () => {
    const binome = '{"binome":{"firstName":"Corentin","lastName":"Dupont"}}';
    const state = await getInscriptionsState(deps([entry(2027, 'bruz-sud', 'V1', binome)]));

    expect(state.inscriptions).toEqual([{ tourId: 'V1', zoneId: 'bruz-sud' }]);
    for (const inscription of state.inscriptions) {
      expect(Object.keys(inscription).sort()).toEqual(['tourId', 'zoneId']);
    }
    expect(JSON.stringify(state)).not.toContain('Corentin');
    expect(JSON.stringify(state)).not.toContain('Dupont');
    expect(JSON.stringify(state)).not.toContain('binome');
  });

  it('should keep an empty store valid, with an empty pair list', async () => {
    const state = await getInscriptionsState(deps([]));
    expect(state.inscriptions).toEqual([]);
  });

  it('should skip entries whose stored value is not JSON (garbage never breaks the API)', async () => {
    const state = await getInscriptionsState(
      deps([
        entry(2027, 'zh', 'Kept1', '{"binome":{}}'),
        entry(2027, 'zh', 'BadJson', 'garbage{{'),
        entry(2027, 'zh', 'BadString', '"just a string"'),
        entry(2027, 'zh', 'BadNumber', '42'),
        entry(2027, 'zh', 'BadNull', 'null'),
        entry(2027, 'ze', 'KeptArray', '[]'),
      ]),
    );
    expect(state.inscriptions).toEqual([
      { tourId: 'KeptArray', zoneId: 'ze' },
      { tourId: 'Kept1', zoneId: 'zh' },
    ]);
  });

  it('should skip malformed keys and entries of any other Édition year', async () => {
    const state = await getInscriptionsState(
      deps([
        { key: 'sessions:2027:zh:V1', value: '{"binome":{}}' },
        { key: 'inscriptions:twenty:zh:V1', value: '{"binome":{}}' },
        { key: 'inscriptions:2027:zh', value: '{"binome":{}}' },
        entry(2026, 'zh', 'Stale', '{"binome":{}}'),
        entry(2027, 'zh', 'Kept', '{"binome":{}}'),
      ]),
    );
    expect(state.inscriptions).toEqual([{ tourId: 'Kept', zoneId: 'zh' }]);
  });

  it('should reflect the injected Édition config', async () => {
    const state = await getInscriptionsState(deps([]));
    expect(state.edition).toEqual(EDITION);
  });

  it('should derive registrationOpen from the Édition config and the injected clock', async () => {
    await expect(getInscriptionsState(deps([], OPEN_CLOCK))).resolves.toMatchObject({
      registrationOpen: true,
    });
    await expect(getInscriptionsState(deps([], CLOSED_CLOCK))).resolves.toMatchObject({
      registrationOpen: false,
    });
  });
});

describe('handleInscriptionsGet', () => {
  it('should answer 200 with a no-store JSON body carrying the public state', async () => {
    const response = await handleInscriptionsGet(deps([entry(2027, 'zh', 'T', '{"binome":{}}')]));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      edition: EDITION,
      inscriptions: [{ tourId: 'T', zoneId: 'zh' }],
      registrationOpen: true,
    });
  });

  it('should answer an empty-but-valid JSON body for an empty store', async () => {
    await expect(handleInscriptionsGet(deps([])).then((r) => r.json())).resolves.toEqual({
      edition: EDITION,
      inscriptions: [],
      registrationOpen: true,
    });
  });

  it('should degrade to a JSON 502 when the store fails', async () => {
    const response = await handleInscriptionsGet({
      edition: EDITION,
      now: () => OPEN_CLOCK,
      store: {
        listAll: async () => {
          throw new Error('network down');
        },
      },
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'inscriptions-unavailable' });
  });
});

describe('isValidInscriptionValue', () => {
  it('should accept any JSON object payload without reading its content', () => {
    expect(isValidInscriptionValue('{"binome":{"firstName":"Léa"}}')).toBe(true);
    expect(isValidInscriptionValue('{}')).toBe(true);
    expect(isValidInscriptionValue('[]')).toBe(true);
  });

  it('should reject non-object and unparseable payloads', () => {
    expect(isValidInscriptionValue('"just a string"')).toBe(false);
    expect(isValidInscriptionValue('42')).toBe(false);
    expect(isValidInscriptionValue('null')).toBe(false);
    expect(isValidInscriptionValue('garbage{{')).toBe(false);
    expect(isValidInscriptionValue('')).toBe(false);
  });
});

describe('readInscriptionEntry', () => {
  it('should map a valid entry to its zone/tour pair', () => {
    expect(readInscriptionEntry(entry(2027, 'zh', 'V1', '{"binome":{}}'), 2027)).toEqual({
      tourId: 'V1',
      zoneId: 'zh',
    });
  });

  it('should map entries of another year or with garbage to null', () => {
    expect(readInscriptionEntry(entry(2026, 'zh', 'V1', '{"binome":{}}'), 2027)).toBeNull();
    expect(readInscriptionEntry(entry(2027, 'zh', 'V1', 'garbage'), 2027)).toBeNull();
    expect(
      readInscriptionEntry({ key: 'not-an-inscription-key', value: '{"binome":{}}' }, 2027),
    ).toBeNull();
  });
});
