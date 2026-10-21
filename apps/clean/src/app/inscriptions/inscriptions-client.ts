/**
 * Browser client of the inscriptions endpoints — fetches the relative
 * `GET /api/inscriptions` URL and deserializes the response into the trichotomy
 * the home provider consumes: `loading` before the request resolves (handled by
 * the provider) and a success/error outcome afterwards. Pure module with an
 * injectable fetch, so unit tests script the exchange without a network.
 * Ticket #17 reuses `fetchInscriptionsOutcome` (and its URL constant) when
 * registering a Binôme, and adds the POST side with the same seams.
 */

import type { TourRef } from '../tours-queries';
import type { Edition } from './edition';
import type { InscriptionsPublicState } from './public-state';

/** Relative URL of the public statuses endpoint (same origin as the app). */
export const INSCRIPTIONS_API_URL = '/api/inscriptions';

/** Outcome of a statuses fetch: a validated public state, or an error. */
export type InscriptionsOutcome =
  | { readonly state: InscriptionsPublicState; readonly status: 'success' }
  | { readonly status: 'error' };

/** Injectable fetch (defaults to the browser one). */
export type ClientFetch = (input: URL | string) => Promise<Response>;

/**
 * Fetch and deserialize the public inscriptions state. A failing HTTP status,
 * a network error or a malformed payload all degrade to the same error
 * outcome — the UI then renders the page without any badge.
 */
export async function fetchInscriptionsOutcome(
  fetchImpl: ClientFetch = fetch,
): Promise<InscriptionsOutcome> {
  try {
    const response = await fetchImpl(INSCRIPTIONS_API_URL);
    if (!response.ok) return { status: 'error' };
    const state = parseInscriptionsState(await response.json());
    return state === null ? { status: 'error' } : { state, status: 'success' };
  } catch {
    return { status: 'error' };
  }
}

/** Deserialize a JSON payload; `null` when the public state shape is wrong. */
export function parseInscriptionsState(payload: unknown): InscriptionsPublicState | null {
  if (payload === null || typeof payload !== 'object') return null;
  const { edition, inscriptions, registrationOpen } = payload as {
    edition?: unknown;
    inscriptions?: unknown;
    registrationOpen?: unknown;
  };
  if (
    !isEdition(edition) ||
    typeof registrationOpen !== 'boolean' ||
    !Array.isArray(inscriptions)
  ) {
    return null;
  }
  const tourRefs = inscriptions.filter(isTourRef);
  return { edition, inscriptions: tourRefs, registrationOpen };
}

/** Narrow the Édition field of the public state. */
function isEdition(value: unknown): value is Edition {
  if (value === null || typeof value !== 'object') return false;
  const { actionDate, year } = value as { actionDate?: unknown; year?: unknown };
  return typeof actionDate === 'string' && typeof year === 'number';
}

/** Narrow one (zone, Parcours) row of the public state. */
function isTourRef(value: unknown): value is TourRef {
  if (value === null || typeof value !== 'object') return false;
  const { tourId, zoneId } = value as { tourId?: unknown; zoneId?: unknown };
  return typeof tourId === 'string' && tourId !== '' && typeof zoneId === 'string' && zoneId !== '';
}

/** Registration a Binôme submits from the home page (identity + context). */
export interface BinomeRegistration {
  readonly firstName1: string;
  readonly firstName2: string;
  readonly lastName1: string;
  readonly lastName2: string;
  readonly tourId: string;
  readonly zoneId: string;
}

/**
 * Outcome of a registration POST, the mirror of the handler's contract:
 * `created` (201), `taken` (409 — the Parcours is covered), `invalid` (400 —
 * the form is not acceptable) and `error` (anything else: 500, network
 * failure). Distinct enough for the modal's basic feedback; per-status
 * messaging is ticket #18's scope.
 */
export type RegistrationOutcome =
  | { readonly status: 'created' }
  | { readonly status: 'taken' }
  | { readonly status: 'invalid' }
  | { readonly status: 'error' };

/**
 * Exact JSON body of `POST /api/inscriptions` — the single source of the
 * contract keys on the client side. `engaged` is always `true` (the checkbox
 * gates the submit call) and `honeypot` is always an empty string for this
 * ticket (the anti-bot enforcement is ticket #18; the server accepts the
 * shape today).
 */
export function registrationRequestBody(registration: BinomeRegistration): string {
  return JSON.stringify({
    engaged: true,
    firstName1: registration.firstName1,
    firstName2: registration.firstName2,
    honeypot: '',
    lastName1: registration.lastName1,
    lastName2: registration.lastName2,
    tourId: registration.tourId,
    zoneId: registration.zoneId,
  });
}

/**
 * Post a Binôme registration and deserialize the handler's status codes into
 * the outcome above. A malformed or missing 201 body does not change the
 * `created` outcome: the status code, not the body, carries the result (and
 * no personal name is ever expected back).
 */
export async function postRegistration(
  registration: BinomeRegistration,
  fetchImpl: ClientFetch = fetch,
): Promise<RegistrationOutcome> {
  try {
    const response = await fetchImpl(INSCRIPTIONS_API_URL, {
      body: registrationRequestBody(registration),
      headers: { 'content-type': 'application/json; charset=utf-8' },
      method: 'POST',
    });
    if (response.status === 201) return { status: 'created' };
    if (response.status === 409) return { status: 'taken' };
    if (response.status === 400) return { status: 'invalid' };
    return { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}
