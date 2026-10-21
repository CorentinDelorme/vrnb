import { describe, expect, it, vi } from 'vitest';

import {
  INSCRIPTIONS_KEY_PREFIX,
  createUpstashInscriptionsStore,
  inscriptionKey,
  parseInscriptionKey,
} from './upstash-kv';

/**
 * Upstash REST read adapter: key building/parsing and the REST exchange
 * (URL/token/fetch injection, command paths, envelope parsing, defensive
 * skipping of unusable values). A recording scripted fetch replaces the
 * network; value validation lives in `public-state.spec.ts`.
 */

/** One scripted Upstash REST exchange. */
interface ScriptedReply {
  /** Fetch itself throws with this message (network outage). */
  readonly throws?: string;
  /** JSON payload of the `{"result": …}` / `{"error": …}` envelope. */
  readonly payload?: unknown;
  /** HTTP status, 200 unless scripted otherwise. */
  readonly status?: number;
}

interface RestCall {
  readonly url: string;
  readonly init?: RequestInit;
}

interface ScriptedRestFetch {
  /** URL / init of every REST call, in order. */
  readonly calls: RestCall[];
  readonly enqueue: (...replies: ScriptedReply[]) => void;
  readonly fetchImpl: typeof fetch;
}

/** Recording fetch consuming one scripted reply per REST call. */
function createScriptedRestFetch(): ScriptedRestFetch {
  const calls: RestCall[] = [];
  const queue: ScriptedReply[] = [];
  const fetchImpl: typeof fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls.push({ init, url: String(input) });
      const reply = queue.shift();
      if (!reply) throw new Error('no scripted REST reply left');
      if (reply.throws !== undefined) throw new Error(reply.throws);
      return new Response(JSON.stringify(reply.payload ?? null), {
        status: reply.status ?? 200,
      });
    },
  );
  return { calls, enqueue: (...replies: ScriptedReply[]) => queue.push(...replies), fetchImpl };
}

/** Upstash REST envelope builders (the adapter unwraps `result`). */
const scanReply = (cursor: string | number, keys: unknown[]): ScriptedReply => ({
  payload: { error: null, result: [cursor, keys] },
});
const mgetReply = (values: unknown[]): ScriptedReply => ({
  payload: { error: null, result: values },
});

const CONFIG = { token: 'rest-token', url: 'https://rest-upstash.example' } as const;

describe('inscriptionKey', () => {
  it('should build the inscriptions:<year>:<zone>:<tour> key', () => {
    expect(inscriptionKey(2027, 'bruz-sud', 'V1')).toBe('inscriptions:2027:bruz-sud:V1');
    expect(INSCRIPTIONS_KEY_PREFIX).toBe('inscriptions');
  });
});

describe('parseInscriptionKey', () => {
  it('should keep valid keys, round-tripping every segment', () => {
    expect(parseInscriptionKey('inscriptions:2027:bruz-sud:V1')).toEqual({
      tourId: 'V1',
      year: 2027,
      zoneId: 'bruz-sud',
    });
    expect(parseInscriptionKey('inscriptions:2030:bruz-ker-lann:P13')).toEqual({
      tourId: 'P13',
      year: 2030,
      zoneId: 'bruz-ker-lann',
    });
  });

  it('should keep tour names containing a colon', () => {
    expect(parseInscriptionKey('inscriptions:2027:z:very:long:name')).toEqual({
      tourId: 'very:long:name',
      year: 2027,
      zoneId: 'z',
    });
  });

  it('should reject keys of any other namespace', () => {
    expect(parseInscriptionKey('sessions:2027:bruz-sud:V1')).toBeNull();
  });

  it('should reject keys with a non-numeric or missing year', () => {
    expect(parseInscriptionKey('inscriptions:twenty:bruz-sud:V1')).toBeNull();
    expect(parseInscriptionKey('inscriptions:bruz-sud:V1')).toBeNull();
  });

  it('should reject keys without a zone or a tour', () => {
    expect(parseInscriptionKey('inscriptions:2027::V1')).toBeNull();
    expect(parseInscriptionKey('inscriptions:2027:bruz-sud:')).toBeNull();
    expect(parseInscriptionKey('inscriptions:2027:bruz-sud')).toBeNull();
    expect(parseInscriptionKey('inscriptions')).toBeNull();
    expect(parseInscriptionKey('')).toBeNull();
  });
});

