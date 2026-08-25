import { beforeEach, describe, expect, it } from 'vitest';

import { RATE_LIMIT_CONFIG, __resetRateLimitState, checkRateLimit, clientIp } from '@/lib/ratelimit';

describe('checkRateLimit', () => {
  beforeEach(() => __resetRateLimitState());

  it('allows up to the per-window maximum, then blocks', () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i += 1) {
      expect(checkRateLimit('1.2.3.4', now).ok).toBe(true);
    }
    const blocked = checkRateLimit('1.2.3.4', now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('per_ip');
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it('lets the same IP through again once the window has slid past', () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i += 1) checkRateLimit('5.6.7.8', now);
    expect(checkRateLimit('5.6.7.8', now).ok).toBe(false);
    expect(checkRateLimit('5.6.7.8', now + RATE_LIMIT_CONFIG.WINDOW_MS + 1).ok).toBe(true);
  });

  it('tracks each IP separately', () => {
    const now = Date.now();
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i += 1) checkRateLimit('9.9.9.9', now);
    expect(checkRateLimit('9.9.9.9', now).ok).toBe(false);
    expect(checkRateLimit('10.10.10.10', now).ok).toBe(true);
  });

  it('stops everyone once the daily ceiling is reached', () => {
    const now = Date.now();
    let allowed = 0;
    // Spread across enough IPs that the per-IP gate is never the binding one.
    for (let i = 0; i <= RATE_LIMIT_CONFIG.DAILY_CAP + 10; i += 1) {
      const ip = `172.16.${Math.floor(i / 200)}.${i % 200}`;
      if (checkRateLimit(ip, now).ok) allowed += 1;
    }
    expect(allowed).toBe(RATE_LIMIT_CONFIG.DAILY_CAP);

    const blocked = checkRateLimit('203.0.113.1', now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe('daily');
  });
});

describe('clientIp', () => {
  it('takes the first hop of x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1, 10.0.0.2' });
    expect(clientIp(headers)).toBe('198.51.100.7');
  });

  it('falls back to x-real-ip, then to a constant bucket', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
