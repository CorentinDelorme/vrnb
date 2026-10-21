import { CURRENT_EDITION } from '../../../src/app/inscriptions/edition';
import { handleInscriptionsGet } from '../../../src/app/inscriptions/public-state';
import { handleInscriptionsPost } from '../../../src/app/inscriptions/register';
import type { UpstashConfig } from '../../../src/app/inscriptions/upstash-kv';
import {
  createUpstashInscriptionsStore,
  readUpstashConfig,
} from '../../../src/app/inscriptions/upstash-kv';
import { parcoursExists } from '../../../src/app/tours-queries';

/**
 * `/api/inscriptions` — thin adapters over the pure handlers in
 * `src/app/inscriptions/` (public-state.ts for GET, register.ts for POST):
 * they only inject the ports and the Édition config. The Upstash REST KV
 * adapter is built from the environment (bracket-form env access, per repo
 * convention) and serves both directions; credentials are validated at call
 * time by the adapter, so a missing environment degrades to the handlers'
 * JSON 502/500 instead of a crash. The Parcours catalogue (the generated
 * `tours-data.ts`) is the truth of the (Zone, Parcours) pairs: an unknown
 * pair is refused by the POST handler and ignored by the GET one. No caching
 * is opted into (no `force-static` / `revalidate`): the handlers stay dynamic
 * and never run at build time, and the POST is never statically prefetched.
 */
export function GET(): Promise<Response> {
  return handleInscriptionsGet({
    edition: CURRENT_EDITION,
    now: () => new Date(),
    parcours: parcoursExists,
    store: createUpstashInscriptionsStore(restConfig()),
  });
}

export function POST(request: Request): Promise<Response> {
  return handleInscriptionsPost(
    {
      edition: CURRENT_EDITION,
      now: () => new Date(),
      parcours: parcoursExists,
      store: createUpstashInscriptionsStore(restConfig()),
    },
    request,
  );
}

/**
 * REST credentials of the Édition's KV store, read from the environment
 * (bracket-form env access, per repo convention). A missing environment never
 * crashes the route: the adapter validates the credentials at call time, so
 * the handlers degrade to their JSON 502/500.
 */
function restConfig(): UpstashConfig {
  return readUpstashConfig(process.env) ?? { token: '', url: '' };
}
