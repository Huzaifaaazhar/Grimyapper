import 'server-only';

import { classify, MODEL_METRICS, MODEL_THRESHOLD } from './model/classifier';
import { deriveAssumptions, deriveVerdict } from './model/assumptions';
import { scoreRubric } from './model/rubric';
import { projectTwelveMonths } from './metrics';
import { hash32 } from './nlp/text';
import { composeDecree } from './roast/decree';
import { recordJudgement } from './telemetry';
import { bandFor, computeSuccessLikelihood } from './scoring';
import {
  ClassificationSchema,
  EvaluationDraftSchema,
  RejectionSchema,
  type JudgeRequest,
  type JudgeResult,
} from './schemas';

export { MODEL_METRICS, MODEL_THRESHOLD };

/**
 * The whole court, running in-process.
 *
 * There is no model service behind this and no API key: a logistic-regression
 * classifier over tf-idf and engineered signals decides the branch, a
 * transparent per-axis linear model scores the rubric, and the decree is
 * composed from a hand-written corpus. Every judgement is a few hundred
 * microseconds of arithmetic, costs nothing, and never leaves the machine.
 *
 * `server-only` is still here. It no longer guards a secret — there isn't one —
 * but it keeps the weights and the whole decree corpus out of the client bundle,
 * so the page stays light and the jokes are not trivially scraped.
 */

export class JudgeError extends Error {
  constructor(
    message: string,
    readonly stage: 'classify' | 'reject' | 'evaluate',
  ) {
    super(message);
    this.name = 'JudgeError';
  }
}

/**
 * Everything the court reads, it reads from one string.
 *
 * Note what is not in it. `capital` is a quantity of money, and money says
 * nothing about whether a venture is built on thinking engines — feeding it in
 * would only give the classifier a number to overfit. `declared` is the
 * petitioner's own claim, and a claim that decided its own verdict would make
 * the assayer ornamental. `moat` is prose about what the venture actually does,
 * so it is assayed like the rest.
 */
function petition(req: JudgeRequest, amendment = ''): string {
  return [req.idea, req.name, req.customer, req.moat, amendment].filter(Boolean).join('. ');
}

/**
 * `amendment` is text the court should weigh but that is not part of the
 * petition as filed — currently only an upheld appeal's rebuttal. It changes
 * the judgement without rewriting what the petition says.
 */
export function judge(req: JudgeRequest, amendment = ''): JudgeResult {
  const text = petition(req, amendment);

  const raw = classify(text);
  // Probability and branch only. The petition itself is never passed on.
  recordJudgement(raw.probability, MODEL_THRESHOLD, raw.is_ai_startup);

  const checked = ClassificationSchema.safeParse({
    is_ai_startup: raw.is_ai_startup,
    confidence: raw.confidence,
    reason: raw.reason,
  });
  if (!checked.success) throw new JudgeError('classifier produced an invalid verdict', 'classify');
  const classification = checked.data;

  if (!classification.is_ai_startup) {
    const decree = RejectionSchema.safeParse(composeDecree(text));
    if (!decree.success) throw new JudgeError('decree failed its own contract', 'reject');
    return { outcome: 'rejected', classification, rejection: decree.data };
  }

  const { rubric, notes } = scoreRubric(text);
  const success_likelihood = computeSuccessLikelihood(rubric);
  const band = bandFor(success_likelihood);
  const assumptions = deriveAssumptions(text, rubric);

  /*
   * The same zod contract the model output used to face. Nothing generated here
   * reaches the page without clearing it — a scorer bug should surface as an
   * error, not as a rubric of elevens rendered confidently.
   */
  const draft = EvaluationDraftSchema.safeParse({
    verdict: deriveVerdict(rubric, band, hash32(text)),
    rubric,
    rubric_notes: notes,
    assumptions,
  });
  if (!draft.success) {
    throw new JudgeError(
      draft.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      'evaluate',
    );
  }

  return {
    outcome: 'evaluated',
    classification,
    verdict: draft.data.verdict,
    success_likelihood,
    band,
    rubric: draft.data.rubric,
    rubric_notes: draft.data.rubric_notes,
    assumptions: draft.data.assumptions,
    months: projectTwelveMonths(draft.data.assumptions),
  };
}

/** Kept for the eval harness, which exercises the two halves separately. */
export { classify as classifyText, scoreRubric };
