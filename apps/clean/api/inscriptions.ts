/**
 * Vercel Function entry for `/api/inscriptions` (Node.js runtime).
 *
 * Thin adapter over the pure handler: parses the Web `Request`/`Response`
 * boundary and assembles the dependencies per request, so a missing
 * environment variable yields a JSON 500 instead of an import-time crash.
 */
import type { HandlerDeps, HandlerInput, HandlerResult } from '../server/inscriptions-handler';
import { errorResult, handleInscriptions } from '../server/inscriptions-handler';
import { createUpstashStore } from '../server/kv';
import { createTurnstileVerifier } from '../server/turnstile';
import { ACTION_EDITION } from '../src/app/registration/registration-config';

function createDeps(): HandlerDeps {
  return {
    store: createUpstashStore(process.env),
    captcha: createTurnstileVerifier(process.env),
    siteKey: process.env['TURNSTILE_SITE_KEY'] ?? '',
    edition: ACTION_EDITION,
  };
}

function toResponse(result: HandlerResult): Response {
  return Response.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/** First hop of `x-forwarded-for`, as set by Vercel; undefined when absent. */
function clientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const first = forwardedFor?.split(',')[0]?.trim();
  return first ? first : undefined;
}

export async function GET(_request: Request): Promise<Response> {
  try {
    return toResponse(await handleInscriptions({ method: 'GET' }, createDeps()));
  } catch (error) {
    console.error('[inscriptions] Failed to assemble dependencies for GET', error);
    return toResponse(errorResult('server_error'));
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      // Invalid or empty JSON: the handler answers a 400 invalid_input.
      body = undefined;
    }
    const input: HandlerInput = { method: 'POST', body, remoteIp: clientIp(request) };
    return toResponse(await handleInscriptions(input, createDeps()));
  } catch (error) {
    console.error('[inscriptions] Failed to assemble dependencies for POST', error);
    return toResponse(errorResult('server_error'));
  }
}
