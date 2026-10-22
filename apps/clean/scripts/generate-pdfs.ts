import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { join } from 'path';
import { toBuffer as qrCodeToBuffer } from 'qrcode';
import sharp from 'sharp';

import { toursData } from '../src/app/tours-data';
import { getZone } from '../src/app/zones';
import { createNetworkScheduler } from './network-scheduler';
import { createTileFetcher } from './tile-fetcher';

import type { GpxSegmentSuffix } from './generation-helpers';
import {
  errorMessage,
  forEachConcurrently,
  isFilterActive,
  matchesFilters,
  parseForceFlag,
  parseGenerationFilters,
  pdfRootDir,
  perfReportPath,
  resolveGpxTracePath,
  tourPdfPath,
  writePerfReport,
  zoneMapPdfPath,
  zonePdfDir,
} from './generation-helpers';
import type { PerfRecorder } from './generation-perf';
import {
  buildPerfReport,
  countersFromDecisions,
  countersFromZoneDecisions,
  createPerfRecorder,
  formatPerfReport,
} from './generation-perf';
import type { GenerationPlan, PlanCandidate } from './generation-plan';
import { planGeneration } from './generation-plan';
import type { ParcoursStateUpdate, ZoneMapStateUpdate } from './generation-state';
import {
  GENERATION_STATE_VERSION,
  fingerprintDocument,
  fingerprintParcoursArtefacts,
  generationStatePath,
  meetingPointFingerprint,
  nextGenerationState,
  parcoursStateKey,
  withFicheFingerprint,
  zoneMapKey,
} from './generation-state';
import { readGenerationStateOrWarn, writeGenerationStateOrFail } from './generation-steps';
import { FICHE_SUBJECT, ZONE_MAP_SUBJECT } from './generation-subjects';

const rootDir = join(import.meta.dirname, '..');
const logoPath = join(rootDir, 'public/icons/vrnb.png');
const tileCacheDir = join(rootDir, 'scripts', '.cache', 'tiles');

/** Name of the script, as the `[perf]` block of the run shows it. */
const SCRIPT_NAME = 'generate-pdfs';

/** The name of a practice type, as the referent reads it. */
function practiceTypeLabel(kind: 'V' | 'P'): string {
  return kind === 'V' ? 'vélo' : 'pied';
}

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_SIZE = 256;
const USER_AGENT = 'vrnb-clean generate-pdfs';
const REQUEST_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 30_000;
/** Maximum number of simultaneous requests to a host (OSM tile usage policy). */
const MAX_CONCURRENT_REQUESTS_PER_HOST = 2;
/**
 * Number of Fiches assembled in parallel. The network scheduler still caps
 * the tile server at two simultaneous connections and one request every
 * 400 ms: this constant only overlaps the assembly of a Fiche with the
 * network wait of another one.
 */
const FICHE_CONCURRENCY = 3;
const MAX_ZOOM = 18;
const TILE_JPEG_QUALITY = 85;
const MAP_JPEG_QUALITY = 88;
/** Max width/height in pixels of the exact map view (before tiling). */
const MAX_VIEW_PIXELS = 1536;

/** Public base URL of the deployed app; tour pages live at `tour/<zoneId>/<tour>`. */
const TOUR_URL_PREFIX = 'https://clean.velorandonaturebruz.fr/';
/** Address printed under the QR code, so it stays usable without scanning. */
const SITE_HOST = new URL(TOUR_URL_PREFIX).host;
/** QR code image resolution (square pixels) and on-page size (mm). */
const QR_IMAGE_PX = 512;
const QR_PDF_SIZE_MM = 18;

type LonLat = [number, number];

interface TourDistances {
  readonly name: string;
  readonly distance: number;
  readonly startDistance: number;
  readonly endDistance: number;
  readonly zoneId: string;
}

interface PdfRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

function formatDistance(value: number): string {
  if (value < 1) {
    return `${Math.round(value * 1000)} m`;
  }
  return `${value.toFixed(1).replace('.', ',')} km`;
}

function decapitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toLowerCase() + value.slice(1);
}

interface LogoImage {
  readonly buffer: Buffer;
  /** Width over height ratio, to size the logo without distortion. */
  readonly aspect: number;
}

