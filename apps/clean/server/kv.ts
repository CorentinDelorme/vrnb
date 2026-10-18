/**
 * Upstash Redis REST adapter for the registration store.
 *
 * Plain `fetch` against the REST API: no runtime dependency, and the semantics
 * used here are the documented/verified ones (`SET ... NX` → `"OK"`/`null`,
 * `SCAN` cursor loop, `MGET` values are JSON strings).
 */
import type { RegistrationRecord } from '../src/app/registration/registration-contract';
import type { RegistrationStore } from './inscriptions-handler';

/** Timeout applied to every Upstash REST call. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Number of keys requested per SCAN call. */
const SCAN_COUNT = 100;

/** Number of keys read per MGET call. */
const MGET_CHUNK_SIZE = 100;

interface RedisConnection {
  readonly url: string;
  readonly token: string;
}

interface CommandInit {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
}

/** Upstash names first, then the Vercel-Marketplace-compatible KV names. */
function resolveConnection(env: Record<string, string | undefined>): RedisConnection {
  const url = env['UPSTASH_REDIS_REST_URL'] ?? env['KV_REST_API_URL'];
  const token = env['UPSTASH_REDIS_REST_TOKEN'] ?? env['KV_REST_API_TOKEN'];
  if (!url || !token) {
    throw new Error(
      'Missing Upstash Redis REST configuration: set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_URL/KV_REST_API_TOKEN fallback).',
    );
  }
  return { url: url.replace(/\/+$/, ''), token };
}

function warnMalformedKey(key: string): void {
  console.warn(`[inscriptions] Skipping malformed registration stored at key "${key}"`);
}

/** Trimmed non-empty string, or null. */
function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Strict `RegistrationRecord` check: the `as` cast alone would expose junk through GET. */
function toRegistrationRecord(parsed: unknown): RegistrationRecord | null {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  const year = candidate['year'];
  const zoneId = nonEmptyString(candidate['zoneId']);
  const tourName = nonEmptyString(candidate['tourName']);
  const firstName1 = nonEmptyString(candidate['firstName1']);
  const lastName1 = nonEmptyString(candidate['lastName1']);
  const firstName2 = nonEmptyString(candidate['firstName2']);
  const lastName2 = nonEmptyString(candidate['lastName2']);
  if (
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    year <= 0 ||
    zoneId === null ||
    tourName === null ||
    firstName1 === null ||
    lastName1 === null ||
    firstName2 === null ||
    lastName2 === null
  ) {
    return null;
  }
  return { firstName1, lastName1, firstName2, lastName2, year, zoneId, tourName };
}

/** Parses one stored value; skips missing or malformed values, never logging the value. */
function parseRecord(value: unknown, key: string): RegistrationRecord | undefined {
  if (value === null || value === undefined) {
    return undefined; // Key deleted between SCAN and MGET.
  }
  if (typeof value !== 'string') {
    warnMalformedKey(key);
    return undefined;
  }
  try {
    const record = toRegistrationRecord(JSON.parse(value));
    if (record) {
      return record;
    }
  } catch {
    // Fall through to the warning below.
  }
  warnMalformedKey(key);
  return undefined;
}

export function createUpstashStore(env: Record<string, string | undefined>): RegistrationStore {
  const { url, token } = resolveConnection(env);

  /** Runs one REST command and returns its `result`; throws on any failure. */
  async function command(path: string, init: CommandInit = {}): Promise<unknown> {
    const response = await fetch(`${url}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
      body: init.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Upstash Redis request failed with status ${response.status}`);
    }
    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Upstash Redis returned an unexpected payload');
    }
    const result = payload as Record<string, unknown>;
    if (typeof result['error'] === 'string') {
      throw new Error(`Upstash Redis returned an error: ${result['error']}`);
    }
    return result['result'];
  }

  /** `SET key value NX`: true when this call created the key, false when it existed. */
  async function setIfAbsent(key: string, record: RegistrationRecord): Promise<boolean> {
    const result = await command(`/set/${encodeURIComponent(key)}?NX`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (result === 'OK') {
      return true;
    }
    if (result === null) {
      return false;
    }
    throw new Error('Upstash Redis SET NX returned an unexpected result');
  }

  /** Reads the records of every key matching `<prefix>*`. */
  async function list(prefix: string): Promise<RegistrationRecord[]> {
    const match = encodeURIComponent(`${prefix}*`);
    const keys: string[] = [];
    let cursor = '0';
    do {
      const scan = await command(`/scan/${cursor}/match/${match}/count/${SCAN_COUNT}`);
      if (!Array.isArray(scan) || typeof scan[0] !== 'string' || !Array.isArray(scan[1])) {
        throw new Error('Upstash Redis SCAN returned an unexpected result');
      }
      cursor = scan[0];
      for (const key of scan[1]) {
        if (typeof key === 'string') {
          keys.push(key);
        }
      }
    } while (cursor !== '0');

    const records: RegistrationRecord[] = [];
    for (let start = 0; start < keys.length; start += MGET_CHUNK_SIZE) {
      const chunk = keys.slice(start, start + MGET_CHUNK_SIZE);
      const path = `/mget/${chunk.map((key) => encodeURIComponent(key)).join('/')}`;
      const values = await command(path);
      // A short response would silently drop the tail: keep the two REST clients aligned.
      if (!Array.isArray(values) || values.length !== chunk.length) {
        throw new Error('Upstash Redis MGET returned an unexpected result');
      }
      chunk.forEach((key, index) => {
        const record = parseRecord(values[index], key);
        if (record) {
          records.push(record);
        }
      });
    }
    return records;
  }

  return { setIfAbsent, list };
}
