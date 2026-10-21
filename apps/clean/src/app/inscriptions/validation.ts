/**
 * Shared contract of a Binôme registration — the single source of the rules
 * enforced by BOTH sides of `POST /api/inscriptions` (ticket #18):
 *
 * - the identity bounds: the client never sends what the server would reject,
 *   and the server refuses exactly what the client refuses to send;
 * - the French labels of the four identity fields (the modal's input labels)
 *   and the per-field error reasons (the modal's inline feedback);
 * - the rejection codes of a 400 answer (the modal maps each of them to its
 *   own explicit French message);
 * - the shape of a registration: the browser client builds it, the POST
 *   handler parses it, the extraction script narrows it to the identity it
 *   reads — one declaration, never redeclared under another name.
 *
 * Client-safe pure module (no server-only dependency): it is imported by the
 * POST handler (`register.ts`), by the browser client (`inscriptions-client.ts`)
 * and by the registration modal (`components/register-binome-modal.tsx`).
 */

/**
 * The registration of a Binôme: its four identity fields, the (Zone,
 * Parcours) context it covers and the hidden anti-bot honeypot. The
 * engagement statement is a request check, never a stored value, so it is
 * not part of this shape — the server checks it on the raw body.
 */
export interface BinomeRegistration {
  readonly firstName1: string;
  readonly firstName2: string;
  /**
   * The hidden anti-bot field of the modal (ticket #18): empty for a human,
   * filled by a bot — the server refuses a filled one without storing
   * anything.
   */
  readonly honeypot: string;
  readonly lastName1: string;
  readonly lastName2: string;
  readonly tourId: string;
  readonly zoneId: string;
}

/**
 * The identity of a Binôme — the narrowing of a registration to the four
 * names, i.e. the only personal data ever stored. The extraction script and
 * the stored value use it; nobody redeclares the four fields.
 */
export type BinomeIdentity = Pick<
  BinomeRegistration,
  'firstName1' | 'firstName2' | 'lastName1' | 'lastName2'
>;

/**
 * The catalogue lookup port: does the (Zone, Parcours) pair exist in the
 * real Parcours catalogue? The server refuses any other pair, so a POST can
 * never cover the same Parcours twice under two different keys.
 */
export type ParcoursLookup = (zoneId: string, tourId: string) => boolean;

/**
 * Minimum length of an identity field, counted on the trimmed value: a name
 * of one character is a typo, not an identity (2 characters minimum).
 */
export const IDENTITY_FIELD_MIN_LENGTH = 2;

/**
 * Maximum length of an identity field, counted on the trimmed value: a name
 * longer than 60 characters is not a name (and would bloat the stored value).
 */
export const IDENTITY_FIELD_MAX_LENGTH = 60;

/** The four identity fields of a Binôme, in the modal's form order. */
export const IDENTITY_FIELDS = ['firstName1', 'lastName1', 'firstName2', 'lastName2'] as const;

/** One identity field of the registration form. */
export type IdentityField = (typeof IDENTITY_FIELDS)[number];

/** French labels of the identity fields — the modal's input labels. */
export const IDENTITY_FIELD_LABELS: Readonly<Record<IdentityField, string>> = {
  firstName1: 'Prénom du membre 1',
  firstName2: 'Prénom du membre 2',
  lastName1: 'Nom du membre 1',
  lastName2: 'Nom du membre 2',
};

/** Why an identity field is not acceptable. */
export type IdentityFieldError = 'required' | 'too-short' | 'too-long';

/** The trimmed value of an identity field and why it is refused (`null`: valid). */
export interface IdentityFieldCheck {
  readonly error: IdentityFieldError | null;
  readonly value: string;
}

/**
 * Check one identity field: the value is trimmed first, then bounded by the
 * shared lengths. A blank value (or a blank-after-trim one) is `required` —
 * the same verdict on both sides of the API.
 */
export function checkIdentityField(raw: string): IdentityFieldCheck {
  const value = raw.trim();
  if (value === '') return { error: 'required', value };
  if (value.length < IDENTITY_FIELD_MIN_LENGTH) return { error: 'too-short', value };
  if (value.length > IDENTITY_FIELD_MAX_LENGTH) return { error: 'too-long', value };
  return { error: null, value };
}

/** Whether one identity field is acceptable (trimmed and within the bounds). */
export function isValidIdentityField(raw: string): boolean {
  return checkIdentityField(raw).error === null;
}

/** The four trimmed identity values and the per-field errors of a form. */
export interface IdentityCheck {
  /** The offending fields only — an absent field is a valid one. */
  readonly errors: Readonly<Partial<Record<IdentityField, IdentityFieldError>>>;
  /** The trimmed values, ready to be posted. */
  readonly values: Readonly<Record<IdentityField, string>>;
}

/**
 * Check the four identity fields of a form at once: the trimmed values and
 * the per-field errors. Used by the modal to gate its submit and to show the
 * inline feedback of each field.
 */
export function checkIdentityFields(
  values: Readonly<Record<IdentityField, string>>,
): IdentityCheck {
  const errors: Partial<Record<IdentityField, IdentityFieldError>> = {};
  const trimmed = {} as Record<IdentityField, string>;
  for (const field of IDENTITY_FIELDS) {
    const check = checkIdentityField(values[field]);
    trimmed[field] = check.value;
    if (check.error !== null) errors[field] = check.error;
  }
  return { errors, values: trimmed };
}

/**
 * The rejection codes of a 400 answer of the POST endpoint — the distinct
 * statuses the server refuses a registration for:
 *
 * - `invalid-inscription`: the body does not hold an acceptable registration
 *   (missing, blank or over-long identity field, missing engagement
 *   statement, unknown (Zone, Parcours) pair, filled anti-bot honeypot — the
 *   honeypot is refused silently, without any dedicated code, so a bot
 *   cannot fingerprint it);
 * - `registration-closed`: the registration window is closed — it closes 3
 *   days before the action date of the Édition.
 */
export type RegistrationRejection = 'invalid-inscription' | 'registration-closed';

/** Whether a string is one of the rejection codes of a 400 answer. */
export function isRegistrationRejection(value: string): value is RegistrationRejection {
  return value === 'invalid-inscription' || value === 'registration-closed';
}
