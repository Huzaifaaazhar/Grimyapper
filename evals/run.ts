/**
 * Grimyapper eval harness — `npm run eval`
 *
 * Three things are checked, in one pass:
 *   1. Routing   — does the classifier send each golden case down the right branch?
 *   2. Range     — are the evaluator's rubric values and assumptions inside their bounds?
 *   3. Judgement — do the cases with rubric expectations actually meet them?
 *                  (a thin wrapper scoring 9 on moat is a broken evaluator)
 *
 * Plus an offline check that the composite score matches the weighted mean, so a
 * prompt change can never quietly move the maths.
 *
 * Exits non-zero when routing accuracy drops below ROUTING_ACCURACY_THRESHOLD or
 * any range/judgement assertion fails. Wire it into CI as the prompt-drift guard.
 */
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { CASES, ROUTING_ACCURACY_THRESHOLD, type EvalCase } from './cases';
import { DEFAULT_MODEL, classify, evaluate } from '../lib/judge';
import { RUBRIC_AXES, AssumptionsSchema, RubricSchema } from '../lib/schemas';
import { RUBRIC_WEIGHTS, bandFor, computeSuccessLikelihood } from '../lib/scoring';

/* --------------------------------------------------------------- env loading */

function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

/* ----------------------------------------------------------------- utilities */

const CONCURRENCY = 4;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

type CaseResult = {
  case: EvalCase;
  routed?: 'evaluated' | 'rejected';
  routingOk: boolean;
  confidence?: number;
  failures: string[];
  error?: string;
};

/* --------------------------------------------- offline: the maths cannot drift */

function checkCompositeMath(): string[] {
  const failures: string[] = [];

  const allTens = Object.fromEntries(RUBRIC_AXES.map((a) => [a, 10])) as Record<
    (typeof RUBRIC_AXES)[number],
    number
  >;
  const allZeros = Object.fromEntries(RUBRIC_AXES.map((a) => [a, 0])) as typeof allTens;

  if (computeSuccessLikelihood(allTens) !== 100) failures.push('all-10 rubric must score 100');
  if (computeSuccessLikelihood(allZeros) !== 0) failures.push('all-0 rubric must score 0');

  // A hand-computed sample: verify the weighted mean, not just the endpoints.
  const sample = {
    problem_intensity: 8,
    wrapper_platform_risk: 2,
    moat_beyond_model: 3,
    distribution: 6,
    willingness_to_pay: 7,
    unit_economics: 5,
    timing_half_life: 4,
  };
  const totalWeight = RUBRIC_AXES.reduce((s, a) => s + RUBRIC_WEIGHTS[a], 0);
  const expected = Math.round(
    (RUBRIC_AXES.reduce((s, a) => s + sample[a] * RUBRIC_WEIGHTS[a], 0) / (totalWeight * 10)) * 100,
  );
  const actual = computeSuccessLikelihood(sample);
  if (actual !== expected) failures.push(`sample rubric: expected ${expected}, got ${actual}`);

  const bands: Array<[number, string]> = [
    [0, 'Low'],
    [39, 'Low'],
    [40, 'Medium'],
    [70, 'Medium'],
    [71, 'High'],
    [100, 'High'],
  ];
  for (const [score, band] of bands) {
    if (bandFor(score) !== band) failures.push(`band(${score}) should be ${band}`);
  }

  return failures;
}

/* ------------------------------------------------------------------ live pass */

