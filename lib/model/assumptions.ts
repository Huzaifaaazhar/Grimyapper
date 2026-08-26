import { extractSignals, type Signals } from '../nlp/signals';
import { hash32 } from '../nlp/text';
import type { Assumptions, Band, Rubric } from '../schemas';

/**
 * The six seed assumptions, derived from the same signals the rubric reads.
 *
 * These are the only inputs to the twelve-month reckoning — everything in the
 * ledger is arithmetic worked upon them (`lib/metrics.ts`). They are estimates
 * with reasoning behind them, not measurements, and the footer says so.
 */

/** ±7%, deterministic per petition, so two similar ventures do not read identically. */
function jitter(seed: number, salt: string): number {
  const h = hash32(`${seed}:${salt}`);
  return 0.93 + ((h % 1000) / 1000) * 0.14;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

export function deriveAssumptions(text: string, rubric: Rubric): Assumptions {
  const s: Signals = extractSignals(text);
  const seed = hash32(text);

  // Which way the business points decides the shape of every number below.
  const enterprise = Math.min(1, s.b2b_buyer + s.regulated_domain * 0.6 + s.integration_depth * 0.5);
  const consumer = Math.min(1, s.consumer_buyer + s.generative_product * 0.5 + s.novelty_toy * 0.6);
  const lean = Math.max(0, Math.min(1, 0.5 + (consumer - enterprise) / 2));

  // Consumer reaches many and keeps few; enterprise the reverse.
  const reach = lerp(2_600, 90_000, lean) * (0.55 + rubric.distribution / 10) * jitter(seed, 'reach');

  const growth = lerp(0.06, 0.13, rubric.distribution / 10) * jitter(seed, 'growth');

  const conversion = lerp(0.09, 0.022, lean) * (0.5 + rubric.willingness_to_pay / 10) * jitter(seed, 'conv');

  const price = lerp(240, 14, lean) * (0.45 + rubric.willingness_to_pay / 8) * jitter(seed, 'price');

  // Churn is the moat read from the other side.
  const stickiness = (rubric.moat_beyond_model + rubric.problem_intensity) / 20;
  const churn = lerp(0.135, 0.014, stickiness) * jitter(seed, 'churn');

  // Sensors and regulated ground cost more to build against.
  const burdened = Math.min(1, s.physical_world * 0.8 + s.regulated_domain * 0.6);
  const burn = lerp(46_000, 132_000, burdened) * (1.25 - rubric.unit_economics / 22) * jitter(seed, 'burn');

  const round = (n: number, to: number) => Math.max(to, Math.round(n / to) * to);

  return {
    reachable_users_year1: round(reach, 100),
    monthly_growth_rate: Number(growth.toFixed(3)),
    free_to_paid_conversion: Number(conversion.toFixed(4)),
    price_per_month_usd: round(price, 1),
    monthly_churn: Number(churn.toFixed(4)),
    monthly_burn_usd: round(burn, 1000),
  };
}

/**
 * The court's one-line ruling. Chosen by band and by whichever axis is doing the
 * most damage, so the line always matches the scores beside it.
 */
export function deriveVerdict(rubric: Rubric, band: Band, seed: number): string {
  const weakest = (
    [
      ['wrapper_platform_risk', 'wrapper'],
      ['moat_beyond_model', 'moat'],
      ['willingness_to_pay', 'purse'],
      ['problem_intensity', 'need'],
      ['unit_economics', 'margin'],
      ['distribution', 'reach'],
      ['timing_half_life', 'clock'],
    ] as const
  )
    .map(([axis, key]) => ({ key, value: rubric[axis] }))
    .sort((a, b) => a.value - b.value)[0].key;

  const LINES: Record<Band, Record<string, string[]>> = {
    High: {
      wrapper: ['Worth the backing, shouldst thou outlive the great engines'],
      moat: ['A fine craft, though the ditch about it wants digging'],
      purse: ['Sound in every part but the collecting of coin'],
      need: ['Well built, and in want of a wound to heal'],
      margin: ['Strong, save that the thinking costs more than the tithe'],
      reach: ['A worthy trade that no one has yet been told of'],
      clock: ['Good work, and the clock upon it runs faster than thou think'],
    },
    Medium: {
      wrapper: ['Passable, until the engines notice thee'],
      moat: ['A decent trade standing in an open field'],
      purse: ['They will use it gladly and pay for it never'],
      need: ['A remedy in search of an affliction'],
      margin: ['The sums do not yet meet in the middle'],
      reach: ['Sound enough, and unreachable by any customer'],
      clock: ['Serviceable now; ask again after the next release'],
    },
    Low: {
      wrapper: ['This is a feature, and it is not thine'],
      moat: ['Anyone might build this by Thursday'],
      purse: ['Charming, and worth precisely nothing'],
      need: ['A solution to a problem no one has'],
      margin: ['Every customer costs thee more than they bring'],
      reach: ['No one shall ever find it'],
      clock: ['Already obsolete, and it has not yet been built'],
    },
  };

  const pool = LINES[band][weakest] ?? LINES[band].moat;
  return pool[hash32(`verdict:${seed}`) % pool.length];
}
