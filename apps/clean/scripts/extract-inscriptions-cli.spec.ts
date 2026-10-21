import { describe, expect, it } from 'vitest';

import {
  EXTRACT_USAGE,
  fetchWithTimeout,
  parseInscriptionsExtractArgs,
} from './extract-inscriptions-cli';

/**
 * CLI-side helpers of the referent extraction command (ticket #19): the
 * `--out-dir` option parsing and the REST timeout wrapper. They live next to
 * the CLI, out of the pure extraction core, and are checked without any
 * process (no `process.env`, no `node:fs`).
 */

describe('parseInscriptionsExtractArgs', () => {
  it('should keep the default output directory when no option is given', () => {
    expect(parseInscriptionsExtractArgs([])).toEqual({ outDir: null });
  });

  it('should read a single --out-dir override', () => {
    expect(parseInscriptionsExtractArgs(['--out-dir=/tmp/fiches'])).toEqual({
      outDir: '/tmp/fiches',
    });
  });

  it('should refuse a duplicate, empty or unknown argument with the usage line', () => {
    expect(() => parseInscriptionsExtractArgs(['--out-dir=a', '--out-dir=b'])).toThrow(
      '--out-dir dupliquée',
    );
    expect(() => parseInscriptionsExtractArgs(['--out-dir='])).toThrow('--out-dir vide');
    expect(() => parseInscriptionsExtractArgs(['--year=2030'])).toThrow(EXTRACT_USAGE);
  });
});

describe('fetchWithTimeout', () => {
  it('should wrap every REST call with an abort deadline, keeping the input and init', async () => {
    const seen: { init?: RequestInit; url: string }[] = [];
    const base = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      seen.push({ init, url: String(input) });
      return new Response('{"result":null}');
    }) as typeof fetch;
    const wrapped = fetchWithTimeout(base, 1234);

    await wrapped('https://rest.example/scan/0/count/100', {
      headers: { authorization: 'Bearer t' },
    });
    expect(seen[0]?.url).toBe('https://rest.example/scan/0/count/100');
    expect(seen[0]?.init?.signal).toBeDefined();
    expect(new Headers(seen[0]?.init?.headers).get('authorization')).toBe('Bearer t');
  });
});
