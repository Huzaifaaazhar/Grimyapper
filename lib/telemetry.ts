/**
 * Probability-only telemetry.
 *
 * Records where judgements land on the decision scale and nothing else. The
 * petition text is never passed to this module — not truncated, not hashed,
 * not stored — so there is nothing here that could identify a submission even
 * if the process memory were dumped.
 *
 * The point is active learning: judgements piling up near the threshold are the
 * region where the model is least sure, which is where more labelled data would
 * buy the most. A histogram is enough to see that, and is the least that can be
 * collected while still seeing it.
 *
 * In-process and per-instance, like the rate limiter. It resets on redeploy and
 * on any cold start, which is fine for a signal that is only ever read as a
 * shape rather than a count.
 */

/** Ten buckets across the probability scale. */
const BUCKETS = 10;

const counts = new Int32Array(BUCKETS);
let total = 0;
let nearBoundary = 0;
let evaluated = 0;
const startedAt = Date.now();

/** How close to the threshold counts as "the model was not sure". */
const UNCERTAIN_BAND = 0.1;

export function recordJudgement(probability: number, threshold: number, wasEvaluated: boolean) {
  if (!Number.isFinite(probability)) return;
  const index = Math.min(BUCKETS - 1, Math.max(0, Math.floor(probability * BUCKETS)));
  counts[index] += 1;
  total += 1;
  if (wasEvaluated) evaluated += 1;
  if (Math.abs(probability - threshold) <= UNCERTAIN_BAND) nearBoundary += 1;
}

export type TelemetrySnapshot = {
  total: number;
  evaluated: number;
  rejected: number;
  nearBoundary: number;
  uncertainBand: number;
  sinceMinutes: number;
  histogram: Array<{ from: number; to: number; count: number }>;
};

export function snapshot(): TelemetrySnapshot {
  return {
    total,
    evaluated,
    rejected: total - evaluated,
    nearBoundary,
    uncertainBand: UNCERTAIN_BAND,
    sinceMinutes: Math.round((Date.now() - startedAt) / 60_000),
    histogram: Array.from({ length: BUCKETS }, (_, i) => ({
      from: i / BUCKETS,
      to: (i + 1) / BUCKETS,
      count: counts[i],
    })),
  };
}

/** Test seam only. */
export function __resetTelemetry() {
  counts.fill(0);
  total = 0;
  nearBoundary = 0;
  evaluated = 0;
}
