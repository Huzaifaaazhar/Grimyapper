import { beforeEach, describe, expect, it } from 'vitest';

import { __resetTelemetry, recordJudgement, snapshot } from '@/lib/telemetry';

describe('telemetry', () => {
  beforeEach(() => __resetTelemetry());

  it('starts empty', () => {
    expect(snapshot().total).toBe(0);
  });

  it('buckets by probability and counts the branch', () => {
    recordJudgement(0.05, 0.45, false);
    recordJudgement(0.95, 0.45, true);
    recordJudgement(0.95, 0.45, true);

    const s = snapshot();
    expect(s.total).toBe(3);
    expect(s.evaluated).toBe(2);
    expect(s.rejected).toBe(1);
    expect(s.histogram[0].count).toBe(1);
    expect(s.histogram[9].count).toBe(2);
  });

  it('counts judgements that landed near the boundary', () => {
    recordJudgement(0.46, 0.45, true); // within the band
    recordJudgement(0.99, 0.45, true); // nowhere near it
    expect(snapshot().nearBoundary).toBe(1);
  });

  it('ignores a value that is not a number, rather than corrupting the histogram', () => {
    recordJudgement(Number.NaN, 0.45, true);
    expect(snapshot().total).toBe(0);
  });

  it('keeps every probability inside the histogram', () => {
    for (const p of [0, 1, -0.5, 1.5]) recordJudgement(p, 0.45, true);
    const s = snapshot();
    expect(s.histogram.reduce((n, b) => n + b.count, 0)).toBe(s.total);
  });

  it('exposes no petition text — the shape has nowhere to put any', () => {
    recordJudgement(0.7, 0.45, true);
    const keys = Object.keys(snapshot());
    expect(keys).toEqual(
      expect.arrayContaining(['total', 'evaluated', 'rejected', 'nearBoundary', 'histogram']),
    );
    expect(JSON.stringify(snapshot())).not.toMatch(/[a-z]{20,}/);
  });
});
