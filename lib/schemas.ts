import { z } from 'zod';

/**
 * Two layers per LLM role:
 *
 *   *Output  — the loose shape sent to the model as a JSON schema. Types only,
 *              no numeric bounds, because the structured-output schema subset is
 *              deliberately conservative and a rejected schema is a dead route.
 *   *Schema  — the strict contract we actually trust. Applied in code after
 *              clamping. Anything that fails this never reaches the render tree.
 */

/** Hard input caps. This is free text from strangers that costs money per request. */
export const MAX_IDEA_CHARS = 600;
export const MAX_NAME_CHARS = 80;
export const MAX_CUSTOMER_CHARS = 140;
export const MIN_IDEA_CHARS = 12;

export const JudgeRequestSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(MIN_IDEA_CHARS, 'Give me at least a sentence to work with.')
    .max(MAX_IDEA_CHARS, `Keep it under ${MAX_IDEA_CHARS} characters.`),
  name: z.string().trim().max(MAX_NAME_CHARS).default(''),
  customer: z.string().trim().max(MAX_CUSTOMER_CHARS).default(''),
});
export type JudgeRequest = z.infer<typeof JudgeRequestSchema>;

/* ---------------------------------------------------------------- classifier */

export const ClassificationOutput = z.object({
  is_ai_startup: z.boolean(),
  confidence: z.number(),
  reason: z.string(),
});

export const ClassificationSchema = z.object({
  is_ai_startup: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(400),
});
export type Classification = z.infer<typeof ClassificationSchema>;

/* ----------------------------------------------------------------- rejector */

export const RejectionOutput = z.object({
  verdict: z.string(),
  cause_of_death: z.string(),
  time_of_death: z.string(),
  eulogy: z.string(),
  ai_that_replaces_it: z.string(),
});

export const RejectionSchema = z.object({
  verdict: z.literal('REJECTED'),
  cause_of_death: z.string().min(1).max(400),
  time_of_death: z.string().min(1).max(200),
  eulogy: z.string().min(1).max(400),
  ai_that_replaces_it: z.string().min(1).max(240),
});
export type Rejection = z.infer<typeof RejectionSchema>;

/* ---------------------------------------------------------------- evaluator */

export const RUBRIC_AXES = [
  'problem_intensity',
  'wrapper_platform_risk',
  'moat_beyond_model',
  'distribution',
  'willingness_to_pay',
  'unit_economics',
  'timing_half_life',
] as const;
export type RubricAxis = (typeof RUBRIC_AXES)[number];

const looseAxes = z.object({
  problem_intensity: z.number(),
  wrapper_platform_risk: z.number(),
  moat_beyond_model: z.number(),
  distribution: z.number(),
  willingness_to_pay: z.number(),
  unit_economics: z.number(),
  timing_half_life: z.number(),
});

const axis = z.number().min(0).max(10);
export const RubricSchema = z.object({
  problem_intensity: axis,
  wrapper_platform_risk: axis,
  moat_beyond_model: axis,
  distribution: axis,
  willingness_to_pay: axis,
  unit_economics: axis,
  timing_half_life: axis,
});
export type Rubric = z.infer<typeof RubricSchema>;

const looseNotes = z.object({
  problem_intensity: z.string(),
  wrapper_platform_risk: z.string(),
  moat_beyond_model: z.string(),
  distribution: z.string(),
  willingness_to_pay: z.string(),
  unit_economics: z.string(),
  timing_half_life: z.string(),
});

const note = z.string().min(1).max(400);
export const RubricNotesSchema = z.object({
  problem_intensity: note,
  wrapper_platform_risk: note,
  moat_beyond_model: note,
  distribution: note,
  willingness_to_pay: note,
  unit_economics: note,
  timing_half_life: note,
});
export type RubricNotes = z.infer<typeof RubricNotesSchema>;

const looseAssumptions = z.object({
  reachable_users_year1: z.number(),
  monthly_growth_rate: z.number(),
  free_to_paid_conversion: z.number(),
  price_per_month_usd: z.number(),
  monthly_churn: z.number(),
  monthly_burn_usd: z.number(),
});

export const ASSUMPTION_BOUNDS = {
  reachable_users_year1: [1, 50_000_000],
  monthly_growth_rate: [0, 2],
  free_to_paid_conversion: [0, 1],
  price_per_month_usd: [0, 1_000_000],
  monthly_churn: [0, 0.95],
  monthly_burn_usd: [0, 100_000_000],
} as const satisfies Record<string, readonly [number, number]>;

export const AssumptionsSchema = z.object({
  reachable_users_year1: z.number().min(1).max(50_000_000),
  monthly_growth_rate: z.number().min(0).max(2),
  free_to_paid_conversion: z.number().min(0).max(1),
  price_per_month_usd: z.number().min(0).max(1_000_000),
  monthly_churn: z.number().min(0).max(0.95),
  monthly_burn_usd: z.number().min(0).max(100_000_000),
});
export type Assumptions = z.infer<typeof AssumptionsSchema>;

/**
 * What the model is asked for. Note what is absent: the final score, the band,
 * and the twelve monthly rows. Those are computed in `lib/scoring.ts` and
 * `lib/metrics.ts` so they stay consistent, testable, and un-hallucinated.
 */
export const EvaluationOutput = z.object({
  verdict: z.string(),
  rubric: looseAxes,
  rubric_notes: looseNotes,
  assumptions: looseAssumptions,
});

export const EvaluationDraftSchema = z.object({
  verdict: z.string().min(1).max(200),
  rubric: RubricSchema,
  rubric_notes: RubricNotesSchema,
  assumptions: AssumptionsSchema,
});
export type EvaluationDraft = z.infer<typeof EvaluationDraftSchema>;

/* ------------------------------------------------------------ API responses */

export const BandSchema = z.enum(['Low', 'Medium', 'High']);
export type Band = z.infer<typeof BandSchema>;

export type MonthRow = {
  month: number;
  label: string;
  users: number;
  paying: number;
  gross_mrr: number;
  net_revenue: number;
  burn: number;
  net: number;
  cumulative_net: number;
};

export type RejectedResult = {
  outcome: 'rejected';
  classification: Classification;
  rejection: Rejection;
};

export type EvaluatedResult = {
  outcome: 'evaluated';
  classification: Classification;
  verdict: string;
  success_likelihood: number;
  band: Band;
  rubric: Rubric;
  rubric_notes: RubricNotes;
  assumptions: Assumptions;
  months: MonthRow[];
};

export type JudgeResult = RejectedResult | EvaluatedResult;
