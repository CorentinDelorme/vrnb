import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

import { ZONES } from '../src/app/zones';

import {
  compareParcoursIds,
  matchesZoneFilter,
  parseGenerationFilters,
  zoneMapPdfPath,
  zonePdfDir,
} from './generation-helpers';

const rootDir = join(import.meta.dirname, '..');

const TOUR_PDF_PATTERN = /^[VP]\d+\.pdf$/;
/** Overview maps of a Zone, in the order of the pack: vélo then pied. */
const ZONE_MAP_KINDS = ['V', 'P'] as const;

/**
 * All PDFs belonging to a zone: overview maps, then tour sheets (V then P).
 * The tracking sheets are not part of the pack anymore: the « Fiches de
 * suivi » are generated from the real inscriptions by the referent script
 * (`scripts/extract-inscriptions.ts`), outside the site.
 */
function getZoneFiles(zoneId: string): string[] {
  const zoneFolder = zonePdfDir(rootDir, zoneId);
  if (!existsSync(zoneFolder)) {
    return [];
  }

  const files: string[] = [];
  for (const kind of ZONE_MAP_KINDS) {
    const mapPath = zoneMapPdfPath(rootDir, zoneId, kind);
    if (existsSync(mapPath)) {
      files.push(mapPath);
    }
  }

  const tourPdfs = readdirSync(zoneFolder)
    .filter((file) => TOUR_PDF_PATTERN.test(file))
    .sort(compareParcoursIds);
  for (const tourPdf of tourPdfs) {
    files.push(join(zoneFolder, tourPdf));
  }

  return files;
}

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
  const files = getZoneFiles(zoneId);
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
