'use client';

import { useState } from 'react';

import { ZONES } from '../src/app/zones';

/** `P` = à pied, `V` = à vélo (see GLOSSARY: Type de parcours). */
type PracticeType = 'P' | 'V';

const PRACTICE_TYPES: readonly { readonly label: string; readonly value: PracticeType }[] = [
  { label: 'À pied', value: 'P' },
  { label: 'À vélo', value: 'V' },
];

/** URL of the Parcours import API route (ticket #42 / #43). */
const IMPORT_API_URL = '/api/import-parcours';

export function ImportParcoursForm() {
  const [zoneId, setZoneId] = useState<string>(ZONES[0]?.id ?? '');
  const [practiceType, setPracticeType] = useState<PracticeType>('P');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImport(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setApiResponse(null);
    setApiError(null);
    setImporting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(IMPORT_API_URL, { method: 'POST', body: formData });
      const body = await response.text();
      setApiResponse(body);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  }

  return (
    <form onSubmit={handleImport} className="space-y-4">
      <div>
        <label htmlFor="import-zone-id" className="label">
          <span className="label-text">Zone</span>
        </label>
        <select
          id="import-zone-id"
          name="zoneId"
          className="select select-bordered"
          value={zoneId}
          onChange={(event) => setZoneId(event.target.value)}
        >
          {ZONES.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="import-practice-type" className="label">
          <span className="label-text">Type de pratique</span>
        </label>
        <select
          id="import-practice-type"
          name="practiceType"
          className="select select-bordered"
          value={practiceType}
          onChange={(event) => setPracticeType(event.target.value as PracticeType)}
        >
          {PRACTICE_TYPES.map((practice) => (
            <option key={practice.value} value={practice.value}>
              {practice.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="import-gpx-files" className="label">
          <span className="label-text">Fichiers GPX</span>
        </label>
        <input
          id="import-gpx-files"
          name="files"
          type="file"
          multiple
          accept=".gpx"
          className="file-input file-input-bordered"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={importing}>
        {importing ? 'Importation…' : 'Importer'}
      </button>

      {apiResponse !== null && (
        <div className="card bg-base-100 border border-base-300 p-4">
          <h3 className="text-sm font-semibold">Réponse de l&apos;API</h3>
          <pre className="text-xs break-all">{apiResponse}</pre>
        </div>
      )}

      {apiError !== null && (
        <div className="card bg-base-100 border border-red-500 p-4">
          <h3 className="text-sm font-semibold text-red-700">Erreur</h3>
          <pre className="text-xs break-all">{apiError}</pre>
        </div>
      )}
    </form>
  );
}
