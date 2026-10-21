import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

import { ZONES } from '../src/app/zones';

import { matchesZoneFilter, parseGenerationFilters, zonePackFiles } from './generation-helpers';

const rootDir = join(import.meta.dirname, '..');

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
  const filters = parseGenerationFilters(process.argv);
  const outDir = parseOutDir();
  const zoneIds = ZONES.map((zone) => zone.id).filter((id) => matchesZoneFilter(filters, id));

  if (zoneIds.length === 0) {
    throw new Error('No zones match the --zone filter.');
  }

  for (const zoneId of zoneIds) {
    await mergeZone(zoneId, outDir);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
