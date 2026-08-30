import { describe, expect, it } from 'vitest';

import {
  buildCharter,
  buildWarrant,
  charterFilename,
  rollNumber,
  warrantFilename,
} from '@/lib/charter';
import { ordinal } from '@/lib/model/percentile';
import { projectTwelveMonths } from '@/lib/metrics';
import { bandFor, computeSuccessLikelihood } from '@/lib/scoring';
import type { EvaluatedResult, JudgeRequest, RejectedResult, Rubric } from '@/lib/schemas';

const RUBRIC: Rubric = {
  problem_intensity: 8,
  wrapper_platform_risk: 4,
  moat_beyond_model: 9,
  distribution: 6,
  willingness_to_pay: 7,
  unit_economics: 5,
  timing_half_life: 3,
};

const NOTE = 'A note of the length the contract demands.';

function evaluated(over: Partial<EvaluatedResult> = {}): EvaluatedResult {
  const assumptions = {
    reachable_users_year1: 40_000,
    monthly_growth_rate: 0.12,
    free_to_paid_conversion: 0.04,
    price_per_month_usd: 49,
    monthly_churn: 0.05,
    monthly_burn_usd: 90_000,
  };
  const score = computeSuccessLikelihood(RUBRIC);
  return {
    outcome: 'evaluated',
    classification: { is_ai_startup: true, confidence: 0.91, reason: 'the model is the product' },
    verdict: 'A venture of some promise and considerable exposure.',
    success_likelihood: score,
    band: bandFor(score),
    rubric: RUBRIC,
    rubric_notes: {
      problem_intensity: NOTE,
      wrapper_platform_risk: NOTE,
      moat_beyond_model: NOTE,
      distribution: NOTE,
      willingness_to_pay: NOTE,
      unit_economics: NOTE,
      timing_half_life: NOTE,
    },
    assumptions,
    months: projectTwelveMonths(assumptions),
    ...over,
  };
}

function petition(over: Partial<JudgeRequest> = {}): JudgeRequest {
  return {
    idea: 'An agent that reconciles freight invoices against the original bill of lading.',
    name: 'The Synergx Engine',
    customer: 'Merchant captains',
    moat: 'Five years of labelled carrier disputes nobody else holds.',
    capital: 'Twelve moons of gold',
    declared: 'ai',
    ...over,
  };
}

describe('buildCharter', () => {
  it('carries the score through unscaled', () => {
    const result = evaluated();
    const charter = buildCharter(result, petition());
    // success_likelihood is already 0-100. Multiplying it again would print a
    // four-digit florin count on the certificate.
    expect(charter.florins).toBe(Math.round(result.success_likelihood));
    expect(charter.florins).toBeGreaterThan(0);
    expect(charter.florins).toBeLessThanOrEqual(100);
  });

  it('names all seven virtues and ranks the extremes correctly', () => {
    const charter = buildCharter(evaluated(), petition());
    expect(charter.virtues).toHaveLength(7);
    expect(charter.strongest.score).toBe(9);
    expect(charter.weakest.score).toBe(3);
    for (const v of charter.virtues) {
      expect(v.title.length).toBeGreaterThan(0);
      expect(v.plain.length).toBeGreaterThan(0);
    }
  });

  it('marks the claim upheld only when the petitioner actually claimed it', () => {
    expect(buildCharter(evaluated(), petition({ declared: 'ai' })).claimUpheld).toBe(true);
    expect(buildCharter(evaluated(), petition({ declared: 'unstated' })).claimUpheld).toBe(false);
    expect(buildCharter(evaluated(), petition({ declared: 'none' })).claimUpheld).toBe(false);
  });

  it('substitutes readable text for every blank field', () => {
    const charter = buildCharter(
      evaluated(),
      petition({ name: '', customer: '', moat: '', capital: '' }),
    );
    // A charter with empty lines on it looks broken, not minimal.
    for (const value of [charter.venture, charter.guilds, charter.treasury, charter.alchemy]) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it('is deterministic: the same petition yields the same roll and style', () => {
    const a = buildCharter(evaluated(), petition(), new Date('2026-08-30T12:00:00Z'));
    const b = buildCharter(evaluated(), petition(), new Date('2026-08-30T12:00:00Z'));
    expect(a).toEqual(b);
  });

  it('gives different petitions different roll numbers', () => {
    expect(rollNumber('one venture')).not.toBe(rollNumber('another venture'));
  });
});

describe('percentile ordinals', () => {
  it('gets the teens right, which the naive rule does not', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });

  it('gets the rest right', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(21)).toBe('21st');
    // The bug that prompted this: the charter printed "92th".
    expect(ordinal(92)).toBe('92nd');
    expect(ordinal(93)).toBe('93rd');
    expect(ordinal(100)).toBe('100th');
  });

  it('labels the charter with the ordinal, not a bare th', () => {
    const charter = buildCharter(evaluated(), petition());
    expect(charter.percentileLabel).toBe(ordinal(charter.percentile));
    expect(charter.percentileLabel).not.toMatch(/(1[12]|[02-9][2])th$/);
  });
});

