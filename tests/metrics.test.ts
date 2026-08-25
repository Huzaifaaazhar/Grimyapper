import { describe, expect, it } from 'vitest';

import { HORIZON_MONTHS, projectTwelveMonths } from '@/lib/metrics';
import type { Assumptions } from '@/lib/schemas';

const base: Assumptions = {
  reachable_users_year1: 50_000,
  monthly_growth_rate: 0.2,
  free_to_paid_conversion: 0.03,
  price_per_month_usd: 29,
  monthly_churn: 0.06,
  monthly_burn_usd: 40_000,
};

describe('projectTwelveMonths', () => {
  it('returns exactly twelve consecutive months', () => {
    const rows = projectTwelveMonths(base);
    expect(rows).toHaveLength(HORIZON_MONTHS);
    expect(rows.map((r) => r.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('lands month 12 on reachable_users_year1', () => {
    const rows = projectTwelveMonths(base);
    expect(rows[11].users).toBe(base.reachable_users_year1);
  });

  it('lands month 12 on target across a range of growth rates', () => {
    for (const g of [0, 0.05, 0.15, 0.3, 0.6, 1]) {
      const rows = projectTwelveMonths({ ...base, monthly_growth_rate: g });
      // Rounding of the seed can move the endpoint by a user or two.
      expect(Math.abs(rows[11].users - base.reachable_users_year1)).toBeLessThanOrEqual(2);
    }
  });

  it('grows users monotonically when growth is positive', () => {
    const rows = projectTwelveMonths(base);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].users).toBeGreaterThanOrEqual(rows[i - 1].users);
    }
  });

  it('holds users flat at zero growth', () => {
    const rows = projectTwelveMonths({ ...base, monthly_growth_rate: 0 });
    expect(new Set(rows.map((r) => r.users)).size).toBe(1);
  });

  it('shrinks the paying base when there is no growth but there is churn', () => {
    const rows = projectTwelveMonths({
      ...base,
      monthly_growth_rate: 0,
      monthly_churn: 0.1,
    });
    expect(rows[11].paying).toBeLessThan(rows[0].paying);
    expect(rows[11].paying).toBeGreaterThanOrEqual(0);
  });

  it('keeps the paying base flat when nothing churns and nothing grows', () => {
    const rows = projectTwelveMonths({
      ...base,
      monthly_growth_rate: 0,
      monthly_churn: 0,
    });
    expect(new Set(rows.map((r) => r.paying)).size).toBe(1);
  });

  it('derives gross MRR from paying accounts and price', () => {
    const rows = projectTwelveMonths(base);
    for (const r of rows) {
      expect(r.gross_mrr).toBeCloseTo(r.paying * base.price_per_month_usd, 2);
      expect(r.net_revenue).toBe(r.gross_mrr);
    }
  });

  it('nets revenue against a flat burn', () => {
    const rows = projectTwelveMonths(base);
    for (const r of rows) {
      expect(r.burn).toBe(base.monthly_burn_usd);
      expect(r.net).toBeCloseTo(r.net_revenue - r.burn, 2);
    }
  });

  it('accumulates cumulative_net as the running sum of net', () => {
    const rows = projectTwelveMonths(base);
    let running = 0;
    for (const r of rows) {
      running = Math.round((running + r.net) * 100) / 100;
      expect(r.cumulative_net).toBeCloseTo(running, 2);
    }
  });

  it('never emits a negative user or paying count', () => {
    const rows = projectTwelveMonths({
      ...base,
      monthly_growth_rate: 0,
      monthly_churn: 0.95,
      reachable_users_year1: 5,
    });
    for (const r of rows) {
      expect(r.users).toBeGreaterThanOrEqual(0);
      expect(r.paying).toBeGreaterThanOrEqual(0);
    }
  });

  it('is deterministic — same assumptions, same table', () => {
    expect(projectTwelveMonths(base)).toEqual(projectTwelveMonths(base));
  });
});
