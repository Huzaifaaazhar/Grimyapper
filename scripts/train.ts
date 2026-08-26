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
import { features } from '../lib/nlp/text';
import { SIGNAL_NAMES } from '../lib/nlp/signals';
import { MODEL_VERSION, sigmoid, vectorise } from '../lib/model/vectorise';
import type { TrainedModel } from '../lib/model/types';

/** A feature must appear in at least this many petitions to earn a column. */
const MIN_DOC_FREQUENCY = 2;
const EPOCHS = 2000;
const LEARNING_RATE = 0.55;
const L2 = 0.0005;
const FOLDS = 5;
/** See TrainedModel.threshold — below 0.5 because the two errors do not cost the same. */
const THRESHOLD = 0.45;

type Vocab = { vocabulary: Record<string, number>; idf: number[] };

function buildVocabulary(examples: Example[]): Vocab {
  const docFrequency = new Map<string, number>();
  for (const ex of examples) {
    for (const term of new Set(features(ex.text))) {
      docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
    }
  }

  const kept = [...docFrequency.entries()]
    .filter(([, df]) => df >= MIN_DOC_FREQUENCY)
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

function predict(weights: number[], bias: number, row: Float64Array): number {
  let z = bias;
  for (let j = 0; j < row.length; j += 1) z += row[j] * weights[j];
  return sigmoid(z);
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
      const p = predict(weights, bias, vectorise(ex.text, vocabulary, idf, SIGNAL_NAMES));
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

  return { accuracy, precision, recall, f1, tp, fp, tn, fn, mistakes };
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
  console.log(`\n${FOLDS}-fold cross-validation — held out, never fitted on ` +
    `(decision threshold ${THRESHOLD}):`);
  console.log(`  accuracy   ${(cv.accuracy * 100).toFixed(1)}%`);
  console.log(`  precision  ${(cv.precision * 100).toFixed(1)}%`);
  console.log(`  recall     ${(cv.recall * 100).toFixed(1)}%`);
  console.log(`  F1         ${(cv.f1 * 100).toFixed(1)}%`);
  console.log(`  confusion  tp ${cv.tp}  fp ${cv.fp}  tn ${cv.tn}  fn ${cv.fn}`);

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

  const out = path.join(process.cwd(), 'lib', 'model', 'weights.json');
  writeFileSync(out, `${JSON.stringify(model)}\n`);

  const sizeKb = (JSON.stringify(model).length / 1024).toFixed(0);
  console.log(`\nWrote ${out}`);
  console.log(`  ${idf.length} learned features + ${SIGNAL_NAMES.length} signals · ${sizeKb} KB\n`);

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
