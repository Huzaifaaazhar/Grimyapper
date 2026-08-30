import distribution from './score-distribution.json';

/**
 * Where a composite sits against every engine-built petition the court has
 * seen — which is the training corpus, scored through the same rubric.
 *
 * The original idea was to compare against everything judged *today*, which
 * needs somewhere to keep today's verdicts. This needs nothing, is identical
 * for every visitor, and does not shift because of who else happened to turn
 * up, which makes it the more honest comparison as well as the cheaper one.
 */
const SCORES: number[] = distribution.scores;

export const SCORE_DISTRIBUTION = {
  n: distribution.n,
  median: distribution.median,
  mean: distribution.mean,
  scores: SCORES,
};

/** Percentage of known petitions this score beats, 0–100. */
export function percentileFor(score: number): number {
  if (SCORES.length === 0) return 50;
  let below = 0;
  for (const s of SCORES) {
    if (s < score) below += 1;
    else if (s === score) below += 0.5; // split ties, so identical scores agree
  }
  return Math.round((below / SCORES.length) * 100);
}

/** A coarse band, for when a number is more precision than the point deserves. */
export function standingFor(percentile: number): string {
  if (percentile >= 90) return 'among the strongest this court has weighed';
  if (percentile >= 70) return 'above most that come before it';
  if (percentile >= 45) return 'about the middle of the roll';
  if (percentile >= 20) return 'below most that come before it';
  return 'among the weakest this court has weighed';
}

/**
 * English ordinals, done properly.
 *
 * Appending a bare "th" printed "92th" and "21th" on the charter and the
 * dossier alike. The teens are the exception that a naive last-digit rule gets
 * wrong, so they are checked first.
 */
export function ordinal(n: number): string {
  const abs = Math.abs(Math.trunc(n));
  const teen = abs % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