describe('charterFilename', () => {
  it('slugs the venture name', () => {
    expect(charterFilename(buildCharter(evaluated(), petition()))).toBe(
      'grimyapper-charter-the-synergx-engine.pdf',
    );
  });

  it('falls back rather than producing a nameless file', () => {
    const charter = buildCharter(evaluated(), petition({ name: '' }));
    expect(charterFilename(charter)).toMatch(/^grimyapper-charter-[a-z0-9-]+\.pdf$/);
  });

  it('survives a name that is entirely punctuation', () => {
    const charter = { ...buildCharter(evaluated(), petition()), venture: '«»—///' };
    expect(charterFilename(charter)).toBe('grimyapper-charter-venture.pdf');
  });
});

function rejected(): RejectedResult {
  return {
    outcome: 'rejected',
    classification: { is_ai_startup: false, confidence: 0.88, reason: 'nothing thinks here' },
    rejection: {
      verdict: 'REJECTED',
      cause_of_death: 'The engines shall offer this freely as a mere convenience.',
      time_of_death: 'Midwinter, twenty-seven.',
      eulogy: 'It was a reasonable idea, and reasonable is what the engines are cheapest at.',
      ai_that_replaces_it: 'An automaton clerk that works for the price of electricity',
    },
  };
}

describe('buildWarrant', () => {
  it('carries every line the decree prints on screen', () => {
    const w = buildWarrant(rejected(), petition());
    expect(w.cause).toBe(rejected().rejection.cause_of_death);
    expect(w.hour).toBe(rejected().rejection.time_of_death);
    expect(w.lament).toBe(rejected().rejection.eulogy);
    expect(w.supplantedBy).toBe(rejected().rejection.ai_that_replaces_it);
  });

  it('marks the claim refuted only when the petitioner swore it was AI', () => {
    expect(buildWarrant(rejected(), petition({ declared: 'ai' })).claimRefuted).toBe(true);
    expect(buildWarrant(rejected(), petition({ declared: 'none' })).claimRefuted).toBe(false);
    expect(buildWarrant(rejected(), petition({ declared: 'unstated' })).claimRefuted).toBe(false);
  });

  it('substitutes readable text for every blank field', () => {
    const w = buildWarrant(rejected(), petition({ name: '', customer: '', moat: '', capital: '' }));
    for (const v of [w.venture, w.guilds, w.treasury, w.alchemy]) {
      expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it('shares its roll number with the charter, so one petition means one roll', () => {
    const p = petition();
    expect(buildWarrant(rejected(), p).roll).toBe(rollNumber(`${p.idea}${p.name}`));
  });

  it('names the file as a decree, not a charter', () => {
    expect(warrantFilename(buildWarrant(rejected(), petition()))).toBe(
      'grimyapper-decree-the-synergx-engine.pdf',
    );
  });
});
