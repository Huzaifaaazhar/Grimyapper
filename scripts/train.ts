/**
 * Trains the AI-startup classifier — `npm run train`.
 *
 * Logistic regression on tf-idf word/bigram features plus the engineered
 * signals, fitted by batch gradient descent with L2 regularisation. Small
 * enough that the whole thing runs in a second and the weights check into git,
 * which means the deployed app carries no model download and no API call.
 *
 * Reports stratified k-fold cross-validated accuracy, precision, recall and F1
 * — numbers the model never saw during fitting — then refits on everything and
 * writes lib/model/weights.json.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { CORPUS, type Example } from '../data/corpus';
import { CASES } from '../evals/cases';
import { charFeatures, wordFeatures } from '../lib/nlp/text';
import { SIGNAL_NAMES } from '../lib/nlp/signals';
import { MODEL_VERSION, sigmoid, vectorise } from '../lib/model/vectorise';
import { scoreRubric } from '../lib/model/rubric';
import { computeSuccessLikelihood } from '../lib/scoring';
import type { TrainedModel } from '../lib/model/types';

/**
 * A feature must appear in at least this many petitions to earn a column.
 * Character grams get a higher bar: there are far more of them and each one
 * carries far less, so at df 2 they are mostly memorisation.
 */
const MIN_DF_WORD = 2;
const MIN_DF_CHAR = 4;
const EPOCHS = 2000;
const LEARNING_RATE = 0.55;
const L2 = 0.0005;
const FOLDS = 5;
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';
/** See TrainedModel.threshold — below 0.5 because the two errors do not cost the same. */
const THRESHOLD = 0.45;

type Vocab = { vocabulary: Record<string, number>; idf: number[] };

function buildVocabulary(examples: Example[]): Vocab {
  const docFrequency = new Map<string, number>();
  for (const ex of examples) {
    for (const term of new Set([...wordFeatures(ex.text), ...charFeatures(ex.text)])) {
      docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
    }
  }

  // Character grams are prefixed '#' by charFeatures, so the two kinds are
  // separable here and can be held to different thresholds.
  const kept = [...docFrequency.entries()]
    .filter(([term, df]) => df >= (term.startsWith('#') ? MIN_DF_CHAR : MIN_DF_WORD))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const vocabulary: Record<string, number> = {};
  const idf: number[] = [];
  kept.forEach(([term, df], i) => {
    vocabulary[term] = i;
    // smoothed idf, so a term in every document still carries a little weight
    idf.push(Math.log((1 + examples.length) / (1 + df)) + 1);
  });

  return { vocabulary, idf };
}

function fit(rows: Float64Array[], labels: number[], width: number) {
  const weights = new Float64Array(width);
  let bias = 0;

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    const gradW = new Float64Array(width);
    let gradB = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      let z = bias;
      for (let j = 0; j < width; j += 1) z += row[j] * weights[j];
      const error = sigmoid(z) - labels[i];
      for (let j = 0; j < width; j += 1) gradW[j] += error * row[j];
      gradB += error;
    }

    const scale = LEARNING_RATE / rows.length;
    for (let j = 0; j < width; j += 1) {
      weights[j] -= scale * gradW[j] + LEARNING_RATE * L2 * weights[j];
    }
    bias -= scale * gradB;
  }

  return { weights: Array.from(weights), bias };
}

/** Stratified so every fold keeps the corpus's class balance. */
function stratifiedFolds(examples: Example[], k: number): Example[][] {
  const positives = examples.filter((e) => e.label === 1);
  const negatives = examples.filter((e) => e.label === 0);
  const folds: Example[][] = Array.from({ length: k }, () => []);
  positives.forEach((e, i) => folds[i % k].push(e));
  negatives.forEach((e, i) => folds[i % k].push(e));
  return folds;
}

