import { describe, expect, it } from 'vitest';

import { composeDecree, decreeVariety } from '@/lib/roast/decree';
import { RejectionSchema } from '@/lib/schemas';

const PETITIONS = [
  'A marketplace connecting dog owners with vetted local dog walkers.',
  'A neighbourhood bakery specialising in sourdough.',
  'A boutique design agency that builds pitch decks.',
  'A gym offering small-group strength classes.',
  'A courier company doing same-day delivery.',
  'asdf qwer zxcv',
];

describe('composeDecree', () => {
  it('always satisfies the rejection contract', () => {
    for (const p of PETITIONS) {
      expect(RejectionSchema.safeParse(composeDecree(p)).success).toBe(true);
    }
  });

  it('is deterministic — the court does not change its mind', () => {
    for (const p of PETITIONS) {
      expect(composeDecree(p)).toEqual(composeDecree(p));
    }
  });

  it('gives different petitions different decrees', () => {
    const eulogies = new Set(PETITIONS.map((p) => composeDecree(p).eulogy));
    expect(eulogies.size).toBeGreaterThan(1);
  });

  it('reaches for the matching trade when it recognises one', () => {
    const dogs = composeDecree('A dog walking service covering three postcodes.');
    expect(`${dogs.cause_of_death} ${dogs.eulogy}`.toLowerCase()).toMatch(
      /walker|neighbour|dogs|introduction|matching/,
    );
  });

  it('still buries a trade it does not recognise', () => {
    const odd = composeDecree('A company that does an unusual and unclassifiable thing.');
    expect(RejectionSchema.safeParse(odd).success).toBe(true);
    expect(odd.cause_of_death.length).toBeGreaterThan(20);
  });

  it('never leaves a field empty or unterminated', () => {
    for (const p of PETITIONS) {
      const d = composeDecree(p);
      for (const field of [d.cause_of_death, d.time_of_death, d.eulogy]) {
        expect(field.trim().length).toBeGreaterThan(10);
        expect(field.trim().endsWith('.')).toBe(true);
      }
      expect(d.ai_that_replaces_it.trim().length).toBeGreaterThan(5);
    }
  });

  it('never leaves a stray capital where an opening clause was joined on', () => {
    // "Quietly, and at speed, A familiar spirit shall…" is the tell that a line
    // was assembled rather than written.
    const many = Array.from({ length: 300 }, (_, i) => composeDecree(`venture number ${i}`));
    for (const d of many) {
      expect(d.cause_of_death).not.toMatch(/,\s+[A-Z][a-z]/);
    }
  });

  it('carries enough combinations that repeat visitors see new text', () => {
    const { trades, minCombinations } = decreeVariety();
    expect(trades).toBeGreaterThanOrEqual(10);
    expect(minCombinations).toBeGreaterThan(5000);
  });
});
