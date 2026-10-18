/**
 * Pure HTTP handler of the registration API: the single test seam of the
 * server side. All side effects go through the injected `store` (atomic
 * first-come persistence) and `captcha` (Turnstile verification) ports, so it
 * runs on the Vercel Node runtime and in Vitest alike.
 */
import type { ActionEdition } from '../src/app/registration/registration-config';
import { isRegistrationOpen } from '../src/app/registration/registration-config';
import type {
  CoveredTour,
  RegistrationCreatedResponse,
  RegistrationErrorCode,
  RegistrationErrorResponse,
  RegistrationIdentity,
  RegistrationRecord,
  RegistrationStatusResponse,
} from '../src/app/registration/registration-contract';
import {
  IDENTITY_FIELD_MAX_LENGTH,
  REGISTRATION_KEY_PREFIX,
  registrationKey,
} from '../src/app/registration/registration-contract';
import { toursData } from '../src/app/tours-data';

/** Persistence port: one atomic write, one prefix read. */
export interface RegistrationStore {
  /** Atomically store only if absent; resolve false when the key already exists. */
  setIfAbsent(key: string, record: RegistrationRecord): Promise<boolean>;
  /** All records whose key starts with `prefix`. */
  list(prefix: string): Promise<RegistrationRecord[]>;
}

/** Captcha port; the real implementation calls Turnstile siteverify. */
export interface CaptchaVerifier {
  /** Resolve false for an invalid/replayed token; throw on transport failure. */
  verify(token: string, remoteIp: string | undefined): Promise<boolean>;
}

export interface HandlerDeps {
  store: RegistrationStore;
  captcha: CaptchaVerifier;
  siteKey: string;
  edition: ActionEdition;
  now?: () => Date;
}

export type HandlerInput = { method: 'GET' } | { method: 'POST'; body: unknown; remoteIp?: string };

export type HandlerResponseBody =
  RegistrationStatusResponse | RegistrationCreatedResponse | RegistrationErrorResponse;

export interface HandlerResult {
  readonly status: number;
  readonly body: HandlerResponseBody;
}

const ERROR_STATUS: Record<RegistrationErrorCode, number> = {
  invalid_input: 400,
  captcha_failed: 400,
  closed: 400,
  already_registered: 409,
  server_error: 500,
};

const ERROR_MESSAGES: Record<RegistrationErrorCode, string> = {
  invalid_input: 'Merci de vérifier les champs saisis.',
  captcha_failed: 'Captcha invalide, merci de réessayer.',
  closed: 'Les inscriptions sont closes.',
  already_registered: "Ce parcours vient d'être réservé par un autre binôme.",
  server_error: 'Une erreur est survenue, merci de réessayer plus tard.',
};

/** Error result factory, also used by the Vercel entry when dependency assembly fails. */
export function errorResult(error: RegistrationErrorCode): HandlerResult {
  return { status: ERROR_STATUS[error], body: { error, message: ERROR_MESSAGES[error] } };
}

interface ValidatedRegistration {
  readonly zoneId: string;
  readonly tourName: string;
  readonly identity: RegistrationIdentity;
  readonly captchaToken: string;
}

function trimIdentityField(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > IDENTITY_FIELD_MAX_LENGTH) {
    return undefined;
  }
  return trimmed;
}

/** Strict lookup of the (zoneId, tourName) pair in the generated tour data; no fallback. */
function tourExists(zoneId: string, tourName: string): boolean {
  return [...toursData.vTours, ...toursData.pTours].some(
    (tour) => tour.zoneId === zoneId && tour.name === tourName,
  );
}

/** Validates the unknown request body down to the fields the record keeps. */
function parseRegistrationRequest(body: unknown): ValidatedRegistration | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return undefined;
  }
  const candidate = body as Record<string, unknown>;
  const zoneId = candidate['zoneId'];
  const tourName = candidate['tourName'];
  const captchaToken = candidate['captchaToken'];
  if (
    typeof zoneId !== 'string' ||
    typeof tourName !== 'string' ||
    typeof captchaToken !== 'string'
  ) {
    return undefined;
  }
  if (candidate['commitment'] !== true) {
    return undefined;
  }
  if (!tourExists(zoneId, tourName)) {
    return undefined;
  }
  const firstName1 = trimIdentityField(candidate['firstName1']);
  const lastName1 = trimIdentityField(candidate['lastName1']);
  const firstName2 = trimIdentityField(candidate['firstName2']);
  const lastName2 = trimIdentityField(candidate['lastName2']);
  if (!firstName1 || !lastName1 || !firstName2 || !lastName2) {
    return undefined;
  }
  return {
    zoneId,
    tourName,
    captchaToken,
    identity: { firstName1, lastName1, firstName2, lastName2 },
  };
}

/** Public status: covered tours of the current edition, never a name. */
async function handleGet(deps: HandlerDeps): Promise<HandlerResult> {
  const { year } = deps.edition;
  const records = await deps.store.list(`${REGISTRATION_KEY_PREFIX}:${year}:`);
  const coveredTours: CoveredTour[] = records.map((record) => ({
    zoneId: record.zoneId,
    tourName: record.tourName,
  }));
  const body: RegistrationStatusResponse = {
    year,
    coveredTours,
    turnstileSiteKey: deps.siteKey,
  };
  return { status: 200, body };
}

async function handlePost(
  input: { body: unknown; remoteIp?: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  const registration = parseRegistrationRequest(input.body);
  if (!registration) {
    return errorResult('invalid_input');
  }

  const captchaAccepted = await deps.captcha.verify(registration.captchaToken, input.remoteIp);
  if (!captchaAccepted) {
    return errorResult('captcha_failed');
  }

  const now = deps.now?.() ?? new Date();
  if (!isRegistrationOpen(deps.edition, now)) {
    return errorResult('closed');
  }

  const { year } = deps.edition;
  const { zoneId, tourName } = registration;
  const record: RegistrationRecord = { ...registration.identity, year, zoneId, tourName };
  const created = await deps.store.setIfAbsent(registrationKey(year, zoneId, tourName), record);
  if (!created) {
    return errorResult('already_registered');
  }

  const body: RegistrationCreatedResponse = { year, zoneId, tourName };
  return { status: 201, body };
}

/**
 * Handles one `/api/inscriptions` request. Thrown errors (store, captcha,
 * anything) become a generic 500: the body never leaks a stack trace or any
 * personal data.
 */
export async function handleInscriptions(
  input: HandlerInput,
  deps: HandlerDeps,
): Promise<HandlerResult> {
  try {
    if (input.method === 'GET') {
      return await handleGet(deps);
    }
    return await handlePost(input, deps);
  } catch (error) {
    console.error('[inscriptions] Unhandled error while processing the request', error);
    return errorResult('server_error');
  }
}
