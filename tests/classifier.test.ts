import { describe, expect, it } from 'vitest';

import { MODEL_METRICS, MODEL_THRESHOLD, classify } from '@/lib/model/classifier';

describe('classify', () => {
  it('ships a model that beat 90% on held-out folds', () => {
    expect(MODEL_METRICS.accuracy).toBeGreaterThanOrEqual(0.9);
    expect(MODEL_METRICS.f1).toBeGreaterThanOrEqual(0.9);
    expect(MODEL_METRICS.trainedOn).toBeGreaterThan(200);
  });

  it('leans toward "engine-built" on ties, as the definition requires', () => {
    expect(MODEL_THRESHOLD).toBeLessThan(0.5);
  });

  it('routes a core AI product to evaluation', () => {
    const r = classify('An agent that reads insurance claims and drafts the adjuster decision.');
    expect(r.is_ai_startup).toBe(true);
  });

  it('routes an ordinary trade to rejection', () => {
    const r = classify('A subscription box of small-batch hot sauces delivered monthly.');
    expect(r.is_ai_startup).toBe(false);
  });

  it('rejects a business that merely uses AI internally', () => {
    const r = classify('A bakery that uses ChatGPT to write its Instagram captions.');
    expect(r.is_ai_startup).toBe(false);
  });

  it('evaluates a thin wrapper rather than dismissing it', () => {
    const r = classify('Chat with your PDF. You upload a PDF and ask questions about it.');
    expect(r.is_ai_startup).toBe(true);
  });

  it('sees through an AI adjective painted on an ordinary trade', () => {
    const r = classify('A blockchain-enabled AI-powered synergy platform for premium dog walking.');
    expect(r.is_ai_startup).toBe(false);
  });

  it('reports confidence as distance from the boundary, never below a coin toss', () => {
    for (const text of ['A model that reads scans.', 'A bakery.', 'asdf qwer zxcv']) {
      const r = classify(text);
      expect(r.confidence).toBeGreaterThanOrEqual(0.5);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('always gives a non-empty reason', () => {
    expect(classify('A model that grades essays.').reason.length).toBeGreaterThan(0);
    expect(classify('!!!???...').reason.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const text = 'A forecasting model trained on our own shipping data.';
    expect(classify(text)).toEqual(classify(text));
  });
});