describe('createUpstashInscriptionsStore', () => {
  it('should list the edition entries by scanning then MGET-ing the keys', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply('0', ['inscriptions:2027:bruz-sud:V1']));
    rest.enqueue(mgetReply(['{"binome":{"firstName":"Léa"}}']));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    const entries = await store.listAll(2027);

    expect(entries).toEqual([
      {
        key: 'inscriptions:2027:bruz-sud:V1',
        value: '{"binome":{"firstName":"Léa"}}',
      },
    ]);
    expect(rest.calls).toHaveLength(2);
    expect(rest.calls[0]?.url).toBe(
      'https://rest-upstash.example/scan/0/match/inscriptions%3A2027%3A*/count/100',
    );
    expect(rest.calls[1]?.url).toBe(
      'https://rest-upstash.example/mget/inscriptions%3A2027%3Abruz-sud%3AV1',
    );
  });

  it('should send the REST token as a Bearer header over a plain GET', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply('0', []));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await store.listAll(2027);

    expect(rest.calls).toHaveLength(1);
    expect(new Headers(rest.calls[0]?.init?.headers).get('authorization')).toBe(
      'Bearer rest-token',
    );
  });

  it('should trim the trailing slash of the REST URL', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply('0', []));

    const store = createUpstashInscriptionsStore(
      { token: 'rest-token', url: 'https://rest-upstash.example/' },
      rest.fetchImpl,
    );
    await store.listAll(2027);

    expect(rest.calls[0]?.url).toBe(
      'https://rest-upstash.example/scan/0/match/inscriptions%3A2027%3A*/count/100',
    );
  });

  it('should follow SCAN pages until the cursor comes back to 0', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply('7', ['inscriptions:2027:z:V1']));
    rest.enqueue(scanReply('0', ['inscriptions:2027:z:V2']));
    rest.enqueue(mgetReply(['{"a":1}', '{"b":2}']));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    const entries = await store.listAll(2027);

    expect(entries).toEqual([
      { key: 'inscriptions:2027:z:V1', value: '{"a":1}' },
      { key: 'inscriptions:2027:z:V2', value: '{"b":2}' },
    ]);
    expect(rest.calls[1]?.url).toContain('/scan/7/match/');
    expect(rest.calls[2]?.url).toBe(
      'https://rest-upstash.example/mget/' +
        'inscriptions%3A2027%3Az%3AV1/inscriptions%3A2027%3Az%3AV2',
    );
  });

  it('should accept a numeric SCAN cursor', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply(42, ['inscriptions:2027:z:V1']));
    rest.enqueue(scanReply('0', []));
    rest.enqueue(mgetReply(['{"a":1}']));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    const entries = await store.listAll(2027);

    expect(entries).toHaveLength(1);
    expect(rest.calls[1]?.url).toContain('/scan/42/match/');
  });

  it('should ignore non-string SCAN keys', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply('0', [42, 'inscriptions:2027:z:V1']));
    rest.enqueue(mgetReply(['{"a":1}']));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    const entries = await store.listAll(2027);

    expect(entries).toHaveLength(1);
    expect(rest.calls[1]?.url).toBe(
      'https://rest-upstash.example/mget/inscriptions%3A2027%3Az%3AV1',
    );
  });

  it('should skip missing (null) and non-string MGET values, keeping the rest', async () => {
    const rest = createScriptedRestFetch();
    const keys = [
      'inscriptions:2027:z:V1',
      'inscriptions:2027:z:V2',
      'inscriptions:2027:z:V3',
      'inscriptions:2027:z:V4',
    ];
    rest.enqueue(scanReply('0', keys));
    rest.enqueue(mgetReply([null, 42, '{"a":1}', 'garbage']));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    const entries = await store.listAll(2027);

    expect(entries).toEqual([
      { key: 'inscriptions:2027:z:V3', value: '{"a":1}' },
      { key: 'inscriptions:2027:z:V4', value: 'garbage' },
    ]);
  });

  it('should return an empty listing without MGET for an empty store', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply('0', []));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await expect(store.listAll(2027)).resolves.toEqual([]);
    expect(rest.calls).toHaveLength(1);
  });

  it('should MGET large key listings in chunks of 100', async () => {
    const rest = createScriptedRestFetch();
    const keys = Array.from({ length: 250 }, (_, index) => `inscriptions:2027:z:T${index}`);
    rest.enqueue(scanReply('0', keys));
    for (const size of [100, 100, 50]) {
      rest.enqueue(mgetReply(Array.from({ length: size }, () => '{"ok":true}')));
    }

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    const entries = await store.listAll(2027);

    expect(entries).toHaveLength(250);
    expect(rest.calls).toHaveLength(4);
    expect(((rest.calls[3]?.url ?? '').match(/\/inscriptions/g) ?? []).length).toBe(50);
  });

  it('should fail on an Upstash error envelope', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue({ payload: { error: 'ERR wrong number of arguments' } });

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await expect(store.listAll(2027)).rejects.toThrow('Upstash REST command failed');
  });

  it('should fail on an HTTP error status', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue({ status: 401 });

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await expect(store.listAll(2027)).rejects.toThrow('HTTP 401');
  });

  it('should fail when the fetch itself fails', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue({ throws: 'network down' });

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await expect(store.listAll(2027)).rejects.toThrow('network down');
  });

  it('should fail on a non-object REST envelope', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue({ payload: 'plain text' });

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await expect(store.listAll(2027)).rejects.toThrow('not a JSON object');
  });

  it('should fail on an unreadable SCAN reply', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue({ payload: ['0'] });

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await expect(store.listAll(2027)).rejects.toThrow('not a (cursor, keys) pair');

    const restWithBadKeys = createScriptedRestFetch();
    restWithBadKeys.enqueue({ payload: ['0', 'astring'] });
    const store2 = createUpstashInscriptionsStore(CONFIG, restWithBadKeys.fetchImpl);
    await expect(store2.listAll(2027)).rejects.toThrow('not a (cursor, keys) pair');
  });

  it('should fail when the MGET reply is not aligned with the requested keys', async () => {
    const rest = createScriptedRestFetch();
    rest.enqueue(scanReply('0', ['inscriptions:2027:z:V1']));
    rest.enqueue(mgetReply([]));

    const store = createUpstashInscriptionsStore(CONFIG, rest.fetchImpl);
    await expect(store.listAll(2027)).rejects.toThrow('not aligned with the requested keys');
  });

  it('should fail per call when the REST credentials are missing', async () => {
    const rest = createScriptedRestFetch();
    const store = createUpstashInscriptionsStore({ token: '', url: '' }, rest.fetchImpl);

    await expect(store.listAll(2027)).rejects.toThrow('UPSTASH_REDIS_REST_URL');
    expect(rest.calls).toHaveLength(0);
  });
});
