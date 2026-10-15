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
const MAX_ZOOM = 16;
const TILE_JPEG_QUALITY = 85;
const MAP_JPEG_QUALITY = 88;
/** Max width/height in pixels of the exact map view (before tiling). */
const MAX_VIEW_PIXELS = 1536;

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
 * Pick a zoom level so the track (with a small margin) fits the panel aspect.
 * The view bounds are exact (no tile snapping): the background image is
 * cropped precisely to these bounds, so the map stays zoomed on the route.
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
    const pad = 1.08;
    let halfW = Math.max((Math.max(...xs) - Math.min(...xs)) / 2, 30) * pad;
    let halfH = Math.max((Math.max(...ys) - Math.min(...ys)) / 2, 30) * pad;
    if (halfW / halfH < aspect) {
      halfW = halfH * aspect;
    } else {
      halfH = halfW / aspect;
    }
    if (halfW * 2 > MAX_VIEW_PIXELS || halfH * 2 > MAX_VIEW_PIXELS) continue;
    const minX = cx - halfW;
    const maxX = cx + halfW;
    const minY = cy - halfH;
    const maxY = cy + halfH;
    return {
      zoom,
      xTileMin: Math.floor(minX / TILE_SIZE),
      xTileMax: Math.floor((maxX - 1e-6) / TILE_SIZE),
      yTileMin: Math.floor(minY / TILE_SIZE),
      yTileMax: Math.floor((maxY - 1e-6) / TILE_SIZE),
      minX,
      maxX,
      minY,
      maxY,
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

/**
 * Assemble the OSM tiles covering the view into a single JPEG cropped
 * exactly to the view bounds. Missing tiles leave the neutral background.
 */
async function buildMapBackground(view: PlannedView): Promise<Buffer | undefined> {
  try {
    const originX = view.xTileMin * TILE_SIZE;
    const originY = view.yTileMin * TILE_SIZE;
    const canvasW = (view.xTileMax - view.xTileMin + 1) * TILE_SIZE;
    const canvasH = (view.yTileMax - view.yTileMin + 1) * TILE_SIZE;
    const layers: { input: Buffer; left: number; top: number }[] = [];
    for (let x = view.xTileMin; x <= view.xTileMax; x++) {
      for (let y = view.yTileMin; y <= view.yTileMax; y++) {
        const tile = await fetchTile(view.zoom, x, y);
        if (!tile) continue;
        layers.push({
          input: tile,
          left: (x - view.xTileMin) * TILE_SIZE,
          top: (y - view.yTileMin) * TILE_SIZE,
        });
      }
    }
    const left = Math.min(Math.max(Math.round(view.minX - originX), 0), canvasW - 1);
    const top = Math.min(Math.max(Math.round(view.minY - originY), 0), canvasH - 1);
    const width = Math.min(Math.round(view.maxX - view.minX), canvasW - left);
    const height = Math.min(Math.round(view.maxY - view.minY), canvasH - top);
    // Note: sharp applies extract() before composite() within a single
    // pipeline, so assemble the full canvas first, then crop in a second step.
    const assembled = await sharp({
      create: { width: canvasW, height: canvasH, channels: 3, background: '#e9e7e2' },
    })
      .composite(layers)
      .jpeg({ quality: MAP_JPEG_QUALITY })
      .toBuffer();
    return await sharp(assembled)
      .extract({ left, top, width, height })
      .jpeg({ quality: MAP_JPEG_QUALITY })
      .toBuffer();
  } catch (error) {
    console.warn(`  map background failed: ${error instanceof Error ? error.message : error}`);
    return undefined;
  }
}

async function renderMapPanel(
  doc: jsPDF,
  coords: LonLat[] | undefined,
  rect: PdfRect,
  style: PanelStyle,
  emptyLabel: string,
  mapKey: string,
): Promise<void> {
  if (!coords || coords.length === 0) {
    doc.setFillColor(235, 235, 232);
    doc.rect(rect.x, rect.y, rect.w, rect.h, 'F');
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

  const background = await buildMapBackground(view);
  if (background) {
    const dataUrl = `data:image/jpeg;base64,${background.toString('base64')}`;
    try {
      doc.addImage(dataUrl, 'JPEG', rect.x, rect.y, rect.w, rect.h, mapKey);
    } catch (error) {
      console.warn(`  addImage failed: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    doc.setFillColor(235, 235, 232);
    doc.rect(rect.x, rect.y, rect.w, rect.h, 'F');
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
}

// --- Per-tour PDF ---

const MAIN_STYLE: PanelStyle = { lineWidth: 0.9, casingWidth: 1.7, markerRadius: 2 };
const SMALL_STYLE: PanelStyle = { lineWidth: 0.7, casingWidth: 1.3, markerRadius: 1.5 };

/** Graphical legend: green dot = start, blue line = route, red dot = finish. */
function drawLegend(doc: jsPDF, x: number, baselineY: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);

  let cursorX = x;
  const midY = baselineY - 1;

  doc.setFillColor(22, 163, 74);
  doc.circle(cursorX + 1.5, midY, 1.5, 'F');
  cursorX += 4;
  doc.text('Départ', cursorX, baselineY);
  cursorX += doc.getTextWidth('Départ') + 4;

  doc.setDrawColor(0, 88, 202);
  doc.setLineWidth(0.9);
  doc.line(cursorX, midY, cursorX + 7, midY);
  cursorX += 9;
  doc.text('Parcours', cursorX, baselineY);
  cursorX += doc.getTextWidth('Parcours') + 4;

  doc.setFillColor(225, 29, 72);
  doc.circle(cursorX + 1.5, midY, 1.5, 'F');
  cursorX += 4;
  doc.text('Arrivée', cursorX, baselineY);
}

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

  autoTable(doc, {
    startY: 23,
    margin: { left: margin, right: margin },
    head: [['Début', 'Zone de nettoyage', 'Fin', 'Total']],
    body: [
      [
        formatKmFr(tour.startDistance),
        formatKmFr(tour.distance),
        formatKmFr(tour.endDistance),
        formatKmFr(formatTotal(tour)),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [66, 135, 75], halign: 'center' },
    bodyStyles: { halign: 'center' },
  });

  const tableEndY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Zone de nettoyage', margin, tableEndY + 7);
  const mainRect: PdfRect = { x: margin, y: tableEndY + 10, w: contentWidth, h: 132 };
  await renderMapPanel(
    doc,
    tourCoords,
    mainRect,
    MAIN_STYLE,
    'Trace principal introuvable',
    `${tour.name}-main`,
  );

  const gap = 4;
  const smallWidth = (contentWidth - gap) / 2;
  const smallCaptionY = mainRect.y + mainRect.h + 7;
  const smallMapY = smallCaptionY + 4;
  const smallH = 70;
  doc.setFontSize(10);
  doc.text(`${MEETING_POINT.name} vers début du parcours`, margin, smallCaptionY);
  doc.text(`Fin du parcours vers ${MEETING_POINT.name}`, margin + smallWidth + gap, smallCaptionY);
  await renderMapPanel(
    doc,
    startCoords,
    { x: margin, y: smallMapY, w: smallWidth, h: smallH },
    SMALL_STYLE,
    'Trace aller introuvable',
    `${tour.name}-start`,
  );
  await renderMapPanel(
    doc,
    endCoords,
    { x: margin + smallWidth + gap, y: smallMapY, w: smallWidth, h: smallH },
    SMALL_STYLE,
    'Trace retour introuvable',
    `${tour.name}-end`,
  );

  drawLegend(doc, margin, 282);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Cartes © OpenStreetMap', pageWidth - margin, 282, { align: 'right' });
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
