/**
 * Network scheduler — the politeness layer of the generation pipeline
 * (ticket #24, spec #21).
 *
 * The community servers the pipeline talks to (OSM tiles, OSRM, Valhalla)
 * accept a limited load: the OSM tile usage policy allows two simultaneous
 * connections, and the pipeline must keep the request rate it has always had
 * (one request every 400 ms per host). The scheduler enforces both, per host,
 * whatever the number of callers: the callers just submit requests and the
 * scheduler decides when they may start.
 *
 * Two identical requests submitted while the first one is still running share
 * a single network call (a tile needed by two Fiches at the same time is
 * downloaded once). Two requests are identical when they share their URL,
 * their method and their body key.
 *
 * Pure module: no import-time side effect, no clock and no network of its
 * own. The clock and the fetch are injected, so the unit suite is
 * deterministic and never touches the network.
 */

/** Clock used to space the requests; injected so the tests are deterministic. */
export interface SchedulerClock {
  /** Current time, in milliseconds. */
  now(): number;
  /** Wait for `ms` milliseconds. */
  sleep(ms: number): Promise<void>;
}

/** The `fetch` shape used by the scheduler. */
export type SchedulerFetch = (url: string, init?: RequestInit) => Promise<Response>;

/** A request submitted to the scheduler. */
export interface ScheduledRequest {
  /** Absolute URL of the request; its host drives the rate and concurrency limits. */
  readonly url: string;
  /** HTTP method, `GET` by default. Part of the de-duplication key. */
  readonly method?: string;
  /** Stable key of the request body, when the request carries one. Part of the de-duplication key. */
  readonly bodyKey?: string;
  /**
   * Extra options forwarded to `fetch` (headers, signal…). A factory is
   * called when the request starts, so a timeout signal covers the network
   * call only and not the time the request waits in the queue.
   */
  readonly init?: RequestInit | (() => RequestInit);
}

/** The outcome of a scheduled request. */
export interface ScheduledResponse {
  /** The HTTP response of the (possibly shared) call. */
  readonly response: Response;
  /** True when the caller joined an identical request already in flight. */
  readonly shared: boolean;
}

/** Options of the scheduler. */
export interface NetworkSchedulerOptions {
  /** Minimum delay between two request starts to the same host, in milliseconds. */
  readonly minIntervalMs?: number;
  /** Maximum number of simultaneous requests to the same host. */
  readonly maxConcurrentPerHost?: number;
  /** Clock used to space the requests. Defaults to the real time. */
  readonly clock?: SchedulerClock;
  /** Fetch implementation. Defaults to the global `fetch`. */
  readonly fetch?: SchedulerFetch;
}

/** The scheduler: a fetch-like entry point honouring the per-host limits. */
export interface NetworkScheduler {
  /** Perform (or join) a request, honouring the per-host rate and concurrency limits. */
  request(request: ScheduledRequest): Promise<ScheduledResponse>;
}

/** Minimum delay between two request starts to the same host (the current rate). */
const DEFAULT_MIN_INTERVAL_MS = 400;

/** Maximum number of simultaneous requests to the same host (OSM tile usage policy). */
const DEFAULT_MAX_CONCURRENT_PER_HOST = 2;

/** A caller waiting for the outcome of a (possibly shared) call. */
interface CallWaiter {
  resolve(result: ScheduledResponse): void;
  reject(error: unknown): void;
  /** True when the caller joined a call that was already running. */
  shared: boolean;
}

/** One network call, shared by the callers that asked for the same request. */
interface SharedCall {
  readonly key: string;
  readonly waiters: CallWaiter[];
}

/** A request waiting for its turn on its host. */
interface PendingRequest {
  readonly request: ScheduledRequest;
  readonly call: SharedCall;
}

/** The state of one host: its request rate and its pending queue. */
interface HostState {
  /** Start of the last request started on this host, undefined when none was started. */
  lastStartAt: number | undefined;
  /** Requests running right now on this host. */
  inFlight: number;
  /** Resolvers waiting for a free slot on this host. */
  readonly slotWaiters: (() => void)[];
  /** Requests waiting for their turn. */
  readonly queue: PendingRequest[];
  /** True while the queue is being served. */
  pumping: boolean;
}

/** The parts of a response kept aside, to rebuild one response per caller. */
interface ResponseSnapshot {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
}

/**
 * Create a scheduler. The limits are per host: two different hosts never wait
 * for each other.
 */
