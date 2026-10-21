import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

import { ZONES } from '../src/app/zones';

import {
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

async function mergeZone(zoneId: string, outDir: string): Promise<void> {
  const files = zonePackFiles(rootDir, zoneId);
  if (files.length === 0) {
    console.warn(`skip ${zoneId}: no PDFs found under public/pdf/${zoneId}/`);
    return;
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
  writeFileSync(outputPath, await merged.save());
  console.log(`Generated: ${outputPath} (${merged.getPageCount()} pages)`);
}

async function main(): Promise<void> {
  const perf = createPerfRecorder();
  /** The Zones of the run, and the Parcours their pack reuses. */
  let zoneIds: string[] = [];

  try {
    const filters = parseGenerationFilters(process.argv);
    const outDir = parseOutDir();
    zoneIds = ZONES.map((zone) => zone.id).filter((id) => matchesZoneFilter(filters, id));

    if (zoneIds.length === 0) {
      throw new Error('No zones match the --zone filter.');
    }

    for (const zoneId of zoneIds) {
      await perf.measure(zoneId, async () => {
        await mergeZone(zoneId, outDir);
      });
    }
  } finally {
    reportRun(perf, zoneIds);
  }
}

/**
 * Show the `[perf]` block of the run: how long it took, how long each Zone
 * took, and how many Parcours the pack reused.
 *
 * The pack regenerates no Parcours: it merges the documents that are
 * already published, so every Parcours of the pack is left alone.
 */
function reportRun(perf: PerfRecorder, zoneIds: readonly string[]): void {
  const reused = zoneIds.flatMap((zoneId) => zonePackParcours(rootDir, zoneId));

  const report = buildPerfReport({
    script: SCRIPT_NAME,
    totalMs: perf.totalMs(),
    steps: perf.steps,
    tiles: { fromCache: 0, downloaded: 0 },
    parcours: countersFromIds([], reused),
  });

  console.log(formatPerfReport(report).join('\n'));
  writePerfReport(perfReportPath(rootDir, SCRIPT_NAME), report);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
