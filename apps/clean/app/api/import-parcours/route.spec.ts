import type { SpawnSyncOptions, SpawnSyncReturns } from 'child_process';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mockedMkdir = vi.hoisted(() => vi.fn());
const mockedReaddir = vi.hoisted(() => vi.fn());
const mockedWriteFile = vi.hoisted(() => vi.fn());
const mockedSpawnSync = vi.hoisted(() =>
  vi.fn<
    (
      command: string,
      args: readonly string[] | undefined,
      options: SpawnSyncOptions | undefined,
    ) => SpawnSyncReturns<string>
  >(),
);

vi.mock('fs/promises', () => ({
  mkdir: mockedMkdir,
  readdir: mockedReaddir,
  writeFile: mockedWriteFile,
}));

vi.mock('child_process', () => ({
  spawnSync: mockedSpawnSync,
}));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

/** Builds a Request whose `formData()` returns the given FormData directly. */
function stubRequest(formData: FormData): Request {
  return { formData: () => Promise.resolve(formData) } as unknown as Request;
}

function postRequest(formData: FormData): Request {
  return stubRequest(formData);
}

/** Calls `POST` and returns its `Response` (the route answers 404 directly). */
async function callPost(request: Request): Promise<Response> {
  return await POST(request);
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

function scriptPath(file: string): string {
  return join(process.cwd(), 'scripts', file);
}

function scriptLabelOf(args: readonly string[] | undefined): string {
  const script = args?.[1] ?? '';
  if (script.includes('generate-start-end-gpx')) return 'generate:routes';
  if (script.includes('generate-tours')) return 'generate:tours';
  return 'generate:pdfs';
}

beforeEach(() => {
  mockedMkdir.mockResolvedValue(undefined);
  mockedReaddir.mockResolvedValue([]);
  mockedWriteFile.mockResolvedValue(undefined);
  mockedSpawnSync.mockImplementation((_command, args) => {
    const label = scriptLabelOf(args);
    return {
      pid: 1,
      output: [`stdout-${label}`, `stderr-${label}`],
      stdout: `stdout-${label}`,
      stderr: `stderr-${label}`,
      status: 0,
      signal: null,
      error: undefined,
    };
  });
  mockedMkdir.mockClear();
  mockedReaddir.mockClear();
  mockedWriteFile.mockClear();
  mockedSpawnSync.mockClear();
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

  it('returns 400 when zoneId is missing and launches no generation script', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['practiceType', 'V'],
            ['files', gpxFile('<gpx/>')],
          ]),
        ),
      ),
    );
    expect(response.status).toBe(400);
    expect(mockedSpawnSync).not.toHaveBeenCalled();
  });

  it('returns 400 when practiceType is invalid', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['zoneId', 'bruz-sud'],
            ['practiceType', 'X'],
            ['files', gpxFile('<gpx/>')],
          ]),
        ),
      ),
    );
    expect(response.status).toBe(400);
    expect(mockedSpawnSync).not.toHaveBeenCalled();
  });

  it('returns 400 when no GPX file is provided', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['zoneId', 'bruz-sud'],
            ['practiceType', 'V'],
          ]),
        ),
      ),
    );
    expect(response.status).toBe(400);
    expect(mockedSpawnSync).not.toHaveBeenCalled();
  });

  it('assigns the next free V id (bruz-sud → V16) and writes one GPX file', async () => {
    const file = gpxFile('<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>');
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['zoneId', 'bruz-sud'],
            ['practiceType', 'V'],
            ['files', file],
          ]),
        ),
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ids: ['V16'] });
    expect(mockedMkdir).toHaveBeenCalledTimes(1);
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    expect(mockedWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('bruz-sud/V16/V16.gpx'),
      '<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>',
    );
  });

  it('assigns the next free P id (bruz-sud → P14)', async () => {
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['zoneId', 'bruz-sud'],
            ['practiceType', 'P'],
            ['files', gpxFile('<gpx/>')],
          ]),
        ),
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ids: ['P14'] });
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
    expect(await response.json()).toMatchObject({ ids: ['V16', 'V17', 'V18'] });
    expect(mockedWriteFile).toHaveBeenCalledTimes(3);
  });

  it('launches generate:routes, generate:tours and generate:pdfs sequentially, filtered on zone and ids', async () => {
    const file = gpxFile('<gpx/>');
    await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['zoneId', 'bruz-sud'],
            ['practiceType', 'V'],
            ['files', file],
          ]),
        ),
      ),
    );
    expect(mockedSpawnSync).toHaveBeenCalledTimes(3);

    const expectedArgs = (fileName: string): readonly string[] => [
      'tsx',
      scriptPath(fileName),
      '--zone=bruz-sud',
      '--tour=V16',
    ];
    const expectedOptions = { cwd: process.cwd(), encoding: 'utf8' };

    expect(mockedSpawnSync).toHaveBeenNthCalledWith(
      1,
      'bun',
      expectedArgs('generate-start-end-gpx.ts'),
      expectedOptions,
    );
    expect(mockedSpawnSync).toHaveBeenNthCalledWith(
      2,
      'bun',
      expectedArgs('generate-tours.ts'),
      expectedOptions,
    );
    expect(mockedSpawnSync).toHaveBeenNthCalledWith(
      3,
      'bun',
      expectedArgs('generate-pdfs.ts'),
      expectedOptions,
    );
  });

  it('passes the comma-joined ids of every imported file as --tour', async () => {
    await withNodeEnv('development', () =>
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
    expect(mockedSpawnSync).toHaveBeenCalledTimes(3);
    expect(mockedSpawnSync.mock.calls[0]?.[1]).toEqual([
      'tsx',
      scriptPath('generate-start-end-gpx.ts'),
      '--zone=bruz-sud',
      '--tour=V16,V17,V18',
    ]);
  });

  it('returns the aggregated stdout and stderr of each script in the response JSON', async () => {
    const file = gpxFile('<gpx/>');
    const response = await withNodeEnv('development', () =>
      callPost(
        postRequest(
          formData([
            ['zoneId', 'bruz-sud'],
            ['practiceType', 'V'],
            ['files', file],
          ]),
        ),
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ids: ['V16'],
      logs: {
        'generate:routes': {
          stdout: 'stdout-generate:routes',
          stderr: 'stderr-generate:routes',
          ok: true,
        },
        'generate:tours': {
          stdout: 'stdout-generate:tours',
          stderr: 'stderr-generate:tours',
          ok: true,
        },
        'generate:pdfs': {
          stdout: 'stdout-generate:pdfs',
          stderr: 'stderr-generate:pdfs',
          ok: true,
        },
      },
    });
  });
});
