'use client';

import { useState } from 'react';

import { ZONES } from '../src/app/zones';
import {
  ImportResponse,
  PracticeType,
  SCRIPT_LABELS,
  SCRIPTS,
  isImportResponse,
} from '../lib/import-parcours';

/** URL of the Parcours import API route (ticket #42 / #43). */
const IMPORT_API_URL = '/api/import-parcours';

/** `P` = à pied, `V` = à vélo (see GLOSSARY: Type de parcours). */
const PRACTICE_TYPES: readonly { readonly label: string; readonly value: PracticeType }[] = [
  { label: 'À pied', value: 'P' },
  { label: 'À vélo', value: 'V' },
];

export function ImportParcoursForm() {
  const [zoneId, setZoneId] = useState<string>(ZONES[0]?.id ?? '');
  const [parcoursType, setParcoursType] = useState<PracticeType>('P');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  /** The import button is disabled until at least one GPX file is selected. */
  const isDisabled = importing || selectedFiles.length === 0;

  async function handleImport(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setImportResult(null);
    setApiError(null);
    setImporting(true);

    const formData = new FormData();
    formData.append('zoneId', zoneId);
    formData.append('practiceType', parcoursType);
    for (const file of selectedFiles) {
      formData.append('files', file);
    }

    try {
      const response = await fetch(IMPORT_API_URL, { method: 'POST', body: formData });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          body && typeof body === 'object' && 'error' in body
            ? String(body.error)
            : `Échec de l&apos;importation (HTTP ${response.status})`;
        setApiError(message);
        return;
      }

      if (!isImportResponse(body)) {
        setApiError('Réponse de l’API inattendue');
        return;
      }

      setImportResult(body);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="card bg-base-100 shadow-sm p-6 space-y-5 max-w-xl mx-auto">
        <form onSubmit={handleImport} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="import-zone-id" className="label">
              <span className="label-text">Zone</span>
            </label>
            <select
              id="import-zone-id"
              name="zoneId"
              className="select select-bordered w-full"
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

          <div className="space-y-2">
            <label htmlFor="import-parcours-type" className="label">
              <span className="label-text">Type de parcours</span>
            </label>
            <select
              id="import-parcours-type"
              name="practiceType"
              className="select select-bordered w-full"
              value={parcoursType}
              onChange={(event) => setParcoursType(event.target.value as PracticeType)}
            >
              {PRACTICE_TYPES.map((practice) => (
                <option key={practice.value} value={practice.value}>
                  {practice.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="import-gpx-files" className="label">
              <span className="label-text">Fichiers GPX</span>
            </label>
            <input
              id="import-gpx-files"
              name="files"
              type="file"
              multiple
              accept=".gpx"
              className="file-input file-input-bordered w-full"
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                setSelectedFiles(files);
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isDisabled}
          >
            {importing ? 'Importation…' : 'Importer'}
          </button>
        </form>
      </div>

      {importResult !== null && (
        <>
          <div className="card bg-base-100 border border-base-300 p-4 mt-4 space-y-3">
            <h3 className="text-sm font-semibold">Résultat de l&apos;importation</h3>
            <p className="text-sm">
              {importResult.ids.length} fichier{importResult.ids.length > 1 ? 's' : ''} importé
              {importResult.ids.length > 1 ? 's' : ''} — IDs attribués :{' '}
              {importResult.ids.join(', ')}
            </p>
            <ul className="list list-disc list-inside mt-3 space-y-1 text-sm">
              {importResult.ids.map((id) => {
                const allOk = Object.values(importResult.logs).every((log) => log.ok);
                return (
                  <li key={id} className="flex items-center gap-2">
                    <span className={`badge badge-sm ${allOk ? 'badge-success' : 'badge-error'}`}>
                      {allOk ? 'Succès' : 'Échec'}
                    </span>
                    {id}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card bg-base-100 border border-base-300 p-4 mt-4 space-y-3">
            <h3 className="text-sm font-semibold mb-3">Logs des scripts de génération</h3>
            {SCRIPTS.map((script) => {
              const log = importResult.logs[script];
              return (
                <details
                  key={script}
                  className="collapse collapse-arrow border-b border-base-300 last:border-b-0"
                  aria-label={`Logs du script ${script}`}
                >
                  <summary className="collapse-title text-sm font-semibold">
                    {SCRIPT_LABELS[script]}
                  </summary>
                  <div className="collapse-content p-3 text-xs">
                    {log.stdout !== '' && (
                      <>
                        <div className="font-mono mb-1">stdout</div>
                        <pre className="font-mono whitespace-pre-wrap break-all mb-2">
                          {log.stdout}
                        </pre>
                      </>
                    )}
                    {log.stderr !== '' && (
                      <>
                        <div className="font-mono mb-1">stderr</div>
                        <pre className="font-mono whitespace-pre-wrap break-all">
                          {log.stderr}
                        </pre>
                      </>
                    )}
                    {log.stdout === '' && log.stderr === '' && (
                      <p className="text-xs">Aucune sortie de ce script.</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}

      {apiError !== null && (
        <div className="card bg-base-100 border border-base-300 p-4 mt-4">
          <h3 className="text-sm font-semibold">Erreur</h3>
          <pre className="text-xs break-all">{apiError}</pre>
        </div>
      )}
    </>
  );
}
