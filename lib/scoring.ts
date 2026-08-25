import { RUBRIC_AXES, type Band, type Rubric, type RubricAxis } from './schemas';

/**
 * Composite weights. Wrapper/platform risk and moat dominate because in 2026
 * they are what actually decides whether an AI startup is still alive in a year.
 */
export const RUBRIC_WEIGHTS: Record<RubricAxis, number> = {
  problem_intensity: 1.5,
  wrapper_platform_risk: 2,
  moat_beyond_model: 2,
  distribution: 1,
  willingness_to_pay: 1,
  unit_economics: 1,
  timing_half_life: 1,
};

export const RUBRIC_LABELS: Record<RubricAxis, string> = {
  problem_intensity: 'Problem intensity',
  wrapper_platform_risk: 'Wrapper / platform risk',
  moat_beyond_model: 'Moat beyond the model',
  distribution: 'Distribution',
  willingness_to_pay: 'Willingness to pay',
  unit_economics: 'Unit economics',
  timing_half_life: 'Timing / half-life',
};

export const RUBRIC_HINTS: Record<RubricAxis, string> = {
  problem_intensity: 'Must-have or vitamin?',
  wrapper_platform_risk: 'Inverted — 10 is safe, 0 means OpenAI ships this next week',
  moat_beyond_model: 'Proprietary data, workflow lock-in, integrations, network effects',
  distribution: 'Can they reach customers cheaply?',
  willingness_to_pay: 'Real budget, or "cool but free"?',
  unit_economics: 'Do inference costs eat the margin?',
  timing_half_life: 'How fast does model progress obsolete it?',
};

const TOTAL_WEIGHT = RUBRIC_AXES.reduce((sum, a) => sum + RUBRIC_WEIGHTS[a], 0);

/** Weighted mean of the seven axes, normalised to 0–100. Computed in code, never asked of the LLM. */
export function computeSuccessLikelihood(rubric: Rubric): number {
  const weighted = RUBRIC_AXES.reduce((sum, axis) => sum + rubric[axis] * RUBRIC_WEIGHTS[axis], 0);
  return Math.round((weighted / (TOTAL_WEIGHT * 10)) * 100);
}

/** <40 Low, 40–70 Medium, >70 High. */
export function bandFor(score: number): Band {
  if (score < 40) return 'Low';
  if (score <= 70) return 'Medium';
  return 'High';
}

export const BAND_COLORS: Record<Band, { hex: string; label: string }> = {
  Low: { hex: '#e5484d', label: 'Low' },
  Medium: { hex: '#f5a524', label: 'Medium' },
  High: { hex: '#30a46c', label: 'High' },
};
