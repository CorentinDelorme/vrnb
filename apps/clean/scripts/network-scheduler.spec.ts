import { describe, expect, it } from 'vitest';

import { createNetworkScheduler } from './network-scheduler';

import type { SchedulerClock, SchedulerFetch } from './network-scheduler';

/**
 * Network scheduler (ticket #24, spec #21) — the seam is the public API of
 * `scripts/network-scheduler.ts`:
 *
 * - `createNetworkScheduler(options)` → `NetworkScheduler`
 *   - `request({ url, method?, bodyKey?, init? })` → `Promise<ScheduledResponse>`
 *     catches the per-host rate limit, the per-host concurrency cap, the
 *     in-flight de-duplication and the error propagation to the caller;
 *   - the clock and the fetch are injected, so the suite never touches the
 *     network and never waits for a real timer.
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

/** Let every pending microtask run: the scheduler is promise-driven. */
function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

interface RecordedCall {
  readonly url: string;
  readonly startedAt: number;
  resolve(response: Response): void;
  reject(error: unknown): void;
}

/** A fetch that records every call and lets the test settle it by hand. */
function createRecordingFetch(clock: SchedulerClock): {
  fetch: SchedulerFetch;
  calls: RecordedCall[];
  /** Highest number of calls running at the same time. */
  readonly maxActive: number;
} {
  const calls: RecordedCall[] = [];
  let active = 0;
  let maxActive = 0;
  const fetchImpl: SchedulerFetch = (url: string) =>
    new Promise<Response>((resolve, reject) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls.push({
        url,
        startedAt: clock.now(),
        resolve: (response: Response) => {
          active -= 1;
          resolve(response);
        },
        reject: (error: unknown) => {
          active -= 1;
          reject(error);
        },
      });
    });
  return {
    fetch: fetchImpl,
    calls,
    get maxActive() {
      return maxActive;
    },
  };
}

