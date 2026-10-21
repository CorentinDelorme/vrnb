/**
 * Extraction of the current Édition's Inscriptions from the KV store — the
 * pure core of `scripts/extract-inscriptions.ts` (ticket #19).
 *
 * The module produces the per-Zone markdown « Fiche de suivi » files and is
 * fully injectable so the extraction runs without a network or a filesystem:
 * the KV listing comes in through the `InscriptionsStore` port defined by
 * ticket #16 and file writing through the `FicheDeSuiviFileSink` port. The thin CLI
 * adapter in `extract-inscriptions.ts` wires the Upstash REST store and the
 * real filesystem (env credentials, REST timeouts, console recap); its
 * CLI-side helpers live in `extract-inscriptions-cli.ts` (the core stays pure:
 * no `process.env`, no `node:fs`).
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
import {
  INSCRIPTIONS_RETENTION_DAYS,
  formatActionDateLabel,
} from '../src/app/inscriptions/edition';
import type { InscriptionsStore, RawInscriptionEntry } from '../src/app/inscriptions/public-state';
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
  /** How many pairs the catalogue does not know (skipped, never a Fiche de suivi). */
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
        `clé placée dans une Zone inconnue (Fiche de suivi générée sous « ${inscription.zoneId} ») : ${inscription.key}`,
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

/** The two Binôme identities joined for the Fiche de suivi's Binôme column. */
export function binomeDisplay(fields: BinomeIdentity): string {
  return [
    memberDisplay(fields.firstName1, fields.lastName1),
    memberDisplay(fields.firstName2, fields.lastName2),
  ].join(' — ');
}

/** File name of one Zone's Fiche de suivi: `Fiche_de_suivi_<zoneId>_<year>.md`. */
export function zoneFicheDeSuiviFileName(zoneId: string, year: number): string {
  return `Fiche_de_suivi_${zoneId}_${year}.md`;
}

/** File name of the empty-Édition Fiche de suivi: `Fiche_de_suivi_<year>.md`. */
export function emptyEditionFicheDeSuiviFileName(year: number): string {
  return `Fiche_de_suivi_${year}.md`;
}

const RETENTION_FOOTER =
  'Une seule inscription par Parcours ; les prénoms et noms des Binômes sont ' +
  `effacés automatiquement ${INSCRIPTIONS_RETENTION_DAYS} jours après la date de l'action.`;

/** First letter capitalized: the sheet line starts with the day name. */
function capitalizeFirst(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

const EDITION_LINES = (edition: Edition): string =>
  [
    'Édition : ' + edition.year,
    "Date de l'action : " + capitalizeFirst(formatActionDateLabel(edition.actionDate)),
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
export interface FicheDeSuiviFileSink {
  /** Create the output directory if it is missing. */
  readonly ensureDir: (dir: string) => Promise<void>;
  /** Save one Fiche de suivi into the output directory; returns its path for the recap. */
  readonly saveFile: (dir: string, fileName: string, content: string) => Promise<string>;
}

/** Injected ports and configuration of the extraction. */
export interface InscriptionsExtractionDeps {
  readonly store: InscriptionsStore;
  readonly edition: Edition;
  /** Local (gitignored) folder receiving the Fiches de suivi. */
  readonly outputDir: string;
  readonly sink: FicheDeSuiviFileSink;
  /**
   * The Parcours catalogue: a (Zone, Parcours) pair it does not know is
   * skipped (with a warning), never turned into a Fiche de suivi.
   */
  readonly parcours: ParcoursLookup;
}

/** One written Fiche de suivi, for the CLI recap. */
export interface GeneratedFicheDeSuivi {
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
  readonly fiches: readonly GeneratedFicheDeSuivi[];
  /** How many pairs the catalogue does not know (skipped, never a Fiche de suivi). */
  readonly unknownParcoursCount: number;
}

/**
 * Extract the Édition Inscriptions and write the Fiches de suivi: one file
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
  const fiches: GeneratedFicheDeSuivi[] = [];
  if (grouped.sheets.length === 0) {
    const fileName = emptyEditionFicheDeSuiviFileName(deps.edition.year);
    const path = await deps.sink.saveFile(
      deps.outputDir,
      fileName,
      renderEmptyEditionContent(deps.edition),
    );
    fiches.push({ fileName, inscriptionCount: 0, path, zoneId: null });
  }
  for (const sheet of grouped.sheets) {
    const fileName = zoneFicheDeSuiviFileName(sheet.zoneId, deps.edition.year);
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
