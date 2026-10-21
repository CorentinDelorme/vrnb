import { describe, expect, it } from 'vitest';

import type { InscriptionsWriteStore } from './register';
import type { RawInscriptionEntry } from './public-state';
import { handleInscriptionsGet } from './public-state';
import {
  handleInscriptionsPost,
  inscriptionStoredValue,
  parseInscriptionRegistration,
  registrationExpiresIn,
} from './register';
import { inscriptionKey } from './upstash-kv';

/**
 * Pure core of `POST /api/inscriptions` (ticket #17): the registration is an
 * atomic first-come reservation on the KV store, the stored value never
 * exceeds the four identity fields, and every outcome is a distinct no-store
 * JSON response (201 created, 409 covered, 400 invalid, 500 store failure).
 */

const EDITION = { actionDate: '2027-02-14', year: 2027 } as const;

/** 2027-02-01 late morning in Paris — a plausible registration instant. */
const NOW = new Date('2027-02-01T09:00:00Z');

/** One valid registration body, tweakable per test. */
function validBody(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    engaged: true,
    firstName1: 'Léa',
    firstName2: 'Marc',
    honeypot: '',
    lastName1: 'Dupont',
    lastName2: 'Martin',
    tourId: 'V1',
    zoneId: 'bruz-sud',
    ...overrides,
  };
}

/**
 * In-memory KV fake implementing the write port, recording its operations
 * like the adapters' specs do so tests can assert the exact interactions.
 */
class InMemoryWriteStore implements InscriptionsWriteStore {
  /** Key → serialized value currently stored. */
  readonly values = new Map<string, string>();
  /** Key → TTL recorded when the value was stored (seconds until expiry). */
  readonly expiries = new Map<string, number>();
  /** Human-readable operation log, one line per port call. */
  readonly operationLog: string[] = [];

  async setIfAbsent(key: string, value: string, expiresIn: number): Promise<boolean> {
    this.operationLog.push(`set-if-absent ${key} ex=${expiresIn}`);
    if (this.values.has(key)) return false;
    this.values.set(key, value);
    this.expiries.set(key, expiresIn);
    return true;
  }

  /** Raw entries as the read port would serve them (for cover-by-seed setups). */
  entries(): readonly RawInscriptionEntry[] {
    return [...this.values.entries()].map(([key, value]) => ({ key, value }));
  }
}

/** Deps injecting the fake store and a fixed clock. */
function deps(store: InMemoryWriteStore, now: Date = NOW) {
  return { edition: EDITION, now: () => now, store };
}

