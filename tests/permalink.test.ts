import { describe, expect, it } from 'vitest';

import { canPermalink, decodePetition, encodePetition, permalinkPath } from '@/lib/permalink';
import { guardPermalink } from '@/lib/permalink-guard';
import { MAX_IDEA_CHARS, type JudgeRequest } from '@/lib/schemas';

const petition = (over: Partial<JudgeRequest> = {}): JudgeRequest => ({
  idea: 'A marketplace connecting dog owners with vetted local dog walkers.',
  name: '',
  customer: '',
  moat: '',
  capital: '',
  declared: 'unstated',
  ...over,
});

describe('what fits in a link', () => {
  const maxed = (fill: string) =>
    petition({
      idea: fill.repeat(600),
      name: fill.repeat(80),
      customer: fill.repeat(140),
      moat: fill.repeat(300),
      capital: fill.repeat(60),
      declared: 'ai' as const,
    });

  it('carries every field at its cap in Latin script', () => {
    expect(canPermalink(maxed('a'))).toBe(true);
  });

  it('carries an ordinary petition in a multi-byte script', () => {
    // The bug this guards: the old 2048-char bound rejected these on arrival
    // while the UI happily printed the link.
    expect(canPermalink(petition({ idea: '貓'.repeat(600), name: '貓'.repeat(80) }))).toBe(true);
  });

  it('admits it when a petition genuinely will not fit', () => {
    // Every field maxed in a three-byte script exceeds any sane URL. The point
    // is that this is reported, not that it is impossible.
    expect(canPermalink(maxed('貓'))).toBe(false);
  });

  it('never claims a link works when decoding it would fail', () => {
    for (const fill of ['a', 'é', '貓', '𝔊']) {
      const p = maxed(fill);
      expect(canPermalink(p)).toBe(decodePetition(encodePetition(p)) !== null);
    }
  });
});

describe('permalink encoding', () => {
  it('round-trips the fields added after launch', () => {
    const p = petition({
      name: 'The Synergx Engine',
      customer: 'Merchant captains',
      moat: 'Five years of labelled carrier disputes.',
      capital: 'Twelve moons of gold',
      declared: 'ai',
    });
    expect(decodePetition(encodePetition(p))).toEqual(p);
  });

  it('still decodes a three-field link minted before those fields existed', () => {
    /*
     * Links are in the wild. This is the exact byte layout the first version
     * produced, written out literally rather than via encodePetition, so the
     * test keeps failing if the column order is ever changed.
     */
    const legacy = Buffer.from(
      ['A bakery selling sourdough and pastries.', 'Crumb', 'Neighbours'].join('\t'),
      'utf8',
    ).toString('base64url');

    expect(decodePetition(legacy)).toEqual(
      petition({
        idea: 'A bakery selling sourdough and pastries.',
        name: 'Crumb',
        customer: 'Neighbours',
      }),
    );
  });

  it('defaults a nonsense declaration rather than refusing the link', () => {
    const crafted = Buffer.from(
      ['An agent that drafts freight claims.', '', '', '', '', 'sovereign'].join('\t'),
      'utf8',
    ).toString('base64url');
    expect(decodePetition(crafted)?.declared).toBe('unstated');
  });

  it('does not pad a short petition with empty columns', () => {
    // Trailing tabs would lengthen every URL for nothing.
    const bare = petition();
    expect(Buffer.from(encodePetition(bare), 'base64url').toString('utf8')).toBe(bare.idea);
  });

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

  it('refuses junk that happens to be in the base64url alphabet', () => {
    // Regression: `/j/not-a-real-token` is valid base64url, and the default
    // TextDecoder substituted U+FFFD rather than rejecting — so a typo'd link
    // decoded to mojibake, passed the length check, and got a real judgement
    // instead of a 404.
    for (const bad of ['not-a-real-token', 'abcdefgh', 'zzzzzzzzzzzz', 'QQQQQQQQ', '____----']) {
      expect(decodePetition(bad)).toBeNull();
    }
  });

  it('refuses a token carrying control characters', () => {
    const sneaky = Buffer.from('A bakery\u0000selling bread\u0007.\t\t').toString('base64url');
    expect(decodePetition(sneaky)).toBeNull();
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
