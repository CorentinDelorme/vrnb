/**
 * CLI-side helpers of the referent extraction command — the concerns that
 * belong to the command line, not to the pure extraction core
 * (`scripts/inscriptions-extract.ts`): the option parsing and the REST
 * timeout wrapper. The KV credentials are read by the shared
 * `readUpstashConfig` of `src/app/inscriptions/upstash-kv.ts` (the same
 * reader as the API route), so the env var names live in one place only.
 *
 * Pure module (no `process.env`, no `node:fs`): the CLI wires the real
 * environment, and the unit suite checks these helpers without any process.
 */

import type { RestFetch } from '../src/app/inscriptions/upstash-kv';

/** Parsed `--out-dir=DIR` options of the extraction command. */
export interface ExtractedCliArgs {
  readonly outDir: string | null;
}

const OUT_DIR_FLAG = '--out-dir=';
/** Usage line printed verbatim in the unknown-argument error. */
export const EXTRACT_USAGE = 'Usage : bun scripts/extract-inscriptions.ts [--out-dir=DIR]';

/** Parse the CLI options; only `--out-dir` is overridable, the Édition defines the year. */
export function parseInscriptionsExtractArgs(argv: readonly string[]): ExtractedCliArgs {
  let outDir: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith(OUT_DIR_FLAG)) {
      const value = arg.slice(OUT_DIR_FLAG.length).trim();
      if (outDir !== null) {
        throw new Error(`Option --out-dir dupliquée. ${EXTRACT_USAGE}`);
      }
      if (!value) {
        throw new Error(`Option --out-dir vide (dossier de sortie attendu). ${EXTRACT_USAGE}`);
      }
      outDir = value;
      continue;
    }
    throw new Error(`Argument inconnu : « ${arg} ». ${EXTRACT_USAGE}`);
  }
  return { outDir };
}

/**
 * Fetch with a hard timeout: the Upstash REST adapter has no per-command
 * deadline of its own (ticket #16 reuse), so the CLI wraps its injected
 * fetch — a wedged REST call (dropped connection, stalled proxy) aborts the
 * extraction with a controlled error instead of freezing it forever.
 */
export function fetchWithTimeout(restFetch: RestFetch, timeoutMs: number): RestFetch {
  return (input, init) => restFetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
