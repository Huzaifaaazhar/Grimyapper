import { describe, expect, it } from 'vitest';

import { SIGNAL_NAMES, extractSignals } from '@/lib/nlp/signals';

describe('extractSignals', () => {
  it('emits every named signal, always in 0..1', () => {
    const s = extractSignals('A model that reads insurance claims and drafts the decision.');
    for (const name of SIGNAL_NAMES) {
      expect(s[name]).toBeGreaterThanOrEqual(0);
      expect(s[name]).toBeLessThanOrEqual(1);
    }
  });

  it('saturates on match count rather than on the fraction of patterns', () => {
    // The bug this replaced: dividing by rules.length meant a signal with more
    // patterns scored *lower* for the same evidence.
    // Every value must land on 1 - 0.45^n for a whole number of matches n,
    // never on hits/rules.length, and more evidence must never score lower.
    const onMatchCurve = (v: number) => {
      if (v === 0) return true;
      const n = Math.log(1 - v) / Math.log(0.45);
      return Math.abs(n - Math.round(n)) < 1e-6;
    };

    const weak = extractSignals('A model that reads contracts.');
    const strong = extractSignals(
      'A model that reads contracts, trained on our own claims data. We predict outcomes.',
    );

    expect(onMatchCurve(weak.core_model_product)).toBe(true);
    expect(onMatchCurve(strong.core_model_product)).toBe(true);
    expect(strong.core_model_product).toBeGreaterThanOrEqual(weak.core_model_product);
    expect(strong.core_model_product).toBeLessThanOrEqual(1);
  });

  it('separates selling model output from using AI in the back office', () => {
    const product = extractSignals('An agent that drafts replies to customer emails.');
    const internal = extractSignals('A bakery that uses ChatGPT to write its captions.');

    expect(product.core_model_product).toBeGreaterThan(0);
    expect(internal.internal_use_shape).toBeGreaterThan(0);
    expect(internal.core_model_product).toBe(0);
  });

  it('fires buzzword_veneer only when AI words sit on top of an ordinary trade', () => {
    expect(extractSignals('An AI-powered premium dog grooming franchise.').buzzword_veneer)
      .toBeGreaterThan(0);
    // AI adjective, but no ordinary-trade noun for it to be painted onto.
    expect(extractSignals('An AI-powered claims adjudication engine.').buzzword_veneer).toBe(0);
    // An ordinary trade with no AI adjective at all.
    expect(extractSignals('A dog grooming franchise.').buzzword_veneer).toBe(0);
  });

  it('does not treat renting cameras as computer vision', () => {
    expect(extractSignals('We rent out camera equipment to film crews.').physical_world).toBe(0);
    expect(extractSignals('Vision on overhead cameras that counts stock.').physical_world)
      .toBeGreaterThan(0);
  });
});
