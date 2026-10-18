/**
 * Cloudflare Turnstile siteverify verifier (server side only).
 *
 * Reference: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
import type { CaptchaVerifier } from './inscriptions-handler';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Timeout applied to the siteverify call (Cloudflare's own example uses 10 s). */
const VERIFY_TIMEOUT_MS = 10_000;

/**
 * Builds the captcha port. Creation is lazy about the secret on purpose: a
 * missing `TURNSTILE_SECRET_KEY` must not break `GET /api/inscriptions`
 * (status needs no captcha), so it only fails when a token is verified.
 */
export function createTurnstileVerifier(env: Record<string, string | undefined>): CaptchaVerifier {
  const secret = env['TURNSTILE_SECRET_KEY'];
  return {
    async verify(token: string, remoteIp: string | undefined): Promise<boolean> {
      if (!secret) {
        throw new Error('Missing TURNSTILE_SECRET_KEY configuration');
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
      try {
        const response = await fetch(SITEVERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Turnstile siteverify failed with status ${response.status}`);
        }
        const payload = (await response.json()) as { success?: unknown };
        return payload.success === true;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
