import { describe, expect, it, vi } from 'vitest';

import type { ActionEdition } from '../src/app/registration/registration-config';
import type {
  RegistrationErrorResponse,
  RegistrationRecord,
  RegistrationStatusResponse,
} from '../src/app/registration/registration-contract';
import {
  IDENTITY_FIELD_MAX_LENGTH,
  registrationKey,
} from '../src/app/registration/registration-contract';

import type { CaptchaVerifier, HandlerDeps, RegistrationStore } from './inscriptions-handler';
import { handleInscriptions } from './inscriptions-handler';

/** In-memory store whose `setIfAbsent` enforces the first-come rule. */
class InMemoryRegistrationStore implements RegistrationStore {
  readonly entries = new Map<string, RegistrationRecord>();
  readonly operationLog: string[];
  setError: Error | undefined;
  listError: Error | undefined;

  constructor(operationLog: string[] = []) {
    this.operationLog = operationLog;
  }

  async setIfAbsent(key: string, record: RegistrationRecord): Promise<boolean> {
    this.operationLog.push('store.setIfAbsent');
    if (this.setError) {
      throw this.setError;
    }
    if (this.entries.has(key)) {
      return false;
    }
    this.entries.set(key, record);
    return true;
  }

  async list(prefix: string): Promise<RegistrationRecord[]> {
    this.operationLog.push(`store.list:${prefix}`);
    if (this.listError) {
      throw this.listError;
    }
    return [...this.entries].filter(([key]) => key.startsWith(prefix)).map(([, record]) => record);
  }
}

/** Captcha port fake: accepts or rejects every token, per test. */
class FakeCaptchaVerifier implements CaptchaVerifier {
  accepted = true;
  error: Error | undefined;
  readonly calls: Array<{ token: string; remoteIp: string | undefined }> = [];
  readonly operationLog: string[];

  constructor(operationLog: string[] = []) {
    this.operationLog = operationLog;
  }

  async verify(token: string, remoteIp: string | undefined): Promise<boolean> {
    this.operationLog.push('captcha.verify');
    this.calls.push({ token, remoteIp });
    if (this.error) {
      throw this.error;
    }
    return this.accepted;
  }
}

const TEST_EDITION: ActionEdition = { year: 2027, actionDate: '2027-02-14' };

interface TestContext {
  readonly store: InMemoryRegistrationStore;
  readonly captcha: FakeCaptchaVerifier;
  readonly deps: HandlerDeps;
  readonly log: string[];
}

/** Open registration window by default: mid-January, well before the action. */
function createContext(now = new Date('2027-01-10T12:00:00Z')): TestContext {
  const log: string[] = [];
  const store = new InMemoryRegistrationStore(log);
  const captcha = new FakeCaptchaVerifier(log);
  const deps: HandlerDeps = {
    store,
    captcha,
    siteKey: 'test-site-key',
    edition: TEST_EDITION,
    now: () => now,
  };
  return { store, captcha, deps, log };
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    zoneId: 'bruz-sud',
    tourName: 'V1',
    firstName1: 'Ada',
    lastName1: 'Lovelace',
    firstName2: 'Alan',
    lastName2: 'Turing',
    commitment: true,
    captchaToken: 'turnstile-token',
    ...overrides,
  };
}

function withoutField(field: string): Record<string, unknown> {
  const body = validBody();
  delete body[field];
  return body;
}

const IDENTITY_RECORD: RegistrationRecord = {
  firstName1: 'Ada',
  lastName1: 'Lovelace',
  firstName2: 'Alan',
  lastName2: 'Turing',
  year: 2027,
  zoneId: 'bruz-sud',
  tourName: 'V1',
};

