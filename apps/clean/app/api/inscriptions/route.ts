import { CURRENT_EDITION } from '../../../src/app/inscriptions/edition';
import { handleInscriptionsGet } from '../../../src/app/inscriptions/public-state';
import { handleInscriptionsPost } from '../../../src/app/inscriptions/register';
import { createUpstashInscriptionsStore } from '../../../src/app/inscriptions/upstash-kv';

/**
 * `/api/inscriptions` — thin adapters over the pure handlers in
 * `src/app/inscriptions/` (public-state.ts for GET, register.ts for POST):
 * they only inject the ports and the Édition config. The Upstash REST KV
 * adapter is built from the environment (bracket-form env access, per repo
 * convention) and serves both directions; credentials are validated at call
 * time by the adapter, so a missing environment degrades to the handlers'
 * JSON 502/500 instead of a crash. No caching is opted into (no
 * `force-static` / `revalidate`): the handlers stay dynamic and never run at
 * build time, and the POST is never statically prefetched.
 */
export function GET(): Promise<Response> {
  return handleInscriptionsGet({
    edition: CURRENT_EDITION,
    now: () => new Date(),
    store: createUpstashInscriptionsStore(restConfig()),
  });
}

export function POST(request: Request): Promise<Response> {
  return handleInscriptionsPost(
    {
      edition: CURRENT_EDITION,
      now: () => new Date(),
      store: createUpstashInscriptionsStore(restConfig()),
    },
    request,
  );
}

/** REST credentials of the Édition's KV store, read from the environment. */
function restConfig(): { token: string; url: string } {
  return {
    token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
    url: process.env['UPSTASH_REDIS_REST_URL'] ?? '',
  };
}
