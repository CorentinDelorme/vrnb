import { CURRENT_EDITION } from '../../../src/app/inscriptions/edition';
import { handleInscriptionsGet } from '../../../src/app/inscriptions/public-state';
import { createUpstashInscriptionsStore } from '../../../src/app/inscriptions/upstash-kv';

/**
 * `GET /api/inscriptions` — thin adapter over the pure handler in
 * `src/app/inscriptions/public-state.ts`. It only injects the ports: the
 * Upstash REST KV reading port built from the environment (bracket-form env
 * access, per repo convention) and the Édition config. Credentials are
 * validated at call time by the adapter, so a missing environment degrades to
 * the handler's JSON 502 instead of a crash. No caching is opted into (no
 * `force-static` / `revalidate`): the handler stays dynamic and never runs at
 * build time.
 */
export function GET(): Promise<Response> {
  return handleInscriptionsGet({
    edition: CURRENT_EDITION,
    now: () => new Date(),
    store: createUpstashInscriptionsStore({
      token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
      url: process.env['UPSTASH_REDIS_REST_URL'] ?? '',
    }),
  });
}
