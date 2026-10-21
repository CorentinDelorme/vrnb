/**
 * Browser client of the public inscriptions state — fetches the relative
 * `GET /api/inscriptions` URL and deserializes the response into the trichotomy
 * the home provider consumes: `loading` before the request resolves (handled by
 * the provider) and a success/error outcome afterwards. Pure module with an
 * injectable fetch, so unit tests script the exchange without a network.
 * Ticket #17 reuses `fetchInscriptionsOutcome` (and its URL constant) when
 * registering a Binôme.
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
