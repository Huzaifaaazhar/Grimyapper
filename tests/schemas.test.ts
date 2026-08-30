import { describe, expect, it } from 'vitest';

import {
  ClassificationSchema,
  JudgeRequestSchema,
  MAX_IDEA_CHARS,
  RejectionSchema,
} from '@/lib/schemas';

describe('JudgeRequestSchema', () => {
  it('accepts a normal pitch and defaults the optional fields', () => {
    const parsed = JudgeRequestSchema.parse({ idea: 'An agent that files my expenses for me.' });
    expect(parsed.name).toBe('');
    expect(parsed.customer).toBe('');
    expect(parsed.moat).toBe('');
    expect(parsed.capital).toBe('');
    // Silence is its own answer, and is not the same as "no engines".
    expect(parsed.declared).toBe('unstated');
  });

  it('refuses a declaration that is not one of the three', () => {
    const result = JudgeRequestSchema.safeParse({
      idea: 'An agent that files my expenses for me.',
      declared: 'definitely-ai-trust-me',
    });
    expect(result.success).toBe(false);
  });

  it('caps the moat and the treasury line', () => {
    const idea = 'A model that predicts grocery shrink per SKU.';
    expect(JudgeRequestSchema.safeParse({ idea, moat: 'x'.repeat(1000) }).success).toBe(false);
    expect(JudgeRequestSchema.safeParse({ idea, capital: 'x'.repeat(500) }).success).toBe(false);
  });

  it('rejects a pitch that is too short', () => {
    expect(JudgeRequestSchema.safeParse({ idea: 'dogs' }).success).toBe(false);
  });

  it('rejects a pitch past the character cap', () => {
    const long = 'a'.repeat(MAX_IDEA_CHARS + 1);
    expect(JudgeRequestSchema.safeParse({ idea: long }).success).toBe(false);
  });

  it('rejects an over-long optional field rather than silently truncating', () => {
    const result = JudgeRequestSchema.safeParse({
      idea: 'A model that predicts grocery shrink per SKU.',
      name: 'x'.repeat(500),
    });
    expect(result.success).toBe(false);
  });
});

describe('model output contracts', () => {
  it('rejects a classification with an out-of-range confidence', () => {
    expect(
      ClassificationSchema.safeParse({ is_ai_startup: true, confidence: 4, reason: 'no' }).success,
    ).toBe(false);
  });

  it('rejects a rejection card whose verdict is not REJECTED', () => {
    expect(
      RejectionSchema.safeParse({
        verdict: 'APPROVED',
        cause_of_death: 'a',
        time_of_death: 'b',
        eulogy: 'c',
        ai_that_replaces_it: 'd',
      }).success,
    ).toBe(false);
  });

  it('rejects a rejection card with an empty field', () => {
    expect(
      RejectionSchema.safeParse({
        verdict: 'REJECTED',
        cause_of_death: '',
        time_of_death: 'b',
        eulogy: 'c',
        ai_that_replaces_it: 'd',
      }).success,
    ).toBe(false);
  });
});