describe('handleInscriptions POST', () => {
  it('creates the registration and returns its public context', async () => {
    const { deps, store } = createContext();

    const result = await handleInscriptions({ method: 'POST', body: validBody() }, deps);

    expect(result.status).toBe(201);
    expect(result.body).toEqual({ year: 2027, zoneId: 'bruz-sud', tourName: 'V1' });

    const key = 'inscriptions:2027:bruz-sud:V1';
    expect(key).toBe(registrationKey(2027, 'bruz-sud', 'V1'));
    expect([...store.entries.keys()]).toEqual([key]);
    const record = store.entries.get(key);
    expect(record).toEqual(IDENTITY_RECORD);
    expect(Object.keys(record ?? {}).sort()).toEqual([
      'firstName1',
      'firstName2',
      'lastName1',
      'lastName2',
      'tourName',
      'year',
      'zoneId',
    ]);
  });

  it('trims identity fields and stores nothing beyond the seven record fields', async () => {
    const { deps, store } = createContext();

    const result = await handleInscriptions(
      {
        method: 'POST',
        body: validBody({
          firstName1: '  Ada  ',
          lastName2: ' Turing ',
          email: 'ada@example.org',
          phone: '0600000000',
          createdAt: '2027-01-10T12:00:00Z',
        }),
      },
      deps,
    );

    expect(result.status).toBe(201);
    const record = store.entries.get('inscriptions:2027:bruz-sud:V1');
    expect(record).toEqual(IDENTITY_RECORD);
    expect(Object.keys(record ?? {})).toHaveLength(7);
  });

  it('accepts identity fields of exactly the maximum length', async () => {
    const { deps } = createContext();

    const result = await handleInscriptions(
      {
        method: 'POST',
        body: validBody({
          firstName1: 'a'.repeat(IDENTITY_FIELD_MAX_LENGTH),
          lastName1: 'b'.repeat(IDENTITY_FIELD_MAX_LENGTH),
        }),
      },
      deps,
    );

    expect(result.status).toBe(201);
  });

  it('accepts a zone and tour pair from another zone', async () => {
    const { deps, store } = createContext();

    const result = await handleInscriptions(
      { method: 'POST', body: validBody({ zoneId: 'bruz-vau-gaillard', tourName: 'V20' }) },
      deps,
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual({ year: 2027, zoneId: 'bruz-vau-gaillard', tourName: 'V20' });
    expect([...store.entries.keys()]).toEqual(['inscriptions:2027:bruz-vau-gaillard:V20']);
  });

  it('grants the tour to the first of two concurrent binomes only', async () => {
    const { deps, store } = createContext();

    const [first, second] = await Promise.all([
      handleInscriptions({ method: 'POST', body: validBody({ firstName1: 'Ada' }) }, deps),
      handleInscriptions(
        { method: 'POST', body: validBody({ firstName1: 'Grace', lastName1: 'Hopper' }) },
        deps,
      ),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body).toEqual({
      error: 'already_registered',
      message: "Ce parcours vient d'être réservé par un autre binôme.",
    });
    expect(store.entries.size).toBe(1);
    expect(store.entries.get('inscriptions:2027:bruz-sud:V1')?.firstName1).toBe('Ada');
  });

  it('verifies the captcha before writing to the store', async () => {
    const { deps, log } = createContext();

    const result = await handleInscriptions({ method: 'POST', body: validBody() }, deps);

    expect(result.status).toBe(201);
    expect(log).toEqual(['captcha.verify', 'store.setIfAbsent']);
  });

  it('rejects a refused captcha with captcha_failed before touching the store', async () => {
    const { deps, store, captcha, log } = createContext();
    captcha.accepted = false;

    const result = await handleInscriptions(
      { method: 'POST', body: validBody(), remoteIp: '203.0.113.7' },
      deps,
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      error: 'captcha_failed',
      message: 'Captcha invalide, merci de réessayer.',
    });
    expect(store.entries.size).toBe(0);
    expect(log).toEqual(['captcha.verify']);
    expect(captcha.calls).toEqual([{ token: 'turnstile-token', remoteIp: '203.0.113.7' }]);
  });

  it('rejects a registration once the action day is over', async () => {
    const { deps, store, log } = createContext(new Date('2027-02-15T10:00:00Z'));

    const result = await handleInscriptions({ method: 'POST', body: validBody() }, deps);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'closed', message: 'Les inscriptions sont closes.' });
    expect(store.entries.size).toBe(0);
    // The captcha is verified before the window check; the window then blocks the write.
    expect(log).toEqual(['captcha.verify']);
  });

  it('accepts a registration during the action day itself (Paris time)', async () => {
    // 23:59 on the action day in Paris (UTC+1 in February).
    const { deps, log } = createContext(new Date('2027-02-14T22:59:00Z'));

    const result = await handleInscriptions({ method: 'POST', body: validBody() }, deps);

    expect(result.status).toBe(201);
    expect(log).toEqual(['captcha.verify', 'store.setIfAbsent']);
  });

  it('rejects a registration just after Paris midnight, one minute past the action day', async () => {
    // 00:01 the day after the action in Paris.
    const { deps, store } = createContext(new Date('2027-02-14T23:01:00Z'));

    const result = await handleInscriptions({ method: 'POST', body: validBody() }, deps);

    expect(result.status).toBe(400);
    expect((result.body as RegistrationErrorResponse).error).toBe('closed');
    expect(store.entries.size).toBe(0);
  });

  it('returns already_registered when the tour was taken meanwhile', async () => {
    const { deps, store } = createContext();

    const first = await handleInscriptions({ method: 'POST', body: validBody() }, deps);
    const second = await handleInscriptions(
      { method: 'POST', body: validBody({ firstName1: 'Grace' }) },
      deps,
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(store.entries.size).toBe(1);
    expect(store.entries.get('inscriptions:2027:bruz-sud:V1')?.firstName1).toBe('Ada');
  });

  const invalidInputBody: RegistrationErrorResponse = {
    error: 'invalid_input',
    message: 'Merci de vérifier les champs saisis.',
  };

  const invalidBodies: ReadonlyArray<readonly [description: string, body: unknown]> = [
    ['a missing identity field', withoutField('firstName1')],
    ['an identity field with only whitespace', validBody({ lastName2: '   ' })],
    [
      'an identity field longer than the maximum',
      validBody({ firstName2: 'a'.repeat(IDENTITY_FIELD_MAX_LENGTH + 1) }),
    ],
    ['a non-string identity field', validBody({ lastName1: 42 })],
    ['a missing commitment', withoutField('commitment')],
    ['a commitment that is not confirmed', validBody({ commitment: false })],
    ['a non-boolean commitment', validBody({ commitment: 'true' })],
    ['an unknown tour name', validBody({ tourName: 'V99' })],
    ['an unknown zone', validBody({ zoneId: 'unknown-zone' })],
    [
      'a zone and tour pair that does not exist',
      validBody({ zoneId: 'bruz-vau-gaillard', tourName: 'V1' }),
    ],
    ['a non-string zone', validBody({ zoneId: 42 })],
    ['a missing captcha token', withoutField('captchaToken')],
    ['a non-string captcha token', validBody({ captchaToken: 123 })],
    ['a string body', 'not-an-object'],
    ['a null body', null],
    ['an array body', [validBody()]],
    ['an undefined body', undefined],
  ];

  for (const [description, body] of invalidBodies) {
    it(`rejects ${description} with invalid_input and never touches the store or the captcha`, async () => {
      const { deps, store, captcha, log } = createContext();

      const result = await handleInscriptions({ method: 'POST', body }, deps);

      expect(result.status).toBe(400);
      expect(result.body).toEqual(invalidInputBody);
      expect(store.entries.size).toBe(0);
      expect(captcha.calls).toHaveLength(0);
      expect(log).toEqual([]);
    });
  }
});