/** Load the VRNB logo flattened on white (JPEG keeps PDFs small). */
async function loadLogo(): Promise<LogoImage | undefined> {
  try {
    if (!existsSync(logoPath)) {
      console.warn(`  logo not found: ${logoPath}`);
      return undefined;
    }
    const source = sharp(readFileSync(logoPath));
    const metadata = await source.metadata();
    const buffer = await source.flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
    const aspect = (metadata.width ?? 1) / (metadata.height ?? 1);
    return { buffer, aspect };
  } catch (error) {
    console.warn(`  logo failed: ${error instanceof Error ? error.message : error}`);
    return undefined;
  }
}

function formatTotal(tour: TourDistances): number {
  return Math.round((tour.startDistance + tour.distance + tour.endDistance) * 10) / 10;
}

/** Deep link to the tour page in the deployed app. */
function tourUrl(tour: TourDistances): string {
  return `${TOUR_URL_PREFIX}tour/${parcoursStateKey(tour.zoneId, tour.name)}`;
}

/**
 * QR code PNG for a tour URL with the VRNB logo centered.
 * Error correction level H keeps the code scannable despite the overlay.
 */
async function buildQrCodeImage(url: string): Promise<Buffer | undefined> {
  try {
    const qr = await qrCodeToBuffer(url, {
      errorCorrectionLevel: 'H',
      width: QR_IMAGE_PX,
      margin: 2,
    });
    if (!existsSync(logoPath)) {
      return qr;
    }
    const overlaySize = Math.round(QR_IMAGE_PX * 0.22);
    const padding = Math.round(QR_IMAGE_PX * 0.03);
    const overlay = await sharp(readFileSync(logoPath))
      .resize(overlaySize, overlaySize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: '#ffffff' })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: '#ffffff',
      })
      .png()
      .toBuffer();
    return await sharp(qr)
      .composite([{ input: overlay, gravity: 'center' }])
      .png()
      .toBuffer();
  } catch (error) {
    console.warn(`  QR code failed: ${error instanceof Error ? error.message : error}`);
    return undefined;
  }
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
function planView(
  coords: LonLat[],
  aspect: number,
  maxPixels = MAX_VIEW_PIXELS,
): PlannedView | undefined {
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
    if (halfW * 2 > maxPixels || halfH * 2 > maxPixels) continue;
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

// --- OSM tile fetching: disk cache, network scheduler ---

function tileCachePath(zoom: number, x: number, y: number): string {
  return join(tileCacheDir, String(zoom), String(x), `${y}.jpg`);
}

/**
 * The scheduler every tile download goes through: one request every 400 ms
 * and two at a time per host, and a tile needed by two Fiches at the same
 * time is downloaded once.
 */
const scheduler = createNetworkScheduler({
  minIntervalMs: REQUEST_DELAY_MS,
  maxConcurrentPerHost: MAX_CONCURRENT_REQUESTS_PER_HOST,
});

/** The map tiles: read from the disk cache, downloaded through the scheduler. */
const tileFetcher = createTileFetcher({
  scheduler,
  tileUrl: (zoom, x, y) =>
    TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y)),
  readCache: (zoom, x, y) => {
    const cachePath = tileCachePath(zoom, x, y);
    return existsSync(cachePath) ? readFileSync(cachePath) : undefined;
  },
  writeCache: (zoom, x, y, tile) => {
    // Written aside and renamed: a Fiche reading the cache while another one
    // writes it must not see a half-written tile.
    const cachePath = tileCachePath(zoom, x, y);
    const temporaryPath = `${cachePath}.${process.pid}.tmp`;
    mkdirSync(join(tileCacheDir, String(zoom), String(x)), { recursive: true });
    writeFileSync(temporaryPath, tile);
    renameSync(temporaryPath, cachePath);
  },
  encode: (downloaded) => sharp(downloaded).jpeg({ quality: TILE_JPEG_QUALITY }).toBuffer(),
  requestInit: () => ({
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }),
  onUnavailable: (zoom, x, y, error) => {
    console.warn(
      `  tile ${zoom}/${x}/${y} unavailable: ${error instanceof Error ? error.message : error}`,
    );
  },
});

