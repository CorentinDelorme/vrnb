import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

import { ZONES } from '../src/app/zones';

import {
  errorMessage,
  matchesZoneFilter,
  parseGenerationFilters,
  perfReportPath,
  writePerfReport,
  zonePackFiles,
  zonePackParcours,
} from './generation-helpers';
import type { PerfRecorder } from './generation-perf';
import {
  buildPerfReport,
  countersFromIds,
  createPerfRecorder,
  formatPerfReport,
} from './generation-perf';

const rootDir = join(import.meta.dirname, '..');

/** Name of the script, as the `[perf]` block of the run shows it. */
const SCRIPT_NAME = 'generate-zone-pdf';

/**
 * Output folder of the packs: the local `scripts/output/` tree, like the
 * Inscriptions extraction — a gitignored folder, never committed and never
 * deployed. `--out-dir=` overrides it.
 */
function parseOutDir(): string {
  const arg = process.argv.find((a) => a.startsWith('--out-dir='));
  if (arg) {
    const dir = arg.slice('--out-dir='.length).trim();
    if (dir) return dir;
  }
  return join(import.meta.dirname, 'output', 'packs');
}

/**
 * Merge the published documents of a Zone into one pack.
 *
 * Returns the number of documents the pack holds: zero when the Zone has
 * no document to merge.
 */
async function mergeZone(zoneId: string, outDir: string): Promise<number> {
  const files = zonePackFiles(rootDir, zoneId);
  if (files.length === 0) {
    console.warn(`skip ${zoneId}: no PDFs found under public/pdf/${zoneId}/`);
    return 0;
  }

  const merged = await PDFDocument.create();
  for (const file of files) {
    const source = await PDFDocument.load(readFileSync(file));
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
    console.log(`  + ${file} (${source.getPageCount()} pages)`);
  }

  mkdirSync(outDir, { recursive: true });
  const outputPath = join(outDir, `${zoneId}.pdf`);
  try {
    writeFileSync(outputPath, await merged.save());
  } catch (error) {
    throw new Error(`cannot write ${outputPath}: ${errorMessage(error)}`);
  }
  console.log(`Generated: ${outputPath} (${merged.getPageCount()} pages)`);
  return files.length;
}

async function main(): Promise<void> {
  const perf = createPerfRecorder();
  /** The Zones of the run, and the Parcours their pack reuses. */
  let zoneIds: string[] = [];
  /** The packs the run wrote. */
  const written: string[] = [];
  /** The number of documents the packs hold. */
  let documents = 0;

  try {
    const filters = parseGenerationFilters(process.argv);
    const outDir = parseOutDir();
    zoneIds = ZONES.map((zone) => zone.id).filter((id) => matchesZoneFilter(filters, id));

    if (zoneIds.length === 0) {
      throw new Error('No zones match the --zone filter.');
    }

    for (const zoneId of zoneIds) {
      await perf.measure(zoneId, async () => {
        const merged = await mergeZone(zoneId, outDir);
        if (merged > 0) {
          written.push(zoneId);
          documents += merged;
        }
      });
    }
  } finally {
    reportRun(perf, zoneIds, written, documents);
  }
}

/**
 * Show the `[perf]` block of the run: how long it took, how long each Zone
 * took, how many documents the packs hold and how many Parcours the pack
 * reused.
 *
 * The pack regenerates no Parcours: it merges the documents that are
 * already published, so every Parcours of the pack is left alone.
 */
function reportRun(
  perf: PerfRecorder,
  zoneIds: readonly string[],
  written: readonly string[],
  documents: number,
): void {
  const reused = zoneIds.flatMap((zoneId) => zonePackParcours(rootDir, zoneId));

  const report = buildPerfReport({
    script: SCRIPT_NAME,
    totalMs: perf.totalMs(),
    steps: perf.steps,
    tiles: { fromCache: 0, downloaded: 0 },
    parcours: countersFromIds([], reused),
    packs: { written, documents },
  });

  console.log(formatPerfReport(report).join('\n'));
  writePerfReport(perfReportPath(rootDir, SCRIPT_NAME), report);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
