import { describe, expect, it } from 'vitest';

import { hearAppeal } from '@/lib/appeal';

const base = {
  idea: 'A marketplace connecting dog owners with vetted local dog walkers.',
  name: '',
  customer: '',
};

describe('hearAppeal', () => {
  it('dismisses a rebuttal that establishes nothing', () => {
    const result = hearAppeal({
      ...base,
      rebuttal: 'But we are extremely passionate about dogs and our team is excellent.',
    });
    expect(result.outcome).toBe('dismissed');
    if (result.outcome === 'dismissed') {
      expect(result.ruling.length).toBeGreaterThan(20);
      expect(result.unmoved.length).toBeGreaterThan(20);
    }
  });

  it('upholds a rebuttal that genuinely redefines what is being sold', () => {
    // The joke is that the court never reconsiders. The mechanism is honest, so
    // a rebuttal that moves the classifier across the threshold really does win.
    const result = hearAppeal({
      ...base,
      rebuttal: 'The product is a model that predicts which walker will cancel, sold to insurers.',
    });
    expect(result.outcome).toBe('upheld');
    if (result.outcome === 'upheld') {
      expect(result.judgement.outcome).toBe('evaluated');
      expect(result.moved.length).toBeGreaterThan(10);
    }
  });

  it('does not uphold merely because a model is mentioned as an ingredient', () => {
    // "We also use a model" is exactly the case the definition says is NOT an
    // AI startup, so the appeal must fail even though the words are there.
    const result = hearAppeal({
      ...base,
      rebuttal: 'We also use machine learning internally to schedule the walkers.',
    });
    expect(result.outcome).toBe('dismissed');
  });

  it('is deterministic', () => {
    const input = { ...base, rebuttal: 'But our team is excellent and we care deeply.' };
    expect(hearAppeal(input)).toEqual(hearAppeal(input));
  });

  it('rejects a rebuttal that is too long or too short', () => {
    expect(() => hearAppeal({ ...base, rebuttal: 'no' })).toThrow();
    expect(() => hearAppeal({ ...base, rebuttal: 'x'.repeat(400) })).toThrow();
  });
});