describe('createNetworkScheduler', () => {
  it('should perform the request and return the response', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });

    const pending = scheduler.request({ url: 'https://tile.example/1/2/3.png' });
    await flush();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://tile.example/1/2/3.png');

    calls[0]?.resolve(new Response('tile-bytes'));
    const { response } = await pending;
    expect(await response.text()).toBe('tile-bytes');
  });

  it('should space two request starts to the same host by the minimum interval', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl, minIntervalMs: 400 });

    const first = scheduler.request({ url: 'https://tile.example/1/2/3.png' });
    const second = scheduler.request({ url: 'https://tile.example/1/2/4.png' });
    await flush();

    expect(calls.map((call) => call.startedAt)).toEqual([0, 400]);

    calls[0]?.resolve(new Response('a'));
    calls[1]?.resolve(new Response('b'));
    await Promise.all([first, second]);
  });

  it('should never run more than two requests at the same time on a host', async () => {
    const clock = createVirtualClock();
    const recorder = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({
      clock,
      fetch: recorder.fetch,
      maxConcurrentPerHost: 2,
    });

    const pending = [1, 2, 3, 4].map((n) =>
      scheduler.request({ url: `https://tile.example/${n}.png` }),
    );
    await flush();

    // The two first requests run, the next ones wait for a free slot.
    expect(recorder.calls).toHaveLength(2);
    expect(recorder.maxActive).toBe(2);

    recorder.calls[0]?.resolve(new Response('a'));
    await flush();

    expect(recorder.calls).toHaveLength(3);
    expect(recorder.calls[2]?.startedAt).toBe(800);

    recorder.calls[1]?.resolve(new Response('b'));
    recorder.calls[2]?.resolve(new Response('c'));
    await flush();

    expect(recorder.calls).toHaveLength(4);
    expect(recorder.calls[3]?.startedAt).toBe(1200);

    recorder.calls[3]?.resolve(new Response('d'));
    await Promise.all(pending);

    expect(recorder.calls.map((call) => call.startedAt)).toEqual([0, 400, 800, 1200]);
    expect(recorder.maxActive).toBe(2);
  });

  it('should trigger a single call for two identical concurrent requests', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });

    const first = scheduler.request({ url: 'https://tile.example/1/2/3.png' });
    const second = scheduler.request({ url: 'https://tile.example/1/2/3.png' });
    await flush();

    expect(calls).toHaveLength(1);

    calls[0]?.resolve(new Response('tile-bytes'));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.shared).toBe(false);
    expect(secondResult.shared).toBe(true);
    expect(await firstResult.response.text()).toBe('tile-bytes');
    expect(await secondResult.response.text()).toBe('tile-bytes');
  });

  it('should not share a call between requests that differ', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createRecordingFetch(clock);
    // Three simultaneous calls are allowed here: the test is about the
    // de-duplication key, not about the concurrency cap.
    const scheduler = createNetworkScheduler({
      clock,
      fetch: fetchImpl,
      maxConcurrentPerHost: 3,
    });

    const other = scheduler.request({ url: 'https://tile.example/1/2/4.png' });
    const otherMethod = scheduler.request({
      url: 'https://tile.example/1/2/3.png',
      method: 'POST',
      bodyKey: 'a-body',
    });
    const otherBody = scheduler.request({
      url: 'https://tile.example/1/2/3.png',
      method: 'POST',
      bodyKey: 'another-body',
    });
    await flush();

    expect(calls.map((call) => call.url)).toEqual([
      'https://tile.example/1/2/4.png',
      'https://tile.example/1/2/3.png',
      'https://tile.example/1/2/3.png',
    ]);

    for (const call of calls) {
      call.resolve(new Response('bytes'));
    }
    await Promise.all([other, otherMethod, otherBody]);
  });

  it('should report a failed request to its caller and let the other requests succeed', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });

    const failing = scheduler.request({ url: 'https://tile.example/broken.png' });
    const working = scheduler.request({ url: 'https://tile.example/fine.png' });
    await flush();

    expect(calls).toHaveLength(2);

    calls[0]?.reject(new Error('network down'));
    calls[1]?.resolve(new Response('tile-bytes'));

    await expect(failing).rejects.toThrow('network down');
    const { response } = await working;
    expect(await response.text()).toBe('tile-bytes');
  });

  it('should report a failed shared call to every caller of the call', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });

    const first = scheduler.request({ url: 'https://tile.example/broken.png' });
    const second = scheduler.request({ url: 'https://tile.example/broken.png' });
    await flush();

    expect(calls).toHaveLength(1);

    calls[0]?.reject(new Error('network down'));

    await expect(first).rejects.toThrow('network down');
    await expect(second).rejects.toThrow('network down');
  });

  it('should not let a host wait for another host', async () => {
    const clock = createVirtualClock();
    const { fetch: fetchImpl, calls } = createRecordingFetch(clock);
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });

    const tiles = scheduler.request({ url: 'https://tiles.example/1.png' });
    const router = scheduler.request({ url: 'https://router.example/1' });
    await flush();

    // Two different hosts: both requests start right away.
    expect(calls.map((call) => call.startedAt)).toEqual([0, 0]);

    calls[0]?.resolve(new Response('tile'));
    calls[1]?.resolve(new Response('route'));
    await Promise.all([tiles, router]);
  });

  it('should build the request options when the request starts, not when it is queued', async () => {
    const clock = createVirtualClock();
    const events: string[] = [];
    const fetchImpl: SchedulerFetch = async () => {
      events.push('fetch');
      return new Response('bytes');
    };
    const scheduler = createNetworkScheduler({ clock, fetch: fetchImpl });

    await scheduler.request({
      url: 'https://tile.example/1/2/3.png',
      init: () => {
        events.push('init');
        return { headers: { 'User-Agent': 'vrnb-clean' } };
      },
    });

    // A timeout signal built when the request is queued would expire while it
    // waits its turn: the options must be built when the request starts.
    expect(events).toEqual(['init', 'fetch']);
  });
});
