/**
 * Extraction of the current Édition's Inscriptions from the KV store — the
 * pure core of `scripts/extract-inscriptions.ts` (ticket #19).
 *
 * The module produces the per-Zone « Suivi » sheets (the printed tracking
 * sheets, with the binômes of the registered Parcours) and is fully
 * injectable so the extraction runs without a network or a filesystem: the KV
 * listing comes in through the `InscriptionsStore` port defined by ticket #16,
 * the Parcours catalogue through `CatalogueTour[]` and the writing through the
 * `SuiviSheetSink` port. The thin CLI adapter in `extract-inscriptions.ts`
 * wires the Upstash REST store, the PDF renderer (`scripts/suivi-pdf.ts`) and
 * the real filesystem (env credentials, REST timeouts, console recap); its
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

import { join } from 'node:path';

import type { Edition } from '../src/app/inscriptions/edition';
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

// --- Suivi sheets (the printed tracking sheets, PDF) ---

/**
 * One tour of the Parcours catalogue, with its practice type: the sheets list
 * every tour of a Zone, the registered ones carrying their binôme.
 */
export interface CatalogueTour {
  readonly zoneId: string;
  /** `V` = à vélo, `P` = à pied. */
  readonly practice: 'V' | 'P';
  readonly tourId: string;
}

/**
 * One row of a Suivi sheet: the tour and the two members of the binôme that
 * covers it. Both members are empty when the Parcours is still free.
 */
export interface SuiviSheetRow {
  readonly tourId: string;
  readonly member1: string;
  readonly member2: string;
}

/** One Suivi sheet: a Zone, a practice type and the rows to print. */
export interface SuiviSheet {
  readonly zoneId: string;
  /** French display name of the Zone; the raw zone id for an unknown Zone. */
  readonly zoneName: string;
  readonly practice: 'V' | 'P';
  /** File name of the sheet: `Suivi_parcours_a_velo.pdf` / `..._a_pied.pdf`. */
  readonly fileName: string;
  readonly rows: readonly SuiviSheetRow[];
  readonly edition: Edition;
}

/** `Prénom NOM` display of one binôme member, like the printed sheet header. */
function memberDisplay(firstName: string, lastName: string): string {
  const first = firstName.replace(/\s+/g, ' ').trim();
  const last = lastName.replace(/\s+/g, ' ').trim().toUpperCase();
  return `${first} ${last}`.trim();
}

/** File name of one Zone's tracking sheet for a practice type. */
export function suiviSheetFileName(practice: 'V' | 'P'): string {
  return practice === 'V' ? 'Suivi_parcours_a_velo.pdf' : 'Suivi_parcours_a_pied.pdf';
}

/**
 * Build the Suivi sheets of the Édition: one per Zone and practice type that
 * has tours — like the tracking sheets the site used to publish, but filled
 * with the binômes of the real inscriptions and never published.
 *
 * The catalogue drives the rows (every tour of the Zone, in the catalogue
 * order); the inscriptions only fill the two name columns.
 */
