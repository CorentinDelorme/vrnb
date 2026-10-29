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
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Field, FieldContent, FieldGroup, FieldLabel } from './ui/field';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
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

const ZONE_ITEMS = ZONES.map((zone) => ({ label: zone.name, value: zone.id }));

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

  const CARD_CLASSES = 'w-full max-w-3xl mx-auto';

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full items-center">
      <Card className={CARD_CLASSES}>
        <CardHeader>
          <CardTitle>Import de parcours</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleImport} className="w-full">
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="import-zone-id">Zone</FieldLabel>
                  <FieldContent>
                    <Select
                      id="import-zone-id"
                      name="zoneId"
                      value={zoneId}
                      onValueChange={(value) => setZoneId(value as string)}
                      items={ZONE_ITEMS}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ZONE_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="import-parcours-type">Type de parcours</FieldLabel>
                  <FieldContent>
                    <Select
                      id="import-parcours-type"
                      name="practiceType"
                      value={parcoursType}
                      onValueChange={(value) => setParcoursType(value as PracticeType)}
                      items={PRACTICE_TYPES}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type de parcours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PRACTICE_TYPES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="import-gpx-files">Fichiers GPX</FieldLabel>
                <FieldContent>
                  <Input
                    id="import-gpx-files"
                    name="files"
                    type="file"
                    multiple
                    accept=".gpx"
                    onChange={(event) => {
                      const files = event.target.files ? Array.from(event.target.files) : [];
                      setSelectedFiles(files);
                    }}
                  />
                </FieldContent>
              </Field>

              <Field orientation="horizontal">
                <Button type="submit" variant="default" className="w-full" disabled={isDisabled}>
                  {importing ? 'Importation…' : 'Importer'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {importResult !== null && (
        <>
          <Card className={CARD_CLASSES}>
            <CardHeader>
              <CardTitle>Résultat de l&apos;importation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {importResult.ids.length} fichier{importResult.ids.length > 1 ? 's' : ''} importé
                {importResult.ids.length > 1 ? 's' : ''} — IDs attribués :{' '}
                {importResult.ids.join(', ')}
              </p>
              <ul className="list-disc list-inside mt-3 flex flex-col gap-1 text-sm">
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

          <Card className={CARD_CLASSES}>
            <CardHeader>
              <CardTitle>Logs des scripts de génération</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion multiple>
                {SCRIPTS.map((script) => {
                  const log = importResult.logs[script];
                  return (
                    <AccordionItem key={script} value={script}>
                      <AccordionTrigger className="text-sm font-semibold">
                        {SCRIPT_LABELS[script]}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs">
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
        <div className="w-full max-w-3xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              <pre className="text-xs break-all">{apiError}</pre>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
