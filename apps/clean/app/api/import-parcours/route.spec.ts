import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mockedMkdir = vi.hoisted(() => vi.fn());
const mockedReaddir = vi.hoisted(() => vi.fn());
const mockedWriteFile = vi.hoisted(() => vi.fn());

vi.mock('fs/promises', () => ({
  mkdir: mockedMkdir,
  readdir: mockedReaddir,
  writeFile: mockedWriteFile,
}));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

/** Builds a Request whose `formData()` returns the given FormData directly.
 *
 * Using `new Request({ body: formData })` would route through undici's
 * multipart parser, which rejects `File` instances created in this jsdom
 * environment (`webidl.is.File` realm mismatch). Stubbing `formData()` avoids
 * that and keeps the test focused on the route handler.
 */
function stubRequest(formData: FormData): Request {
  return { formData: () => Promise.resolve(formData) } as unknown as Request;
}

function postRequest(formData: FormData): Request {
  return stubRequest(formData);
}

/** Calls `POST` and converts a `notFound()` throw into a 404 Response, as Next.js does. */
async function callPost(request: Request): Promise<Response> {
  try {
    return await POST(request);
  } catch {
    return new Response(null, { status: 404 });
  }
}

function gpxFile(content: string): File {
  return new File([content], 'trace.gpx', { type: 'application/gpx+xml' });
}

function formData(entries: Array<[string, string | File]>): FormData {
  const formData = new FormData();
  for (const [name, value] of entries) {
    formData.append(name, value);
  }
  return formData;
}

function withNodeEnv(value: string, fn: () => Promise<Response>): Promise<Response> {
  setNodeEnv(value);
  return fn().finally(() => {
    setNodeEnv(ORIGINAL_NODE_ENV);
  });
}

beforeEach(() => {
  mockedMkdir.mockResolvedValue(undefined);
  mockedReaddir.mockResolvedValue([]);
  mockedWriteFile.mockResolvedValue(undefined);
  mockedMkdir.mockClear();
  mockedReaddir.mockClear();
  mockedWriteFile.mockClear();
});

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe('POST /api/import-parcours', () => {
  it('returns 404 when NODE_ENV is not development', async () => {
    const response = await withNodeEnv('production', () => callPost(postRequest(formData([]))));
    expect(response.status).toBe(404);
  });

  it('returns 404 when NODE_ENV is test (default vitest value)', async () => {
    const response = await withNodeEnv('test', () => callPost(postRequest(formData([]))));
    expect(response.status).toBe(404);
  });

  it('returns 400 when zoneId is missing', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(postRequest(formData([['practiceType', 'V'], ['files', gpxFile('<gpx/>')]]))),
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when practiceType is invalid', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(formData([['zoneId', 'bruz-sud'], ['practiceType', 'X'], ['files', gpxFile('<gpx/>')]])),
      ),
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when no GPX file is provided', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(postRequest(formData([['zoneId', 'bruz-sud'], ['practiceType', 'V']]))),
    );
    expect(response.status).toBe(400);
  });

  it('assigns the next free V id (bruz-sud → V16) and writes one GPX file', async () => {
    const file = gpxFile('<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>');
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(formData([['zoneId', 'bruz-sud'], ['practiceType', 'V'], ['files', file]])),
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ids: ['V16'] });
    expect(mockedMkdir).toHaveBeenCalledTimes(1);
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    expect(mockedWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('bruz-sud/V16/V16.gpx'),
      '<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>',
    );
  });

  it('assigns the next free P id (bruz-sud → P14)', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(postRequest(formData([['zoneId', 'bruz-sud'], ['practiceType', 'P'], ['files', gpxFile('<gpx/>')]]))),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ids: ['P14'] });
  });

  it('assigns sequential ids to multiple uploaded files', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['zoneId', 'bruz-sud'],
            ['practiceType', 'V'],
            ['files', gpxFile('<gpx/>')],
            ['files', gpxFile('<gpx/>')],
            ['files', gpxFile('<gpx/>')],
          ]),
        ),
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ids: ['V16', 'V17', 'V18'] });
    expect(mockedWriteFile).toHaveBeenCalledTimes(3);
  });
});