function crossValidate(examples: Example[]) {
  const folds = stratifiedFolds(examples, FOLDS);
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  const mistakes: Array<{ text: string; label: number; p: number }> = [];
  /** Out-of-fold decision values, which is what Platt scaling must be fitted on. */
  const outOfFold: Array<{ logit: number; label: number }> = [];

  for (let f = 0; f < FOLDS; f += 1) {
    const test = folds[f];
    const train = folds.filter((_, i) => i !== f).flat();

    // The vocabulary is rebuilt from the training split only — building it over
    // everything would leak the test fold's vocabulary into the fit.
    const { vocabulary, idf } = buildVocabulary(train);
    const width = idf.length + SIGNAL_NAMES.length;
    const rows = train.map((e) => vectorise(e.text, vocabulary, idf, SIGNAL_NAMES));
    const { weights, bias } = fit(rows, train.map((e) => e.label), width);

    for (const ex of test) {
      const row = vectorise(ex.text, vocabulary, idf, SIGNAL_NAMES);
      let logit = bias;
      for (let j = 0; j < row.length; j += 1) logit += row[j] * weights[j];
      const p = sigmoid(logit);
      outOfFold.push({ logit, label: ex.label });
      const predicted = p >= THRESHOLD ? 1 : 0;
      if (predicted === 1 && ex.label === 1) tp += 1;
      else if (predicted === 1 && ex.label === 0) fp += 1;
      else if (predicted === 0 && ex.label === 0) tn += 1;
      else fn += 1;
      if (predicted !== ex.label) mistakes.push({ text: ex.text, label: ex.label, p });
    }
  }

  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { accuracy, precision, recall, f1, tp, fp, tn, fn, mistakes, outOfFold };
}

/**
 * Platt scaling: a one-dimensional logistic regression from the model's decision
 * value to a calibrated probability. Fitted only on out-of-fold scores, because
 * fitting it on the training scores would calibrate against the model's own
 * overconfidence and produce a number that lies more convincingly.
 */
function fitPlatt(points: Array<{ logit: number; label: number }>) {
  let a = 1;
  let b = 0;
  const lr = 0.08;

  for (let epoch = 0; epoch < 4000; epoch += 1) {
    let ga = 0;
    let gb = 0;
    for (const { logit, label } of points) {
      const error = sigmoid(a * logit + b) - label;
      ga += error * logit;
      gb += error;
    }
    a -= (lr / points.length) * ga;
    b -= (lr / points.length) * gb;
  }

  const brier = (map: (l: number) => number) =>
    points.reduce((sum, { logit, label }) => sum + (map(logit) - label) ** 2, 0) / points.length;

  return {
    a: Number(a.toFixed(6)),
    b: Number(b.toFixed(6)),
    brier: Number(brier((l) => sigmoid(a * l + b)).toFixed(5)),
    brierRaw: Number(brier((l) => sigmoid(l)).toFixed(5)),
  };
}

/** How often the stated confidence matches what actually happened, in bins. */
function reliability(points: Array<{ logit: number; label: number }>, a: number, b: number) {
  const bins = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0001];
  return bins.slice(0, -1).map((lo, i) => {
    const hi = bins[i + 1];
    const inBin = points
      .map(({ logit, label }) => {
        const p = sigmoid(a * logit + b);
        const stated = Math.max(p, 1 - p);
        const correct = (p >= 0.5 ? 1 : 0) === label ? 1 : 0;
        return { stated, correct };
      })
      .filter((x) => x.stated >= lo && x.stated < hi);
    return {
      lo,
      hi,
      n: inBin.length,
      stated: inBin.length ? inBin.reduce((s, x) => s + x.stated, 0) / inBin.length : 0,
      actual: inBin.length ? inBin.reduce((s, x) => s + x.correct, 0) / inBin.length : 0,
    };
  });
}

