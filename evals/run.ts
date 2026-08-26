/**
 * Grimyapper eval harness — `npm run eval`
 *
 * Runs entirely offline: no API key, no network, about a second end to end.
 * That is the point of the local engine — this can gate every commit rather
 * than being the expensive job everyone learns to skip.
 *
 * Six gates, all of which must pass:
 *   1. Routing      — the classifier sends each golden case down the right branch
 *   2. Judgement    — rubric expectations hold (a thin wrapper cannot score 9 on moat)
 *   3. Range        — every rubric value and assumption inside its bounds
 *   4. Arithmetic   — composite maths and the twelve-month model still agree
 *   5. Determinism  — the same petition judged twice gives byte-identical output
 *   6. Calibration  — the rubric stays close to hand-scored labels, per axis
 *
 * Adversarial and non-English petitions used to be a separate gate; they are now
 * golden cases in their own right, asserted well-formed rather than routed.
 *
 * The golden cases are held out of the training corpus; `npm run train` fails
 * if one leaks in, so routing accuracy here is measured on unseen text.
 */
import { CASES, ROUTING_ACCURACY_THRESHOLD, type EvalCase } from './cases';
import { MAX_AXIS_MAE, MAX_OVERALL_MAE, RUBRIC_LABELS } from './rubric-labels';
import { MODEL_METRICS, MODEL_THRESHOLD, judge } from '../lib/judge';
import { scoreRubric } from '../lib/model/rubric';
import { decreeVariety } from '../lib/roast/decree';
import { HORIZON_MONTHS, projectTwelveMonths } from '../lib/metrics';
import {
  AssumptionsSchema,
  JudgeRequestSchema,
  RUBRIC_AXES,
  RubricSchema,
  type Assumptions,
} from '../lib/schemas';
import { RUBRIC_WEIGHTS, bandFor, computeSuccessLikelihood } from '../lib/scoring';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const failures: string[] = [];
const fail = (gate: string, detail: string) => failures.push(`${gate}: ${detail}`);

const req = (c: EvalCase) => ({ idea: c.idea, name: c.name ?? '', customer: c.customer ?? '' });

/* ------------------------------------------------------- 1 & 2: routing + rubric */

