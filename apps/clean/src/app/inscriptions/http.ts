/**
 * The JSON transport of the Inscriptions API — the headers every answer
 * carries, shared by the GET (public state) and the POST (registration)
 * handlers so the two directions never drift apart.
 *
 * The responses are never cached: the public state changes with every
 * registration, and a cached answer would show a stale badge.
 */
export const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
} as const;
