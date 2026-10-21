/**
 * Extraction of the current Édition's Inscriptions from the KV store — the
 * pure core of `scripts/extract-inscriptions.ts` (ticket #19).
 *
 * The module produces the per-Zone markdown « Fiche de suivi » files and is
 * fully injectable so the extraction runs without a network or a filesystem:
 * the KV listing comes in through the `InscriptionsStore` port defined by
 * ticket #16 and file writing through the `FicheFileSink` port. The thin CLI
 * adapter in `extract-inscriptions.ts` wires the Upstash REST store and the
 * real filesystem (env credentials, REST timeouts, console recap).
 *
 * Defensive policy — the stored value shape is owned by the POST side
 * (ticket #17), so only the four Binôme identity fields are read when
 * present, extra or unknown JSON keys are tolerated, and unusable records
 * are skipped with a key-only French warning. The stored value is never
 * echoed anywhere: the console recap and the warnings never leak personal
 * data. The KV key `inscriptions:<year>:<zoneId>:<tourId>` (parsed by
 * `parseInscriptionKey`) stays the single truth for the (zoneId, Parcours,
 * Édition) context — the value only contributes the names.
 */

import type { Edition } from '../src/app/inscriptions/edition';
import { EDITION_TIME_ZONE } from '../src/app/inscriptions/edition';
import type { InscriptionsStore, RawInscriptionEntry } from '../src/app/inscriptions/public-state';
import type { RestFetch, UpstashConfig } from '../src/app/inscriptions/upstash-kv';
import { parseInscriptionKey } from '../src/app/inscriptions/upstash-kv';
import type { BinomeIdentity, ParcoursLookup } from '../src/app/inscriptions/validation';
import { ZONES } from '../src/app/zones';

// --- Parsed inscriptions ---

/**
 * One usable Inscription: the KV key provides the zone, Parcours and Édition
 * context, the parsed value provides the Binôme.
 */
export interface BinomeInscription extends BinomeIdentity {
  readonly key: string;
  readonly zoneId: string;
  readonly tourId: string;
}

/** A stored name field is usable only as a non-empty string (trimmed). */
function trimmedStringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Parse one stored value into the Binôme identity; `null` whenever the JSON
 * is missing any of the four name fields (garbage is skipped downstream with
 * a warning). Unknown keys are tolerated: the POST side owns the remaining
 * fields and may evolve them without breaking this extraction.
 */
export function parseInscriptionBinome(value: string): BinomeIdentity | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const stored = parsed as Record<string, unknown>;
  const firstName1 = trimmedStringField(stored['firstName1']);
  const lastName1 = trimmedStringField(stored['lastName1']);
  const firstName2 = trimmedStringField(stored['firstName2']);
  const lastName2 = trimmedStringField(stored['lastName2']);
  if (firstName1 === null || lastName1 === null || firstName2 === null || lastName2 === null) {
    return null;
  }
  return { firstName1, firstName2, lastName1, lastName2 };
}

/** The usable Édition inscriptions plus the French, key-only skip warnings. */
export interface CollectedInscriptions {
  readonly inscriptions: readonly BinomeInscription[];
  readonly warnings: readonly string[];
  /** How many pairs the catalogue does not know (skipped, never a fiche). */
  readonly unknownParcoursCount: number;
}

/**
 * Map a raw listing to usable Inscriptions of the Édition year. The KV key is
 * authoritative: keys that do not parse are warned and skipped, keys of any
 * other year are skipped silently (they simply belong to another Édition —
 * they live on until their TTL expires, that is expected), duplicate keys
 * (SCAN may emit them) keep their first value, values without the four name
 * fields are warned and skipped, and a (Zone, Parcours) pair the catalogue
 * does not know is warned and skipped too — an unknown pair is not a real
 * Parcours, so it must never become a Fiche de suivi. The run never stops on
 * one bad record.
 */
