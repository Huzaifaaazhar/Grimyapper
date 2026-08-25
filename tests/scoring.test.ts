import { describe, expect, it } from 'vitest';

import { RUBRIC_AXES, type Rubric } from '@/lib/schemas';
import { RUBRIC_WEIGHTS, bandFor, computeSuccessLikelihood } from '@/lib/scoring';

const rubric = (fill: number | Partial<Rubric>): Rubric =>
  Object.fromEntries(
    RUBRIC_AXES.map((a) => [a, typeof fill === 'number' ? fill : (fill[a] ?? 0)]),
  ) as Rubric;

describe('computeSuccessLikelihood', () => {
  it('maps an all-10 rubric to 100 and an all-0 rubric to 0', () => {
    expect(computeSuccessLikelihood(rubric(10))).toBe(100);
    expect(computeSuccessLikelihood(rubric(0))).toBe(0);
  });

  it('maps a uniform mid rubric to its own percentage', () => {
    expect(computeSuccessLikelihood(rubric(5))).toBe(50);
    expect(computeSuccessLikelihood(rubric(7))).toBe(70);
  });

  it('matches the weighted mean computed independently', () => {
    const sample = rubric({
      problem_intensity: 8,
      wrapper_platform_risk: 2,
      moat_beyond_model: 3,
      distribution: 6,
      willingness_to_pay: 7,
      unit_economics: 5,
      timing_half_life: 4,
    });
    const totalWeight = RUBRIC_AXES.reduce((s, a) => s + RUBRIC_WEIGHTS[a], 0);
    const expected = Math.round(
      (RUBRIC_AXES.reduce((s, a) => s + sample[a] * RUBRIC_WEIGHTS[a], 0) / (totalWeight * 10)) *
        100,
    );
    expect(computeSuccessLikelihood(sample)).toBe(expected);
  });

  it('weights wrapper risk and moat twice as hard as distribution', () => {
    const wrapperStrong = computeSuccessLikelihood(rubric({ wrapper_platform_risk: 10 }));
    const distributionStrong = computeSuccessLikelihood(rubric({ distribution: 10 }));
    expect(wrapperStrong).toBeGreaterThan(distributionStrong);
    // 2x before rounding; each score is rounded independently, so allow one point.
    expect(Math.abs(wrapperStrong - distributionStrong * 2)).toBeLessThanOrEqual(1);
  });

  it('never leaves 0-100', () => {
    for (let v = 0; v <= 10; v += 1) {
      const score = computeSuccessLikelihood(rubric(v));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('bandFor', () => {
  it('splits at the documented boundaries', () => {
    expect(bandFor(0)).toBe('Low');
    expect(bandFor(39)).toBe('Low');
    expect(bandFor(40)).toBe('Medium');
    expect(bandFor(70)).toBe('Medium');
    expect(bandFor(71)).toBe('High');
    expect(bandFor(100)).toBe('High');
  });
});
