import { features, termCounts } from '../nlp/text';
import { extractSignals } from '../nlp/signals';
import type { TrainedModel } from './types';

export const MODEL_VERSION = 2;

/**
 * The engineered signals are multiplied by this before fitting.
 *
 * The tf-idf block is L2-normalised across ~500 columns, so no single word
 * carries much; the twenty signals are the features that actually encode the
 * distinction and were being outvoted by noise. 1.5 came out of the sweep in
 * `scripts/train.ts` — it beat 1.0 by about three points of held-out accuracy,
 * and going further to 3.0 bought nothing.
 */
export const SIGNAL_SCALE = 1.5;

/**
 * A petition becomes one vector: an L2-normalised tf-idf block over learned
 * word and bigram features, with the engineered signals appended after it.
 *
 * The tf-idf block is normalised on its own so that a long petition does not
 * outweigh a short one, and the signals are left at their natural 0..1 scale so
 * the learned weight on each stays readable.
 */
export function vectorise(
  text: string,
  vocabulary: Record<string, number>,
  idf: number[],
  signalNames: readonly string[],
): Float64Array {
  const width = idf.length + signalNames.length;
  const vec = new Float64Array(width);

  const counts = termCounts(features(text));
  let sumSquares = 0;

  for (const [term, count] of counts) {
    const col = vocabulary[term];
    if (col === undefined) continue;
    // sublinear tf: one mention of "model" is the signal, the fifth adds little
    const value = (1 + Math.log(count)) * idf[col];
    vec[col] = value;
    sumSquares += value * value;
  }

  if (sumSquares > 0) {
    const norm = Math.sqrt(sumSquares);
    for (let i = 0; i < idf.length; i += 1) vec[i] /= norm;
  }

  const signals = extractSignals(text);
  signalNames.forEach((name, i) => {
    vec[idf.length + i] = (signals[name as keyof typeof signals] ?? 0) * SIGNAL_SCALE;
  });

  return vec;
}

export function vectoriseWith(model: TrainedModel, text: string): Float64Array {
  return vectorise(text, model.vocabulary, model.idf, model.signals);
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function score(model: TrainedModel, text: string): number {
  const vec = vectoriseWith(model, text);
  let z = model.bias;
  for (let i = 0; i < vec.length; i += 1) z += vec[i] * model.weights[i];
  return sigmoid(z);
}
