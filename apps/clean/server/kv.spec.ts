import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RegistrationRecord } from '../src/app/registration/registration-contract';
import { createUpstashStore } from './kv';

const BASE_URL = 'https://eu1-example.upstash.io';
const TOKEN = 'secret-token';

const RECORD: RegistrationRecord = {
  firstName1: 'Ada',
  lastName1: 'Lovelace',
  firstName2: 'Alan',
  lastName2: 'Turing',
  year: 2027,
  zoneId: 'bruz-sud',
  tourName: 'V1',
};

type FetchMock = ReturnType<typeof createFetchMock>;

function createFetchMock() {
  return vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();
}

function redisResponse(result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ result }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function redisError(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(fetchMock: FetchMock): void {
  vi.stubGlobal('fetch', fetchMock);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createUpstashStore configuration', () => {
  it('throws when no Redis REST connection is configured', () => {
    expect(() => createUpstashStore({})).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it('reads the Vercel KV fallback environment names', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisResponse('OK'));

    const store = createUpstashStore({
      KV_REST_API_URL: BASE_URL,
      KV_REST_API_TOKEN: TOKEN,
    });
    await store.setIfAbsent('some-key', RECORD);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/set/some-key?NX`);
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
  });

  it('prefers the Upstash environment names over the Vercel KV fallback', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisResponse('OK'));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: 'https://upstash.example',
      UPSTASH_REDIS_REST_TOKEN: 'upstash-token',
      KV_REST_API_URL: 'https://kv.example',
      KV_REST_API_TOKEN: 'kv-token',
    });
    await store.setIfAbsent('some-key', RECORD);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://upstash.example/set/some-key?NX');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer upstash-token' });
  });
});

describe('createUpstashStore setIfAbsent', () => {
  it('writes with SET NX and reports a created key', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisResponse('OK'));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });
    const created = await store.setIfAbsent('inscriptions:2027:bruz-sud:V1', RECORD);

    expect(created).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/set/inscriptions%3A2027%3Abruz-sud%3AV1?NX`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify(RECORD));
    expect(init?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports false when the key already exists', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisResponse(null));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });

    await expect(store.setIfAbsent('inscriptions:2027:bruz-sud:V1', RECORD)).resolves.toBe(false);
  });

  it('throws on an unexpected SET NX result', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisResponse(5));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });

    await expect(store.setIfAbsent('inscriptions:2027:bruz-sud:V1', RECORD)).rejects.toThrow(
      /unexpected/i,
    );
  });

  it('throws on an error payload, even with a 2xx status', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisError('WRONGPASS invalid or missing auth token', 200));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });

    await expect(store.setIfAbsent('inscriptions:2027:bruz-sud:V1', RECORD)).rejects.toThrow(
      /WRONGPASS/,
    );
  });

  it('throws on a non-2xx response', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisError('WRONGPASS invalid or missing auth token', 401));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });

    await expect(store.setIfAbsent('inscriptions:2027:bruz-sud:V1', RECORD)).rejects.toThrow(/401/);
  });
});

describe('createUpstashStore list', () => {
  it('scans the cursor loop, reads values with MGET and skips malformed values', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(
        redisResponse(['42', ['inscriptions:2027:bruz-sud:V1', 'inscriptions:2027:bruz-sud:V2']]),
      )
      .mockResolvedValueOnce(redisResponse(['0', ['inscriptions:2027:bruz-sud:V3']]))
      .mockResolvedValueOnce(redisResponse([JSON.stringify(RECORD), 'not-json', null]));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });
    const records = await store.list('inscriptions:2027:');

    expect(records).toEqual([RECORD]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${BASE_URL}/scan/0/match/inscriptions%3A2027%3A*/count/100`,
      `${BASE_URL}/scan/42/match/inscriptions%3A2027%3A*/count/100`,
      `${BASE_URL}/mget/inscriptions%3A2027%3Abruz-sud%3AV1/inscriptions%3A2027%3Abruz-sud%3AV2/inscriptions%3A2027%3Abruz-sud%3AV3`,
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('inscriptions:2027:bruz-sud:V2');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('not-json');
  });

  it('returns an empty list without calling MGET when no key matches', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisResponse(['0', []]));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });

    await expect(store.list('inscriptions:2027:')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads values in MGET chunks of 100 keys', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    const keys = Array.from(
      { length: 101 },
      (_, index) => `inscriptions:2027:bruz-sud:V${index + 1}`,
    );
    fetchMock
      .mockResolvedValueOnce(redisResponse(['0', keys]))
      .mockResolvedValueOnce(redisResponse(Array.from({ length: 100 }, () => null)))
      .mockResolvedValueOnce(redisResponse([JSON.stringify(RECORD)]));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });
    const records = await store.list('inscriptions:2027:');

    expect(records).toEqual([RECORD]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const mgetUrls = fetchMock.mock.calls.slice(1).map(([url]) => String(url));
    expect(mgetUrls[0]?.split('/mget/')[1]?.split('/')).toHaveLength(100);
    expect(mgetUrls[1]?.split('/mget/')[1]?.split('/')).toHaveLength(1);
  });

  it('throws on an unexpected SCAN result', async () => {
    const fetchMock = createFetchMock();
    stubFetch(fetchMock);
    fetchMock.mockResolvedValueOnce(redisResponse('OK'));

    const store = createUpstashStore({
      UPSTASH_REDIS_REST_URL: BASE_URL,
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });

    await expect(store.list('inscriptions:2027:')).rejects.toThrow(/unexpected/i);
  });
});
