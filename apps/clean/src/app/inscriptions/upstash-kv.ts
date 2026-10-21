/**
 * Upstash KV read adapter for the inscriptions feature — pure `fetch` against
 * the Upstash REST API (no SDK), following the Redis-proto convention
 * `REST_URL/COMMAND/arg1/…/argN` with the REST token as a Bearer header.
 *
 * Covered Parcours are stored as string keys
 * `inscriptions:<year>:<zone>:<tour-name>` holding a JSON blob of the Binôme.
 * For #16 the value contents are irrelevant (names never leave the store):
 * the adapter only lists keys for the Édition year and returns the raw
 * entries; the pure handler in `public-state.ts` validates and maps them.
 * Ticket #17 adds the SET/NX write side to this module, not before.
 */

import type { InscriptionsStore, RawInscriptionEntry } from './public-state';

/** First segment of every stored inscription key. */
export const INSCRIPTIONS_KEY_PREFIX = 'inscriptions';

/** KV key of one inscription, namespaced by the Édition year (see GLOSSARY). */
export function inscriptionKey(year: number, zoneId: string, tourId: string): string {
  return `${INSCRIPTIONS_KEY_PREFIX}:${year}:${zoneId}:${tourId}`;
}

/** One `inscriptions:<year>:<zone>:<tour-name>` key split back apart. */
export interface ParsedInscriptionKey {
  readonly year: number;
  readonly zoneId: string;
  readonly tourId: string;
}

/**
 * Strictly parse a stored key; `null` whenever the segments are not a valid
 * inscription key of any year (wrong namespace, missing parts, garbage). The
 * tour name may itself contain `:`, so only the first three segments are fixed.
 */
export function parseInscriptionKey(key: string): ParsedInscriptionKey | null {
  const [prefix, rawYear, zoneId, ...tourParts] = key.split(':');
  if (
    prefix !== INSCRIPTIONS_KEY_PREFIX ||
    typeof rawYear !== 'string' ||
    typeof zoneId !== 'string' ||
    tourParts.length === 0
  ) {
    return null;
  }
  if (!/^\d+$/.test(rawYear)) return null;
  const tourId = tourParts.join(':');
  if (!zoneId || !tourId) return null;
  return { tourId, year: Number.parseInt(rawYear, 10), zoneId };
}

/** Upstash REST credentials, read from the environment by the route adapter. */
export interface UpstashConfig {
  readonly url: string;
  readonly token: string;
}

/** Injectable fetch so tests script the REST exchange without a network. */
export type RestFetch = typeof fetch;

/** Upstash REST JSON envelope: `{"result": …}` on success, `{"error": …}` otherwise. */
interface UpstashEnvelope {
  readonly result?: unknown;
  readonly error?: unknown;
}

/** SCAN page size hint; the whole keyspace is scanning in pages until cursor 0. */
const SCAN_COUNT = 100;
/** Bound on SCAN pages so a broken cursor can never loop forever. */
const MAX_SCAN_PAGES = 256;
/** Upper MGET size per REST call (keys are URL path segments). */
const MGET_BATCH = 100;

/**
 * Adapter factory for the pure handler's reading port: lists every stored
 * entry of an Édition year (scan + MGET, validated defensively). Both the
 * base URL and the token are required at call time, so a missing environment
 * becomes a controlled failure inside the handler (JSON 502) instead of a
 * crash at import time. The REST fetch is injectable for unit tests.
 */
export function createUpstashInscriptionsStore(
  config: UpstashConfig,
  restFetch: RestFetch = fetch,
): InscriptionsStore {
  async function request(command: string): Promise<unknown> {
    if (!config.url || !config.token) {
      throw new Error(
        'Upstash REST credentials missing: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
      );
    }
    const base = config.url.replace(/\/+$/, '');
    const response = await restFetch(`${base}/${command}`, {
      headers: { authorization: `Bearer ${config.token}` },
    });
    if (!response.ok) throw new Error(`Upstash REST request failed: HTTP ${response.status}`);
    const envelope: unknown = await response.json();
    if (envelope === null || typeof envelope !== 'object') {
      throw new Error('Upstash REST response is not a JSON object');
    }
    const body = envelope as UpstashEnvelope;
    if (body.error != null) {
      throw new Error(`Upstash REST command failed on /${command}`);
    }
    return body.result;
  }

  async function scanInscriptionKeys(year: number): Promise<string[]> {
    const pattern = `${INSCRIPTIONS_KEY_PREFIX}:${year}:*`;
    const keys: string[] = [];
    let cursor = '0';
    for (let page = 0; page < MAX_SCAN_PAGES; page++) {
      const result = await request(
        `scan/${cursor}/match/${encodeURIComponent(pattern)}/count/${SCAN_COUNT}`,
      );
      if (!Array.isArray(result) || result.length !== 2 || !Array.isArray(result[1])) {
        throw new Error('Upstash SCAN reply is not a (cursor, keys) pair');
      }
      const nextCursor = result[0];
      if (typeof nextCursor !== 'number' && typeof nextCursor !== 'string') {
        throw new Error('Upstash SCAN reply has no readable cursor');
      }
      cursor = String(nextCursor);
      for (const key of result[1]) {
        if (typeof key === 'string') keys.push(key);
      }
      if (cursor === '0') return keys;
    }
    throw new Error(`Upstash SCAN did not converge after ${MAX_SCAN_PAGES} pages`);
  }

  async function readRawValues(keys: readonly string[]): Promise<readonly RawInscriptionEntry[]> {
    const entries: RawInscriptionEntry[] = [];
    for (let offset = 0; offset < keys.length; offset += MGET_BATCH) {
      const batch = keys.slice(offset, offset + MGET_BATCH);
      const command = `mget/${batch.map((key) => encodeURIComponent(key)).join('/')}`;
      const result = await request(command);
      if (!Array.isArray(result) || result.length !== batch.length) {
        throw new Error('Upstash MGET reply is not aligned with the requested keys');
      }
      for (const index of batch.keys()) {
        const value = result[index];
        if (typeof value === 'string') entries.push({ key: batch[index], value });
      }
    }
    return entries;
  }

  return {
    async listAll(year: number): Promise<readonly RawInscriptionEntry[]> {
      const keys = await scanInscriptionKeys(year);
      if (keys.length === 0) return [];
      return readRawValues(keys);
    },
  };
}