function routingAndJudgement() {
  console.log(`${BOLD}Gates 1 & 2 — routing and rubric judgement${OFF}\n`);

  let correct = 0;
  let strict = 0;
  const rubricFailures: string[] = [];

  for (const c of CASES) {
    const result = judge(JudgeRequestSchema.parse(req(c)));
    const routed = result.outcome;
    const scored = c.expect !== 'any';
    const ok = scored ? routed === c.expect : true;
    if (scored) {
      strict += 1;
      if (ok) correct += 1;
    }

    const localFailures: string[] = [];

    // Whatever the branch, the judgement must be well-formed and must never
    // echo the petition's markup back into the response.
    const serialised = JSON.stringify(result);
    if (/<script|<\/b>|DROP TABLE/i.test(serialised)) {
      localFailures.push('echoed hostile input into the response');
    }
    if (result.outcome === 'evaluated' && !RubricSchema.safeParse(result.rubric).success) {
      localFailures.push('rubric outside 0–10');
    }
    if (result.outcome === 'rejected' && result.rejection.verdict !== 'REJECTED') {
      localFailures.push('decree carried the wrong verdict');
    }

    if (c.rubric && result.outcome === 'evaluated') {
      for (const [axis, bound] of Object.entries(c.rubric)) {
        const value = result.rubric[axis as (typeof RUBRIC_AXES)[number]];
        if (bound.max !== undefined && value > bound.max) {
          localFailures.push(`${axis} = ${value}, expected <= ${bound.max}`);
        }
        if (bound.min !== undefined && value < bound.min) {
          localFailures.push(`${axis} = ${value}, expected >= ${bound.min}`);
        }
      }
    }

    rubricFailures.push(...localFailures.map((f) => `${c.id} — ${f}`));

    const mark = ok && localFailures.length === 0 ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`;
    const conf = `${(result.classification.confidence * 100).toFixed(0)}%`;
    const want = scored ? c.expect : 'any';
    console.log(
      `  ${mark} ${c.id.padEnd(28)} ${DIM}${c.group.padEnd(12)}${OFF} ` +
        `want ${want.padEnd(9)} got ${routed.padEnd(9)} ${DIM}conf ${conf.padStart(4)}${OFF}`,
    );
    for (const f of localFailures) console.log(`      ${RED}✗${OFF} ${f}`);
  }

  const accuracy = correct / strict;
  console.log(
    `\n  routing ${correct}/${strict} = ${(accuracy * 100).toFixed(1)}% ` +
      `${DIM}(threshold ${(ROUTING_ACCURACY_THRESHOLD * 100).toFixed(0)}%; ` +
      `${CASES.length - strict} further cases asserted well-formed only)${OFF}`,
  );

  if (accuracy < ROUTING_ACCURACY_THRESHOLD) {
    fail('routing', `accuracy ${(accuracy * 100).toFixed(1)}% below threshold`);
  }
  for (const f of rubricFailures) fail('judgement', f);

  return accuracy;
}

/* -------------------------------------------------------------- 3: value ranges */

function ranges() {
  console.log(`\n${BOLD}Gate 3 — every value inside its bounds${OFF}`);
  let checked = 0;

  for (const c of CASES) {
    const result = judge(JudgeRequestSchema.parse(req(c)));
    if (result.outcome !== 'evaluated') continue;
    checked += 1;

    if (!RubricSchema.safeParse(result.rubric).success) {
      fail('range', `${c.id}: rubric outside 0–10`);
    }
    if (!AssumptionsSchema.safeParse(result.assumptions).success) {
      fail('range', `${c.id}: assumptions outside bounds`);
    }
    if (result.success_likelihood < 0 || result.success_likelihood > 100) {
      fail('range', `${c.id}: composite ${result.success_likelihood} outside 0–100`);
    }
    if (result.months.length !== HORIZON_MONTHS) {
      fail('range', `${c.id}: ${result.months.length} months, expected ${HORIZON_MONTHS}`);
    }
    for (const m of result.months) {
      if (m.users < 0 || m.paying < 0 || m.paying > m.users + 1) {
        fail('range', `${c.id}: month ${m.month} has ${m.paying} paying of ${m.users} users`);
      }
    }
    for (const axis of RUBRIC_AXES) {
      if (!result.rubric_notes[axis]?.trim()) fail('range', `${c.id}: empty note on ${axis}`);
    }
  }

  console.log(`  ${checked} evaluated petitions checked for range and note coverage`);
}

/* --------------------------------------------------------------- 4: arithmetic */

function arithmetic() {
  console.log(`\n${BOLD}Gate 4 — the arithmetic cannot drift${OFF}`);

  const all = (v: number) =>
    Object.fromEntries(RUBRIC_AXES.map((a) => [a, v])) as Record<
      (typeof RUBRIC_AXES)[number],
      number
    >;

  if (computeSuccessLikelihood(all(10)) !== 100) fail('arithmetic', 'all-10 rubric must score 100');
  if (computeSuccessLikelihood(all(0)) !== 0) fail('arithmetic', 'all-0 rubric must score 0');

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
  if (computeSuccessLikelihood(sample) !== expected) {
    fail('arithmetic', `sample rubric expected ${expected}, got ${computeSuccessLikelihood(sample)}`);
  }

  for (const [score, band] of [[0, 'Low'], [39, 'Low'], [40, 'Medium'], [70, 'Medium'], [71, 'High'], [100, 'High']] as const) {
    if (bandFor(score) !== band) fail('arithmetic', `band(${score}) should be ${band}`);
  }

  // The projection must land month 12 on the reachable figure it was seeded from.
  const seed: Assumptions = {
    reachable_users_year1: 42_000,
    monthly_growth_rate: 0.19,
    free_to_paid_conversion: 0.035,
    price_per_month_usd: 149,
    monthly_churn: 0.025,
    monthly_burn_usd: 85_000,
  };
  const rows = projectTwelveMonths(seed);
  if (Math.abs(rows[11].users - seed.reachable_users_year1) > 2) {
    fail('arithmetic', `month 12 landed on ${rows[11].users}, expected ${seed.reachable_users_year1}`);
  }
  let running = 0;
  for (const row of rows) {
    running = Math.round((running + row.net) * 100) / 100;
    if (Math.abs(row.cumulative_net - running) > 0.01) {
      fail('arithmetic', `cumulative diverges at month ${row.month}`);
    }
  }

  console.log('  composite weights, band boundaries and the twelve-month model all agree');
}

/* -------------------------------------------------------------- 5: determinism */

function determinism() {
  console.log(`\n${BOLD}Gate 5 — the court does not change its mind${OFF}`);

  for (const c of CASES.slice(0, 8)) {
    const parsed = JudgeRequestSchema.parse(req(c));
    const a = JSON.stringify(judge(parsed));
    const b = JSON.stringify(judge(parsed));
    if (a !== b) fail('determinism', `${c.id} judged differently on a second reading`);
  }

  const variety = decreeVariety();
  console.log(
    `  8 petitions judged twice, byte-identical · ` +
      `${variety.trades} trades, at least ${variety.minCombinations.toLocaleString()} distinct decrees each`,
  );
  if (variety.minCombinations < 500) {
    fail('determinism', `only ${variety.minCombinations} decree combinations for some trade`);
  }
}

/* --------------------------------------------------------------- 6: robustness */

/* ------------------------------------------------- 6: rubric calibration */

function rubricCalibration() {
  console.log(`\n${BOLD}Gate 6 — the rubric against hand-scored labels${OFF}`);
  console.log(
    `  ${DIM}${RUBRIC_LABELS.length} petitions, scored by hand on all seven axes. ` +
      `One labeller, so this catches drift rather than proving correctness.${OFF}\n`,
  );

  const errors: Record<string, number[]> = Object.fromEntries(RUBRIC_AXES.map((a) => [a, []]));

  for (const label of RUBRIC_LABELS) {
    const { rubric } = scoreRubric(label.idea);
    for (const axis of RUBRIC_AXES) {
      errors[axis].push(Math.abs(rubric[axis] - label.rubric[axis]));
    }
  }

  let all: number[] = [];
  for (const axis of RUBRIC_AXES) {
    const e = errors[axis];
    all = all.concat(e);
    const mae = e.reduce((s, x) => s + x, 0) / e.length;
    const worst = Math.max(...e);
    const ok = mae <= MAX_AXIS_MAE;
    console.log(
      `  ${ok ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`} ${axis.padEnd(24)} ` +
        `MAE ${mae.toFixed(2)}  ${DIM}worst ${worst}${OFF}`,
    );
    if (!ok) fail('rubric-calibration', `${axis} MAE ${mae.toFixed(2)} above ${MAX_AXIS_MAE}`);
  }

  const overall = all.reduce((s, x) => s + x, 0) / all.length;
  console.log(`\n  overall MAE ${overall.toFixed(2)} ${DIM}(gate ${MAX_OVERALL_MAE})${OFF}`);
  if (overall > MAX_OVERALL_MAE) {
    fail('rubric-calibration', `overall MAE ${overall.toFixed(2)} above ${MAX_OVERALL_MAE}`);
  }
}

