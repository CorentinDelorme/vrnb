import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

import { ZONES } from '../src/app/zones';

const rootDir = join(__dirname, '..');
const pdfDir = join(rootDir, 'public/pdf');

const TOUR_PDF_PATTERN = /^[VP]\d+\.pdf$/;
const MAP_PDFS = ['Carte_parcours_a_velo.pdf', 'Carte_parcours_a_pied.pdf'];

function sortTourFiles(a: string, b: string): number {
  if (a[0] !== b[0]) {
    return a[0] < b[0] ? -1 : 1;
  }
  return parseInt(a.slice(1)) - parseInt(b.slice(1));
}

/**
 * All PDFs belonging to a zone: overview maps, then tour sheets (V then P).
 * Tracking sheets are shared across zones and stay separate.
 */
function getZoneFiles(zoneId: string): string[] {
  const zoneDir = join(pdfDir, zoneId);
  if (!existsSync(zoneDir)) {
    return [];
  }

  const files: string[] = [];
  for (const mapPdf of MAP_PDFS) {
    const mapPath = join(zoneDir, mapPdf);
    if (existsSync(mapPath)) {
      files.push(mapPath);
    }
  }

  const tourPdfs = readdirSync(zoneDir)
    .filter((file) => TOUR_PDF_PATTERN.test(file))
    .sort(sortTourFiles);
  for (const tourPdf of tourPdfs) {
    files.push(join(zoneDir, tourPdf));
  }

  return files;
}

function parseZoneFilter(): Set<string> | undefined {
  const arg = process.argv.find((a) => a.startsWith('--zone='));
  if (!arg) return undefined;
  const ids = arg
    .slice('--zone='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : undefined;
}

function parseOutDir(): string {
  const arg = process.argv.find((a) => a.startsWith('--out-dir='));
  if (arg) {
    const dir = arg.slice('--out-dir='.length).trim();
    if (dir) return dir;
  }
  return join(process.env['HOME'] || homedir(), 'Documents');
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
  const zoneFilter = parseZoneFilter();
  const outDir = parseOutDir();
  const zoneIds = ZONES.map((zone) => zone.id).filter((id) => !zoneFilter || zoneFilter.has(id));

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
