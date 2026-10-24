'use client';

import { useState } from 'react';

import {
  ImportResponse,
  isImportResponse,
  PracticeType,
  SCRIPT_LABELS,
  SCRIPTS,
} from '../lib/import-parcours';
import { ZONES } from '../src/app/zones';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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
      <Card className="shadow-sm p-6 max-w-xl mx-auto border">
        <CardContent>
          <form onSubmit={handleImport} className="space-y-5">
            <div className="space-y-2">
              <Select
                id="import-zone-id"
                name="zoneId"
                value={zoneId}
                onValueChange={(value) => setZoneId(value as string)}
              >
                <SelectLabel>Zone</SelectLabel>
                <SelectTrigger>
                  <SelectValue placeholder="Zone" />
                </SelectTrigger>
                <SelectContent>
                  {ZONES.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select
                id="import-parcours-type"
                name="practiceType"
                value={parcoursType}
                onValueChange={(value) => setParcoursType(value as PracticeType)}
              >
                <SelectLabel>Type de parcours</SelectLabel>
                <SelectTrigger>
                  <SelectValue placeholder="Type de parcours" />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_TYPES.map((practice) => (
                    <SelectItem key={practice.value} value={practice.value}>
                      {practice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="w-full border border-input bg-input px-2.5 py-1 text-base rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  setSelectedFiles(files);
                }}
              />
            </div>

            <Button type="submit" variant="default" className="w-full" disabled={isDisabled}>
              {importing ? 'Importation…' : 'Importer'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {importResult !== null && (
        <>
          <Card className="border border-border p-4 mt-4 space-y-3">
            <CardContent>
              <h3 className="text-sm font-semibold">Résultat de l&apos;importation</h3>
              <p className="text-sm">
                {importResult.ids.length} fichier{importResult.ids.length > 1 ? 's' : ''} importé
                {importResult.ids.length > 1 ? 's' : ''} — IDs attribués :{' '}
                {importResult.ids.join(', ')}
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
                {importResult.ids.map((id) => {
                  const allOk = Object.values(importResult.logs).every((log) => log.ok);
                  return (
                    <li key={id} className="flex items-center gap-2">
                      <Badge variant={allOk ? 'default' : 'destructive'}>
                        {allOk ? 'Succès' : 'Échec'}
                      </Badge>
                      {id}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-border p-4 mt-4 space-y-3">
            <CardContent>
              <h3 className="text-sm font-semibold mb-3">Logs des scripts de génération</h3>
              <Accordion>
                {SCRIPTS.map((script) => {
                  const log = importResult.logs[script];
                  return (
                    <AccordionItem key={script} value={script}>
                      <AccordionTrigger className="text-sm font-semibold">
                        {SCRIPT_LABELS[script]}
                      </AccordionTrigger>
                      <AccordionContent className="p-3 text-xs">
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
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}

      {apiError !== null && (
        <Card className="border border-border p-4 mt-4">
          <CardContent>
            <h3 className="text-sm font-semibold">Erreur</h3>
            <pre className="text-xs break-all">{apiError}</pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}