export function createNetworkScheduler(options: NetworkSchedulerOptions = {}): NetworkScheduler {
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const maxConcurrentPerHost = options.maxConcurrentPerHost ?? DEFAULT_MAX_CONCURRENT_PER_HOST;
  const clock = options.clock ?? { now: () => Date.now(), sleep: defaultSleep };
  const fetchImpl = options.fetch ?? ((url: string, init?: RequestInit) => fetch(url, init));
  const hosts = new Map<string, HostState>();
  /** The calls currently running, keyed by their de-duplication key. */
  const calls = new Map<string, SharedCall>();

  function hostOf(url: string): HostState {
    const host = new URL(url).host;
    let state = hosts.get(host);
    if (!state) {
      state = {
        lastStartAt: undefined,
        inFlight: 0,
        slotWaiters: [],
        queue: [],
        pumping: false,
      };
      hosts.set(host, state);
    }
    return state;
  }

  /** Wait until a request of this host is over. */
  function waitForSlot(host: HostState): Promise<void> {
    return new Promise((resolve) => {
      host.slotWaiters.push(resolve);
    });
  }

  /** Wake the requests waiting for a free slot. */
  function releaseSlots(host: HostState): void {
    for (const waiter of host.slotWaiters.splice(0)) {
      waiter();
    }
  }

  /** Serve the queue of a host: bounded concurrency, requests spaced by the minimum interval. */
  async function serveQueue(host: HostState): Promise<void> {
    try {
      while (host.queue.length > 0) {
        const pending = host.queue[0];
        while (host.inFlight >= maxConcurrentPerHost) {
          await waitForSlot(host);
        }
        const wait =
          host.lastStartAt === undefined ? 0 : host.lastStartAt + minIntervalMs - clock.now();
        if (wait > 0) {
          await clock.sleep(wait);
          continue;
        }
        host.queue.shift();
        host.lastStartAt = clock.now();
        host.inFlight += 1;
        void startCall(host, pending);
      }
    } finally {
      // Reset synchronously: a request submitted right after the queue was
      // emptied must find the pump free and start a new one.
      host.pumping = false;
    }
  }

  /** Perform one request and hand its response to every caller of the call. */
  async function startCall(host: HostState, pending: PendingRequest): Promise<void> {
    const { call } = pending;
    try {
      const init = pending.request.init;
      const response = await fetchImpl(pending.request.url, {
        method: pending.request.method ?? 'GET',
        ...(typeof init === 'function' ? init() : init),
      });
      // The body is buffered once: every caller of a shared call must be able
      // to read it on its own.
      const body = await response.arrayBuffer();
      const snapshot: ResponseSnapshot = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      };
      for (const waiter of call.waiters) {
        waiter.resolve({ response: rebuildResponse(snapshot, body), shared: waiter.shared });
      }
    } catch (error) {
      for (const waiter of call.waiters) {
        waiter.reject(error);
      }
    } finally {
      calls.delete(call.key);
      host.inFlight -= 1;
      releaseSlots(host);
    }
  }

  return {
    async request(request: ScheduledRequest): Promise<ScheduledResponse> {
      const key = dedupeKey(request);
      const running = calls.get(key);
      if (running) {
        // The very same request is already on its way: share its outcome.
        return new Promise<ScheduledResponse>((resolve, reject) => {
          running.waiters.push({ resolve, reject, shared: true });
        });
      }
      const call: SharedCall = { key, waiters: [] };
      calls.set(key, call);
      const outcome = new Promise<ScheduledResponse>((resolve, reject) => {
        call.waiters.push({ resolve, reject, shared: false });
      });

      let host: HostState;
      try {
        host = hostOf(request.url);
      } catch (error) {
        calls.delete(key);
        throw error;
      }
      host.queue.push({ request, call });
      if (!host.pumping) {
        host.pumping = true;
        void serveQueue(host);
      }
      return outcome;
    },
  };
}

/** Key of the requests that may share their network call. */
function dedupeKey(request: ScheduledRequest): string {
  const method = (request.method ?? 'GET').toUpperCase();
  return `${method} ${request.url} ${request.bodyKey ?? ''}`;
}

/** Rebuild a response from a snapshot, so every caller can read the body. */
function rebuildResponse(snapshot: ResponseSnapshot, body: ArrayBuffer): Response {
  const status = snapshot.status >= 200 && snapshot.status <= 599 ? snapshot.status : 200;
  const withoutBody = status === 204 || status === 205 || status === 304;
  return new Response(withoutBody ? null : body.slice(0), {
    status,
    statusText: snapshot.statusText,
    headers: snapshot.headers,
  });
}

/** Wait for `ms` milliseconds, with the real timers. */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
