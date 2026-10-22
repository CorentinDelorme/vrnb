/**
 * Registration pure core of `POST /api/inscriptions` (tickets #17 + #18) — the
 * write side of `public-state.ts`. One Binôme reserves a Parcours by creating
 * the KV key `inscriptions:<year>:<zone>:<tour>`, so the reservation is
 * atomic and first-come-first-served: the store only writes the key when it
 * does not exist (`SET … NX`), and a loser is answered with 409 without
 * storing anything.
 *
 * The value stores ONLY the four identity fields — the (Édition, Zone,
 * Parcours) context lives in the key itself, and no name ever leaves the
 * store (the public state of ticket #16 stays name-free). The thin Next
 * adapters live in `app/api/inscriptions/route.ts`.
 *
 * Ticket #18 hardens the handler with the three guards of the registration
 * window, all of them refusing BEFORE any write (the KV stays untouched):
 *
 * - the anti-bot honeypot: a filled hidden field means a bot → the SAME 400
 *   as any other invalid input (`invalid-inscription`), silently: the answer
 *   never names the honeypot, so a bot cannot fingerprint the trap;
 * - the registration window, both bounds with their own code: before the
 *   opening day of the Édition (`inscriptionsOpenDate`) the inscriptions are
 *   not open yet → 400 `registration-not-open`, and after the closing bound
 *   (the last registration day is `actionDate - 3`) → 400
 *   `registration-closed`;
 * - the identity validation: the four names are required, trimmed and
 *   bounded (see `validation.ts`, the bounds shared with the client), the
 *   (Zone, Parcours) pair must exist in the Parcours catalogue, and the
 *   engagement statement must be literally `true` → 400 `invalid-inscription`.
 */

import type { Edition } from './edition';
import { inscriptionsExpiryInstant, registrationWindowPhase, ttlSecondsUntil } from './edition';
import { JSON_HEADERS } from './http';
import { inscriptionKey } from './upstash-kv';
import type { BinomeIdentity, BinomeRegistration, ParcoursLookup } from './validation';
import { checkIdentityField } from './validation';

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
  /**
   * The Parcours catalogue: only a (Zone, Parcours) pair it knows can be
   * registered, so the same Parcours can never be covered twice under two
   * different keys.
   */
  readonly parcours: ParcoursLookup;
  readonly store: InscriptionsWriteStore;
}

const INVALID = { error: 'invalid-inscription' } as const;
const NOT_OPEN = { error: 'registration-not-open' } as const;
const CLOSED = { error: 'registration-closed' } as const;
const CONFLICT = { error: 'inscriptions-conflict' } as const;
const UNAVAILABLE = { error: 'inscriptions-unavailable' } as const;

/** Error body shapes — never any identity of a requester. */
type RegistrationErrorBody =
  typeof INVALID | typeof NOT_OPEN | typeof CLOSED | typeof CONFLICT | typeof UNAVAILABLE;
/** 201 body: the public (zone, tour) pair of the reservation, never names. */
interface InscriptionCreatedBody {
  readonly inscription: { readonly tourId: string; readonly zoneId: string };
}

/**
 * Whether the raw body carries a filled honeypot — the anti-bot signal of the
 * hidden field of the modal. A human never fills it; a bot that fills every
 * input of the form does.
 */
export function hasFilledHoneypot(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') return false;
  const honeypot = (payload as Record<string, unknown>)['honeypot'];
  return typeof honeypot === 'string' && honeypot.trim() !== '';
}

/**
 * Validate a raw request body into the exact registration input. The four
 * identity fields must be strings, non-blank after trimming and within the
 * shared bounds (2 to 60 characters — see `validation.ts`), the context
 * (zone, Parcours) must be plausible non-empty strings, the engagement
 * statement must be literally `true`, and the anti-bot honeypot must be empty.
 *
 * A filled honeypot is refused like any other invalid input: the answer
 * never names the honeypot, so a bot cannot fingerprint the trap (spec US7).
 */
export function parseInscriptionRegistration(payload: unknown): BinomeRegistration | null {
  if (payload === null || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  const nonEmptyTrimmed = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };
  /** The trimmed identity value, or `null` when it is not acceptable. */
  const identity = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const check = checkIdentityField(value);
    return check.error === null ? check.value : null;
  };
  // The anti-bot honeypot: a filled hidden field means a bot. It is refused
  // silently, exactly like any other invalid input.
  if (hasFilledHoneypot(payload)) return null;
  const zoneId = nonEmptyTrimmed(body['zoneId']);
  const tourId = nonEmptyTrimmed(body['tourId']);
  const firstName1 = identity(body['firstName1']);
  const lastName1 = identity(body['lastName1']);
  const firstName2 = identity(body['firstName2']);
  const lastName2 = identity(body['lastName2']);
  if (!zoneId || !tourId || !firstName1 || !lastName1 || !firstName2 || !lastName2) return null;
  if (body['engaged'] !== true) return null;
  const honeypot = body['honeypot'] === undefined ? '' : body['honeypot'];
  if (typeof honeypot !== 'string') return null;
  return {
    firstName1,
    firstName2,
    honeypot: '',
    lastName1,
    lastName2,
    tourId,
    zoneId,
  };
}

/** Serialized KV value of a registration: the four identity fields only. */
export function inscriptionStoredValue(input: BinomeRegistration): string {
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
 * Pure `POST` handler: refuse what the registration window and the anti-bot
 * honeypot forbid, then parse + validate the body and create the KV key
 * atomically. The first comer answers 201 with the public (zone, tour) pair,
 * a loser on an already covered Parcours answers 409 without storing
 * anything, a refused body answers 400 (with the distinct rejection code of
 * its cause) and a store failure answers 500 — all as no-store JSON,
 * mirroring the GET responses. Every refusal happens BEFORE the write: a
 * rejected registration never reaches the KV store.
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
  // The registration window of the Édition, both bounds with their own code
  // and neither of them storing anything: before the opening day of the
  // Édition the inscriptions are not open yet (`registration-not-open`), and
  // they close 3 days before the action date (the last registration day is
  // `actionDate - 3`, the action day itself is closed too).
  const phase = registrationWindowPhase(deps.edition, deps.now());
  if (phase === 'not-open-yet') return respond(400, NOT_OPEN);
  if (phase === 'closed') return respond(400, CLOSED);
  // The body validation: the anti-bot honeypot, the four identity fields, the
  // engagement statement and the (Zone, Parcours) pair. A filled honeypot is
  // refused silently, like any other invalid input — no dedicated code, so a
  // bot cannot fingerprint the trap. Nothing is stored.
  const registration = parseInscriptionRegistration(payload);
  if (registration === null) return respond(400, INVALID);
  // The Parcours catalogue: an unknown (Zone, Parcours) pair is refused, so
  // the same Parcours can never be covered twice under two different keys.
  if (!deps.parcours(registration.zoneId, registration.tourId)) {
    return respond(400, INVALID);
  }

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
