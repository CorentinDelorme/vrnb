import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { join } from 'path';
import sharp from 'sharp';

import { MEETING_POINT } from '../src/app/shared/constants';
import { toursData } from '../src/app/tours-data';

const rootDir = join(__dirname, '..');
const pdfDir = join(rootDir, 'public/pdf');
const gpxDir = join(rootDir, 'public/gpx');
const tileCacheDir = join(rootDir, 'scripts', '.cache', 'tiles');

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_SIZE = 256;
const USER_AGENT = 'vrnb-clean generate-pdfs';
const REQUEST_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_TILES_PER_SIDE = 5;
const MAX_ZOOM = 15;
const TILE_JPEG_QUALITY = 75;

type LonLat = [number, number];

interface TourDistances {
  readonly name: string;
  readonly distance: number;
  readonly startDistance: number;
  readonly endDistance: number;
}

interface PdfRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

function formatKmFr(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} km`;
}

function formatTotal(tour: TourDistances): number {
  return Math.round((tour.startDistance + tour.distance + tour.endDistance) * 10) / 10;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Older PDFs were committed read-only; make the target writable before saving. */
function ensureWritable(outputPath: string): void {
  if (!existsSync(outputPath)) {
    return;
  }
  try {
    chmodSync(outputPath, 0o644);
  } catch (error) {
    console.warn(`  cannot chmod ${outputPath}: ${error instanceof Error ? error.message : error}`);
  }
}

function parseGpxCoords(gpxPath: string): LonLat[] | undefined {
  if (!existsSync(gpxPath)) {
    return undefined;
  }
  const content = readFileSync(gpxPath, 'utf-8');
  const parsedGpx = new DOMParser().parseFromString(content, 'application/xml');
  const geoJson = gpx(parsedGpx);
  const feature = geoJson.features[0];
  if (!feature || feature.geometry.type !== 'LineString') {
    return undefined;
  }
  const coords = feature.geometry.coordinates;
  if (coords.length === 0) {
    return undefined;
  }
  return coords.map(([lon, lat]) => [lon, lat] as LonLat);
}

// --- Web Mercator helpers (OSM tile scheme) ---

function lonToPixelX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToPixelY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  const mercator = Math.log(Math.tan(rad) + 1 / Math.cos(rad));
  return ((1 - mercator / Math.PI) / 2) * TILE_SIZE * 2 ** zoom;
}

interface PlannedView {
  readonly zoom: number;
  readonly xTileMin: number;
  readonly xTileMax: number;
  readonly yTileMin: number;
  readonly yTileMax: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/**
 * Pick a zoom level so the track (with padding) fits the panel aspect,
 * then snap the view to OSM tile boundaries so tiles fill the panel exactly.
 */
function planView(coords: LonLat[], aspect: number): PlannedView | undefined {
  if (coords.length === 0) {
    return undefined;
  }
  for (let zoom = MAX_ZOOM; zoom >= 11; zoom--) {
    const xs = coords.map(([lon]) => lonToPixelX(lon, zoom));
    const ys = coords.map(([, lat]) => latToPixelY(lat, zoom));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const pad = 1.15;
    const halfW = (Math.max(...xs) - Math.min(...xs) + 60) / 2;
    const halfH = (Math.max(...ys) - Math.min(...ys) + 60) / 2;
    const fittedHalfW = Math.max(halfW * pad, halfH * pad * aspect);
    const fittedHalfH = Math.max(halfH * pad, (halfW * pad) / aspect);
    const xTileMin = Math.floor((cx - fittedHalfW) / TILE_SIZE);
    const xTileMax = Math.floor((cx + fittedHalfW - 1e-6) / TILE_SIZE);
    const yTileMin = Math.floor((cy - fittedHalfH) / TILE_SIZE);
    const yTileMax = Math.floor((cy + fittedHalfH - 1e-6) / TILE_SIZE);
    if (xTileMax - xTileMin + 1 > MAX_TILES_PER_SIDE) continue;
    if (yTileMax - yTileMin + 1 > MAX_TILES_PER_SIDE) continue;
    return {
      zoom,
      xTileMin,
      xTileMax,
      yTileMin,
      yTileMax,
      minX: xTileMin * TILE_SIZE,
      maxX: (xTileMax + 1) * TILE_SIZE,
      minY: yTileMin * TILE_SIZE,
      maxY: (yTileMax + 1) * TILE_SIZE,
    };
  }
  return undefined;
}

// --- OSM tile fetching with disk cache and throttling ---

let lastFetchAt = 0;

function tileCachePath(zoom: number, x: number, y: number): string {
  return join(tileCacheDir, String(zoom), String(x), `${y}.jpg`);
}

async function fetchTile(zoom: number, x: number, y: number): Promise<Buffer | undefined> {
  const cachePath = tileCachePath(zoom, x, y);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath);
  }
  const wait = REQUEST_DELAY_MS - (Date.now() - lastFetchAt);
  if (wait > 0) {
    await delay(wait);
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      lastFetchAt = Date.now();
      const url = TILE_URL.replace('{z}', String(zoom))
        .replace('{x}', String(x))
        .replace('{y}', String(y));
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const pngBuffer = Buffer.from(await res.arrayBuffer());
      const jpegBuffer = await sharp(pngBuffer).jpeg({ quality: TILE_JPEG_QUALITY }).toBuffer();
      mkdirSync(join(tileCacheDir, String(zoom), String(x)), { recursive: true });
      writeFileSync(cachePath, jpegBuffer);
      return jpegBuffer;
    } catch (error) {
      if (attempt === 1) {
        console.warn(
          `  tile ${zoom}/${x}/${y} unavailable: ${error instanceof Error ? error.message : error}`,
        );
        return undefined;
      }
      await delay(1000);
    }
  }
  return undefined;
}

// --- Map panel rendering ---

interface PanelStyle {
  readonly lineWidth: number;
  readonly casingWidth: number;
  readonly markerRadius: number;
}

function projectToPanel(
  lon: number,
  lat: number,
  view: PlannedView,
  rect: PdfRect,
): { x: number; y: number } {
  const gx = lonToPixelX(lon, view.zoom);
  const gy = latToPixelY(lat, view.zoom);
  return {
    x: rect.x + ((gx - view.minX) / (view.maxX - view.minX)) * rect.w,
    y: rect.y + ((gy - view.minY) / (view.maxY - view.minY)) * rect.h,
  };
}

async function renderMapPanel(
  doc: jsPDF,
  coords: LonLat[] | undefined,
  rect: PdfRect,
  style: PanelStyle,
  emptyLabel: string,
): Promise<void> {
  doc.setFillColor(235, 235, 232);
  doc.rect(rect.x, rect.y, rect.w, rect.h, 'F');

  if (!coords || coords.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(emptyLabel, rect.x + rect.w / 2, rect.y + rect.h / 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    return;
  }

  const view = planView(coords, rect.w / rect.h);
  if (!view) {
    return;
  }

  for (let x = view.xTileMin; x <= view.xTileMax; x++) {
    for (let y = view.yTileMin; y <= view.yTileMax; y++) {
      const tile = await fetchTile(view.zoom, x, y);
      if (!tile) continue;
      const tx = rect.x + ((x * TILE_SIZE - view.minX) / (view.maxX - view.minX)) * rect.w;
      const ty = rect.y + ((y * TILE_SIZE - view.minY) / (view.maxY - view.minY)) * rect.h;
      const tw = (TILE_SIZE / (view.maxX - view.minX)) * rect.w + 0.2;
      const th = (TILE_SIZE / (view.maxY - view.minY)) * rect.h + 0.2;
      const dataUrl = `data:image/jpeg;base64,${tile.toString('base64')}`;
      try {
        doc.addImage(dataUrl, 'JPEG', tx, ty, tw, th, `tile-${view.zoom}-${x}-${y}`);
      } catch (error) {
        console.warn(`  addImage failed: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  const points = coords.map(([lon, lat]) => projectToPanel(lon, lat, view, rect));

  doc.setLineCap(1);
  doc.setLineJoin(1);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(style.casingWidth);
  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }
  doc.setDrawColor(0, 88, 202);
  doc.setLineWidth(style.lineWidth);
  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }

  const start = points[0];
  const end = points[points.length - 1];
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.setFillColor(22, 163, 74);
  doc.circle(start.x, start.y, style.markerRadius, 'FD');
  doc.setFillColor(225, 29, 72);
  doc.circle(end.x, end.y, style.markerRadius, 'FD');

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.rect(rect.x, rect.y, rect.w, rect.h);
}

