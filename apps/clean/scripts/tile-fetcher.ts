/**
 * Tile fetcher — the map tiles of the Fiches, read from the disk cache or
 * downloaded through the network scheduler (ticket #24, spec #21).
 *
 * The disk cache is the one the pipeline has always used: a tile is read
 * from `scripts/.cache/tiles/<z>/<x>/<y>.jpg` when it is there, and
 * downloaded otherwise. A cached tile never reaches the network, so it never
 * takes a slot in the scheduler either.
 *
 * Pure module: the filesystem, the sharp conversion and the network are
 * injected, so the unit suite checks the cache and the download behaviour
 * without touching the disk nor the network.
 */

import type { NetworkScheduler } from './network-scheduler';

/** Counters of a tile fetcher. */
export interface TileFetcherStats {
  /** Tiles served from the cache, without any network call. */
  readonly cacheHits: number;
  /** Tiles downloaded from the network. */
  readonly downloads: number;
}

/** Options of the tile fetcher. */
export interface TileFetcherOptions {
  /** Scheduler performing the network calls (rate, concurrency, de-duplication). */
  readonly scheduler: NetworkScheduler;
  /** URL of a tile, from its coordinates. */
  readonly tileUrl: (zoom: number, x: number, y: number) => string;
  /** The cached tile, or undefined when the tile is not cached. */
  readonly readCache: (zoom: number, x: number, y: number) => Buffer | undefined;
  /** Store a downloaded tile in the cache. */
  readonly writeCache: (zoom: number, x: number, y: number, tile: Buffer) => void;
  /** Convert the downloaded bytes into the cached format (PNG to JPEG). */
  readonly encode: (downloaded: Buffer) => Promise<Buffer>;
  /** Options forwarded to `fetch` (headers, timeout); built when the request starts. */
  readonly requestInit?: () => RequestInit;
  /** Number of attempts per tile. */
  readonly attempts?: number;
  /** Pause between two attempts, in milliseconds. */
  readonly retryDelayMs?: number;
  /** Wait function used between two attempts. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Called when a tile is still unavailable after the last attempt. */
  readonly onUnavailable?: (zoom: number, x: number, y: number, error: unknown) => void;
}

/** The tile fetcher: the tiles of the Fiches, cached or downloaded. */
export interface TileFetcher {
  /** The tile, or undefined when it could not be obtained. */
  get(zoom: number, x: number, y: number): Promise<Buffer | undefined>;
  /** Counters of the fetcher: tiles read from the cache and tiles downloaded. */
  readonly stats: TileFetcherStats;
}

/** Number of attempts per tile (the second one comes after a pause). */
const DEFAULT_ATTEMPTS = 2;

/** Pause between two attempts, in milliseconds. */
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Create a tile fetcher.
 */
export function createTileFetcher(options: TileFetcherOptions): TileFetcher {
  const stats = { cacheHits: 0, downloads: 0 };
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;

  /** Download a tile through the scheduler, and cache it. */
  async function download(zoom: number, x: number, y: number): Promise<Buffer | undefined> {
    const url = options.tileUrl(zoom, x, y);
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const { response, shared } = await options.scheduler.request({
          url,
          method: 'GET',
          init: options.requestInit,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const downloaded = Buffer.from(await response.arrayBuffer());
        const encoded = await options.encode(downloaded);
        if (!shared) {
          // The caller that started the download owns the cache: a shared
          // download must not write the same file twice.
          options.writeCache(zoom, x, y, encoded);
          stats.downloads += 1;
        }
        return encoded;
      } catch (error) {
        lastError = error;
        if (attempt < attempts - 1) {
          await sleep(retryDelayMs);
        }
      }
    }
    options.onUnavailable?.(zoom, x, y, lastError);
    return undefined;
  }

  return {
    async get(zoom: number, x: number, y: number): Promise<Buffer | undefined> {
      const cached = options.readCache(zoom, x, y);
      if (cached) {
        stats.cacheHits += 1;
        return cached;
      }
      return download(zoom, x, y);
    },
    get stats(): TileFetcherStats {
      return { cacheHits: stats.cacheHits, downloads: stats.downloads };
    },
  };
}

/** Wait for `ms` milliseconds, with the real timers. */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
