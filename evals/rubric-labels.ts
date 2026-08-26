import type { Rubric } from '../lib/schemas';

/**
 * A calibration set for the rubric model.
 *
 * **These labels are one author's judgement, not a panel's.** That is a real
 * limitation and it is stated here rather than buried: a proper calibration set
 * would be scored independently by several investors and the disagreement
 * between them measured first, because that disagreement is the floor below
 * which no model's error can meaningfully fall.
 *
 * What this set is good for is catching drift. If a change to the signals or
 * the axis weights moves the rubric a long way from these, that is worth
 * knowing even if the labels themselves are arguable.
 *
 * Scored on the same 0–10 scale as the model, wrapper_platform_risk inverted
 * (10 = safe from the providers).
 */
export type RubricLabel = {
  id: string;
  idea: string;
  note: string;
  rubric: Rubric;
};

export const RUBRIC_LABELS: RubricLabel[] = [
  {
    id: 'cal-thin-rewriter',
    idea: 'A site where you paste a paragraph and a model rewrites it to sound more professional.',
    note: 'The canonical thin wrapper. Everything that can be low, is.',
    rubric: {
      problem_intensity: 3,
      wrapper_platform_risk: 1,
      moat_beyond_model: 1,
      distribution: 6,
      willingness_to_pay: 2,
      unit_economics: 3,
      timing_half_life: 1,
    },
  },
  {
    id: 'cal-claims-agent',
    idea: 'An agent that reads insurance claims, extracts the fields and drafts the adjuster decision, integrated with the carrier core system.',
    note: 'Regulated, integrated, real budget. Wrapper risk is moderate because extraction keeps improving natively.',
    rubric: {
      problem_intensity: 8,
      wrapper_platform_risk: 6,
      moat_beyond_model: 7,
      distribution: 3,
      willingness_to_pay: 8,
      unit_economics: 6,
      timing_half_life: 6,
    },
  },
  {
    id: 'cal-weld-vision',
    idea: 'A computer-vision system that inspects pipeline weld joints from drone footage and flags defects.',
    note: 'Physical world, hard to absorb, but a long industrial sales cycle.',
    rubric: {
      problem_intensity: 8,
      wrapper_platform_risk: 8,
      moat_beyond_model: 7,
      distribution: 3,
      willingness_to_pay: 8,
      unit_economics: 7,
      timing_half_life: 8,
    },
  },
  {
    id: 'cal-shrink-forecast',
    idea: 'We train a forecasting model on three years of proprietary grocery waste data to predict shrink per store per day.',
    note: 'Proprietary data is the whole moat, and it compounds as models improve.',
    rubric: {
      problem_intensity: 7,
      wrapper_platform_risk: 8,
      moat_beyond_model: 8,
      distribution: 4,
      willingness_to_pay: 7,
      unit_economics: 7,
      timing_half_life: 8,
    },
  },
  {
    id: 'cal-companion',
    idea: 'An AI companion you talk to that remembers your conversations and has a personality you choose.',
    note: 'Consumer generative. Cheap to reach, expensive to run, and the providers ship this directly.',
    rubric: {
      problem_intensity: 4,
      wrapper_platform_risk: 2,
      moat_beyond_model: 2,
      distribution: 7,
      willingness_to_pay: 4,
      unit_economics: 2,
      timing_half_life: 3,
    },
  },
  {
    id: 'cal-code-review',
    idea: 'An LLM code-review agent that learns each team’s conventions from their merged pull requests.',
    note: 'Learns from customer data, sits in a daily workflow, but the platforms are actively here.',
    rubric: {
      problem_intensity: 7,
      wrapper_platform_risk: 3,
      moat_beyond_model: 5,
      distribution: 5,
      willingness_to_pay: 6,
      unit_economics: 5,
      timing_half_life: 4,
    },
  },
  {
    id: 'cal-clinical-note',
    idea: 'Software that transcribes doctor-patient conversations and writes the clinical note, integrated with the hospital record system.',
    note: 'Regulated and integrated. Crowded, but the integration is the defence.',
    rubric: {
      problem_intensity: 9,
      wrapper_platform_risk: 6,
      moat_beyond_model: 6,
      distribution: 3,
      willingness_to_pay: 8,
      unit_economics: 6,
      timing_half_life: 6,
    },
  },
  {
    id: 'cal-prompt-shop',
    idea: 'A marketplace where creators sell prompt packs they wrote themselves.',
    note: 'Sells a thing that stops existing as models get better at being asked.',
    rubric: {
      problem_intensity: 2,
      wrapper_platform_risk: 1,
      moat_beyond_model: 1,
      distribution: 6,
      willingness_to_pay: 2,
      unit_economics: 7,
      timing_half_life: 1,
    },
  },
  {
    id: 'cal-essay-marking',
    idea: 'A model that grades student essays consistently against a marking rubric, used by exam boards.',
    note: 'Real institutional pain, real budget, slow buyers, and defensible on validation evidence.',
    rubric: {
      problem_intensity: 7,
      wrapper_platform_risk: 5,
      moat_beyond_model: 5,
      distribution: 3,
      willingness_to_pay: 7,
      unit_economics: 6,
      timing_half_life: 5,
    },
  },
  {
    id: 'cal-avatar',
    idea: 'An app that turns your selfie into a fantasy avatar.',
    note: 'The purest vitamin on the list.',
    rubric: {
      problem_intensity: 1,
      wrapper_platform_risk: 1,
      moat_beyond_model: 1,
      distribution: 8,
      willingness_to_pay: 3,
      unit_economics: 3,
      timing_half_life: 1,
    },
  },
  {
    id: 'cal-freight-invoice',
    idea: 'A model that reads freight invoices against contracted rates and disputes overcharges automatically.',
    note: 'Pays for itself in recovered money, which is the easiest sale there is.',
    rubric: {
      problem_intensity: 8,
      wrapper_platform_risk: 6,
      moat_beyond_model: 6,
      distribution: 5,
      willingness_to_pay: 9,
      unit_economics: 8,
      timing_half_life: 6,
    },
  },
  {
    id: 'cal-meeting-summary',
    idea: 'We generate meeting minutes from a transcript you upload.',
    note: 'Shipped natively by every conferencing tool already.',
    rubric: {
      problem_intensity: 4,
      wrapper_platform_risk: 1,
      moat_beyond_model: 1,
      distribution: 5,
      willingness_to_pay: 3,
      unit_economics: 4,
      timing_half_life: 2,
    },
  },
];

/**
 * The gate. Mean absolute error per axis, on the 0–10 scale.
 *
 * 2.0 is deliberately loose: with a single labeller, anything tighter would be
 * measuring agreement with one person's taste rather than correctness. Tighten
 * it only alongside better labels.
 */
export const MAX_AXIS_MAE = 2.0;
export const MAX_OVERALL_MAE = 1.6;
