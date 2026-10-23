import { notFound } from 'next/navigation';

/**
 * `POST /api/import-parcours` — skeleton of the Parcours import API (ticket #42).
 *
 * Protected by `NODE_ENV === 'development'`: in any other environment the route
 * answers 404 via `notFound()`. In development it accepts a `FormData` carrying
 * GPX files and a `zoneId` field, and answers `200` with an empty JSON `{}`.
 * GPX writing and Parcours ID attribution are deferred to ticket #44.
 */
export async function POST(request: Request): Promise<Response> {
  return handleImportParcours(request);
}

/** Pure handler skeleton over the incoming request. */
async function handleImportParcours(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  // The `zoneId` form field is accepted as part of the import contract; GPX
  // files are received but not yet written (ticket #44).
  const formData = await request.formData();
  const zoneId = formData.get('zoneId');
  void zoneId;

  return new Response(JSON.stringify({}), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status: 200,
  });
}