export function buildSuiviSheets(
  tours: readonly CatalogueTour[],
  inscriptions: readonly BinomeInscription[],
  edition: Edition,
): SuiviSheet[] {
  const byParcours = new Map<string, BinomeInscription>();
  for (const inscription of inscriptions) {
    byParcours.set(`${inscription.zoneId}:${inscription.tourId}`, inscription);
  }

  const grouped = new Map<string, CatalogueTour[]>();
  for (const tour of tours) {
    const key = `${tour.zoneId}:${tour.practice}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(tour);
    grouped.set(key, bucket);
  }

  const sheets: SuiviSheet[] = [];
  for (const [key, zoneTours] of grouped) {
    const [zoneId, practice] = key.split(':') as [string, 'V' | 'P'];
    sheets.push({
      edition,
      fileName: suiviSheetFileName(practice),
      practice,
      rows: zoneTours.map((tour) => {
        const inscription = byParcours.get(`${tour.zoneId}:${tour.tourId}`);
        return {
          member1:
            inscription === undefined
              ? ''
              : memberDisplay(inscription.firstName1, inscription.lastName1),
          member2:
            inscription === undefined
              ? ''
              : memberDisplay(inscription.firstName2, inscription.lastName2),
          tourId: tour.tourId,
        };
      }),
      zoneId,
      zoneName: ZONES.find((zone) => zone.id === zoneId)?.name ?? zoneId,
    });
  }
  return sheets;
}

// --- Sheet writing ---

/**
 * Writing port: keeps the generation free of `node:fs` and of the PDF
 * renderer, so the tests record the sheets in memory.
 */
export interface SuiviSheetSink {
  /** Create the output directory if it is missing. */
  readonly ensureDir: (dir: string) => Promise<void>;
  /** Render one sheet as a PDF and save it; returns its path for the recap. */
  readonly saveSheet: (dir: string, sheet: SuiviSheet) => Promise<string>;
}

/** Injected ports and configuration of the extraction. */
export interface InscriptionsExtractionDeps {
  readonly store: InscriptionsStore;
  readonly edition: Edition;
  /** Local (gitignored) folder receiving the Suivi sheets. */
  readonly outputDir: string;
  readonly sink: SuiviSheetSink;
  /** The Parcours catalogue: the sheets list its tours, in its order. */
  readonly tours: readonly CatalogueTour[];
  /**
   * The Parcours catalogue lookup: a (Zone, Parcours) pair it does not know is
   * skipped (with a warning), never written in a sheet.
   */
  readonly parcours: ParcoursLookup;
}

/** One written Suivi sheet, for the CLI recap. */
export interface GeneratedSuiviSheet {
  readonly fileName: string;
  readonly path: string;
  readonly zoneId: string;
  readonly practice: 'V' | 'P';
  /** How many binômes the sheet carries (the covered tours). */
  readonly inscriptionCount: number;
}

/** Extraction result: every written sheet plus the warnings and counts. */
export interface InscriptionsExtractionOutcome {
  readonly inscriptions: readonly BinomeInscription[];
  readonly warnings: readonly string[];
  readonly sheets: readonly GeneratedSuiviSheet[];
  /** How many pairs the catalogue does not know (skipped, never a sheet). */
  readonly unknownParcoursCount: number;
}

/**
 * Extract the Édition Inscriptions and write the Suivi sheets: one PDF per
 * Zone and practice type, with the binômes of the registered Parcours filled
 * in. All KV reads happen before the first write: a store failure leaves no
 * partial output.
 */
export async function extractSuiviSheets(
  deps: InscriptionsExtractionDeps,
): Promise<InscriptionsExtractionOutcome> {
  // All KV reads happen before the first write: an inventory failure leaves no partial output.
  const listings = await deps.store.listAll(deps.edition.year);
  const collected = collectInscriptions(listings, deps.edition.year, deps.parcours);
  const warnings = [...collected.warnings];
  for (const inscription of collected.inscriptions) {
    if (!ZONES.some((zone) => zone.id === inscription.zoneId)) {
      warnings.push(
        `clé placée dans une Zone inconnue (Suivi générée sous « ${inscription.zoneId} ») : ${inscription.key}`,
      );
    }
  }
  const sheets = buildSuiviSheets(deps.tours, collected.inscriptions, deps.edition);
  const written: GeneratedSuiviSheet[] = [];
  for (const sheet of sheets) {
    const zoneDir = join(deps.outputDir, sheet.zoneId);
    await deps.sink.ensureDir(zoneDir);
    const path = await deps.sink.saveSheet(zoneDir, sheet);
    written.push({
      fileName: sheet.fileName,
      inscriptionCount: sheet.rows.filter((row) => row.member1 !== '').length,
      path,
      practice: sheet.practice,
      zoneId: sheet.zoneId,
    });
  }
  return {
    inscriptions: collected.inscriptions,
    sheets: written,
    unknownParcoursCount: collected.unknownParcoursCount,
    warnings,
  };
}