/* ---------------------------------------------------------------------- main */

function main() {
  const started = Date.now();

  console.log(`\n${BOLD}Grimyapper eval${OFF} ${DIM}· ${CASES.length} golden cases · no network, no key${OFF}`);
  console.log(
    `${DIM}classifier: ${MODEL_METRICS.folds}-fold CV on ${MODEL_METRICS.trainedOn} labelled petitions — ` +
      `accuracy ${(MODEL_METRICS.accuracy * 100).toFixed(1)}%, ` +
      `precision ${(MODEL_METRICS.precision * 100).toFixed(1)}%, ` +
      `recall ${(MODEL_METRICS.recall * 100).toFixed(1)}%, ` +
      `F1 ${(MODEL_METRICS.f1 * 100).toFixed(1)}% · threshold ${MODEL_THRESHOLD}${OFF}\n`,
  );

  const accuracy = routingAndJudgement();
  ranges();
  arithmetic();
  determinism();
  rubricCalibration();

  console.log(`\n${BOLD}Summary${OFF} ${DIM}(${((Date.now() - started) / 1000).toFixed(2)}s)${OFF}`);
  console.log(`  golden routing accuracy  ${(accuracy * 100).toFixed(1)}%`);
  console.log(`  gate failures            ${failures.length}`);

  if (failures.length > 0) {
    console.log(`\n${RED}Failures:${OFF}`);
    for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
    console.log(`\n${RED}${BOLD}EVAL FAILED${OFF}\n`);
    process.exit(1);
  }

  console.log(`\n${GREEN}${BOLD}EVAL PASSED${OFF}\n`);
}

main();
