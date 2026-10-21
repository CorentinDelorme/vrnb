/**
 * Referent command: extracts the configured Édition's Inscriptions from the
 * KV store (Upstash REST) and writes the per-Zone « Fiche de suivi » markdown
 * files into a local gitignored folder — never into `public/`, never deployed
 * (they contain volunteer identities). See `scripts/README-inscriptions-extract.md`
 * for the operations runbook.
 *
 * Usage: bun scripts/extract-inscriptions.ts [--out-dir=DIR]
 *
 * Bun loads `apps/clean/.env.local` automatically when the command is launched
 * from `apps/clean`: put `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
 * there. A standard token is required: read-only tokens cannot run SCAN.
 *
 * The extraction core is pure (`scripts/inscriptions-extract.ts`): this file
 * only wires the environment, the Upstash REST store (REST reads are
 * time-boxed so a wedged call cannot freeze the run), the filesystem sink
 * and the console recap — which never prints a stored value or a name.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CURRENT_EDITION } from '../src/app/inscriptions/edition';
import { createUpstashInscriptionsStore } from '../src/app/inscriptions/upstash-kv';
import {
  type FicheFileSink,
  type InscriptionsExtractionOutcome,
  extractInscriptionSheets,
  fetchWithTimeout,
  parseInscriptionsExtractArgs,
  readInscriptionsKvConfig,
} from './inscriptions-extract';

/** Per-REST-call deadline; a stuck connection fails the run with a clear error. */
const REQUEST_TIMEOUT_MS = 10_000;

const MISSING_ENV_MESSAGE = [
  'Configuration KV manquante : renseignez UPSTASH_REDIS_REST_URL et',
  'UPSTASH_REDIS_REST_TOKEN dans apps/clean/.env.local (Bun les charge',
  'automatiquement), avec un jeton standard : les jetons en lecture seule',
  'ne peuvent pas exécuter SCAN. Voir scripts/README-inscriptions-extract.md.',
].join(' ');

/** Real filesystem sink: writes the fiches under the gitignored output folder. */
const fileSink: FicheFileSink = {
  ensureDir: async (dir) => {
    await mkdir(dir, { recursive: true });
  },
  saveFile: async (dir, fileName, content) => {
    const path = join(dir, fileName);
    await writeFile(path, content, 'utf8');
    return path;
  },
};

async function main(argv: readonly string[]): Promise<void> {
  const options = parseInscriptionsExtractArgs(argv);
  const config = readInscriptionsKvConfig(process.env);
  if (config === null) {
    throw new Error(MISSING_ENV_MESSAGE);
  }
  const store = createUpstashInscriptionsStore(
    config,
    fetchWithTimeout(globalThis.fetch, REQUEST_TIMEOUT_MS),
  );
  const outputDir =
    options.outDir ??
    join(import.meta.dirname, 'output', 'inscriptions', String(CURRENT_EDITION.year));
  const outcome: InscriptionsExtractionOutcome = await extractInscriptionSheets({
    edition: CURRENT_EDITION,
    outputDir,
    sink: fileSink,
    store,
  });

  // Recap and warnings go to the console without any personal data.
  for (const warning of outcome.warnings) {
    console.warn(`Attention : ${warning}`);
  }
  console.log(`Édition : ${CURRENT_EDITION.year}`);
  if (outcome.inscriptions.length === 0) {
    console.log(`Aucune inscription pour l'édition ${CURRENT_EDITION.year}.`);
  }
  console.log(`Fiches de suivi générées : ${outcome.fiches.length}`);
  for (const fiche of outcome.fiches) {
    console.log(
      `  - ${fiche.path} (${fiche.inscriptionCount} inscription${fiche.inscriptionCount === 1 ? '' : 's'})`,
    );
  }
  console.log(`Dossier de sortie : ${outputDir}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