function main() {
  // Guard: the eval set must stay held out, or the reported accuracy is a lie.
  const corpusTexts = new Set(CORPUS.map((e) => e.text.trim().toLowerCase()));
  const leaked = CASES.filter((c) => corpusTexts.has(c.idea.trim().toLowerCase()));
  if (leaked.length > 0) {
    console.error('\nEval cases found in the training corpus — that would inflate every number:');
    for (const c of leaked) console.error(`  - ${c.id}`);
    process.exit(1);
  }

  console.log(`\nTraining on ${CORPUS.length} labelled petitions ` +
    `(${CORPUS.filter((e) => e.label === 1).length} engine-built, ` +
    `${CORPUS.filter((e) => e.label === 0).length} not).`);

  const cv = crossValidate(CORPUS);
  const platt = fitPlatt(cv.outOfFold);
  console.log(`\n${FOLDS}-fold cross-validation — held out, never fitted on ` +
    `(decision threshold ${THRESHOLD}):`);
  console.log(`  accuracy   ${(cv.accuracy * 100).toFixed(1)}%`);
  console.log(`  precision  ${(cv.precision * 100).toFixed(1)}%`);
  console.log(`  recall     ${(cv.recall * 100).toFixed(1)}%`);
  console.log(`  F1         ${(cv.f1 * 100).toFixed(1)}%`);
  console.log(`  confusion  tp ${cv.tp}  fp ${cv.fp}  tn ${cv.tn}  fn ${cv.fn}`);

  console.log(`\nCalibration — Platt scaling fitted on the out-of-fold scores:`);
  console.log(`  a ${platt.a}, b ${platt.b}`);
  console.log(`  Brier  ${platt.brierRaw} raw → ${platt.brier} calibrated ${DIM}(lower is better)${OFF}`);
  console.log(`  ${DIM}stated confidence vs how often it was actually right:${OFF}`);
  for (const bin of reliability(cv.outOfFold, platt.a, platt.b)) {
    if (bin.n === 0) continue;
    const gap = bin.actual - bin.stated;
    console.log(
      `    ${(bin.lo * 100).toFixed(0)}–${Math.min(100, bin.hi * 100).toFixed(0)}%`.padEnd(12) +
        `n=${String(bin.n).padStart(3)}  said ${(bin.stated * 100).toFixed(1)}%  ` +
        `was ${(bin.actual * 100).toFixed(1)}%  ${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}`,
    );
  }

  if (cv.mistakes.length > 0) {
    console.log(`\n  ${cv.mistakes.length} misclassified:`);
    for (const m of cv.mistakes.slice(0, 12)) {
      console.log(
        `    [want ${m.label}, p=${m.p.toFixed(2)}] ${m.text.slice(0, 78)}${m.text.length > 78 ? '…' : ''}`,
      );
    }
  }

  // Refit on everything for the shipped model.
  const { vocabulary, idf } = buildVocabulary(CORPUS);
  const width = idf.length + SIGNAL_NAMES.length;
  const rows = CORPUS.map((e) => vectorise(e.text, vocabulary, idf, SIGNAL_NAMES));
  const { weights, bias } = fit(rows, CORPUS.map((e) => e.label), width);

  const model: TrainedModel = {
    version: MODEL_VERSION,
    vocabulary,
    idf: idf.map((v) => Number(v.toFixed(6))),
    signals: [...SIGNAL_NAMES],
    threshold: THRESHOLD,
    calibration: platt,
    weights: weights.map((v) => Number(v.toFixed(6))),
    bias: Number(bias.toFixed(6)),
    metrics: {
      folds: FOLDS,
      accuracy: Number(cv.accuracy.toFixed(4)),
      precision: Number(cv.precision.toFixed(4)),
      recall: Number(cv.recall.toFixed(4)),
      f1: Number(cv.f1.toFixed(4)),
      trainedOn: CORPUS.length,
    },
  };

  const charCols = Object.keys(vocabulary).filter((t) => t.startsWith('#')).length;
  const out = path.join(process.cwd(), 'lib', 'model', 'weights.json');
  writeFileSync(out, `${JSON.stringify(model)}\n`);

  /*
   * The score distribution, for the percentile a petition is shown against.
   *
   * "Compared with every venture judged today" would need somewhere to put
   * today's verdicts. Comparing against the corpus needs nothing, is stable
   * between visitors, and is arguably the more honest reference anyway: it is
   * the same population the model was fitted on, and it does not quietly change
   * because of who else happened to visit.
   */
  const composites = CORPUS.filter((e) => e.label === 1)
    .map((e) => computeSuccessLikelihood(scoreRubric(e.text).rubric))
    .sort((a, b) => a - b);

  const distributionPath = path.join(process.cwd(), 'lib', 'model', 'score-distribution.json');
  writeFileSync(
    distributionPath,
    `${JSON.stringify({
      n: composites.length,
      scores: composites,
      median: composites[Math.floor(composites.length / 2)],
      mean: Number((composites.reduce((a, b) => a + b, 0) / composites.length).toFixed(1)),
    })}\n`,
  );
  console.log(
    `  score distribution over ${composites.length} engine-built petitions ` +
      `(median ${composites[Math.floor(composites.length / 2)]})`,
  );

  /*
   * The report the /model page reads.
   *
   * Everything here was already computed to print to a terminal nobody but the
   * author sees. Publishing it costs one file write and is the most honest
   * thing on the site: a product that claims to evaluate accurately should show
   * its own confusion matrix and the petitions it gets wrong.
   */
  const signalWeightPairs = SIGNAL_NAMES.map((name, i) => ({
    name,
    weight: Number(weights[idf.length + i].toFixed(4)),
  })).sort((a, b) => b.weight - a.weight);

  const reportPath = path.join(process.cwd(), 'lib', 'model', 'report.json');
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        // Deliberately no timestamp: CI re-trains and diffs these artefacts to
        // catch a stale model, and a date would make that diff fail every day
        // for no reason.
        corpus: {
          total: CORPUS.length,
          engineBuilt: CORPUS.filter((e) => e.label === 1).length,
          notEngineBuilt: CORPUS.filter((e) => e.label === 0).length,
        },
        features: {
          total: idf.length,
          word: idf.length - charCols,
          character: charCols,
          signals: SIGNAL_NAMES.length,
        },
        metrics: model.metrics,
        confusion: { tp: cv.tp, fp: cv.fp, tn: cv.tn, fn: cv.fn },
        threshold: THRESHOLD,
        calibration: platt,
        reliability: reliability(cv.outOfFold, platt.a, platt.b)
          .filter((b) => b.n > 0)
          .map((b) => ({
            lo: b.lo,
            hi: Math.min(1, b.hi),
            n: b.n,
            stated: Number(b.stated.toFixed(4)),
            actual: Number(b.actual.toFixed(4)),
          })),
        signalWeights: signalWeightPairs,
        mistakes: cv.mistakes
          .sort((a, b) => Math.abs(b.p - THRESHOLD) - Math.abs(a.p - THRESHOLD))
          .slice(0, 20)
          .map((m) => ({ text: m.text, label: m.label, p: Number(m.p.toFixed(3)) })),
        rubricMae: null as number | null,
      },
      null,
      0,
    )}\n`,
  );
  console.log(`  published lib/model/report.json for the model page`);

  const sizeKb = (JSON.stringify(model).length / 1024).toFixed(0);
  console.log(`\nWrote ${out}`);
  console.log(
    `  ${idf.length} learned features (${idf.length - charCols} word, ${charCols} character) ` +
      `+ ${SIGNAL_NAMES.length} signals · ${sizeKb} KB\n`,
  );

  // The signals are readable on their own — print what the model made of them.
  const signalWeights = SIGNAL_NAMES.map((name, i) => ({
    name,
    weight: weights[idf.length + i],
  })).sort((a, b) => b.weight - a.weight);

  console.log('Learned signal weights (positive pushes toward "engine-built"):');
  for (const s of signalWeights) {
    const bar = '█'.repeat(Math.min(28, Math.round(Math.abs(s.weight) * 14)));
    console.log(`  ${s.name.padEnd(22)} ${s.weight >= 0 ? '+' : '−'}${Math.abs(s.weight).toFixed(3)}  ${bar}`);
  }
  console.log();
}

main();
