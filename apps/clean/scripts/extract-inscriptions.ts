/**
 * Referent command: extracts the configured Édition's Inscriptions from the
 * KV store (Upstash REST) and writes the per-Zone « Suivi » PDF sheets into a
 * local gitignored folder — never into `public/`, never committed, never
 * deployed (they carry the volunteers' names). See
 * `scripts/README-inscriptions-extract.md` for the operations runbook.
 *
 * Usage: bun scripts/extract-inscriptions.ts [--out-dir=DIR]
 *
 * Bun loads `apps/clean/.env.local` automatically when the command is launched
 * from `apps/clean`: put `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
 * there. A standard token is required: read-only tokens cannot run SCAN.
 *
 * The extraction core is pure (`scripts/inscriptions-extract.ts`): this file
 * only wires the environment, the Upstash REST store (REST reads are
 * time-boxed so a wedged call cannot freeze the run), the PDF renderer
 * (`scripts/suivi-pdf.ts`), the filesystem sink and the console recap — which
 * never prints a stored value or a name. The CLI-side helpers (option parsing,
 * REST timeout) live in `scripts/extract-inscriptions-cli.ts`, and the KV
 * credentials are read by the shared `readUpstashConfig` of
 * `src/app/inscriptions/upstash-kv.ts`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CURRENT_EDITION } from '../src/app/inscriptions/edition';
import {
  createUpstashInscriptionsStore,
  readUpstashConfig,
} from '../src/app/inscriptions/upstash-kv';
import { toursData } from '../src/app/tours-data';
import { parcoursExists } from '../src/app/tours-queries';
import { fetchWithTimeout, parseInscriptionsExtractArgs } from './extract-inscriptions-cli';
import {
  type CatalogueTour,
  type InscriptionsExtractionOutcome,
  type SuiviSheet,
  type SuiviSheetSink,
  extractSuiviSheets,
} from './inscriptions-extract';
import { renderSuiviSheetPdf } from './suivi-pdf';

/** Per-REST-call deadline; a stuck connection fails the run with a clear error. */
const REQUEST_TIMEOUT_MS = 10_000;

const MISSING_ENV_MESSAGE = [
  'Configuration KV manquante : renseignez UPSTASH_REDIS_REST_URL et',
  'UPSTASH_REDIS_REST_TOKEN dans apps/clean/.env.local (Bun les charge',
  'automatiquement), avec un jeton standard : les jetons en lecture seule',
  'ne peuvent pas exécuter SCAN. Voir scripts/README-inscriptions-extract.md.',
].join(' ');

/** The catalogue of the Parcours, in the order of the generated data. */
const CATALOGUE: readonly CatalogueTour[] = [
  ...toursData.vTours.map((tour) => ({
    practice: 'V' as const,
    tourId: tour.name,
    zoneId: tour.zoneId,
  })),
  ...toursData.pTours.map((tour) => ({
    practice: 'P' as const,
    tourId: tour.name,
    zoneId: tour.zoneId,
  })),
];

/** Real filesystem sink: renders the sheet as a PDF and writes it. */
const sheetSink: SuiviSheetSink = {
  ensureDir: async (dir) => {
    await mkdir(dir, { recursive: true });
  },
  saveSheet: async (dir, sheet: SuiviSheet) => {
    const path = join(dir, sheet.fileName);
    await writeFile(path, renderSuiviSheetPdf(sheet));
    return path;
  },
};

async function main(argv: readonly string[]): Promise<void> {
  const options = parseInscriptionsExtractArgs(argv);
  const config = readUpstashConfig(process.env);
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
  const outcome: InscriptionsExtractionOutcome = await extractSuiviSheets({
    edition: CURRENT_EDITION,
    outputDir,
    parcours: parcoursExists,
    sink: sheetSink,
    store,
    tours: CATALOGUE,
  });

  // Recap and warnings go to the console without any personal data.
  for (const warning of outcome.warnings) {
    console.warn(`Attention : ${warning}`);
  }
  console.log(`Édition : ${CURRENT_EDITION.year}`);
  if (outcome.inscriptions.length === 0) {
    console.log(`Aucune inscription pour l'édition ${CURRENT_EDITION.year}.`);
  }
  if (outcome.unknownParcoursCount > 0) {
    console.log(
      `Paires (Zone, Parcours) inconnues du catalogue ignorées : ${outcome.unknownParcoursCount}`,
    );
  }
  console.log(`Suivi générés : ${outcome.sheets.length}`);
  for (const sheet of outcome.sheets) {
    console.log(
      `  - ${sheet.path} (${sheet.inscriptionCount} binôme${sheet.inscriptionCount === 1 ? '' : 's'})`,
    );
  }
  console.log(`Dossier de sortie : ${outputDir}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
