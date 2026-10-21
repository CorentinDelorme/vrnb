/**
 * Public state of the Inscriptions for the Édition — the pure core of
 * `GET /api/inscriptions` (ticket #16).
 *
 * The module is server-agnostic (no `process.env`, no `next` import) so it
 * stays unit-testable: it reads a raw KV listing through the
 * `InscriptionsStore` port and returns validated public data. Names are never
 * read from the stored values — Binôme identities stay in the store, the
 * response only exposes (zone, Parcours) pairs. The thin Next adapter lives
 * in `app/api/inscriptions/route.ts`; ticket #17 adds the write side.
 *
 * The coverage of a Parcours is decided by its KEY, never by the stored
 * value: the key carries the whole (Édition, Zone, Parcours) context, and the
 * value only carries the Binôme identity — or nothing at all, when the key was
 * seeded by hand in the Upstash console (the referent workflow). Such a key
 * covers its Parcours all the same, which is why the GET never parses the
 * values at all.
 */

import type { TourRef } from '../tours-queries';
import type { Edition } from './edition';
import { isRegistrationOpen } from './edition';
import { JSON_HEADERS } from './http';
import { parseInscriptionKey } from './upstash-kv';
import type { ParcoursLookup } from './validation';

/** One stored inscription as read from the KV store, before any validation. */
export interface RawInscriptionEntry {
  /** Redis key `inscriptions:<year>:<zone>:<tour-name>` (or garbage). */
  readonly key: string;
  /**
   * Raw JSON blob of the entry (may be malformed, or empty when the key was
   * seeded by hand). Only the referent extraction script reads it — the
   * public state decides the coverage from the key alone.
   */
  readonly value: string;
}

/** Reading port of the pure handler over any KV backend (.Upstash for prod). */
export interface InscriptionsStore {
  /** Every stored entry for the edition `year`, keys and values as strings. */
  readonly listAll: (year: number) => Promise<readonly RawInscriptionEntry[]>;
}

/** Public body of `GET /api/inscriptions` — no personal names, ever. */
export interface InscriptionsPublicState {
  readonly edition: Edition;
  /** Registration for the Édition is open until 3 days before the action date. */
  readonly registrationOpen: boolean;
  /** Names-free list of covered (zone, Parcours) pairs, sorted for stability. */
  readonly inscriptions: readonly TourRef[];
}

/** Injected ports + config of the pure handler. */
export interface InscriptionsHandlerDeps {
  readonly store: InscriptionsStore;
  readonly edition: Edition;
  /** Injectable clock so tests control "today". */
  readonly now: () => Date;
  /**
   * The Parcours catalogue: only the pairs it knows are exposed, so a bogus
   * legacy key can never pollute the public state.
   */
  readonly parcours: ParcoursLookup;
}

/**
 * Map one stored entry to its (zone, tour) pair; `null` when the key is not a
 * valid inscription key of this Édition or the pair is unknown to the Parcours
 * catalogue (a bogus legacy key is ignored, never exposed).
 *
 * The stored value is never read: the coverage comes from the key alone, so a
 * key seeded by hand in the Upstash console (empty or garbage value) covers
 * its Parcours exactly like a key written by the POST handler.
 */
export function readInscriptionEntry(
  entry: RawInscriptionEntry,
  editionYear: number,
  parcours: ParcoursLookup,
): TourRef | null {
  const parsedKey = parseInscriptionKey(entry.key);
  if (parsedKey === null || parsedKey.year !== editionYear) return null;
  if (!parcours(parsedKey.zoneId, parsedKey.tourId)) return null;
  return { tourId: parsedKey.tourId, zoneId: parsedKey.zoneId };
}

/** Zone first, then Parcours with numeric-aware order (V2 before V10). */
function byZoneThenTour(a: TourRef, b: TourRef): number {
  return (
    a.zoneId.localeCompare(b.zoneId, 'en', { numeric: true }) ||
    a.tourId.localeCompare(b.tourId, 'en', { numeric: true })
  );
}

/**
 * Compute the public inscriptions state of the Édition: an empty store yields
 * an empty list (still valid JSON), entries whose key is malformed or foreign
 * are silently skipped, and only the (Zone, Parcours) pairs the catalogue
 * knows are exposed.
 */
export async function getInscriptionsState(
  deps: InscriptionsHandlerDeps,
): Promise<InscriptionsPublicState> {
  const entries = await deps.store.listAll(deps.edition.year);
  const inscriptions = entries
    .map((entry) => readInscriptionEntry(entry, deps.edition.year, deps.parcours))
    .filter((inscription): inscription is TourRef => inscription !== null)
    .sort(byZoneThenTour);
  return {
    edition: deps.edition,
    inscriptions,
    registrationOpen: isRegistrationOpen(deps.edition, deps.now()),
  };
}

/** Body of the degraded response when the store is unreachable. */
const UNAVAILABLE = { error: 'inscriptions-unavailable' } as const;

/**
 * Pure `GET` handler: returns the public state as a JSON `Response`, or a
 * JSON 502 when the KV adapter fails — the response shape stays valid JSON in
 * both cases so any client can parse the outcome. No caching: route handlers
 * of this app stay dynamic by default (see `route.ts`).
 */
export async function handleInscriptionsGet(deps: InscriptionsHandlerDeps): Promise<Response> {
  try {
    const state = await getInscriptionsState(deps);
    return new Response(JSON.stringify(state), { headers: JSON_HEADERS, status: 200 });
  } catch {
    return new Response(JSON.stringify(UNAVAILABLE), { headers: JSON_HEADERS, status: 502 });
  }
}
