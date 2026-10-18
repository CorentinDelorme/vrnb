/**
 * Behaviour tests of the deployed Vercel entry: the Web `Request`/`Response`
 * boundary and the dependency assembly, with `fetch` and the environment
 * stubbed. The handler logic itself is covered by `server/inscriptions-handler.spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_EDITION } from '../src/app/registration/registration-config';
import { GET, POST } from './inscriptions';

const BASE_URL = 'https://eu1-example.upstash.io';
const TOKEN = 'secret-token';
const SECRET_KEY = 'turnstile-secret';
const SITE_KEY = 'turnstile-site-key';

const VALID_REQUEST = {
  zoneId: 'bruz-sud',
  tourName: 'V1',
  firstName1: 'Alice',
  lastName1: 'Martin',
  firstName2: 'Bruno',
  lastName2: 'Petit',
  commitment: true,
  captchaToken: 'captcha-token',
};

const ORIGINAL_ENV = { ...process.env };

const REDIS_ENV_NAMES = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
] as const;

function redisResponse(result: unknown): Response {
  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: string | URL | Request): string {
  return input instanceof Request ? input.url : String(input);
}

describe('/api/inscriptions entry', () => {
  beforeEach(() => {
    process.env['UPSTASH_REDIS_REST_URL'] = BASE_URL;
    process.env['UPSTASH_REDIS_REST_TOKEN'] = TOKEN;
    process.env['TURNSTILE_SECRET_KEY'] = SECRET_KEY;
    process.env['TURNSTILE_SITE_KEY'] = SITE_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('answers 400 invalid_input for a body that is not valid JSON', async () => {
    const request = new Request('http://localhost/api/inscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_input' });
  });

  it('serves the public status with Cache-Control: no-store', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request): Promise<Response> => {
      const url = requestUrl(input);
      if (url.includes('/scan/')) {
        return redisResponse(['0', []]);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/inscriptions'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      year: ACTION_EDITION.year,
      coveredTours: [],
      turnstileSiteKey: SITE_KEY,
    });
  });

  it('forwards the first x-forwarded-for entry to the captcha verifier', async () => {
    const siteverifyBodies: unknown[] = [];
    const fetchMock = vi.fn(
      async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const url = requestUrl(input);
        if (url.includes('siteverify')) {
          siteverifyBodies.push(JSON.parse(String(init?.body)));
          return jsonResponse({ success: true });
        }
        if (url.includes('/set/')) {
          return redisResponse('OK');
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost/api/inscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.7, 70.41.3.18',
        },
        body: JSON.stringify(VALID_REQUEST),
      }),
    );

    expect(response.status).toBe(201);
    expect(siteverifyBodies).toEqual([
      { secret: SECRET_KEY, response: 'captcha-token', remoteip: '203.0.113.7' },
    ]);
    await expect(response.json()).resolves.toEqual({
      year: ACTION_EDITION.year,
      zoneId: 'bruz-sud',
      tourName: 'V1',
    });
  });

  it('answers a clean JSON 500 when the environment is missing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const name of REDIS_ENV_NAMES) {
      delete process.env[name];
    }

    const response = await GET(new Request('http://localhost/api/inscriptions'));

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      error: 'server_error',
      message: 'Une erreur est survenue, merci de réessayer plus tard.',
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
