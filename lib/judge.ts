import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod';

import { CLASSIFIER_SYSTEM, EVALUATOR_SYSTEM, REJECTOR_SYSTEM, buildUserMessage } from './prompts';
import { projectTwelveMonths } from './metrics';
import { bandFor, computeSuccessLikelihood } from './scoring';
import {
  ASSUMPTION_BOUNDS,
  ClassificationOutput,
  ClassificationSchema,
  EvaluationDraftSchema,
  EvaluationOutput,
  RUBRIC_AXES,
  RejectionOutput,
  RejectionSchema,
  type Assumptions,
  type Classification,
  type EvaluationDraft,
  type JudgeRequest,
  type JudgeResult,
  type Rejection,
} from './schemas';

/** Small and fast on purpose: three calls per judgement, paid for by nobody. */
export const DEFAULT_MODEL = 'claude-haiku-4-5';

export class JudgeError extends Error {
  constructor(
    message: string,
    readonly stage: 'classify' | 'reject' | 'evaluate',
  ) {
    super(message);
    this.name = 'JudgeError';
  }
}

let cachedClient: Anthropic | null = null;

function client(): Anthropic {
  if (!cachedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    // Key stays here, server-side. It is never serialised into any response.
    cachedClient = new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 });
  }
  return cachedClient;
}

function model(): string {
  return process.env.JUDGE_MODEL || DEFAULT_MODEL;
}

/**
 * One structured call. Asks for the loose shape, then holds the answer to the
 * strict contract. One retry on a parse/validation failure, then it fails —
 * callers fail closed rather than rendering whatever came back.
 */
async function structuredCall<Loose, Strict>(opts: {
  system: string;
  user: string;
  outputSchema: ZodType<Loose>;
  strictSchema: ZodType<Strict>;
  normalise?: (raw: Loose) => Loose;
  maxTokens: number;
  stage: 'classify' | 'reject' | 'evaluate';
}): Promise<Strict> {
  let lastError = 'unknown error';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: unknown;
    try {
      const message = await client().messages.parse({
        model: model(),
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
        output_config: { format: zodOutputFormat(opts.outputSchema) },
      });
      raw = message.parsed_output;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'request failed';
      continue;
    }

    if (raw == null) {
      lastError = 'model returned no parseable output';
      continue;
    }

    const normalised = opts.normalise ? opts.normalise(raw as Loose) : raw;
    const checked = opts.strictSchema.safeParse(normalised);
    if (checked.success) return checked.data;

    lastError = checked.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  }

  throw new JudgeError(lastError, opts.stage);
}

const clamp = (n: number, lo: number, hi: number) =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;

const trimTo = (s: unknown, max: number) =>
  typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export async function classify(req: JudgeRequest): Promise<Classification> {
  return structuredCall({
    system: CLASSIFIER_SYSTEM,
    user: buildUserMessage(req),
    outputSchema: ClassificationOutput,
    strictSchema: ClassificationSchema,
    normalise: (raw) => ({
      is_ai_startup: Boolean(raw.is_ai_startup),
      confidence: clamp(raw.confidence, 0, 1),
      reason: trimTo(raw.reason, 400) || 'No reason given.',
    }),
    maxTokens: 400,
    stage: 'classify',
  });
}

export async function reject(req: JudgeRequest): Promise<Rejection> {
  return structuredCall({
    system: REJECTOR_SYSTEM,
    user: buildUserMessage(req),
    outputSchema: RejectionOutput,
    strictSchema: RejectionSchema,
    // The model is told verdict is always REJECTED; we make it so regardless.
    normalise: (raw) => ({
      verdict: 'REJECTED',
      cause_of_death: trimTo(raw.cause_of_death, 400),
      time_of_death: trimTo(raw.time_of_death, 200),
      eulogy: trimTo(raw.eulogy, 400),
      ai_that_replaces_it: trimTo(raw.ai_that_replaces_it, 240),
    }),
    maxTokens: 800,
    stage: 'reject',
  });
}

export async function evaluate(req: JudgeRequest): Promise<EvaluationDraft> {
  return structuredCall({
    system: EVALUATOR_SYSTEM,
    user: buildUserMessage(req),
    outputSchema: EvaluationOutput,
    strictSchema: EvaluationDraftSchema,
    normalise: (raw) => {
      const rubric = { ...raw.rubric };
      const notes = { ...raw.rubric_notes };
      for (const key of RUBRIC_AXES) {
        rubric[key] = Math.round(clamp(rubric[key], 0, 10));
        notes[key] = trimTo(notes[key], 400) || 'No note supplied.';
      }
      const assumptions = { ...raw.assumptions } as Assumptions;
      for (const [key, [lo, hi]] of Object.entries(ASSUMPTION_BOUNDS)) {
        const k = key as keyof Assumptions;
        assumptions[k] = clamp(assumptions[k], lo, hi);
      }
      return {
        verdict: trimTo(raw.verdict, 200) || 'Verdict withheld.',
        rubric,
        rubric_notes: notes,
        assumptions,
      };
    },
    maxTokens: 2000,
    stage: 'evaluate',
  });
}

/** Classifier first, then exactly one of the two branches. */
export async function judge(req: JudgeRequest): Promise<JudgeResult> {
  const classification = await classify(req);

  if (!classification.is_ai_startup) {
    return { outcome: 'rejected', classification, rejection: await reject(req) };
  }

  const draft = await evaluate(req);
  const success_likelihood = computeSuccessLikelihood(draft.rubric);

  return {
    outcome: 'evaluated',
    classification,
    verdict: draft.verdict,
    success_likelihood,
    band: bandFor(success_likelihood),
    rubric: draft.rubric,
    rubric_notes: draft.rubric_notes,
    assumptions: draft.assumptions,
    months: projectTwelveMonths(draft.assumptions),
  };
}
