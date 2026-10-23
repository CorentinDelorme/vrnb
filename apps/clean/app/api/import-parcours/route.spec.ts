import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

function postRequest(body?: BodyInit): Request {
  return new Request('http://localhost/api/import-parcours', {
    method: 'POST',
    body,
  });
}

/** Calls `POST` and converts a `notFound()` throw into a 404 Response, as Next.js does. */
async function callPost(request: Request): Promise<Response> {
  try {
    return await POST(request);
  } catch {
    return new Response(null, { status: 404 });
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/import-parcours', () => {
  it('returns 404 when NODE_ENV is not development', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await callPost(postRequest());
    expect(response.status).toBe(404);
  });

  it('returns 404 when NODE_ENV is test (default vitest value)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const response = await callPost(postRequest());
    expect(response.status).toBe(404);
  });

  it('returns 200 and an empty JSON when NODE_ENV is development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const response = await callPost(postRequest(new FormData()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
  });

  it('accepts a FormData with GPX files and zoneId', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const formData = new FormData();
    formData.set('zoneId', 'bruz-sud');
    formData.set('gpx', '<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>');
    const response = await callPost(postRequest(formData));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
  });
});
