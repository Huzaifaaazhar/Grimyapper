/**
 * Two gates: a per-IP sliding window, and a hard per-UTC-day ceiling.
 *
 * The limiter is pluggable. By default it keeps counters in this process, which
 * on Vercel means per-instance — the effective ceiling is roughly
 * (cap × warm instances). That mattered a great deal when every judgement spent
 * money on a hosted model. It matters much less now that a judgement is a dot
 * product: the worst a flood achieves is a slow page.
 *
 * Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` and the counters
 * move to Redis, making the cap a real quota shared across every instance. The
 * memory store stays the default so a clone still runs with no configuration.
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_MAX ?? 8);
const DAILY_CAP = Number(process.env.DAILY_JUDGEMENT_CAP ?? 1500);

/** Bounded so a spray of unique IPs cannot grow the map without limit. */
const MAX_TRACKED_IPS = 5000;

export type RateVerdict =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'per_ip' | 'daily'; retryAfterSeconds: number };

/**
 * What a backing store must do. Both operations return the count *after* the
 * increment, so the caller never needs a read-then-write race.
 */
export interface RateLimitStore {
  readonly name: string;
  /** Count of hits for `key` inside the trailing `windowMs`, this one included. */
  hitWindow(key: string, windowMs: number, now: number): Promise<number>;
  /** Count of hits for `key` today, this one included. */
  hitDaily(key: string, now: number): Promise<number>;
}

function utcDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function msUntilUtcMidnight(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now;
}

/* --------------------------------------------------------------- in-process */

class MemoryStore implements RateLimitStore {
  readonly name = 'memory';
  private hits = new Map<string, number[]>();
  private dailyCount = 0;
  private dailyKey = '';

  async hitWindow(key: string, windowMs: number, now: number): Promise<number> {
    const cutoff = now - windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > MAX_TRACKED_IPS) this.sweep(cutoff);
    return recent.length;
  }

  async hitDaily(_key: string, now: number): Promise<number> {
    const today = utcDayKey(now);
    if (today !== this.dailyKey) {
      this.dailyKey = today;
      this.dailyCount = 0;
    }
    this.dailyCount += 1;
    return this.dailyCount;
  }

  /** The oldest timestamp still inside the window, for Retry-After. */
  oldestIn(key: string, windowMs: number, now: number): number | undefined {
    return (this.hits.get(key) ?? []).filter((t) => t > now - windowMs)[0];
  }

  private sweep(cutoff: number) {
    for (const [key, stamps] of this.hits) {
      const live = stamps.filter((t) => t > cutoff);
      if (live.length === 0) this.hits.delete(key);
      else this.hits.set(key, live);
    }
  }

  reset() {
    this.hits.clear();
    this.dailyCount = 0;
    this.dailyKey = '';
  }
}

/* ------------------------------------------------------------ shared, via KV */

/**
 * Upstash Redis over its REST API — no client library, just fetch, which keeps
 * it working on every runtime without adding a dependency.
 *
 * Both windows are plain counters with a TTL rather than sorted sets: a fixed
 * window is marginally less precise than a sliding one at the boundary, and in
 * exchange it costs a single round trip. For an abuse guard that is the right
 * trade.
 */
export class UpstashStore implements RateLimitStore {
  readonly name = 'upstash';

  constructor(
    private url: string,
    private token: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  private async pipeline(commands: string[][]): Promise<number[]> {
    const response = await this.fetchImpl(`${this.url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`upstash ${response.status}`);

    const body = (await response.json()) as Array<{ result?: unknown; error?: string }>;
    return body.map((entry) => {
      if (entry.error) throw new Error(entry.error);
      return Number(entry.result ?? 0);
    });
  }

  async hitWindow(key: string, windowMs: number, now: number): Promise<number> {
    const bucket = Math.floor(now / windowMs);
    const redisKey = `grimyapper:w:${key}:${bucket}`;
    const [count] = await this.pipeline([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, String(Math.ceil((windowMs * 2) / 1000))],
    ]);
    return count;
  }

  async hitDaily(_key: string, now: number): Promise<number> {
    const redisKey = `grimyapper:d:${utcDayKey(now)}`;
    const [count] = await this.pipeline([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, String(Math.ceil(msUntilUtcMidnight(now) / 1000) + 60)],
    ]);
    return count;
  }
}

/* ------------------------------------------------------------------ wiring */

const memory = new MemoryStore();

function defaultStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new UpstashStore(url, token) : memory;
}

let store: RateLimitStore = defaultStore();

/** Swap the backing store. Used by the tests; also the seam for another backend. */
export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

export function activeStoreName(): string {
  return store.name;
}

export async function checkRateLimit(ip: string, now = Date.now()): Promise<RateVerdict> {
  let daily: number;
  let windowed: number;

  try {
    daily = await store.hitDaily('all', now);
    windowed = await store.hitWindow(ip, WINDOW_MS, now);
  } catch {
    /*
     * A shared store that is unreachable must not take the court down with it.
     * Failing open is the right call here specifically because the thing being
     * guarded is CPU rather than money — with a hosted model behind this, the
     * safe direction would have been the opposite one.
     */
    console.error('[ratelimit] store unavailable, allowing');
    return { ok: true, remaining: 0 };
  }

  if (daily > DAILY_CAP) {
    return {
      ok: false,
      reason: 'daily',
      retryAfterSeconds: Math.ceil(msUntilUtcMidnight(now) / 1000),
    };
  }

  if (windowed > MAX_PER_WINDOW) {
    const oldest = store === memory ? memory.oldestIn(ip, WINDOW_MS, now) : undefined;
    const retryAfterSeconds = oldest
      ? Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000))
      : Math.ceil(WINDOW_MS / 1000);
    return { ok: false, reason: 'per_ip', retryAfterSeconds };
  }

  return { ok: true, remaining: Math.max(0, MAX_PER_WINDOW - windowed) };
}

/** Trusts the first hop of x-forwarded-for, which on Vercel is the client. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Test seam only. */
export function __resetRateLimitState() {
  memory.reset();
  store = memory;
}

export const RATE_LIMIT_CONFIG = { WINDOW_MS, MAX_PER_WINDOW, DAILY_CAP };
