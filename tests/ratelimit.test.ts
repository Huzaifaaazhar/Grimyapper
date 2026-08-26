import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RATE_LIMIT_CONFIG,
  UpstashStore,
  __resetRateLimitState,
  activeStoreName,
  checkRateLimit,
  clientIp,
  setRateLimitStore,
  type RateLimitStore,
} from '@/lib/ratelimit';

describe('checkRateLimit — in-process store', () => {
  beforeEach(() => __resetRateLimitState());

  it('allows up to the per-window maximum, then blocks', async () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i += 1) {
      expect((await checkRateLimit('1.2.3.4', now)).ok).toBe(true);
    }
    const blocked = await checkRateLimit('1.2.3.4', now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('per_ip');
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it('lets the same IP through again once the window has slid past', async () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i += 1) await checkRateLimit('5.6.7.8', now);
    expect((await checkRateLimit('5.6.7.8', now)).ok).toBe(false);
    expect((await checkRateLimit('5.6.7.8', now + RATE_LIMIT_CONFIG.WINDOW_MS + 1)).ok).toBe(true);
  });

  it('tracks each IP separately', async () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i += 1) await checkRateLimit('9.9.9.9', now);
    expect((await checkRateLimit('9.9.9.9', now)).ok).toBe(false);
    expect((await checkRateLimit('10.10.10.10', now)).ok).toBe(true);
  });

  it('stops everyone once the daily ceiling is reached', async () => {
    const now = Date.now();
    let allowed = 0;
    for (let i = 0; i <= RATE_LIMIT_CONFIG.DAILY_CAP + 5; i += 1) {
      const ip = `172.16.${Math.floor(i / 200)}.${i % 200}`;
      if ((await checkRateLimit(ip, now)).ok) allowed += 1;
    }
    expect(allowed).toBe(RATE_LIMIT_CONFIG.DAILY_CAP);

    const blocked = await checkRateLimit('203.0.113.1', now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe('daily');
  });

  it('defaults to the in-process store when no KV is configured', () => {
    expect(activeStoreName()).toBe('memory');
  });
});

describe('checkRateLimit — a shared store', () => {
  beforeEach(() => __resetRateLimitState());

  it('uses whatever store it is given', async () => {
    let windowHits = 0;
    const fake: RateLimitStore = {
      name: 'fake',
      hitWindow: async () => (windowHits += 1),
      hitDaily: async () => 1,
    };
    setRateLimitStore(fake);

    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i += 1) {
      expect((await checkRateLimit('1.1.1.1')).ok).toBe(true);
    }
    expect((await checkRateLimit('1.1.1.1')).ok).toBe(false);
    expect(windowHits).toBe(RATE_LIMIT_CONFIG.MAX_PER_WINDOW + 1);
  });

  it('fails open when the shared store is unreachable', async () => {
    setRateLimitStore({
      name: 'broken',
      hitWindow: async () => {
        throw new Error('network down');
      },
      hitDaily: async () => {
        throw new Error('network down');
      },
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Guarding CPU, not money: a dead store must not take the court down.
    expect((await checkRateLimit('1.1.1.1')).ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('UpstashStore', () => {
  function stubFetch(results: number[]) {
    return vi.fn(async () =>
      new Response(JSON.stringify(results.map((r) => ({ result: r }))), { status: 200 }),
    ) as unknown as typeof fetch;
  }

  it('increments a bucketed window key and sets a TTL in one round trip', async () => {
    const fetchImpl = stubFetch([3, 1]);
    const store = new UpstashStore('https://kv.example.com/', 'tok', fetchImpl);

    const count = await store.hitWindow('8.8.8.8', 60_000, 1_700_000_000_000);
    expect(count).toBe(3);

    const [[url, init]] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(url).toBe('https://kv.example.com/pipeline');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body[0][0]).toBe('INCR');
    expect(body[0][1]).toContain('8.8.8.8');
    expect(body[1][0]).toBe('EXPIRE');
  });

  it('keys the daily counter by UTC day, not by IP', async () => {
    const fetchImpl = stubFetch([42, 1]);
    const store = new UpstashStore('https://kv.example.com', 'tok', fetchImpl);

    const count = await store.hitDaily('ignored', Date.UTC(2026, 7, 26, 12));
    expect(count).toBe(42);

    const [[, init]] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body[0][1]).toBe('grimyapper:d:2026-08-26');
    expect(body[0][1]).not.toContain('ignored');
  });

  it('throws on a transport failure so the caller can fail open', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const store = new UpstashStore('https://kv.example.com', 'tok', fetchImpl);
    await expect(store.hitWindow('1.1.1.1', 60_000, Date.now())).rejects.toThrow('upstash 500');
  });

  it('surfaces a Redis-level error rather than reading it as a count', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([{ error: 'WRONGTYPE' }]), { status: 200 }),
    ) as unknown as typeof fetch;
    const store = new UpstashStore('https://kv.example.com', 'tok', fetchImpl);
    await expect(store.hitDaily('x', Date.now())).rejects.toThrow('WRONGTYPE');
  });
});

describe('clientIp', () => {
  it('takes the first hop of x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' }))).toBe('198.51.100.7');
  });

  it('falls back to x-real-ip, then to a constant bucket', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
