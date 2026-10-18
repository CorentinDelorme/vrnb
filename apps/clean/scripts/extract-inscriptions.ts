/**
 * Extraction annuelle des inscriptions et génération des fiches de suivi.
 *
 * Lit le KV (Upstash) via son API REST avec `fetch` (aucun client à installer),
 * sur le préfixe `inscriptions:<année>:`, puis écrit une fiche de suivi PDF par
 * zone et par type de parcours (`Suivi_parcours_a_velo.pdf` / `..._a_pied.pdf`)
 * dans un dossier local non publié.
 *
 * Usage : bun scripts/extract-inscriptions.ts [--year=YYYY] [--out-dir=DIR]
 *
 * Bun charge `apps/clean/.env.local` automatiquement quand la commande est
 * lancée depuis `apps/clean` : y renseigner `UPSTASH_REDIS_REST_URL` et
 * `UPSTASH_REDIS_REST_TOKEN` (ou les équivalents `KV_REST_API_*`). Le jeton
 * doit être un jeton *standard* : le SCAN est refusé aux jetons lecture seule.
 *
 * Voir scripts/README-inscriptions.md pour le mode opératoire (référent).
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { ACTION_EDITION } from '../src/app/registration/registration-config';
import {
  REGISTRATION_KEY_PREFIX,
  registrationKey,
  type RegistrationRecord,
} from '../src/app/registration/registration-contract';
import { toursData } from '../src/app/tours-data';
import { getZone } from '../src/app/zones';

/** Tour type, same convention as `TourType` in `src/app/tours-service.ts`. */
export type TourType = 'V' | 'P';

/** Minimal shape of a tour from `toursData` needed to build the sheets. */
export interface TourEntry {
  readonly name: string;
  readonly zoneId: string;
}

const TOUR_TYPES: readonly TourType[] = ['V', 'P'];
const YEAR_PATTERN = /^\d{4}$/;

// --- Parsing des clés et des valeurs du KV ---

export interface ParsedRegistrationKey {
  readonly year: number;
  readonly zoneId: string;
  readonly tourName: string;
}

/** Extracts `(année, zone, parcours)` from `inscriptions:<année>:<zone>:<parcours>`. */
export function parseRegistrationKey(key: string): ParsedRegistrationKey | null {
  const parts = key.split(':');
  if (parts.length !== 4) {
    return null;
  }
  const [prefix, yearPart, zoneId, tourName] = parts;
  if (prefix !== REGISTRATION_KEY_PREFIX || !YEAR_PATTERN.test(yearPart) || !zoneId || !tourName) {
    return null;
  }
  return { year: Number(yearPart), zoneId, tourName };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Parses a stored registration value; `null` when the JSON is missing or malformed. */
export function parseRegistrationValue(raw: string): RegistrationRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  const year = candidate['year'];
  const zoneId = nonEmptyString(candidate['zoneId']);
  const tourName = nonEmptyString(candidate['tourName']);
  const firstName1 = nonEmptyString(candidate['firstName1']);
  const lastName1 = nonEmptyString(candidate['lastName1']);
  const firstName2 = nonEmptyString(candidate['firstName2']);
  const lastName2 = nonEmptyString(candidate['lastName2']);
  if (
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    year <= 0 ||
    zoneId === null ||
    tourName === null ||
    firstName1 === null ||
    lastName1 === null ||
    firstName2 === null ||
    lastName2 === null
  ) {
    return null;
  }
  return { firstName1, lastName1, firstName2, lastName2, year, zoneId, tourName };
}

export interface KvEntry {
  readonly key: string;
  readonly value: string | null;
}

export interface CollectedRegistrations {
  readonly records: readonly RegistrationRecord[];
  /** French warnings: they include the key but never the stored value. */
  readonly warnings: readonly string[];
}

/**
 * Keeps every plausible entry and skips the others with a warning.
 *
 * Policy: the KV key is authoritative. An entry is ignored when its key does
 * not parse, when its year differs from the requested one (defensive: the SCAN
 * already filters on the year), when the value is missing or malformed, or
 * when the value's `(year, zone, parcours)` context does not match its key.
 */
