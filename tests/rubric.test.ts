import { describe, expect, it } from 'vitest';

import { deriveAssumptions, deriveVerdict } from '@/lib/model/assumptions';
import { scoreRubric } from '@/lib/model/rubric';
import { AssumptionsSchema, RUBRIC_AXES, RubricSchema } from '@/lib/schemas';
import { bandFor, computeSuccessLikelihood } from '@/lib/scoring';

const WRAPPER = 'A site where you paste text and a model rewrites it to sound more professional.';
const DEEP =
  'We train a model on three years of proprietary claims data and integrate with the carrier core system.';

describe('scoreRubric', () => {
  it('keeps every axis an integer inside 0..10 with a note', () => {
    for (const text of [WRAPPER, DEEP, 'asdf', '!!!', 'A bakery.']) {
      const { rubric, notes } = scoreRubric(text);
      expect(RubricSchema.safeParse(rubric).success).toBe(true);
      for (const axis of RUBRIC_AXES) {
        expect(Number.isInteger(rubric[axis])).toBe(true);
        expect(notes[axis].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('punishes a thin wrapper on exactly the axes that should punish it', () => {
    const { rubric } = scoreRubric(WRAPPER);
    expect(rubric.moat_beyond_model).toBeLessThanOrEqual(3);
    expect(rubric.wrapper_platform_risk).toBeLessThanOrEqual(3);
    expect(rubric.timing_half_life).toBeLessThanOrEqual(4);
  });

  it('rewards proprietary data and deep integration', () => {
    const { rubric } = scoreRubric(DEEP);
    expect(rubric.moat_beyond_model).toBeGreaterThanOrEqual(6);
    expect(rubric.timing_half_life).toBeGreaterThanOrEqual(6);
  });

  it('scores a deep venture above a wrapper overall', () => {
    expect(computeSuccessLikelihood(scoreRubric(DEEP).rubric)).toBeGreaterThan(
      computeSuccessLikelihood(scoreRubric(WRAPPER).rubric),
    );
  });

  it('is deterministic', () => {
    expect(scoreRubric(DEEP)).toEqual(scoreRubric(DEEP));
  });
});

describe('deriveAssumptions', () => {
  it('stays inside the documented bounds for any petition', () => {
    for (const text of [WRAPPER, DEEP, 'asdf qwer', 'A gym.', 'ai '.repeat(50)]) {
      const { rubric } = scoreRubric(text);
      expect(AssumptionsSchema.safeParse(deriveAssumptions(text, rubric)).success).toBe(true);
    }
  });

  it('prices an enterprise venture above a consumer one', () => {
    const enterprise = 'Claims adjudication for mid-market insurers, integrated with their core system.';
    const consumer = 'An app that turns your selfie into a fantasy avatar, free to try.';
    const ent = deriveAssumptions(enterprise, scoreRubric(enterprise).rubric);
    const con = deriveAssumptions(consumer, scoreRubric(consumer).rubric);
    expect(ent.price_per_month_usd).toBeGreaterThan(con.price_per_month_usd);
    expect(con.reachable_users_year1).toBeGreaterThan(ent.reachable_users_year1);
  });

  it('is deterministic per petition', () => {
    const { rubric } = scoreRubric(DEEP);
    expect(deriveAssumptions(DEEP, rubric)).toEqual(deriveAssumptions(DEEP, rubric));
  });
});

describe('deriveVerdict', () => {
  it('always returns a non-empty line for every band', () => {
    const { rubric } = scoreRubric(WRAPPER);
    for (const score of [10, 55, 90]) {
      const line = deriveVerdict(rubric, bandFor(score), 12345);
      expect(line.length).toBeGreaterThan(0);
      expect(line.length).toBeLessThanOrEqual(200);
    }
  });
});