export function collectInscriptions(
  entries: readonly RawInscriptionEntry[],
  editionYear: number,
  parcours: ParcoursLookup,
): CollectedInscriptions {
  const inscriptions: BinomeInscription[] = [];
  const warnings: string[] = [];
  const seenKeys = new Set<string>();
  let unknownParcoursCount = 0;
  for (const entry of entries) {
    const parsedKey = parseInscriptionKey(entry.key);
    if (parsedKey === null) {
      warnings.push(`clé ignorée (format inattendu) : ${entry.key}`);
      continue;
    }
    if (parsedKey.year !== editionYear) {
      continue;
    }
    if (seenKeys.has(entry.key)) {
      warnings.push(`clé en double ignorée : ${entry.key}`);
      continue;
    }
    if (!parcours(parsedKey.zoneId, parsedKey.tourId)) {
      warnings.push(`clé ignorée (parcours inconnu du catalogue) : ${entry.key}`);
      unknownParcoursCount += 1;
      continue;
    }
    const binome = parseInscriptionBinome(entry.value);
    if (binome === null) {
      warnings.push(`clé ignorée (valeur illisible ou Binôme incomplet) : ${entry.key}`);
      continue;
    }
    seenKeys.add(entry.key);
    inscriptions.push({
      ...binome,
      key: entry.key,
      tourId: parsedKey.tourId,
      zoneId: parsedKey.zoneId,
    });
  }
  return { inscriptions, unknownParcoursCount, warnings };
}

// --- Zone grouping and sheet rendering ---

/** Inscriptions of one Zone, sorted by Parcours, under its display name. */
export interface ZoneInscriptionSheet {
  readonly zoneId: string;
  /**
   * French display name of the Zone; the raw zone id when the key targets a
   * Zone that `ZONES` does not know (preserved so no registration is lost).
   */
  readonly zoneName: string;
  readonly inscriptions: readonly BinomeInscription[];
}

/** Zone grouping outcome: the sheets plus the unknown-Zone warnings. */
export interface GroupedInscriptions {
  readonly sheets: readonly ZoneInscriptionSheet[];
  readonly warnings: readonly string[];
}

/** Group the Inscriptions by their Zone, sorted; unknown Zones keep their id. */
export function groupInscriptionsByZone(
  inscriptions: readonly BinomeInscription[],
): GroupedInscriptions {
  const warnings: string[] = [];
  const byZoneId = new Map<string, BinomeInscription[]>();
  for (const inscription of inscriptions) {
    if (!ZONES.some((zone) => zone.id === inscription.zoneId)) {
      warnings.push(
        `clé placée dans une Zone inconnue (fiche générée sous « ${inscription.zoneId} ») : ${inscription.key}`,
      );
    }
    const bucket = byZoneId.get(inscription.zoneId) ?? [];
    bucket.push(inscription);
    byZoneId.set(inscription.zoneId, bucket);
  }
  const sortedZoneIds = [...byZoneId.keys()].sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  );
  return {
    sheets: sortedZoneIds.map((zoneId) => ({
      inscriptions: (byZoneId.get(zoneId) ?? []).sort((a, b) =>
        a.tourId.localeCompare(b.tourId, 'en', { numeric: true }),
      ),
      zoneId,
      zoneName: ZONES.find((zone) => zone.id === zoneId)?.name ?? zoneId,
    })),
    warnings,
  };
}

