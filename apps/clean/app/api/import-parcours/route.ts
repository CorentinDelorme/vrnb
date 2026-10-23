import { spawnSync } from 'child_process';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { toursData } from '../../../src/app/tours-data';
import {
  GenerationLogs,
  PracticeType,
  ScriptLog,
} from '../../../lib/import-parcours';

/**
 * `POST /api/import-parcours` — Parcours import API (tickets #42, #43, #44).
 *
 * Protected by `NODE_ENV === 'development'`: in any other environment the route
 * answers 404 via a `Response`. In development it accepts a `FormData` carrying
 * `zoneId`, `practiceType` ('P' | 'V') and `files` (multiple GPX files),
 * attributes each file a Parcours id (`<lettre><numero>`, e.g. `V16`), writes
 * the GPX trace to `public/gpx/<zone>/<id>/<id>.gpx` and answers `200` with
 * the list of assigned ids `{ ids: [...] }` and the generation logs.
 */
export async function POST(request: Request): Promise<Response> {
  return handleImportParcours(request);
}

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
 * Launch one generation script synchronously (`bun tsx scripts/<file>
 * --zone=<zone> --tour=<ids>`) and capture its stdout and stderr (the
 * `[perf]` block is printed to stdout at the end of each run).
 */
function runGenerationScript(file: string, zoneId: string, tourIds: string[]): ScriptLog {
  const scriptsRoot = join(process.cwd(), 'scripts');
  const result = spawnSync(
    'bun',
    ['tsx', join(scriptsRoot, file), `--zone=${zoneId}`, `--tour=${tourIds.join(',')}`],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', ok: result.status === 0 };
}

/**
 * Launch the three generation scripts sequentially (one after the other),
 * filtered on the zone and the imported ids, and aggregate the stdout and
 * stderr of each. Order per spec: routes → tours → pdfs.
 */
function runGenerationScripts(zoneId: string, tourIds: string[]): GenerationLogs {
  return {
    'generate:routes': runGenerationScript('generate-start-end-gpx.ts', zoneId, tourIds),
    'generate:tours': runGenerationScript('generate-tours.ts', zoneId, tourIds),
    'generate:pdfs': runGenerationScript('generate-pdfs.ts', zoneId, tourIds),
  };
}

/**
 * Offsets de numérotation par zone : chaque zone dispose d'une marge de 100
 * identifiants (bruz-sud: 1–99, bruz-vau-gaillard: 100–199,
 * bruz-ker-lann: 200–299) afin que les Parcours d'une zone n'empiètent jamais
 * sur ceux d'une autre.
 */
const ZONE_ID_OFFSETS: Readonly<Record<string, number>> = {
  'bruz-sud': 0,
  'bruz-vau-gaillard': 100,
  'bruz-ker-lann': 200,
};

/** Offset de numérotation d'une zone (0 par défaut pour une zone inconnue). */
function zoneIdOffset(zoneId: string): number {
  return ZONE_ID_OFFSETS[zoneId] ?? 0;
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

/**
 * The next free number for `practiceType` in `zoneId`, within the zone's
 * 100-ID margin. Bruz Sud (offset 0) starts at 1 because there is no P0/V0;
 * the other zones start at their offset (Vau Gaillard at 100, Ker Lann at 200).
 * Throws `ZoneCapacityError` when every slot of the zone is taken.
 */
class ZoneCapacityError extends Error {
  constructor(readonly zoneId: string, readonly practiceType: PracticeType) {
    super(`Zone ${zoneId} is full for practice ${practiceType}`);
    this.name = 'ZoneCapacityError';
  }
}

function nextFreeNumber(zoneId: string, practiceType: PracticeType, taken: number[]): number {
  const offset = zoneIdOffset(zoneId);
  // Bruz Sud starts at 1 (no P0/V0); every other zone starts at its offset.
  const start = offset === 0 ? 1 : offset;
  const end = offset + 99;
  const takenSet = new Set(taken);

  for (let n = start; n <= end; n += 1) {
    if (!takenSet.has(n)) {
      return n;
    }
  }

  throw new ZoneCapacityError(zoneId, practiceType);
}

/** Pure handler over the incoming request. */
async function handleImportParcours(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }

  const formData = await request.formData();
  const zoneIdRaw = formData.get('zoneId');
  const practiceTypeRaw = formData.get('practiceType');
  const fileEntries = formData.getAll('files');

  const zoneId = typeof zoneIdRaw === 'string' && zoneIdRaw.length > 0 ? zoneIdRaw : undefined;
  const practiceType = isPracticeType(practiceTypeRaw) ? practiceTypeRaw : undefined;
  const files = fileEntries.filter((entry): entry is File => entry instanceof File);

  if (!zoneId || !practiceType || files.length === 0) {
    return json(400, { error: 'invalid-import-parcours' });
  }

  const taken = await takenNumbers(zoneId, practiceType);
  const takenSet = new Set(taken);

  const ids: string[] = [];
  try {
    let nextNumber = nextFreeNumber(zoneId, practiceType, Array.from(takenSet));
    for (const file of files) {
      const id = `${practiceType}${nextNumber}`;
      ids.push(id);
      takenSet.add(nextNumber);

      const idDir = join(GPX_ROOT, zoneId, id);
      await mkdir(idDir, { recursive: true });
      await writeFile(join(idDir, `${id}.gpx`), await file.text());

      // Compute the next number before the next file so a full zone raises
      // ZoneCapacityError instead of spilling into the next zone's margin.
      nextNumber = nextFreeNumber(zoneId, practiceType, Array.from(takenSet));
    }
  } catch (error) {
    if (error instanceof ZoneCapacityError) {
      return json(400, {
        error: 'zone-capacity-exceeded',
        zoneId,
        practiceType,
        message: `Zone ${zoneId} is full for practice ${practiceType} (${error.message})`,
      });
    }
    throw error;
  }

  const logs = runGenerationScripts(zoneId, ids);

  return json(200, { ids, logs });
}