async function runCase(c: EvalCase): Promise<CaseResult> {
  const req = { idea: c.idea, name: c.name ?? '', customer: c.customer ?? '' };
  const failures: string[] = [];

  let classification;
  try {
    classification = await classify(req);
  } catch (err) {
    return {
      case: c,
      routingOk: false,
      failures: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const routed = classification.is_ai_startup ? ('evaluated' as const) : ('rejected' as const);
  const routingOk = routed === c.expect;

  // Only spend evaluator tokens where the rubric itself is under test.
  if (c.rubric && routed === 'evaluated') {
    try {
      const draft = await evaluate(req);

      if (!RubricSchema.safeParse(draft.rubric).success) failures.push('rubric out of 0–10 range');
      if (!AssumptionsSchema.safeParse(draft.assumptions).success)
        failures.push('assumptions out of range');

      const score = computeSuccessLikelihood(draft.rubric);
      if (score < 0 || score > 100) failures.push(`composite ${score} outside 0–100`);

      for (const [axis, bound] of Object.entries(c.rubric)) {
        const value = draft.rubric[axis as (typeof RUBRIC_AXES)[number]];
        if (bound.max !== undefined && value > bound.max)
          failures.push(`${axis} = ${value}, expected <= ${bound.max}`);
        if (bound.min !== undefined && value < bound.min)
          failures.push(`${axis} = ${value}, expected >= ${bound.min}`);
      }
    } catch (err) {
      failures.push(`evaluator failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { case: c, routed, routingOk, confidence: classification.confidence, failures };
}

/* ----------------------------------------------------------------------- main */

async function main() {
  loadEnvLocal();

  console.log(`\n${BOLD}Grimyapper eval${OFF} ${DIM}· ${CASES.length} golden cases${OFF}`);

  const mathFailures = checkCompositeMath();
  console.log(
    `\n${BOLD}Offline — composite maths${OFF}  ${
      mathFailures.length === 0 ? `${GREEN}PASS${OFF}` : `${RED}FAIL${OFF}`
    }`,
  );
  for (const f of mathFailures) console.log(`  ${RED}✗${OFF} ${f}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      `\n${RED}ANTHROPIC_API_KEY is not set.${OFF} The live pass needs it.` +
        `\nSet it in .env.local or export it, then re-run \`npm run eval\`.\n`,
    );
    process.exit(1);
  }

  console.log(
    `${DIM}model: ${process.env.JUDGE_MODEL || DEFAULT_MODEL} · concurrency: ${CONCURRENCY}${OFF}\n`,
  );

  const started = Date.now();
  const results = await mapLimit(CASES, CONCURRENCY, runCase);

  console.log(`${BOLD}Live — routing and rubric${OFF}\n`);
  for (const r of results) {
    const ok = r.routingOk && r.failures.length === 0 && !r.error;
    const mark = ok ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`;
    const conf = r.confidence !== undefined ? `${(r.confidence * 100).toFixed(0)}%` : '  — ';
    console.log(
      `  ${mark} ${r.case.id.padEnd(28)} ${DIM}${r.case.group.padEnd(10)}${OFF} ` +
        `want ${r.case.expect.padEnd(9)} got ${(r.routed ?? 'error').padEnd(9)} ${DIM}conf ${conf}${OFF}`,
    );
    if (r.error) console.log(`      ${RED}error:${OFF} ${r.error}`);
    for (const f of r.failures) console.log(`      ${RED}✗${OFF} ${f}`);
  }

  const routed = results.filter((r) => !r.error);
  const correct = routed.filter((r) => r.routingOk).length;
  const accuracy = routed.length ? correct / routed.length : 0;
  const assertionFailures = results.reduce((n, r) => n + r.failures.length, 0);
  const errors = results.filter((r) => r.error).length;

  console.log(`\n${BOLD}Summary${OFF} ${DIM}(${((Date.now() - started) / 1000).toFixed(1)}s)${OFF}`);
  console.log(
    `  routing accuracy   ${correct}/${routed.length} = ${(accuracy * 100).toFixed(1)}%  ` +
      `${DIM}(threshold ${(ROUTING_ACCURACY_THRESHOLD * 100).toFixed(0)}%)${OFF}`,
  );
  console.log(`  rubric assertions  ${assertionFailures} failed`);
  console.log(`  request errors     ${errors}`);
  console.log(`  offline maths      ${mathFailures.length} failed\n`);

  const passed =
    accuracy >= ROUTING_ACCURACY_THRESHOLD &&
    assertionFailures === 0 &&
    errors === 0 &&
    mathFailures.length === 0;

  console.log(passed ? `${GREEN}${BOLD}EVAL PASSED${OFF}\n` : `${RED}${BOLD}EVAL FAILED${OFF}\n`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