/** `Dimanche 14 février 2027` for an `YYYY-MM-DD` action date, in the Édition zone. */
export function formatEditionactionDate(actionDate: string): string {
  const instant = new Date(`${actionDate}T12:00:00Z`);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Date de l'action de l'Édition invalide : ${actionDate}`);
  }
  const label = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: EDITION_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
  }).format(instant);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

/**
 * Markdown table cell: pipes are escaped and control characters collapsed, so
 * a volunteer's name can never break the table layout.
 */
function markdownCell(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

/** `Prénom NOM` display of one Binôme member, like the printed sheet header. */
function memberDisplay(firstName: string, lastName: string): string {
  return `${markdownCell(firstName)} ${markdownCell(lastName).toUpperCase()}`;
}

/** The two Binôme identities joined for the fiche's Binôme column. */
export function binomeDisplay(fields: BinomeFields): string {
  return [
    memberDisplay(fields.firstName1, fields.lastName1),
    memberDisplay(fields.firstName2, fields.lastName2),
  ].join(' — ');
}

/** File name of one Zone's fiche: `Fiche_de_suivi_<zoneId>_<year>.md`. */
export function zoneFicheFileName(zoneId: string, year: number): string {
  return `Fiche_de_suivi_${zoneId}_${year}.md`;
}

/** File name of the empty-Édition state: `Fiche_de_suivi_<year>.md`. */
export function emptyEditionFicheFileName(year: number): string {
  return `Fiche_de_suivi_${year}.md`;
}

const RETENTION_FOOTER =
  'Une seule inscription par Parcours ; les prénoms et noms des Binômes sont ' +
  "effacés automatiquement 90 jours après la date de l'action.";

const EDITION_LINES = (edition: Edition): string =>
  [
    'Édition : ' + edition.year,
    "Date de l'action : " + formatEditionactionDate(edition.actionDate),
  ].join('\n');

/** Markdown content of one Zone's « Fiche de suivi ». */
export function renderZoneInscriptionsContent(
  sheet: ZoneInscriptionSheet,
  edition: Edition,
): string {
  const rows = sheet.inscriptions.map(
    (inscription) => `| ${markdownCell(inscription.tourId)} | ${binomeDisplay(inscription)} |`,
  );
  return [
    `# Fiche de suivi — ${markdownCell(sheet.zoneName)}`,
    '',
    EDITION_LINES(edition),
    '',
    '| Parcours | Binôme |',
    '| -------- | ------ |',
    ...rows,
    '',
    RETENTION_FOOTER,
    '',
  ].join('\n');
}

/** Markdown content of the whole-Édition empty state (no registration yet). */
export function renderEmptyEditionContent(edition: Edition): string {
  return [
    `# Fiche de suivi — Édition ${edition.year}`,
    '',
    EDITION_LINES(edition),
    '',
    `Aucune inscription pour l'édition ${edition.year}.`,
    '',
  ].join('\n');
}

// --- Sheet writing ---

/** Writing port: keeps the generation free of `node:fs` so tests record in memory. */
export interface FicheFileSink {
  /** Create the output directory if it is missing. */
  readonly ensureDir: (dir: string) => Promise<void>;
  /** Save one fiche into the output directory; returns its path for the recap. */
  readonly saveFile: (dir: string, fileName: string, content: string) => Promise<string>;
}

/** Injected ports and configuration of the extraction. */
export interface InscriptionsExtractionDeps {
  readonly store: InscriptionsStore;
  readonly edition: Edition;
  /** Local (gitignored) folder receiving the fiches. */
  readonly outputDir: string;
  readonly sink: FicheFileSink;
  /**
   * The Parcours catalogue: a (Zone, Parcours) pair it does not know is
   * skipped (with a warning), never turned into a Fiche de suivi.
   */
  readonly parcours: ParcoursLookup;
}

/** One written fiche, for the CLI recap. */
export interface GeneratedFiche {
  readonly fileName: string;
  readonly path: string;
  /** `null` for the whole-Édition empty state, which is not Zone-specific. */
  readonly zoneId: string | null;
  readonly inscriptionCount: number;
}

/** Extraction result: every written file plus the warnings and counts. */
export interface InscriptionsExtractionOutcome {
  readonly inscriptions: readonly BinomeInscription[];
  readonly warnings: readonly string[];
  readonly fiches: readonly GeneratedFiche[];
  /** How many pairs the catalogue does not know (skipped, never a fiche). */
  readonly unknownParcoursCount: number;
}