// --- Per-tour PDF ---

const MAIN_STYLE: PanelStyle = { lineWidth: 0.9, casingWidth: 1.7, markerRadius: 2 };
const SMALL_STYLE: PanelStyle = { lineWidth: 0.7, casingWidth: 1.3, markerRadius: 1.5 };

async function generateTourPdf(tour: TourDistances): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  const startCoords = parseGpxCoords(join(gpxDir, tour.name, `${tour.name}_start.gpx`));
  const tourCoords = parseGpxCoords(join(gpxDir, tour.name, `${tour.name}.gpx`));
  const endCoords = parseGpxCoords(join(gpxDir, tour.name, `${tour.name}_end.gpx`));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`Parcours ${tour.name}`, pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const distanceLine =
    `Début : ${formatKmFr(tour.startDistance)}  •  Parcours : ${formatKmFr(tour.distance)}` +
    `  •  Fin : ${formatKmFr(tour.endDistance)}  •  Total : ${formatKmFr(formatTotal(tour))}`;
  doc.text(distanceLine, pageWidth / 2, 24, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Départ et arrivée : ${MEETING_POINT.name}`, pageWidth / 2, 30, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Parcours principal - étape 2 (${formatKmFr(tour.distance)})`, margin, 38);
  const mainRect: PdfRect = { x: margin, y: 41, w: contentWidth, h: 140 };
  await renderMapPanel(doc, tourCoords, mainRect, MAIN_STYLE, 'Trace principal introuvable');

  const gap = 4;
  const smallWidth = (contentWidth - gap) / 2;
  const smallY = 188;
  const smallH = 80;
  doc.setFontSize(11);
  doc.text(`Début - étape 1 (${formatKmFr(tour.startDistance)})`, margin, smallY);
  doc.text(`Fin - étape 3 (${formatKmFr(tour.endDistance)})`, margin + smallWidth + gap, smallY);
  await renderMapPanel(
    doc,
    startCoords,
    { x: margin, y: smallY + 4, w: smallWidth, h: smallH },
    SMALL_STYLE,
    'Trace aller introuvable',
  );
  await renderMapPanel(
    doc,
    endCoords,
    { x: margin + smallWidth + gap, y: smallY + 4, w: smallWidth, h: smallH },
    SMALL_STYLE,
    'Trace retour introuvable',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Pastille verte : départ du tronçon - Tracé bleu : parcours - Pastille rouge : arrivée',
    margin,
    280,
  );
  doc.text('Fond de carte : OpenStreetMap contributors', pageWidth - margin, 280, {
    align: 'right',
  });
  doc.setTextColor(0, 0, 0);

  const outputPath = join(pdfDir, `${tour.name}.pdf`);
  ensureWritable(outputPath);
  doc.save(outputPath);
  console.log(`Generated: ${outputPath}`);
}

