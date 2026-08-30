import { ordinal, percentileFor, standingFor } from './model/percentile';
import { RUBRIC_LABELS, RUBRIC_PLAIN } from './scoring';
import {
  RUBRIC_AXES,
  type EvaluatedResult,
  type JudgeRequest,
  type RejectedResult,
} from './schemas';

/**
 * Everything printed on the Charter of Sovereign Blessing, derived in one pure
 * function.
 *
 * Kept separate from both the React component and the PDF writer on purpose:
 * the screen and the downloaded document must agree to the letter, and the only
 * way to guarantee that is for neither to compute anything. It also means the
 * charter's content is unit-testable without a canvas or a DOM.
 */

export type CharterVirtue = { title: string; plain: string; score: number };

export type Charter = {
  venture: string;
  /** Style, deterministic, awarded by band — flavour, not a second score. */
  style: string;
  petition: string;
  verdict: string;
  /** The same 0–100 success likelihood the dial shows, restyled as florins. */
  florins: number;
  band: string;
  percentile: number;
  /** "92nd", not "92th". Rendered identically on screen and in the PDF. */
  percentileLabel: string;
  standing: string;
  guilds: string;
  treasury: string;
  alchemy: string;
  virtues: CharterVirtue[];
  strongest: CharterVirtue;
  weakest: CharterVirtue;
  roll: string;
  sealedOn: string;
  /**
   * True when the petitioner swore the venture was wrought with thinking
   * engines and the assayer agreed. Printed as a separate line, because a
   * confirmed claim and an unclaimed finding are not the same document.
   */
  claimUpheld: boolean;
};

/** Deterministic, so one petition always bears one roll number. */
export function rollNumber(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `MMXXVI · ${String(Math.abs(h) % 10000).padStart(4, '0')}`;
}

const STYLES: Record<string, string[]> = {
  High: ['Sovereign Warrant, first degree', 'Charter Royal, under signet'],
  Medium: ['Letters Patent, provisional', 'Charter of Conditional Grace'],
  Low: ['Licence to Attempt, revocable', 'Charter of Bare Sufferance'],
};

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function buildCharter(
  result: EvaluatedResult,
  petition: JudgeRequest,
  /** Injected so a test can pin the date; the UI passes nothing. */
  now: Date = new Date(),
): Charter {
  const virtues: CharterVirtue[] = RUBRIC_AXES.map((axis) => ({
    title: RUBRIC_LABELS[axis],
    plain: RUBRIC_PLAIN[axis],
    score: result.rubric[axis],
  }));

  const ranked = [...virtues].sort((a, b) => b.score - a.score);
  const percentile = percentileFor(result.success_likelihood);
  const seed = `${petition.idea}${petition.name}`;
  const styles = STYLES[result.band] ?? STYLES.Low;

  return {
    venture: petition.name?.trim() || 'A venture yet unnamed',
    style: styles[Math.abs(hashOf(seed)) % styles.length],
    petition: petition.idea,
    verdict: result.verdict,
    florins: Math.round(result.success_likelihood),
    band: result.band,
    percentile,
    percentileLabel: ordinal(percentile),
    standing: standingFor(percentile),
    guilds: petition.customer?.trim() || 'Guilds unnamed',
    treasury: petition.capital?.trim() || 'Coffers undeclared',
    alchemy: petition.moat?.trim() || 'No secret alchemy was pleaded.',
    virtues,
    strongest: ranked[0],
    weakest: ranked[ranked.length - 1],
    roll: rollNumber(seed),
    sealedOn: DATE.format(now),
    claimUpheld: petition.declared === 'ai',
  };
}

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h;
}

/** A filename a person can find again in their downloads folder. */
export function charterFilename(charter: Charter): string {
  const slug =
    charter.venture
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'venture';
  return `grimyapper-charter-${slug}.pdf`;
}

/* --------------------------------------------------------------- the warrant */

/**
 * The refused half of the same document.
 *
 * A rejected petition gets a leaf too. Same derivation rule as the charter:
 * screen, PDF and tests all read this one object, so the printed decree cannot
 * drift from the one on the page.
 */
export type Warrant = {
  venture: string;
  petition: string;
  cause: string;
  hour: string;
  supplantedBy: string;
  lament: string;
  guilds: string;
  treasury: string;
  alchemy: string;
  roll: string;
  sealedOn: string;
  /** True when the petitioner swore it was AI and the assayer disagreed. */
  claimRefuted: boolean;
};

export function buildWarrant(
  result: RejectedResult,
  petition: JudgeRequest,
  now: Date = new Date(),
): Warrant {
  return {
    venture: petition.name?.trim() || 'A venture yet unnamed',
    petition: petition.idea,
    cause: result.rejection.cause_of_death,
    hour: result.rejection.time_of_death,
    supplantedBy: result.rejection.ai_that_replaces_it,
    lament: result.rejection.eulogy,
    guilds: petition.customer?.trim() || 'Guilds unnamed',
    treasury: petition.capital?.trim() || 'Coffers undeclared',
    alchemy: petition.moat?.trim() || 'No secret alchemy was pleaded.',
    roll: rollNumber(`${petition.idea}${petition.name}`),
    sealedOn: DATE.format(now),
    claimRefuted: petition.declared === 'ai',
  };
}

export function warrantFilename(warrant: Warrant): string {
  const slug =
    warrant.venture
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'venture';
  return `grimyapper-decree-${slug}.pdf`;
}