/** A well-formed POST request carrying a JSON body. */
function request(body: unknown): Request {
  return new Request('http://localhost/api/inscriptions', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
}

describe('parseInscriptionRegistration', () => {
  it('should keep a well-formed registration with trimmed identity fields', () => {
    const registration = parseInscriptionRegistration(validBody({ firstName1: '  Léa  ' }));
    expect(registration?.firstName1).toBe('Léa');
    expect(parseInscriptionRegistration(validBody())).toEqual({
      engaged: true,
      firstName1: 'Léa',
      firstName2: 'Marc',
      honeypot: '',
      lastName1: 'Dupont',
      lastName2: 'Martin',
      tourId: 'V1',
      zoneId: 'bruz-sud',
    });
  });

  it('should trim identity and context fields of the validated shape', () => {
    expect(parseInscriptionRegistration(validBody({ tourId: ' V2\t' }))?.tourId).toBe('V2');
  });

  it('should reject missing, blank or mistyped required fields', () => {
    for (const body of [
      {},
      null,
      'plain text',
      42,
      validBody({ firstName1: '   ' }),
      validBody({ lastName1: '' }),
      validBody({ firstName2: undefined }),
      validBody({ lastName2: 42 }),
      validBody({ tourId: '' }),
      validBody({ zoneId: '   ' }),
      validBody({ engaged: 'yes' }),
      validBody({ engaged: false }),
      validBody({ engaged: undefined }),
      validBody({ honeypot: 42 }),
    ] satisfies unknown[]) {
      expect(parseInscriptionRegistration(body)).toBeNull();
    }
  });

  it('should tolerate any string honeypot at this ticket level (#18 enforces)', () => {
    expect(parseInscriptionRegistration(validBody({ honeypot: 'spam text' }))?.honeypot).toBe(
      'spam text',
    );
    expect(parseInscriptionRegistration(validBody({ honeypot: '' }))?.honeypot).toBe('');
    expect(parseInscriptionRegistration(validBody({ honeypot: undefined }))?.honeypot).toBe('');
  });

  it('should reject non-object payloads', () => {
    expect(parseInscriptionRegistration(null)).toBeNull();
    expect(parseInscriptionRegistration('registration')).toBeNull();
    expect(parseInscriptionRegistration(42)).toBeNull();
  });
});

describe('inscriptionStoredValue', () => {
  it('should serialize exactly the four identity fields', () => {
    const registration = parseInscriptionRegistration(
      validBody({ firstName1: ' Léa ', honeypot: 'spam' }),
    );
    if (!registration) throw new Error('fixture not validated');
    expect(JSON.parse(inscriptionStoredValue(registration))).toEqual({
      firstName1: 'Léa',
      firstName2: 'Marc',
      lastName1: 'Dupont',
      lastName2: 'Martin',
    });
  });
});

describe('handleInscriptionsPost', () => {
  it('should answer 201 and create the key with the identity value on first come', async () => {
    const store = new InMemoryWriteStore();
    const response = await handleInscriptionsPost(deps(store), request(validBody()));

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      inscription: { tourId: 'V1', zoneId: 'bruz-sud' },
    });

    const key = inscriptionKey(2027, 'bruz-sud', 'V1');
    expect(store.operationLog).toEqual([`set-if-absent ${key} ex=8859600`]);
    expect(store.values.get(key)).toBe(
      '{"firstName1":"Léa","firstName2":"Marc","lastName1":"Dupont","lastName2":"Martin"}',
    );
  });

  it('should never expose a personal name in the 201 body', async () => {
    const store = new InMemoryWriteStore();
    const response = await handleInscriptionsPost(deps(store), request(validBody()));
    const text = await response.text();

    expect(['Léa', 'Marc', 'Dupont', 'Martin'].every((name) => !text.includes(name))).toBe(true);
    expect(text).not.toContain('firstName');
    expect(text).not.toContain('lastName');
    expect(text).not.toContain('honeypot');
  });

  it('should answer 409 and store nothing when the tour is already covered', async () => {
    const store = new InMemoryWriteStore();
    const key = inscriptionKey(2027, 'bruz-sud', 'V1');
    store.values.set(key, '{"firstName1":"Premier"}');

    const response = await handleInscriptionsPost(deps(store), request(validBody()));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'inscriptions-conflict' });
    expect(store.values.get(key)).toBe('{"firstName1":"Premier"}');
    expect(store.operationLog).toEqual([`set-if-absent ${key} ex=8859600`]);
  });

  it('should arbitrate a concurrent duplicate: first come 201, second 409', async () => {
    const store = new InMemoryWriteStore();
    const first = await handleInscriptionsPost(deps(store), request(validBody()));
    const second = await handleInscriptionsPost(
      deps(store),
      request(validBody({ firstName2: 'Perdu' })),
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    const key = inscriptionKey(2027, 'bruz-sud', 'V1');
    expect(JSON.parse(store.values.get(key) ?? '{}')).toEqual({
      firstName1: 'Léa',
      firstName2: 'Marc',
      lastName1: 'Dupont',
      lastName2: 'Martin',
    });
    expect(store.operationLog).toHaveLength(2);
  });

  it('should answer 400 for an unparseable body and store nothing', async () => {
    const store = new InMemoryWriteStore();
    const raw = await handleInscriptionsPost(
      deps(store),
      new Request('http://localhost/api/inscriptions', {
        body: 'not json at all',
        method: 'POST',
      }),
    );

    expect(raw.status).toBe(400);
    await expect(raw.json()).resolves.toEqual({ error: 'invalid-inscription' });
    expect(store.operationLog).toEqual([]);
    expect(store.values.size).toBe(0);
  });

  it('should answer 400 for each invalid body shape and store nothing', async () => {
    for (const body of [
      null,
      ['array'],
      'plain text',
      42,
      validBody({ engaged: false }),
      validBody({ firstName1: '  ' }),
      validBody({ tourId: 42 }),
      validBody({ zoneId: '' }),
      validBody({ lastName2: undefined }),
      {},
    ]) {
      const store = new InMemoryWriteStore();
      const response = await handleInscriptionsPost(deps(store), request(body));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: 'invalid-inscription' });
      expect(store.values.size).toBe(0);
    }
  });

  it('should answer 500 when the store fails, without storing anything', async () => {
    const store: InscriptionsWriteStore = {
      setIfAbsent: async () => {
        throw new Error('network down');
      },
    };
    const response = await handleInscriptionsPost(
      { edition: EDITION, now: () => NOW, store },
      request(validBody()),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'inscriptions-unavailable' });
  });

  it('should keep the public GET name-free after registrations went through', async () => {
    const store = new InMemoryWriteStore();
    await handleInscriptionsPost(deps(store), request(validBody()));
    await handleInscriptionsPost(
      deps(store, new Date('2027-02-02T09:00:00Z')),
      request(validBody({ tourId: 'P3' })),
    );

    const response = await handleInscriptionsGet({
      edition: EDITION,
      now: () => NOW,
      store: { listAll: async () => store.entries() },
    });
    const clone = response.clone();
    await expect(response.json()).resolves.toEqual({
      edition: EDITION,
      inscriptions: [
        { tourId: 'P3', zoneId: 'bruz-sud' },
        { tourId: 'V1', zoneId: 'bruz-sud' },
      ],
      registrationOpen: true,
    });
    expect(await clone.text()).not.toContain('Léa');
  });
});

describe('registrationExpiresIn', () => {
  it('should count the seconds from now to the erasure deadline', () => {
    expect(registrationExpiresIn(EDITION, NOW)).toBe(8859600);
  });

  it('should never expire before being parsed (1-second floor)', () => {
    expect(registrationExpiresIn(EDITION, new Date('2030-01-01T00:00:00Z'))).toBe(1);
  });
});
