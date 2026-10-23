/**
 * Shared types and constants for the Parcours import feature (tickets #42-#46).
 *
 * Kept in a single module so the API route (`app/api/import-parcours/route.ts`)
 * and the import form (`components/import-parcours-form.tsx`) agree on the
 * response shape without duplicating code.
 */

export type PracticeType = 'P' | 'V';

/** Name of a generation script as exposed in the API response logs. */
export type ScriptName = 'generate:routes' | 'generate:tours' | 'generate:pdfs';

/** Captured stdout/stderr of a single generation script run. */
export interface ScriptLog {
  readonly stdout: string;
  readonly stderr: string;
  readonly ok: boolean;
}

/** The full log payload of the import: one entry per generation script. */
export type GenerationLogs = {
  readonly [name in ScriptName]: ScriptLog;
}

/** Parsed answer of `POST /api/import-parcours`. */
export interface ImportResponse {
  readonly ids: readonly string[];
  readonly logs: GenerationLogs;
}

/** Friendly French label of each generation script, displayed in the logs UI. */
export const SCRIPT_LABELS: Readonly<Record<ScriptName, string>> = {
  'generate:routes': 'Tronçons de parcours (start/end)',
  'generate:tours': 'Parcours et catalogue',
  'generate:pdfs': 'Fiches PDF',
};

/** Generation scripts in the order the API runs them. */
export const SCRIPTS: readonly ScriptName[] = ['generate:routes', 'generate:tours', 'generate:pdfs'];

export function isScriptLog(value: unknown): value is ScriptLog {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ScriptLog).stdout === 'string' &&
    typeof (value as ScriptLog).stderr === 'string' &&
    typeof (value as ScriptLog).ok === 'boolean'
  );
}

export function isImportResponse(value: unknown): value is ImportResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { ids, logs } = value as ImportResponse;
  return (
    Array.isArray(ids) &&
    ids.every((id): id is string => typeof id === 'string') &&
    typeof logs === 'object' &&
    logs !== null &&
    Object.values(logs).every(isScriptLog)
  );
}