describe('handleInscriptions GET', () => {
  it('lists the covered tours of the current edition without any personal data', async () => {
    const { deps, store } = createContext();
    store.entries.set('inscriptions:2027:bruz-sud:V1', IDENTITY_RECORD);
    store.entries.set('inscriptions:2027:bruz-vau-gaillard:V20', {
      firstName1: 'Grace',
      lastName1: 'Hopper',
      firstName2: 'Jean',
      lastName2: 'Bartik',
      year: 2027,
      zoneId: 'bruz-vau-gaillard',
      tourName: 'V20',
    });
    store.entries.set('inscriptions:2026:bruz-sud:V9', {
      firstName1: 'Margaret',
      lastName1: 'Hamilton',
      firstName2: 'Katherine',
      lastName2: 'Johnson',
      year: 2026,
      zoneId: 'bruz-sud',
      tourName: 'V9',
    });

    const result = await handleInscriptions({ method: 'GET' }, deps);

    expect(result.status).toBe(200);
    expect(store.operationLog).toContain('store.list:inscriptions:2027:');
    const body = result.body as RegistrationStatusResponse;
    expect(body).toEqual({
      year: 2027,
      coveredTours: [
        { zoneId: 'bruz-sud', tourName: 'V1' },
        { zoneId: 'bruz-vau-gaillard', tourName: 'V20' },
      ],
      turnstileSiteKey: 'test-site-key',
    });

    const serialized = JSON.stringify(result.body);
    for (const personalValue of [
      'Ada',
      'Lovelace',
      'Turing',
      'Grace',
      'Hopper',
      'Bartik',
      'Jean',
    ]) {
      expect(serialized).not.toContain(personalValue);
    }
    for (const covered of body.coveredTours) {
      expect(Object.keys(covered).sort()).toEqual(['tourName', 'zoneId']);
    }
  });

  it('returns an empty list when no tour is covered', async () => {
    const { deps } = createContext();

    const result = await handleInscriptions({ method: 'GET' }, deps);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      year: 2027,
      coveredTours: [],
      turnstileSiteKey: 'test-site-key',
    });
  });
});

describe('handleInscriptions failures', () => {
  it('returns a clean server_error when the store write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { deps, store } = createContext();
    store.setError = new Error('boom: Ada Lovelace at inscriptions:2027:bruz-sud:V1');

    const result = await handleInscriptions({ method: 'POST', body: validBody() }, deps);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      error: 'server_error',
      message: 'Une erreur est survenue, merci de réessayer plus tard.',
    });
    const serialized = JSON.stringify(result.body);
    expect(serialized).not.toContain('boom');
    expect(serialized).not.toContain('Lovelace');
    expect(serialized).not.toContain('stack');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('returns a clean server_error when the captcha verifier fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { deps, captcha, store } = createContext();
    captcha.error = new Error('siteverify unreachable');

    const result = await handleInscriptions({ method: 'POST', body: validBody() }, deps);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      error: 'server_error',
      message: 'Une erreur est survenue, merci de réessayer plus tard.',
    });
    expect(store.entries.size).toBe(0);
    expect(JSON.stringify(result.body)).not.toContain('siteverify');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('returns a clean server_error when the store read fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { deps, store } = createContext();
    store.listError = new Error('connection reset');

    const result = await handleInscriptions({ method: 'GET' }, deps);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      error: 'server_error',
      message: 'Une erreur est survenue, merci de réessayer plus tard.',
    });
    expect(JSON.stringify(result.body)).not.toContain('connection reset');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
