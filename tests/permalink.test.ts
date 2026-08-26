import { describe, expect, it } from 'vitest';

import { decodePetition, encodePetition, permalinkPath } from '@/lib/permalink';
import { guardPermalink } from '@/lib/permalink-guard';
import { MAX_IDEA_CHARS, type JudgeRequest } from '@/lib/schemas';

const petition = (over: Partial<JudgeRequest> = {}): JudgeRequest => ({
  idea: 'A marketplace connecting dog owners with vetted local dog walkers.',
  name: '',
  customer: '',
  ...over,
});

describe('permalink encoding', () => {
  it('round-trips every field', () => {
    const p = petition({ name: 'Waggle', customer: 'Urban dog owners' });
    expect(decodePetition(encodePetition(p))).toEqual(p);
  });

  it('survives punctuation, accents and other scripts', () => {
    for (const idea of [
      'Un modèle qui lit les réclamations d’assurance — automatiquement.',
      'A café that sells "artisanal" bread & pastries (mostly).',
      '一个用人工智能分析保险索赔的模型 for insurers.',
    ]) {
      const p = petition({ idea });
      expect(decodePetition(encodePetition(p))?.idea).toBe(idea);
    }
  });

  it('produces a stable path for the same petition', () => {
    expect(permalinkPath(petition())).toBe(permalinkPath(petition()));
  });

  it('refuses anything that is not a valid token', () => {
    for (const bad of ['', '!!!not base64!!!', 'A'.repeat(3000), '%%%%']) {
      expect(decodePetition(bad)).toBeNull();
    }
  });

  it('holds a crafted token to the same limits as the form', () => {
    // The token comes from a URL a stranger controls, so a hand-built one must
    // not be able to smuggle in a longer petition than the form would accept.
    const oversized = Buffer.from(`${'x'.repeat(MAX_IDEA_CHARS + 50)}\t\t`).toString('base64url');
    expect(decodePetition(oversized)).toBeNull();

    const tooShort = Buffer.from('tiny\t\t').toString('base64url');
    expect(decodePetition(tooShort)).toBeNull();
  });
});

describe('guardPermalink', () => {
  it('publishes an ordinary petition', () => {
    expect(guardPermalink(petition()).publishable).toBe(true);
  });

  it('refuses to reprint contact details', () => {
    const cases = [
      'A dog walking service, email me at victim@example.com to sign up.',
      'A bakery. Call +44 7700 900123 any time.',
      'A shop. My card is 4111 1111 1111 1111 if you want to test it.',
      'A cleaning company at 42 Example Street, come by.',
    ];
    for (const idea of cases) {
      const verdict = guardPermalink(petition({ idea }));
      expect(verdict.publishable).toBe(false);
      if (!verdict.publishable) expect(verdict.reason.length).toBeGreaterThan(20);
    }
  });

  it('checks the optional fields too, not just the pitch', () => {
    expect(guardPermalink(petition({ customer: 'reach me at spam@example.com' })).publishable).toBe(false);
  });

  it('does not trip on ordinary numbers in a pitch', () => {
    for (const idea of [
      'We train a model on three years of data from 200 stores.',
      'A gym with 4 locations and 1,200 members.',
      'Software that handles 99.9% uptime for 50 teams.',
    ]) {
      expect(guardPermalink(petition({ idea })).publishable).toBe(true);
    }
  });
});