export function collectRegistrations(
  year: number,
  entries: readonly KvEntry[],
): CollectedRegistrations {
  const records: RegistrationRecord[] = [];
  const warnings: string[] = [];
  for (const { key, value } of entries) {
    const fromKey = parseRegistrationKey(key);
    if (!fromKey) {
      warnings.push(`clé ignorée (format inattendu) : ${key}`);
      continue;
    }
    if (fromKey.year !== year) {
      warnings.push(`clé ignorée (année ${fromKey.year}, attendue ${year}) : ${key}`);
      continue;
    }
    if (value === null) {
      warnings.push(`clé ignorée (valeur absente) : ${key}`);
      continue;
    }
    const record = parseRegistrationValue(value);
    if (!record) {
      warnings.push(`clé ignorée (valeur JSON invalide) : ${key}`);
      continue;
    }
    if (registrationKey(record.year, record.zoneId, record.tourName) !== key) {
      warnings.push(`clé ignorée (contexte incohérent entre la clé et la valeur) : ${key}`);
      continue;
    }
    records.push(record);
  }
  return { records, warnings };
}

// --- Construction des lignes des fiches de suivi ---

export interface SuiviRow {
  readonly tourName: string;
  /** `Prénom NOM` of the first member; empty when the tour is not registered. */
  readonly member1: string;
  /** `Prénom NOM` of the second member; empty when the tour is not registered. */
  readonly member2: string;
}