// --- Tracking sheets (unchanged layout) ---

function generateTrackingPdf(tours: string[], title: string, filename: string): void {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [['Parcours', 'Prénom NOM', 'Prénom NOM', 'Ordures (g)', 'Tri (g)', 'Verre (g)']],
    body: tours.map((tour) => [tour, '', '', '', '', '']),
    theme: 'grid',
    headStyles: { fillColor: [66, 135, 75] },
    columnStyles: {
      0: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15,
    head: [['Ordures (kg)', 'Tri (kg)', 'Verre (kg)', 'Total (kg)']],
    body: [['', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [66, 135, 75] },
  });

  const outputPath = join(pdfDir, filename);
  ensureWritable(outputPath);
  doc.save(outputPath);
  console.log(`Generated: ${outputPath}`);
}

function parseTourFilter(): Set<string> | undefined {
  const arg = process.argv.find((a) => a.startsWith('--tour='));
  if (!arg) return undefined;
  const ids = arg
    .slice('--tour='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : undefined;
}

async function main(): Promise<void> {
  mkdirSync(pdfDir, { recursive: true });
  mkdirSync(tileCacheDir, { recursive: true });

  const tourFilter = parseTourFilter();
  const allTours: TourDistances[] = [...toursData.vTours, ...toursData.pTours].filter(
    (t) => !tourFilter || tourFilter.has(t.name),
  );

  if (tourFilter && allTours.length === 0) {
    throw new Error('No tours match the --tour filter.');
  }

  for (const tour of allTours) {
    await generateTourPdf(tour);
  }

  if (!tourFilter) {
    const vTours = toursData.vTours.map((t) => t.name);
    const pTours = toursData.pTours.map((t) => t.name);
    generateTrackingPdf(
      vTours,
      'Feuille de suivi des parcours à vélo',
      'Suivi_parcours_a_velo.pdf',
    );
    generateTrackingPdf(
      pTours,
      'Feuille de suivi des parcours à pied',
      'Suivi_parcours_a_pied.pdf',
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
