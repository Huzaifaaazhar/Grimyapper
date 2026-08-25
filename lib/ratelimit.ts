/**
 * Two gates, both in-process.
 *
 *   1. A per-IP sliding window, so one person cannot sit on the button.
 *   2. A hard per-UTC-day ceiling, so a distributed script cannot turn the
 *      API budget into someone's afternoon.
 *
 * Honest limitation: Vercel runs several serverless instances, so each gate is
 * per-instance rather than global. That makes the effective ceiling roughly
 * (cap × warm instances) — a soft budget guard, not an airtight quota. The
 * airtight version needs shared state, and a datastore is out of scope for v1.
 * Vercel's platform-level firewall rate limiting sits in front of this.
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_MAX ?? 8);
const DAILY_CAP = Number(process.env.DAILY_JUDGEMENT_CAP ?? 1500);

/** Bounded so a spray of unique IPs cannot grow the map without limit. */
const MAX_TRACKED_IPS = 5000;

const hits = new Map<string, number[]>();
let dailyCount = 0;
let dailyKey = utcDayKey();

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RateVerdict =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'per_ip' | 'daily'; retryAfterSeconds: number };

export function checkRateLimit(ip: string, now = Date.now()): RateVerdict {
  const today = utcDayKey();
  if (today !== dailyKey) {
    dailyKey = today;
    dailyCount = 0;
  }

  if (dailyCount >= DAILY_CAP) {
    const midnight = Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate() + 1,
    );
    return { ok: false, reason: 'daily', retryAfterSeconds: Math.ceil((midnight - now) / 1000) };
  }

  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    return { ok: false, reason: 'per_ip', retryAfterSeconds };
  }

  recent.push(now);
  hits.set(ip, recent);
  dailyCount += 1;

  if (hits.size > MAX_TRACKED_IPS) sweep(cutoff);

  return { ok: true, remaining: MAX_PER_WINDOW - recent.length };
}

function sweep(cutoff: number) {
  for (const [key, stamps] of hits) {
    const live = stamps.filter((t) => t > cutoff);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
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
  hits.clear();
  dailyCount = 0;
  dailyKey = utcDayKey();
}

export const RATE_LIMIT_CONFIG = { WINDOW_MS, MAX_PER_WINDOW, DAILY_CAP };