/** `Prénom NOM`, same convention as the sheet column header. */
function displayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName.toUpperCase()}`;
}

/**
 * One row per tour of the zone and type, in `toursData` order. Registered tours
 * get the two binome names; the others stay blank. When several records target
 * the same tour, the last one wins (the API guarantees one binome per tour).
 */
export function rowsForZoneType(
  tours: readonly TourEntry[],
  records: readonly RegistrationRecord[],
  zoneId: string,
  type: TourType,
): SuiviRow[] {
  const covered = new Map<string, RegistrationRecord>();
  for (const record of records) {
    if (record.zoneId === zoneId) {
      covered.set(record.tourName, record);
    }
  }
  return tours
    .filter((tour) => tour.zoneId === zoneId && tour.name.startsWith(type))
    .map((tour) => {
      const record = covered.get(tour.name);
      return {
        tourName: tour.name,
        member1: record ? displayName(record.firstName1, record.lastName1) : '',
        member2: record ? displayName(record.firstName2, record.lastName2) : '',
      };
    });
}

// --- Accès au KV Upstash via l'API REST ---

export interface KvConfig {
  readonly url: string;
  readonly token: string;
}

/** Reads the Upstash REST config, preferring `UPSTASH_*` over the Vercel `KV_REST_API_*` pair. */
export function readKvConfig(env: Readonly<Record<string, string | undefined>>): KvConfig | null {
  const url = env['UPSTASH_REDIS_REST_URL'] ?? env['KV_REST_API_URL'];
  const token = env['UPSTASH_REDIS_REST_TOKEN'] ?? env['KV_REST_API_TOKEN'];
  if (!url || !token) {
    return null;
  }
  return { url: url.replace(/\/+$/, ''), token };
}

export type FetchLike = (
  input: string,
  init?: { readonly headers?: Record<string, string> },
) => Promise<Response>;

const SCAN_COUNT = 100;
const MGET_CHUNK_SIZE = 50;

function errorMessage(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    return String((payload as { error: unknown }).error);
  }
  return null;
}

async function kvRestCommand(
  fetchImpl: FetchLike,
  config: KvConfig,
  command: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(`${config.url}/${command}`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
  } catch {
    throw new Error(
      `KV injoignable (${config.url}). Vérifiez la connexion réseau et UPSTASH_REDIS_REST_URL.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Réponse illisible du KV (HTTP ${response.status}).`);
  }

  const reportedError = errorMessage(payload);
  if (reportedError !== null || !response.ok) {
    const detail = reportedError ?? `HTTP ${response.status}`;
    throw new Error(
      `Erreur du KV : ${detail}. Vérifiez UPSTASH_REDIS_REST_TOKEN (un jeton standard est nécessaire pour SCAN).`,
    );
  }
  if (typeof payload !== 'object' || payload === null || !('result' in payload)) {
    throw new Error('Réponse inattendue du KV (champ « result » absent).');
  }
  return (payload as { result: unknown }).result;
}

/** Lists every `inscriptions:<année>:*` key, following the SCAN cursor until it returns to `0`. */
export async function scanRegistrationKeys(
  config: KvConfig,
  year: number,
  fetchImpl: FetchLike = fetch,
): Promise<string[]> {
  if (!Number.isInteger(year) || year <= 0) {
    throw new Error(`Année invalide pour le SCAN : ${year}.`);
  }
  // `:` and `*` are legal in URL path segments, and the REST API expects the raw pattern.
  const match = `${REGISTRATION_KEY_PREFIX}:${year}:*`;
  const keys: string[] = [];
  let cursor = '0';
  do {
    const result = await kvRestCommand(
      fetchImpl,
      config,
      `scan/${cursor}/match/${match}/count/${SCAN_COUNT}`,
    );
    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      typeof result[0] !== 'string' ||
      !Array.isArray(result[1])
    ) {
      throw new Error('Réponse SCAN inattendue du KV.');
    }
    cursor = result[0];
    for (const key of result[1]) {
      if (typeof key === 'string') {
        keys.push(key);
      }
    }
  } while (cursor !== '0');
  return keys;
}

/** Reads the values of the given keys with MGET, chunked to keep the URLs short. */
export async function fetchRegistrationValues(
  config: KvConfig,
  keys: readonly string[],
  fetchImpl: FetchLike = fetch,
): Promise<(string | null)[]> {
  const values: (string | null)[] = [];
  for (let start = 0; start < keys.length; start += MGET_CHUNK_SIZE) {
    const chunk = keys.slice(start, start + MGET_CHUNK_SIZE);
    const result = await kvRestCommand(fetchImpl, config, `mget/${chunk.join('/')}`);
    if (!Array.isArray(result) || result.length !== chunk.length) {
      throw new Error('Réponse MGET inattendue du KV.');
    }
    for (const value of result) {
      values.push(typeof value === 'string' ? value : null);
    }
  }
  return values;
}

// --- Génération des fiches de suivi PDF ---

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

const SHEET_FILE_NAMES: Record<TourType, string> = {
  V: 'Suivi_parcours_a_velo.pdf',
  P: 'Suivi_parcours_a_pied.pdf',
};

const SHEET_TITLES: Record<TourType, string> = {
  V: 'Suivi des parcours à vélo',
  P: 'Suivi des parcours à pied',
};

/**
 * Writes one zone × type sheet under `<outputDir>/<zoneId>/`.
 *
 * Deliberate small duplication of `generateTrackingPdf` in
 * scripts/generate-pdfs.ts (same table layout): that script is maintained
 * separately, writes into the published `public/pdf/` folder and must not be
 * refactored here. These sheets stay out of the site and add the binome names.
 */
export function writeTrackingSheet(options: {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly kind: TourType;
  readonly rows: readonly SuiviRow[];
  readonly outputDir: string;
}): string {
  const { zoneId, zoneName, kind, rows, outputDir } = options;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`${zoneName} - ${SHEET_TITLES[kind]}`, 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [['Parcours', 'Prénom NOM', 'Prénom NOM', 'Ordures (g)', 'Tri (g)', 'Verre (g)']],
    body: rows.map((row) => [row.tourName, row.member1, row.member2, '', '', '']),
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
    startY: (doc as AutoTableDoc).lastAutoTable.finalY + 8,
    head: [['Ordures (kg)', 'Tri (kg)', 'Verre (kg)', 'Total (kg)']],
    body: [['', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [66, 135, 75] },
  });

  const zoneDir = join(outputDir, zoneId);
  mkdirSync(zoneDir, { recursive: true });
  const outputPath = join(zoneDir, SHEET_FILE_NAMES[kind]);
  doc.save(outputPath);
  return outputPath;
}

/** Writes every non-empty zone × type sheet for the given records; returns the file paths. */
export function writeTrackingSheets(
  records: readonly RegistrationRecord[],
  outputDir: string,
): string[] {
  const allTours: readonly TourEntry[] = [...toursData.vTours, ...toursData.pTours];
  const zoneIds = [...new Set(allTours.map((tour) => tour.zoneId))].sort();
  const paths: string[] = [];
  for (const zoneId of zoneIds) {
    const zone = getZone(zoneId);
    for (const kind of TOUR_TYPES) {
      const rows = rowsForZoneType(allTours, records, zoneId, kind);
      if (rows.length === 0) {
        continue;
      }
      paths.push(writeTrackingSheet({ zoneId, zoneName: zone.name, kind, rows, outputDir }));
    }
  }
  return paths;
}

// --- Interface en ligne de commande ---

export interface CliOptions {
  readonly year: number;
  readonly outDir: string | null;
}

const CLI_USAGE = 'Usage : bun scripts/extract-inscriptions.ts [--year=YYYY] [--out-dir=DIR]';

export function parseCliArgs(argv: readonly string[], defaultYear: number): CliOptions {
  let year = defaultYear;
  let outDir: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith('--year=')) {
      const raw = arg.slice('--year='.length).trim();
      if (!YEAR_PATTERN.test(raw)) {
        throw new Error(`Année invalide : « ${raw} » (format attendu : --year=YYYY).`);
      }
      year = Number(raw);
    } else if (arg.startsWith('--out-dir=')) {
      const raw = arg.slice('--out-dir='.length).trim();
      if (!raw) {
        throw new Error('Dossier de sortie vide (--out-dir=DIR).');
      }
      outDir = raw;
    } else {
      throw new Error(`Argument inconnu : « ${arg} ». ${CLI_USAGE}`);
    }
  }
  return { year, outDir };
}

const MISSING_ENV_MESSAGE = [
  'Configuration KV manquante : renseignez UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN',
  '(ou KV_REST_API_URL et KV_REST_API_TOKEN) dans apps/clean/.env.local,',
  'avec un jeton standard (les jetons lecture seule ne peuvent pas SCAN).',
  'Voir scripts/README-inscriptions.md.',
].join(' ');

async function main(argv: readonly string[]): Promise<void> {
  const options = parseCliArgs(argv, ACTION_EDITION.year);
  const config = readKvConfig(process.env);
  if (!config) {
    throw new Error(MISSING_ENV_MESSAGE);
  }

  // Every KV read happens before the first file write: a network failure leaves no partial output.
  const keys = await scanRegistrationKeys(config, options.year);
  const values = await fetchRegistrationValues(config, keys);
  const entries: KvEntry[] = keys.map((key, index) => ({ key, value: values[index] ?? null }));
  const { records, warnings } = collectRegistrations(options.year, entries);
  for (const warning of warnings) {
    console.warn(`Attention : ${warning}`);
  }

  const outDir = options.outDir ?? join(__dirname, 'output', 'inscriptions', String(options.year));
  const paths = writeTrackingSheets(records, outDir);

  // Recap without any personal data: only the year, counts and output paths.
  console.log(`Année : ${options.year}`);
  console.log(`Inscriptions extraites : ${records.length}`);
  console.log(`Clés ignorées : ${warnings.length}`);
  console.log(`Fiches de suivi générées : ${paths.length}`);
  for (const path of paths) {
    console.log(`  - ${path}`);
  }
}

/**
 * `true` when this file is the program entry point (`bun scripts/extract-inscriptions.ts`),
 * `false` when Vitest imports it to test the helpers. `import.meta.main` cannot be used:
 * the tooling tsconfig compiles this file as CommonJS.
 */
export function isDirectRun(argv: readonly string[]): boolean {
  const entry = argv[1];
  return typeof entry === 'string' && /extract-inscriptions\.ts$/.test(entry);
}

if (isDirectRun(process.argv)) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
