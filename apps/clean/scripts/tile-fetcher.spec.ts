import { describe, expect, it } from 'vitest';

import { createNetworkScheduler } from './network-scheduler';
import { createTileFetcher } from './tile-fetcher';

import type { SchedulerClock, SchedulerFetch } from './network-scheduler';

/**
 * Tile fetcher (ticket #24, spec #21) — the seam is the public API of
 * `scripts/tile-fetcher.ts`:
 *
 * - `createTileFetcher(options)` → `TileFetcher`
 *   - `get(zoom, x, y)` → `Promise<Buffer | undefined>` gives the tile,
 *     from the disk cache when it is there, from the network otherwise;
 *   - `stats` counts the tiles read from the cache and the tiles downloaded.
 *
 * The network calls go through the real scheduler, with an injected fetch and
 * an injected clock: the suite never touches the network.
 */

/**
 * Virtual clock: the time only moves when the scheduler decides to wait, so
 * the recorded request starts are exactly the times the scheduler planned.
 */
function createVirtualClock(): SchedulerClock {
  let time = 0;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
      await Promise.resolve();
    },
  };
}

/** A fetch answering the same body to every call, and counting the calls. */
function createCountingFetch(body: string): { fetch: SchedulerFetch; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl: SchedulerFetch = async (url: string) => {
    calls.push(url);
    return new Response(body);
  };
  return { fetch: fetchImpl, calls };
}

describe('createTileFetcher', () => {
  it('should serve a cached tile without any network call', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createCountingFetch('downloaded');
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });
    const cached = Buffer.from([1, 2, 3]);
    const fetcher = createTileFetcher({
      scheduler,
      tileUrl: (zoom, x, y) => `https://tile.example/${zoom}/${x}/${y}.png`,
      readCache: (zoom, x, y) => (zoom === 12 && x === 1 && y === 2 ? cached : undefined),
      writeCache: () => {
        throw new Error('the cache must not be written for a cached tile');
      },
      encode: async () => {
        throw new Error('a cached tile must not be encoded again');
      },
    });

    const tile = await fetcher.get(12, 1, 2);

    expect(tile).toEqual(cached);
    expect(calls).toHaveLength(0);
    expect(fetcher.stats.cacheHits).toBe(1);
    expect(fetcher.stats.downloads).toBe(0);
  });

  it('should download a missing tile through the scheduler and cache it', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createCountingFetch('downloaded');
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });
    const written: { zoom: number; x: number; y: number; tile: Buffer }[] = [];
    const encoded = Buffer.from([9, 9]);
    const fetcher = createTileFetcher({
      scheduler,
      tileUrl: (zoom, x, y) => `https://tile.example/${zoom}/${x}/${y}.png`,
      readCache: () => undefined,
      writeCache: (zoom, x, y, tile) => {
        written.push({ zoom, x, y, tile });
      },
      encode: async () => encoded,
    });

    const tile = await fetcher.get(12, 1, 2);

    expect(calls).toEqual(['https://tile.example/12/1/2.png']);
    expect(tile).toEqual(encoded);
    expect(written).toEqual([{ zoom: 12, x: 1, y: 2, tile: encoded }]);
    expect(fetcher.stats.downloads).toBe(1);
    expect(fetcher.stats.cacheHits).toBe(0);
  });

  it('should retry a failed download and report the tile as unavailable', async () => {
    const clock = createVirtualClock();
    const calls: string[] = [];
    const fetchImpl: SchedulerFetch = async (url: string) => {
      calls.push(url);
      throw new Error('network down');
    };
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });
    const unavailable: { zoom: number; x: number; y: number; error: unknown }[] = [];
    const fetcher = createTileFetcher({
      scheduler,
      tileUrl: (zoom, x, y) => `https://tile.example/${zoom}/${x}/${y}.png`,
      readCache: () => undefined,
      writeCache: () => {
        throw new Error('an unavailable tile must not be cached');
      },
      encode: async () => Buffer.from([0]),
      sleep: async () => {
        // No real pause between the two attempts.
      },
      onUnavailable: (zoom, x, y, error) => {
        unavailable.push({ zoom, x, y, error });
      },
    });

    const tile = await fetcher.get(12, 1, 2);

    expect(tile).toBeUndefined();
    expect(calls).toEqual(['https://tile.example/12/1/2.png', 'https://tile.example/12/1/2.png']);
    expect(unavailable).toHaveLength(1);
    expect(unavailable[0]?.zoom).toBe(12);
    expect(unavailable[0]?.x).toBe(1);
    expect(unavailable[0]?.y).toBe(2);
    expect((unavailable[0]?.error as Error).message).toBe('network down');
    expect(fetcher.stats.downloads).toBe(0);
  });

  it('should return the tile when the retry succeeds', async () => {
    const clock = createVirtualClock();
    let attempt = 0;
    const fetchImpl: SchedulerFetch = async () => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error('network down');
      }
      return new Response('downloaded');
    };
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });
    const encoded = Buffer.from([7]);
    const written: Buffer[] = [];
    const fetcher = createTileFetcher({
      scheduler,
      tileUrl: (zoom, x, y) => `https://tile.example/${zoom}/${x}/${y}.png`,
      readCache: () => undefined,
      writeCache: (zoom, x, y, tile) => {
        written.push(tile);
      },
      encode: async () => encoded,
      sleep: async () => {
        // No real pause between the two attempts.
      },
    });

    expect(await fetcher.get(12, 1, 2)).toEqual(encoded);
    expect(attempt).toBe(2);
    expect(written).toEqual([encoded]);
  });

  it('should report a tile answered with an error status as unavailable', async () => {
    const clock = createVirtualClock();
    const fetchImpl: SchedulerFetch = async () => new Response('nope', { status: 404 });
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });
    const errors: string[] = [];
    const fetcher = createTileFetcher({
      scheduler,
      tileUrl: (zoom, x, y) => `https://tile.example/${zoom}/${x}/${y}.png`,
      readCache: () => undefined,
      writeCache: () => {
        throw new Error('an unavailable tile must not be cached');
      },
      encode: async () => Buffer.from([0]),
      sleep: async () => {
        // No real pause between the two attempts.
      },
      onUnavailable: (zoom, x, y, error) => {
        errors.push(error instanceof Error ? error.message : String(error));
      },
    });

    expect(await fetcher.get(12, 1, 2)).toBeUndefined();
    expect(errors).toEqual(['HTTP 404']);
  });

  it('should download a tile once when two Fiches ask for it at the same time', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createCountingFetch('downloaded');
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });
    const encoded = Buffer.from([4, 2]);
    const written: Buffer[] = [];
    const fetcher = createTileFetcher({
      scheduler,
      tileUrl: (zoom, x, y) => `https://tile.example/${zoom}/${x}/${y}.png`,
      readCache: () => undefined,
      writeCache: (zoom, x, y, tile) => {
        written.push(tile);
      },
      encode: async () => encoded,
    });

    const [first, second] = await Promise.all([fetcher.get(12, 1, 2), fetcher.get(12, 1, 2)]);

    expect(calls).toHaveLength(1);
    expect(first).toEqual(encoded);
    expect(second).toEqual(encoded);
    expect(written).toEqual([encoded]);
    expect(fetcher.stats.downloads).toBe(1);
  });
});
