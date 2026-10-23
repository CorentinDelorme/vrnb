import { mkdir, readdir, writeFile } from 'fs/promises';
import { notFound } from 'next/navigation';
import { join } from 'path';

import { toursData } from '../../../src/app/tours-data';

/**
 * `POST /api/import-parcours` — Parcours import API (tickets #42, #43, #44).
 *
 * Protected by `NODE_ENV === 'development'`: in any other environment the route
 * answers 404 via `notFound()`. In development it accepts a `FormData` carrying
 * `zoneId`, `practiceType` ('P' | 'V') and `files` (multiple GPX files),
 * attributes each file a Parcours id (`<lettre><numero>`, e.g. `V16`), writes
 * the GPX trace to `public/gpx/<zone>/<id>/<id>.gpx` and answers `200` with
 * the list of assigned ids `{ ids: [...] }`.
 */
export async function POST(request: Request): Promise<Response> {
  return handleImportParcours(request);
}

/** A practice type chosen by the user on the import form. */
type PracticeType = 'P' | 'V';

const GPX_ROOT = join(process.cwd(), 'public/gpx');

/** Matches a Parcours folder name `V16` / `P14` and captures letter + number. */
const PARCOURS_ID_REGEX = /^(P|V)(\d+)$/;

/** Builds a JSON response with the given status and body. */
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status,
  });
}

/** Whether a raw value is a valid practice type. */
function isPracticeType(value: unknown): value is PracticeType {
  return value === 'P' || value === 'V';
}

/**
 * The numbers already taken for `practiceType` in `zoneId`, collected from two
 * sources: the `public/gpx/<zone>/` folders and the generated catalogue
 * `tours-data.ts` (vTours / pTours filtered by zoneId).
 */
async function takenNumbers(zoneId: string, practiceType: PracticeType): Promise<number[]> {
  const numbers: number[] = [];

  const zoneDir = join(GPX_ROOT, zoneId);
  let entries: readonly string[] = [];
  try {
    entries = await readdir(zoneDir);
  } catch {
    // The zone folder does not exist yet: nothing taken on disk.
    entries = [];
  }
  for (const entry of entries) {
    const match = PARCOURS_ID_REGEX.exec(entry);
    if (match && match[1] === practiceType) {
      numbers.push(Number(match[2]));
    }
  }

  const tours = practiceType === 'V' ? toursData.vTours : toursData.pTours;
  for (const tour of tours) {
    if (tour.zoneId !== zoneId) {
      continue;
    }
    const match = PARCOURS_ID_REGEX.exec(tour.name);
    if (match && match[1] === practiceType) {
      numbers.push(Number(match[2]));
    }
  }

  return numbers;
}

/** Pure handler over the incoming request. */
async function handleImportParcours(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const formData = await request.formData();
  const zoneIdRaw = formData.get('zoneId');
  const practiceTypeRaw = formData.get('practiceType');
  const fileEntries = formData.getAll('files');

  const zoneId =
    typeof zoneIdRaw === 'string' && zoneIdRaw.length > 0 ? zoneIdRaw : undefined;
  const practiceType = isPracticeType(practiceTypeRaw) ? practiceTypeRaw : undefined;
  const files = fileEntries.filter((entry): entry is File => entry instanceof File);

  if (!zoneId || !practiceType || files.length === 0) {
    return json(400, { error: 'invalid-import-parcours' });
  }

  const taken = await takenNumbers(zoneId, practiceType);
  let nextNumber = taken.length > 0 ? Math.max(...taken) + 1 : 1;

  const ids: string[] = [];
  for (const file of files) {
    const id = `${practiceType}${nextNumber}`;
    ids.push(id);

    const idDir = join(GPX_ROOT, zoneId, id);
    await mkdir(idDir, { recursive: true });
    await writeFile(join(idDir, `${id}.gpx`), await file.text());

    nextNumber += 1;
  }

  return json(200, { ids });
}