/** The tile of a map panel, from the disk cache or from the tile server. */
async function fetchTile(zoom: number, x: number, y: number): Promise<Buffer | undefined> {
  return tileFetcher.get(zoom, x, y);
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
async function buildMapBackground(
  view: PlannedView,
  quality = MAP_JPEG_QUALITY,
): Promise<Buffer | undefined> {
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
      .jpeg({ quality })
      .toBuffer();
    return await sharp(assembled)
      .extract({ left, top, width, height })
      .jpeg({ quality })
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

/** Same hues as the overview map, one color per tour (in tour order). */
const MAP_COLORS: [number, number, number][] = [
  [239, 68, 68], // warm - red
  [59, 130, 246], // cool - blue
  [249, 115, 22], // warm - orange
  [20, 184, 184], // cool - teal
  [245, 158, 11], // warm - amber
  [67, 56, 202], // cool - indigo
  [234, 179, 8], // warm - yellow
  [16, 185, 129], // cool - emerald
  [236, 72, 153], // warm - pink
  [14, 165, 233], // cool - sky
  [219, 39, 119], // warm - rose
  [6, 182, 212], // cool - cyan
  [250, 204, 21], // warm - gold
  [34, 197, 94], // cool - green
  [244, 114, 182], // warm - coral
  [168, 85, 247], // cool - violet
  [153, 101, 21], // warm - brown
  [126, 34, 206], // cool - fuchsia
  [255, 99, 71], // warm - tomato
  [132, 204, 22], // cool/warm - lime
];

/** GPX path for a tour file, with fallback to the legacy flat layout (pre-zone files). */
function tourGpxPath(tour: TourDistances, suffix: GpxSegmentSuffix): string {
  return resolveGpxTracePath(rootDir, tour.zoneId, tour.name, suffix);
}

async function generateTourPdf(tour: TourDistances, logo: LogoImage | undefined): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const meetingPoint = getZone(tour.zoneId).meetingPoint;
  const zoneName = getZone(tour.zoneId).name;

  const startCoords = parseGpxCoords(tourGpxPath(tour, '_start'));
  const tourCoords = parseGpxCoords(tourGpxPath(tour, ''));
  const endCoords = parseGpxCoords(tourGpxPath(tour, '_end'));

  if (logo) {
    const logoHeight = 12;
    const dataUrl = `data:image/jpeg;base64,${logo.buffer.toString('base64')}`;
    doc.addImage(dataUrl, 'JPEG', margin, 6, logoHeight * logo.aspect, logoHeight, 'vrnb-logo');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${zoneName} - Parcours ${tour.name}`, pageWidth / 2, 16, { align: 'center' });

  const qrImage = await buildQrCodeImage(tourUrl(tour));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const contactLabel = 'Contact : ';
  doc.text(contactLabel, margin, 24);
  const contactNumberX = margin + doc.getTextWidth(contactLabel);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('06 23 13 56 48', contactNumberX, 24);

  if (qrImage) {
    const qrX = pageWidth - margin - QR_PDF_SIZE_MM;
    const qrY = 4;
    const qrDataUrl = `data:image/png;base64,${qrImage.toString('base64')}`;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, QR_PDF_SIZE_MM, QR_PDF_SIZE_MM, `${tour.name}-qr`);
    doc.link(qrX, qrY, QR_PDF_SIZE_MM, QR_PDF_SIZE_MM, { url: tourUrl(tour) });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    // The address is wider than the QR code: right-align it on the page
    // margin so the whole line stays inside the printable area.
    doc.text(SITE_HOST, pageWidth - margin, qrY + QR_PDF_SIZE_MM + 3.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  autoTable(doc, {
    startY: 29,
    margin: { left: margin, right: margin },
    head: [['Début', 'Zone de nettoyage', 'Fin', 'Total']],
    body: [
      [
        formatDistance(tour.startDistance),
        formatDistance(tour.distance),
        formatDistance(tour.endDistance),
        formatDistance(formatTotal(tour)),
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
  doc.text(`${meetingPoint.name} vers le début du parcours`, margin, smallCaptionY);
  doc.text(
    `Fin du parcours vers la ${decapitalize(meetingPoint.name)}`,
    margin + smallWidth + gap,
    smallCaptionY,
  );
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

  const zoneFolder = zonePdfDir(rootDir, tour.zoneId);
  mkdirSync(zoneFolder, { recursive: true });
  const outputPath = tourPdfPath(rootDir, tour.zoneId, tour.name);
  ensureWritable(outputPath);
  try {
    doc.save(outputPath);
  } catch (error) {
    throw new Error(`cannot write ${outputPath}: ${errorMessage(error)}`);
  }
  console.log(`Generated: ${outputPath}`);
}

// --- Zone overview maps: one landscape PDF per zone and tour type ---

interface ZoneTrack {
  readonly name: string;
  readonly coords: LonLat[];
}

/**
 * Render the overview map of a Zone.
 *
 * Returns whether the document was written: a Zone without any track of
 * the practice type has no map to render.
 */
async function generateZoneMapPdf(
  zoneId: string,
  kind: 'V' | 'P',
  tours: TourDistances[],
  logo: LogoImage | undefined,
): Promise<boolean> {
  const zoneName = getZone(zoneId).name;
  const typeLabel = kind === 'V' ? 'Parcours à vélo' : 'Parcours à pied';
  const tracks: ZoneTrack[] = tours
    .map((tour) => ({ name: tour.name, coords: parseGpxCoords(tourGpxPath(tour, '')) }))
    .filter((track): track is ZoneTrack => !!track.coords && track.coords.length > 0);

  if (tracks.length === 0) {
    return false;
  }

  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  if (logo) {
    const logoHeight = 12;
    const dataUrl = `data:image/jpeg;base64,${logo.buffer.toString('base64')}`;
    doc.addImage(dataUrl, 'JPEG', margin, 6, logoHeight * logo.aspect, logoHeight, 'vrnb-logo');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${zoneName} - ${typeLabel}`, pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Contact', pageWidth - margin, 7, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('06 23 13 56 48', pageWidth - margin, 12, { align: 'right' });

  const mapY = 24;
  const footerY = pageHeight - 6;
  const rect: PdfRect = { x: margin, y: mapY, w: contentWidth, h: footerY - mapY - 6 };

  const allCoords = tracks.flatMap((track) => track.coords);
  // High resolution for the full-page map (print quality).
  const view = planView(allCoords, rect.w / rect.h, 3072);
  if (!view) {
    console.warn(`  no map view for ${zoneId} ${kind}`);
    return false;
  }

  const background = await buildMapBackground(view, 92);
  if (background) {
    const dataUrl = `data:image/jpeg;base64,${background.toString('base64')}`;
    try {
      doc.addImage(dataUrl, 'JPEG', rect.x, rect.y, rect.w, rect.h, `${zoneId}-${kind}-map`);
    } catch (error) {
      console.warn(`  addImage failed: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    doc.setFillColor(235, 235, 232);
    doc.rect(rect.x, rect.y, rect.w, rect.h, 'F');
  }

  doc.setLineCap(1);
  doc.setLineJoin(1);
  const labelMids: { x: number; y: number }[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const color = MAP_COLORS[i % MAP_COLORS.length];
    const points = track.coords.map(([lon, lat]) => projectToPanel(lon, lat, view, rect));

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.7);
    for (let j = 1; j < points.length; j++) {
      doc.line(points[j - 1].x, points[j - 1].y, points[j].x, points[j].y);
    }
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.9);
    for (let j = 1; j < points.length; j++) {
      doc.line(points[j - 1].x, points[j - 1].y, points[j].x, points[j].y);
    }

    const start = points[0];
    const end = points[points.length - 1];
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.setFillColor(22, 163, 74);
    doc.circle(start.x, start.y, 1.2, 'FD');
    doc.setFillColor(225, 29, 72);
    doc.circle(end.x, end.y, 1.2, 'FD');

    labelMids.push(points[Math.floor(points.length / 2)]);
  }

  // Labels last (same style as the web map: track color pill, white bold text),
  // so no route line ever crosses a label.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  for (let i = 0; i < tracks.length; i++) {
    const color = MAP_COLORS[i % MAP_COLORS.length];
    const mid = labelMids[i];
    const labelWidth = doc.getTextWidth(tracks[i].name);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(mid.x - labelWidth / 2 - 2, mid.y - 4.5, labelWidth + 4, 6.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(tracks[i].name, mid.x, mid.y, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);
  drawLegend(doc, margin, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Cartes © OpenStreetMap', pageWidth - margin, footerY, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  const zoneFolder = zonePdfDir(rootDir, zoneId);
  mkdirSync(zoneFolder, { recursive: true });
  const outputPath = zoneMapPdfPath(rootDir, zoneId, kind);
  ensureWritable(outputPath);
  try {
    doc.save(outputPath);
  } catch (error) {
    throw new Error(`cannot write ${outputPath}: ${errorMessage(error)}`);
  }
  console.log(`Generated: ${outputPath}`);
  return true;
}

// --- The plan of the run: what must be rendered again ---

/**
 * The fingerprint of the Point de rendez-vous of a Zone.
 *
 * The Fiche prints the name of the Point de rendez-vous: a Point de
 * rendez-vous that changed invalidates the Fiche.
 */
function meetingPointFingerprintOf(zoneId: string): string {
  return meetingPointFingerprint(getZone(zoneId).meetingPoint);
}

/** A Parcours of the run, with the fingerprints of the files it reads. */
function toCandidate(tour: TourDistances): PlanCandidate {
  return {
    zoneId: tour.zoneId,
    tourId: tour.name,
    fingerprints: fingerprintParcoursArtefacts(rootDir, tour.zoneId, tour.name),
    meetingPoint: meetingPointFingerprintOf(tour.zoneId),
  };
}

/**
 * The fingerprints of the overview maps of the Zones of the run.
 *
 * The plan reads the map of the Zone and the practice type it decides
 * for; a map that is missing, empty or unreadable has no fingerprint.
 */
function zoneMapFingerprintsOf(
  tours: readonly TourDistances[],
): Record<string, string | undefined> {
  const fingerprints: Record<string, string | undefined> = {};

  for (const zoneId of new Set(tours.map((tour) => tour.zoneId))) {
    for (const kind of ['V', 'P'] as const) {
      fingerprints[zoneMapKey(zoneId, kind)] = fingerprintDocument(
        zoneMapPdfPath(rootDir, zoneId, kind),
      );
    }
  }

  return fingerprints;
}

/** Every Parcours of a Zone, whatever the filters of the run: the map shows them all. */
function toursOfZone(zoneId: string, kind: 'V' | 'P'): TourDistances[] {
  const tours = kind === 'V' ? toursData.vTours : toursData.pTours;
  return tours.filter((tour) => tour.zoneId === zoneId);
}

async function main(): Promise<void> {
  const perf = createPerfRecorder();
  /** The plan of the run, `undefined` when the run failed before it. */
  let plan: GenerationPlan | undefined;
  /** The Parcours whose Fiche was rendered, and the overview maps written. */
  const rendered = new Set<string>();
  const renderedZoneMaps = new Set<string>();

  try {
    try {
      mkdirSync(pdfRootDir(rootDir), { recursive: true });
      mkdirSync(tileCacheDir, { recursive: true });
    } catch (error) {
      throw new Error(`cannot prepare the output folders: ${errorMessage(error)}`);
    }

    const filters = parseGenerationFilters(process.argv);
    const force = parseForceFlag(process.argv);
    if (force) {
      console.log('Force mode requested: every Fiche of the selection is rendered.');
    }
    const allTours: TourDistances[] = [...toursData.vTours, ...toursData.pTours].filter((tour) =>
      matchesFilters(filters, tour.zoneId, tour.name),
    );

    if (
      (isFilterActive(filters.tourIds) || isFilterActive(filters.zoneIds)) &&
      allTours.length === 0
    ) {
      throw new Error('No tours match the --tour/--zone filter.');
    }

    // The plan decides what the run must render: the Fiche of the Parcours
    // that changed, and the overview map of the Zones that changed.
    const statePath = generationStatePath(rootDir);
    const state = readGenerationStateOrWarn(statePath);
    const runPlan = planGeneration({
      state,
      currentVersion: GENERATION_STATE_VERSION,
      candidates: allTours.map(toCandidate),
      zoneMapFingerprints: zoneMapFingerprintsOf(allTours),
      filters,
      force,
    });
    plan = runPlan;

    const logo = await loadLogo();

    const toursByKey = new Map(
      allTours.map((tour) => [parcoursStateKey(tour.zoneId, tour.name), tour]),
    );
    let failures = 0;

    await perf.measure('Fiches', async () => {
      await forEachConcurrently(
        runPlan.decisions.filter((decision) => decision.regenerateFiche),
        FICHE_CONCURRENCY,
        async (decision) => {
          const tour = toursByKey.get(parcoursStateKey(decision.zoneId, decision.tourId));
          if (!tour) {
            return;
          }
          try {
            await generateTourPdf(tour, logo);
            rendered.add(parcoursStateKey(tour.zoneId, tour.name));
          } catch (error) {
            failures += 1;
            console.error(`fail ${tour.name}: ${error instanceof Error ? error.message : error}`);
          }
        },
      );
    });

    await perf.measure('Cartes de zone', async () => {
      await forEachConcurrently(
        runPlan.zoneDecisions.filter((decision) => decision.regenerateZoneMap),
        FICHE_CONCURRENCY,
        async (decision) => {
          try {
            const written = await generateZoneMapPdf(
              decision.zoneId,
              decision.kind,
              toursOfZone(decision.zoneId, decision.kind),
              logo,
            );
            if (written) {
              renderedZoneMaps.add(zoneMapKey(decision.zoneId, decision.kind));
            }
          } catch (error) {
            failures += 1;
            console.error(
              `fail ${decision.zoneId} map: ${error instanceof Error ? error.message : error}`,
            );
          }
        },
      );
    });

    // The state remembers the Fiches that were rendered: the next run knows
    // they are up to date. A Fiche that failed keeps no fingerprint, so the
    // next run renders it again.
    const updates: ParcoursStateUpdate[] = [];
    for (const decision of runPlan.decisions) {
      if (!decision.regenerateFiche) {
        continue;
      }
      const key = parcoursStateKey(decision.zoneId, decision.tourId);
      const fiche = rendered.has(key)
        ? fingerprintDocument(tourPdfPath(rootDir, decision.zoneId, decision.tourId))
        : undefined;
      updates.push({ key, record: withFicheFingerprint(state?.parcours[key], fiche) });
    }

    // The state remembers the overview maps that were rendered: the next run
    // knows they are up to date. An overview map that failed keeps no
    // fingerprint, so the next run renders it again.
    const zoneMapUpdates: ZoneMapStateUpdate[] = [];
    for (const decision of runPlan.zoneDecisions) {
      if (!decision.regenerateZoneMap) {
        continue;
      }
      const key = zoneMapKey(decision.zoneId, decision.kind);
      const fingerprint = renderedZoneMaps.has(key)
        ? fingerprintDocument(zoneMapPdfPath(rootDir, decision.zoneId, decision.kind))
        : undefined;
      zoneMapUpdates.push({ key, fingerprint });
    }

    writeGenerationStateOrFail(statePath, nextGenerationState(state, updates, zoneMapUpdates));

    if (failures > 0) {
      throw new Error(`${failures} Fiche(s) failed.`);
    }
  } finally {
    reportRun(perf, plan, rendered, renderedZoneMaps);
  }
}

/**
 * Show the `[perf]` block of the run: how long it took, how long the Fiches
 * and the overview maps took, how many tiles came from the cache and how
 * many were downloaded, and what the run did with every Fiche and every
 * overview map.
 */
function reportRun(
  perf: PerfRecorder,
  plan: GenerationPlan | undefined,
  rendered: ReadonlySet<string>,
  renderedZoneMaps: ReadonlySet<string>,
): void {
  const stats = tileFetcher.stats;
  const report = buildPerfReport({
    script: SCRIPT_NAME,
    totalMs: perf.totalMs(),
    steps: perf.steps,
    tiles: { fromCache: stats.cacheHits, downloaded: stats.downloads },
    subjects: [FICHE_SUBJECT, ZONE_MAP_SUBJECT],
    parcours: plan
      ? countersFromDecisions(plan.decisions, {
          subject: FICHE_SUBJECT.id,
          label: (decision) => decision.tourId,
          reason: (decision) => decision.ficheReason,
          isChanged: (decision) =>
            decision.regenerateFiche &&
            rendered.has(parcoursStateKey(decision.zoneId, decision.tourId)),
        })
      : { changed: [], unchanged: [] },
    zoneMaps: plan
      ? countersFromZoneDecisions(plan.zoneDecisions, {
          subject: ZONE_MAP_SUBJECT.id,
          label: (decision) => practiceTypeLabel(decision.kind),
          reason: (decision) => decision.reason,
          isChanged: (decision) =>
            decision.regenerateZoneMap &&
            renderedZoneMaps.has(zoneMapKey(decision.zoneId, decision.kind)),
        })
      : { changed: [], unchanged: [] },
  });

  console.log(formatPerfReport(report).join('\n'));
  writePerfReport(perfReportPath(rootDir, SCRIPT_NAME), report);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