/**
 * Extract the Édition Inscriptions and write the fiches de suivi: one file
 * per Zone with at least one inscription, or a single empty-Édition file
 * when nothing usable is registered (so the run always leaves a tangible
 * trace). All KV reads happen before the first write: a store failure leaves
 * no partial output.
 */
export async function extractInscriptionSheets(
  deps: InscriptionsExtractionDeps,
): Promise<InscriptionsExtractionOutcome> {
  // All KV reads happen before the first write: an inventory failure leaves no partial output.
  const listings = await deps.store.listAll(deps.edition.year);
  const collected = collectInscriptions(listings, deps.edition.year, deps.parcours);
  const grouped = groupInscriptionsByZone(collected.inscriptions);
  await deps.sink.ensureDir(deps.outputDir);
  const fiches: GeneratedFiche[] = [];
  if (grouped.sheets.length === 0) {
    const fileName = emptyEditionFicheFileName(deps.edition.year);
    const path = await deps.sink.saveFile(
      deps.outputDir,
      fileName,
      renderEmptyEditionContent(deps.edition),
    );
    fiches.push({ fileName, inscriptionCount: 0, path, zoneId: null });
  }
  for (const sheet of grouped.sheets) {
    const fileName = zoneFicheFileName(sheet.zoneId, deps.edition.year);
    const path = await deps.sink.saveFile(
      deps.outputDir,
      fileName,
      renderZoneInscriptionsContent(sheet, deps.edition),
    );
    fiches.push({
      fileName,
      inscriptionCount: sheet.inscriptions.length,
      path,
      zoneId: sheet.zoneId,
    });
  }
  return {
    fiches,
    inscriptions: collected.inscriptions,
    unknownParcoursCount: collected.unknownParcoursCount,
    warnings: [...collected.warnings, ...grouped.warnings],
  };
}

// --- CLI-config helpers (pure, unit-tested here; the CLI wires them) ---

/** The KV credentials of the extraction: env-var names shared with the API. */
export function readInscriptionsKvConfig(
  env: Readonly<Record<string, string | undefined>>,
): UpstashConfig | null {
  const url = env['UPSTASH_REDIS_REST_URL']?.trim();
  const token = env['UPSTASH_REDIS_REST_TOKEN']?.trim();
  if (!url || !token) {
    return null;
  }
  return { token, url };
}

/**
 * Fetch with a hard timeout: the Upstash REST adapter has no per-command
 * deadline of its own (ticket #16 reuse), so the CLI wraps its injected
 * fetch — a wedged REST call (dropped connection, stalled proxy) aborts the
 * extraction with a controlled error instead of freezing it forever.
 */
export function fetchWithTimeout(restFetch: RestFetch, timeoutMs: number): RestFetch {
  return (input, init) => restFetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

/** Parsed `--out-dir=DIR` options of the extraction command. */
export interface ExtractedCliArgs {
  readonly outDir: string | null;
}

const OUT_DIR_FLAG = '--out-dir=';
/** Usage line printed verbatim in the unknown-argument error. */
export const EXTRACT_USAGE = 'Usage : bun scripts/extract-inscriptions.ts [--out-dir=DIR]';

/** Parse the CLI options; only `--out-dir` is overridable, the Édition defines the year. */
export function parseInscriptionsExtractArgs(argv: readonly string[]): ExtractedCliArgs {
  let outDir: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith(OUT_DIR_FLAG)) {
      const value = arg.slice(OUT_DIR_FLAG.length).trim();
      if (outDir !== null) {
        throw new Error(`Option --out-dir dupliquée. ${EXTRACT_USAGE}`);
      }
      if (!value) {
        throw new Error(`Option --out-dir vide (dossier de sortie attendu). ${EXTRACT_USAGE}`);
      }
      outDir = value;
      continue;
    }
    throw new Error(`Argument inconnu : « ${arg} ». ${EXTRACT_USAGE}`);
  }
  return { outDir };
}
