import 'server-only';

import { classify } from './model/classifier';
import { extractSignals, type SignalName } from './nlp/signals';
import { hash32 } from './nlp/text';
import { judge } from './judge';
import { AppealRequestSchema, type AppealRequest, type JudgeResult } from './schemas';

/**
 * The appeal.
 *
 * The court's line is that it has never once reconsidered, and the framing keeps
 * that joke. The mechanism underneath is honest: the rebuttal is appended to the
 * petition and the classifier genuinely runs again. If the founder actually
 * establishes something — proprietary data, a real integration, the fact that
 * the model *is* the product — the appeal is upheld and the venture gets its
 * assay. Most rebuttals establish nothing, which is why the joke survives
 * contact with a real implementation.
 *
 * A rigged "it never works" would have been easier and much worse: the whole
 * point of the product is that the machinery beneath the comedy is real.
 */

export type AppealResult =
  | { outcome: 'upheld'; judgement: JudgeResult; moved: string }
  | { outcome: 'dismissed'; ruling: string; unmoved: string };

/** What the rebuttal would have had to establish, in the court's voice. */
const MISSING: Partial<Record<SignalName, string>> = {
  core_model_product:
    'thou didst not say that the engine itself is the thing sold',
  proprietary_data: 'thou didst not name any record that is thine alone',
  integration_depth: 'thou didst not name a system thou art wired into',
  regulated_domain: 'thou didst not place this upon regulated ground',
  physical_world: 'thou didst not claim to sense the world itself',
  workflow_embedded: 'thou didst not show it living inside daily work',
};

const DISMISSALS = [
  'The court has read thy address twice, and finds in it no fact it did not already have.',
  'Thy words are noted, and change nothing. The decree stands as sealed.',
  'The court thanks thee for thy address and returns to the same conclusion.',
  'Eloquence is not evidence. The seal remains unbroken.',
  'The registrar has re-read the file. The file says what it said before.',
];

const UPHELD = [
  'The court, to its own surprise, finds merit in thy address.',
  'That was not in thy petition. Had it been, this would have gone otherwise from the start.',
  'The registrar concedes the point, which he does not enjoy.',
  'Thy address establishes what the petition omitted. The decree is set aside.',
];

const pick = (pool: string[], seed: number) => pool[hash32(String(seed)) % pool.length];

export function hearAppeal(input: AppealRequest): AppealResult {
  const req = AppealRequestSchema.parse(input);
  const original = [req.idea, req.name, req.customer].filter(Boolean).join('. ');
  const amended = `${original}. ${req.rebuttal}`;

  const before = classify(original);
  const after = classify(amended);
  const seed = hash32(req.rebuttal);

  if (after.is_ai_startup && !before.is_ai_startup) {
    // The rebuttal genuinely moved the classifier. Judge the amended petition.
    return {
      outcome: 'upheld',
      judgement: judge({ idea: req.idea, name: req.name, customer: req.customer }, req.rebuttal),
      moved: pick(UPHELD, seed),
    };
  }

  /*
   * It did not move. Say *what* it failed to establish rather than a stock
   * brush-off — the signals are right there, so the dismissal can cite the
   * strongest thing the rebuttal still has not shown.
   */
  const signals = extractSignals(amended);
  const stillMissing = (Object.keys(MISSING) as SignalName[]).filter((k) => signals[k] === 0);
  const cited = stillMissing.length > 0 ? MISSING[stillMissing[hash32(amended) % stillMissing.length]] : undefined;

  return {
    outcome: 'dismissed',
    ruling: pick(DISMISSALS, seed),
    unmoved: cited
      ? `In particular, ${cited}.`
      : 'The court weighed thy address against the whole petition and found the balance unchanged.',
  };
}
