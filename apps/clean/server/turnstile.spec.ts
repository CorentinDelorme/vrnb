import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTurnstileVerifier } from './turnstile';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SECRET = 'turnstile-secret';

function createFetchMock() {
  return vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();
}

function siteverifyResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createTurnstileVerifier', () => {
  it('returns true when siteverify accepts the token', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(siteverifyResponse({ success: true, hostname: 'vrnb.org' }));

    const verifier = createTurnstileVerifier({ TURNSTILE_SECRET_KEY: SECRET });
    const verified = await verifier.verify('token-value', '203.0.113.7');

    expect(verified).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toEqual({
      secret: SECRET,
      response: 'token-value',
      remoteip: '203.0.113.7',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns false when siteverify rejects the token', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(
      siteverifyResponse({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    );

    const verifier = createTurnstileVerifier({ TURNSTILE_SECRET_KEY: SECRET });

    await expect(verifier.verify('spent-token', undefined)).resolves.toBe(false);
  });

  it('returns false when the payload carries no success flag', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(siteverifyResponse({}));

    const verifier = createTurnstileVerifier({ TURNSTILE_SECRET_KEY: SECRET });

    await expect(verifier.verify('token-value', undefined)).resolves.toBe(false);
  });

  it('omits the remoteip when it is unknown', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(siteverifyResponse({ success: true }));

    const verifier = createTurnstileVerifier({ TURNSTILE_SECRET_KEY: SECRET });
    await verifier.verify('token-value', undefined);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      secret: SECRET,
      response: 'token-value',
    });
  });

  it('throws on an HTTP failure', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(siteverifyResponse({ error: 'boom' }, 500));

    const verifier = createTurnstileVerifier({ TURNSTILE_SECRET_KEY: SECRET });

    await expect(verifier.verify('token-value', undefined)).rejects.toThrow(/500/);
  });

  it('throws on a network failure', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    const verifier = createTurnstileVerifier({ TURNSTILE_SECRET_KEY: SECRET });

    await expect(verifier.verify('token-value', undefined)).rejects.toThrow(/fetch failed/);
  });

  it('throws when the secret is missing, without calling siteverify', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    // Creating the verifier stays lazy so GET /api/inscriptions keeps working
    // when the captcha is not configured; the failure surfaces on verification.
    const verifier = createTurnstileVerifier({});

    await expect(verifier.verify('token-value', undefined)).rejects.toThrow(/TURNSTILE_SECRET_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
