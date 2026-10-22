import { describe, expect, it } from 'vitest';

import type { InscriptionsHandlerDeps, RawInscriptionEntry } from './public-state';
import { getInscriptionsState, handleInscriptionsGet, readInscriptionEntry } from './public-state';
import { inscriptionKey } from './upstash-kv';

/**
 * Pure core of `GET /api/inscriptions` (ticket #16): the public state exposes
 * (zone, tour) pairs only, an empty store stays valid JSON, the coverage comes
 * from the KEY (whatever the stored value holds), the pairs unknown to the
 * Parcours catalogue are never exposed, and the edition data comes from the
 * injected config. A store outage degrades to a JSON 502.
 */

const EDITION = {
  actionDate: '2027-02-14',
  actionEndTime: '12:00',
  actionStartTime: '09:00',
  inscriptionsOpenDate: '2027-01-04',
  year: 2027,
} as const;

/** 2027-01-03 — the day before the inscriptions open: registration not open yet. */
const NOT_OPEN_YET_CLOCK = new Date('2027-01-03T09:00:00Z');
/** 2027-02-10 late morning in Paris — registration still open. */
const OPEN_CLOCK = new Date('2027-02-10T09:00:00Z');
/** 2027-02-11 late morning in Paris — the last registration day, still open. */
const LAST_REGISTRATION_DAY_CLOCK = new Date('2027-02-11T09:00:00Z');
/** 2027-02-12 — 2 days before the action date, registration closed. */
const CLOSED_CLOCK = new Date('2027-02-12T09:00:00Z');

/** The (Zone, Parcours) pairs the fake catalogue knows. */
const KNOWN_PAIRS = new Set([
  'bruz-sud:V1',
  'zh:BadNull',
  'zh:BadNumber',
  'zh:BadString',
  'zh:EmptyValue',
  'zh:GarbageValue',
  'zh:Kept',
  'zh:Kept1',
  'zh:T',
  'zh:T2',
  'zh:T3',
  'zh:T11',
  'zh:T20',
  'zh:V1',
  'zi:T20',
  'ze:KeptArray',
]);

/** The fake catalogue lookup: only the pairs it knows exist. */
const parcours = (zoneId: string, tourId: string): boolean =>
  KNOWN_PAIRS.has(`${zoneId}:${tourId}`);

/** Scripted raw store entry, keyed through the adapter's key builder. */
function entry(year: number, zoneId: string, tourId: string, value: string): RawInscriptionEntry {
  return { key: inscriptionKey(year, zoneId, tourId), value };
}

/** Deps injecting a fixed store listing and a fixed clock. */
function deps(
  entries: readonly RawInscriptionEntry[],
  now: Date = OPEN_CLOCK,
): InscriptionsHandlerDeps {
  return {
    edition: EDITION,
    now: () => now,
    parcours,
    store: { listAll: async () => entries },
  };
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

  it('should cover a key whatever its stored value (a hand-seeded key counts as covered)', async () => {
    // The referent seeds a key by hand in the Upstash console: the coverage
    // comes from the KEY, so an empty or garbage value still covers the
    // Parcours (and the POST answers 409 for that key, forever).
    const state = await getInscriptionsState(
      deps([
        entry(2027, 'zh', 'EmptyValue', ''),
        entry(2027, 'zh', 'GarbageValue', 'garbage{{'),
        entry(2027, 'zh', 'BadString', '"just a string"'),
        entry(2027, 'zh', 'BadNumber', '42'),
        entry(2027, 'zh', 'BadNull', 'null'),
        entry(2027, 'ze', 'KeptArray', '[]'),
      ]),
    );
    expect(state.inscriptions).toEqual([
      { tourId: 'KeptArray', zoneId: 'ze' },
      { tourId: 'BadNull', zoneId: 'zh' },
      { tourId: 'BadNumber', zoneId: 'zh' },
      { tourId: 'BadString', zoneId: 'zh' },
      { tourId: 'EmptyValue', zoneId: 'zh' },
      { tourId: 'GarbageValue', zoneId: 'zh' },
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

  it('should never expose a pair unknown to the Parcours catalogue', async () => {
    // A bogus legacy key (a typo of a real Parcours id, or a Parcours of
    // another Zone) is ignored: it never pollutes the public state.
    const state = await getInscriptionsState(
      deps([
        entry(2027, 'zh', 'Kept', '{"binome":{}}'),
        entry(2027, 'zh', 'v1', '{"binome":{}}'),
        entry(2027, 'unknown-zone', 'V1', '{"binome":{}}'),
      ]),
    );
    expect(state.inscriptions).toEqual([{ tourId: 'Kept', zoneId: 'zh' }]);
  });

  it('should reflect the injected Édition config', async () => {
    const state = await getInscriptionsState(deps([]));
    expect(state.edition).toEqual(EDITION);
  });

  it('should derive registrationOpen from the Édition config and the injected clock', async () => {
    // Before the opening day of the Édition (2027-01-04), not open yet.
    await expect(getInscriptionsState(deps([], NOT_OPEN_YET_CLOCK))).resolves.toMatchObject({
      registrationOpen: false,
    });
    await expect(getInscriptionsState(deps([], OPEN_CLOCK))).resolves.toMatchObject({
      registrationOpen: true,
    });
    // The last registration day (3 days before the action) still accepts them.
    await expect(
      getInscriptionsState(deps([], LAST_REGISTRATION_DAY_CLOCK)),
    ).resolves.toMatchObject({
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
      parcours,
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

describe('readInscriptionEntry', () => {
  it('should map a valid entry to its zone/tour pair', () => {
    expect(readInscriptionEntry(entry(2027, 'zh', 'V1', '{"binome":{}}'), 2027, parcours)).toEqual({
      tourId: 'V1',
      zoneId: 'zh',
    });
  });

  it('should map entries of another year or with a malformed key to null', () => {
    expect(
      readInscriptionEntry(entry(2026, 'zh', 'V1', '{"binome":{}}'), 2027, parcours),
    ).toBeNull();
    expect(
      readInscriptionEntry(
        { key: 'not-an-inscription-key', value: '{"binome":{}}' },
        2027,
        parcours,
      ),
    ).toBeNull();
  });

  it('should map an entry with a garbage value to its pair (the key decides)', () => {
    expect(readInscriptionEntry(entry(2027, 'zh', 'V1', 'garbage'), 2027, parcours)).toEqual({
      tourId: 'V1',
      zoneId: 'zh',
    });
    expect(readInscriptionEntry(entry(2027, 'zh', 'V1', ''), 2027, parcours)).toEqual({
      tourId: 'V1',
      zoneId: 'zh',
    });
  });

  it('should map a pair unknown to the catalogue to null', () => {
    // A bogus legacy key (a typo of a real Parcours id) is ignored: it never
    // reaches the public state.
    expect(
      readInscriptionEntry(entry(2027, 'zh', 'v1', '{"binome":{}}'), 2027, parcours),
    ).toBeNull();
  });
});
