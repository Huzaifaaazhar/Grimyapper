import { extractSignals, type SignalName, type Signals } from '../nlp/signals';
import type { Classification } from '../schemas';
import type { TrainedModel } from './types';
import { MODEL_VERSION, SIGNAL_SCALE, sigmoid, vectoriseWith } from './vectorise';
import weightsJson from './weights.json';

const model = weightsJson as unknown as TrainedModel;

if (model.version !== MODEL_VERSION) {
  throw new Error(
    `weights.json is version ${model.version}, code expects ${MODEL_VERSION}. Run \`npm run train\`.`,
  );
}

export const MODEL_METRICS = model.metrics;
export const MODEL_THRESHOLD = model.threshold;
export const MODEL_CALIBRATION = model.calibration;

/** Platt scaling, fitted out-of-fold in `scripts/train.ts`. */
function calibrate(logit: number): number {
  return sigmoid(model.calibration.a * logit + model.calibration.b);
}

/**
 * How each signal is described when it turns out to be the deciding evidence.
 * The classifier does not narrate — it reports which feature moved the decision
 * and by how much, and this table puts that into English.
 */
const REASONS: Record<SignalName, { forAi: string; against: string }> = {
  core_model_product: {
    forAi: 'the thing being sold is the output of a model',
    against: 'nothing here is actually produced by a model',
  },
  thin_wrapper_shape: {
    forAi: 'it is an interface laid directly over a public model',
    against: 'it is not a wrapper over anything',
  },
  internal_use_shape: {
    forAi: 'the engine does more than run the back office',
    against: 'the engine only runs the back office; the customer buys something else',
  },
  proprietary_data: { forAi: 'it rests on data nobody else holds', against: 'no data of its own' },
  integration_depth: { forAi: 'it embeds in an existing system', against: 'it stands alone' },
  regulated_domain: {
    forAi: 'it works on regulated material where judgement is expensive',
    against: 'no regulated material involved',
  },
  physical_world: {
    forAi: 'it reads the physical world through sensors',
    against: 'nothing is being sensed',
  },
  human_service: {
    forAi: 'the labour is not human',
    against: 'the customer is paying for human labour',
  },
  marketplace: { forAi: 'more than a matching service', against: 'it matches buyers with sellers' },
  retail_goods: { forAi: 'nothing physical is shipped', against: 'the customer is paying for goods' },
  agency_or_consultancy: {
    forAi: 'the work is not billed by the hour',
    against: 'the customer is paying for people, by the project or the hour',
  },
  hospitality_or_food: {
    forAi: 'not a premises trade',
    against: 'the customer is paying for food, drink or a room',
  },
  b2b_buyer: { forAi: 'sold to businesses that measure the saving', against: 'no business buyer' },
  consumer_buyer: { forAi: 'sold direct to people', against: 'no consumer buyer' },
  ai_vocabulary: {
    forAi: 'it speaks of engines',
    against: 'it speaks of engines, which on its own means little',
  },
  automation_verb: { forAi: 'work is done without a person', against: 'a person still does the work' },
  novelty_toy: { forAi: 'it makes something for amusement', against: 'no novelty' },
  workflow_embedded: { forAi: 'it sits inside daily work', against: 'it sits outside daily work' },
  generative_product: {
    forAi: 'the product is generated material',
    against: 'nothing is generated',
  },
  buzzword_veneer: {
    forAi: 'the engine talk is load-bearing',
    against: 'engine words painted over an ordinary trade',
  },
  deterministic_software: {
    forAi: 'it does more than follow rules it was given',
    against: 'its behaviour is configured rather than learned',
  },
};

/** The signals that moved this decision most, largest contribution first. */
function contributions(signals: Signals) {
  return model.signals
    .map((name, i) => ({
      name,
      value: signals[name],
      // the weight column for signal i sits after the whole tf-idf block
      contribution: signals[name] * SIGNAL_SCALE * model.weights[model.idf.length + i],
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function explain(signals: Signals, isAi: boolean): string {
  const moved = contributions(signals).filter((c) =>
    isAi ? c.contribution > 0 : c.contribution < 0,
  );

  if (moved.length === 0) {
    return isAi
      ? 'The wording leans toward an engine, though nothing in it is decisive.'
      : 'Nothing in the wording suggests an engine at its core.';
  }

  const phrases = moved.slice(0, 2).map((c) => REASONS[c.name][isAi ? 'forAi' : 'against']);
  const joined = phrases.length === 2 ? `${phrases[0]}, and ${phrases[1]}` : phrases[0];
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

/**
 * The whole classifier: one dot product and a sigmoid over features computed in
 * about a millisecond. No network call, no key, no cold start.
 */
export function classify(text: string): Classification & { probability: number } {
  const vec = vectoriseWith(model, text);
  let logit = model.bias;
  for (let i = 0; i < vec.length; i += 1) logit += vec[i] * model.weights[i];

  const probability = sigmoid(logit);
  const isAi = probability >= model.threshold;
  const signals = extractSignals(text);

  /*
   * Reported confidence is the *calibrated* probability of the branch actually
   * taken, not distance from the boundary. Platt scaling was fitted on
   * out-of-fold scores, so "93% certain" now means the model was right about
   * 93% of the time when it said that — which the previous number, a rescaled
   * distance wearing a percent sign, did not.
   *
   * Floored at 0.5: inside the narrow band between the 0.45 decision threshold
   * and an even calibrated split, the branch is taken but the call really is a
   * coin toss, and the court should say so.
   */
  const calibrated = calibrate(logit);
  const confidence = Math.max(0.5, isAi ? calibrated : 1 - calibrated);

  return {
    is_ai_startup: isAi,
    confidence: Number(confidence.toFixed(3)),
    probability: Number(probability.toFixed(4)),
    reason: explain(signals, isAi),
  };
}
