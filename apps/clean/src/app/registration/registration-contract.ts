/**
 * HTTP contract of the registration API, shared by the Angular app, the Vercel
 * functions and the local scripts.
 *
 * Keep this module dependency-free: it is imported outside the Angular build
 * (API runtime and bun scripts), so no Angular import and no Node-only API.
 */

/** KV key prefix for every registration, followed by `<year>:<zoneId>:<tourName>`. */
export const REGISTRATION_KEY_PREFIX = 'inscriptions';

/** KV key of one covered (tour, edition), e.g. `inscriptions:2027:bruz-sud:V1`. */
export function registrationKey(year: number, zoneId: string, tourName: string): string {
  return `${REGISTRATION_KEY_PREFIX}:${year}:${zoneId}:${tourName}`;
}

/** Maximum length of each identity field, client and server side. */
export const IDENTITY_FIELD_MAX_LENGTH = 60;

/** The four identity fields of a binome; never exposed by the public API. */
export interface RegistrationIdentity {
  readonly firstName1: string;
  readonly lastName1: string;
  readonly firstName2: string;
  readonly lastName2: string;
}

/** Stored value of a registration: the four identity fields plus the context. */
export interface RegistrationRecord extends RegistrationIdentity {
  readonly year: number;
  readonly zoneId: string;
  readonly tourName: string;
}

/** A covered tour, identified by zone and tour name, without any personal data. */
export interface CoveredTour {
  readonly zoneId: string;
  readonly tourName: string;
}

/** Public `GET /api/inscriptions` response. */
export interface RegistrationStatusResponse {
  readonly year: number;
  readonly coveredTours: readonly CoveredTour[];
  /** Public Turnstile site key; empty string when the captcha is not configured. */
  readonly turnstileSiteKey: string;
}

/** `POST /api/inscriptions` request body. */
export interface RegistrationRequest extends RegistrationIdentity {
  readonly zoneId: string;
  readonly tourName: string;
  readonly commitment: boolean;
  readonly captchaToken: string;
}

/** `POST /api/inscriptions` success (201) response. */
export interface RegistrationCreatedResponse {
  readonly year: number;
  readonly zoneId: string;
  readonly tourName: string;
}

export type RegistrationErrorCode =
  'invalid_input' | 'captcha_failed' | 'closed' | 'already_registered' | 'server_error';

/** Error response body (400, 409 or 500). */
export interface RegistrationErrorResponse {
  readonly error: RegistrationErrorCode;
  /** French fallback message; the client may map the code to its own copy. */
  readonly message: string;
}
