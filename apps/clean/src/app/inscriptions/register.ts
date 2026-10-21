/**
 * Registration pure core of `POST /api/inscriptions` (ticket #17) — the write
 * side of `public-state.ts`. One Binôme reserves a Parcours by creating the KV
 * key `inscriptions:<year>:<zone>:<tour>`, so the reservation is atomic and
 * first-come-first-served: the store only writes the key when it does not
 * exist (`SET … NX`), and a loser is answered with 409 without storing
 * anything.
 *
 * The value stores ONLY the four identity fields — the (Édition, Zone,
 * Parcours) context lives in the key itself, and no name ever leaves the
 * store (the public state of ticket #16 stays name-free). The thin Next
 * adapters live in `app/api/inscriptions/route.ts`.
 *
 * Seams kept open for ticket #18, which hardens this handler: it will refuse
 * a filled `honeypot` (anti-bot) and a closed registration window with 400,
 * and will tighten the field length bounds — all inside the validator below.
 */

import type { Edition } from './edition';
import { inscriptionsExpiryInstant, ttlSecondsUntil } from './edition';
import { inscriptionKey } from './upstash-kv';

/** Body the client sends to register a Binôme (exact contract keys). */
export interface BinomeRegistrationInput {
  readonly engaged: boolean;
  readonly firstName1: string;
  readonly firstName2: string;
  readonly honeypot: string;
  readonly lastName1: string;
  readonly lastName2: string;
  readonly tourId: string;
  readonly zoneId: string;
}

/**
 * Persisted identity of the registered Binôme: the four trimmed fields only.
 * The engagement flag and the honeypot are request checks, never stored
 * values, and the (year, zone, tour) context stays implicit in the key —
 * "never store more than identity + context" (spec).
 */
export interface BinomeIdentity {
  readonly firstName1: string;
  readonly firstName2: string;
  readonly lastName1: string;
  readonly lastName2: string;
}

/**
 * Write port of the pure handler over any KV backend (Upstash REST for prod).
 * `setIfAbsent` must behave like `SET key value NX EX <seconds>`: it resolves
 * `true` when the caller won the race and stored `value`, `false` when the
 * key already existed (the Parcours is covered), and rejects only when the
 * store itself fails.
 */
export interface InscriptionsWriteStore {
  readonly setIfAbsent: (key: string, value: string, expiresIn: number) => Promise<boolean>;
}

/** Injected ports + config of the pure POST handler. */
export interface InscriptionsRegistrationDeps {
  readonly edition: Edition;
  /** Injectable clock: the key TTL is computed against "now". */
  readonly now: () => Date;
  readonly store: InscriptionsWriteStore;
}

const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
} as const;

const INVALID = { error: 'invalid-inscription' } as const;
const CONFLICT = { error: 'inscriptions-conflict' } as const;
const UNAVAILABLE = { error: 'inscriptions-unavailable' } as const;

/** Error body shapes — never any identity of a requester. */
type RegistrationErrorBody = typeof INVALID | typeof CONFLICT | typeof UNAVAILABLE;
/** 201 body: the public (zone, tour) pair of the reservation, never names. */
interface InscriptionCreatedBody {
  readonly inscription: { readonly tourId: string; readonly zoneId: string };
}

/**
 * Validate a raw request body into the exact registration input. Ticket #17
 * scope: the four identity fields must be non-empty strings after trimming,
 * the context (zone, Parcours) must be plausible non-empty strings, and the
 * engagement statement must be literally `true`. A `honeypot` field is
 * tolerated in any form for now (the client of this ticket always sends an
 * empty string) — enforce its emptiness and the length bounds in ticket #18.
 */
export function parseInscriptionRegistration(payload: unknown): BinomeRegistrationInput | null {
  if (payload === null || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  const nonEmptyTrimmed = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };
  const zoneId = nonEmptyTrimmed(body['zoneId']);
  const tourId = nonEmptyTrimmed(body['tourId']);
  const firstName1 = nonEmptyTrimmed(body['firstName1']);
  const lastName1 = nonEmptyTrimmed(body['lastName1']);
  const firstName2 = nonEmptyTrimmed(body['firstName2']);
  const lastName2 = nonEmptyTrimmed(body['lastName2']);
  if (!zoneId || !tourId || !firstName1 || !lastName1 || !firstName2 || !lastName2) return null;
  if (body['engaged'] !== true) return null;
  const honeypot = body['honeypot'] === undefined ? '' : body['honeypot'];
  if (typeof honeypot !== 'string') return null;
  return {
    engaged: true,
    firstName1,
    firstName2,
    honeypot,
    lastName1,
    lastName2,
    tourId,
    zoneId,
  };
}

/** Serialized KV value of a registration: the four identity fields only. */
export function inscriptionStoredValue(input: BinomeRegistrationInput): string {
  const identity: BinomeIdentity = {
    firstName1: input.firstName1,
    firstName2: input.firstName2,
    lastName1: input.lastName1,
    lastName2: input.lastName2,
  };
  return JSON.stringify(identity);
}

/**
 * TTL of a created key at creation time: whole seconds from `now` to the
 * erasure deadline (see `INSCRIPTIONS_RETENTION_DAYS` in `edition.ts`).
 */
export function registrationExpiresIn(edition: Edition, now: Date): number {
  return ttlSecondsUntil(inscriptionsExpiryInstant(edition), now);
}

/**
 * Pure `POST` handler: parse + validate the body, then create the KV key
 * atomically. The first comer answers 201 with the public (zone, tour) pair,
 * a loser on an already covered Parcours answers 409 without storing
 * anything, an invalid body answers 400 and a store failure answers 500 —
 * all as no-store JSON, mirroring the GET responses.
 */
export async function handleInscriptionsPost(
  deps: InscriptionsRegistrationDeps,
  request: Request,
): Promise<Response> {
  const respond = (status: number, body: InscriptionCreatedBody | RegistrationErrorBody) =>
    new Response(JSON.stringify(body), { headers: JSON_HEADERS, status });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return respond(400, INVALID);
  }
  const registration = parseInscriptionRegistration(payload);
  if (registration === null) return respond(400, INVALID);

  const key = inscriptionKey(deps.edition.year, registration.zoneId, registration.tourId);
  try {
    const stored = await deps.store.setIfAbsent(
      key,
      inscriptionStoredValue(registration),
      registrationExpiresIn(deps.edition, deps.now()),
    );
    if (!stored) return respond(409, CONFLICT);
    const body: InscriptionCreatedBody = {
      inscription: { tourId: registration.tourId, zoneId: registration.zoneId },
    };
    return respond(201, body);
  } catch {
    return respond(500, UNAVAILABLE);
  }
}
