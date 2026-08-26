import { extractSignals, type SignalName, type Signals } from '../nlp/signals';
import { RUBRIC_AXES, type Rubric, type RubricAxis, type RubricNotes } from '../schemas';

/**
 * The rubric scorer: a transparent linear model, one per axis.
 *
 * Each axis starts from a base and is moved by the signals read out of the
 * petition. Nothing is hidden — the note under each score is assembled from the
 * terms that actually moved it, so the explanation cannot drift away from the
 * arithmetic the way a generated one can.
 */

type Term = {
  signal: SignalName;
  delta: number;
  /** Shown when this term is among the strongest movers on its axis. */
  note: string;
};

type AxisModel = {
  base: number;
  terms: Term[];
  /** Used when nothing fired — an honest "we saw no evidence either way". */
  fallback: string;
};

const MODEL: Record<RubricAxis, AxisModel> = {
  problem_intensity: {
    base: 5,
    fallback: 'Nothing here says whose job is on fire, which usually means nobody’s is.',
    terms: [
      { signal: 'regulated_domain', delta: 2.5, note: 'Regulated work carries a real penalty for getting it wrong, so the pain is genuine.' },
      { signal: 'workflow_embedded', delta: 2, note: 'It sits in work that happens every day, not in an occasional nice-to-have.' },
      { signal: 'b2b_buyer', delta: 1.5, note: 'A business buyer can name the cost of the problem, which is the test of a real one.' },
      { signal: 'automation_verb', delta: 1, note: 'It removes a task somebody is currently paid to do.' },
      { signal: 'consumer_buyer', delta: -1, note: 'Consumer pain is real but rarely urgent enough to change a habit.' },
      { signal: 'generative_product', delta: -1.5, note: 'Generating pleasant output is a want, not a wound.' },
      { signal: 'novelty_toy', delta: -2.5, note: 'This is entertainment. Nobody wakes up needing it.' },
    ],
  },

  wrapper_platform_risk: {
    base: 5,
    fallback: 'No obvious shelter from the model providers, and no obvious exposure either.',
    terms: [
      { signal: 'regulated_domain', delta: 2.5, note: 'Regulated ground is slow ground; the platforms do not walk onto it casually.' },
      { signal: 'physical_world', delta: 2.5, note: 'Sensors and the physical world are not something a model release absorbs.' },
      { signal: 'proprietary_data', delta: 2, note: 'Data the providers do not have is the one thing they cannot ship past you.' },
      { signal: 'integration_depth', delta: 2, note: 'Being wired into somebody else’s system is a poor thing to replace with a feature.' },
      { signal: 'workflow_embedded', delta: 1, note: 'Living inside a daily workflow buys some distance from a general tool.' },
      { signal: 'novelty_toy', delta: -1.5, note: 'Amusements are the first thing bundled in free.' },
      { signal: 'generative_product', delta: -2, note: 'Generating text or images is exactly what the providers ship natively.' },
      { signal: 'thin_wrapper_shape', delta: -3.5, note: 'A chat surface over a public model is the precise shape a platform ships as a checkbox.' },
    ],
  },

  moat_beyond_model: {
    base: 3.5,
    fallback: 'No proprietary data, no integration, no lock-in named. The moat is a prompt.',
    terms: [
      { signal: 'proprietary_data', delta: 3, note: 'Data nobody else holds is the only moat here that compounds.' },
      { signal: 'integration_depth', delta: 2.5, note: 'Integrations are switching costs, and switching costs are a moat.' },
      { signal: 'workflow_embedded', delta: 2, note: 'Once it holds the workflow, ripping it out costs more than the licence.' },
      { signal: 'physical_world', delta: 1.5, note: 'Hardware and calibration take years to copy, which is the point.' },
      { signal: 'regulated_domain', delta: 1, note: 'Approvals and audit trails are a moat built by somebody else’s paperwork.' },
      { signal: 'generative_product', delta: -1.5, note: 'The output is the model’s, not yours, and so is the advantage.' },
      { signal: 'thin_wrapper_shape', delta: -2.5, note: 'There is nothing underneath the interface. A competitor rebuilds it in a weekend.' },
    ],
  },

  distribution: {
    base: 5,
    fallback: 'No channel named. Assume it costs money to find every customer.',
    terms: [
      { signal: 'consumer_buyer', delta: 1.5, note: 'Selling direct to people means no procurement between you and the first sale.' },
      { signal: 'marketplace', delta: 1, note: 'A matching business carries its own distribution once both sides show up.' },
      { signal: 'generative_product', delta: 1, note: 'Generated output tends to travel; people share the thing it made.' },
      { signal: 'novelty_toy', delta: 1, note: 'Amusing things spread cheaply, which is the one advantage of being one.' },
      { signal: 'b2b_buyer', delta: -1.5, note: 'Business buyers are reachable but slow, and every sale is a conversation.' },
      { signal: 'regulated_domain', delta: -1.5, note: 'Regulated buyers move at the speed of procurement, which is not a speed.' },
    ],
  },

  willingness_to_pay: {
    base: 5,
    fallback: 'No budget line is obvious, which usually means it comes out of somebody’s goodwill.',
    terms: [
      { signal: 'b2b_buyer', delta: 2.5, note: 'There is an existing budget line, currently being spent on people.' },
      { signal: 'regulated_domain', delta: 2, note: 'The cost of getting it wrong is on the invoice already; this is cheaper.' },
      { signal: 'workflow_embedded', delta: 1.5, note: 'Tools inside daily work get renewed without much argument.' },
      { signal: 'consumer_buyer', delta: -2, note: 'Consumers will use this happily and pay for it reluctantly.' },
      { signal: 'generative_product', delta: -1.5, note: 'There is a free version of this feeling, and it is one tab away.' },
      { signal: 'novelty_toy', delta: -2.5, note: 'Nobody has ever renewed an amusement in month four.' },
    ],
  },

  unit_economics: {
    base: 5.5,
    fallback: 'Margins depend on how much the engine is asked to do, and that is unstated.',
    terms: [
      { signal: 'b2b_buyer', delta: 1.5, note: 'A business price per seat leaves room for the cost of thinking.' },
      { signal: 'workflow_embedded', delta: 1.5, note: 'High-value, low-volume work is the shape that survives inference costs.' },
      { signal: 'proprietary_data', delta: 1, note: 'Owning the data means not paying somebody else for it forever.' },
      { signal: 'physical_world', delta: 1, note: 'Sensing is cheap per reading once the hardware is out there.' },
      { signal: 'thin_wrapper_shape', delta: -1, note: 'Every request is a cost you pay and a margin the provider keeps.' },
      { signal: 'consumer_buyer', delta: -1.5, note: 'A consumer price and per-request generation rarely meet in the middle.' },
      { signal: 'generative_product', delta: -2, note: 'Generating long output on a small subscription is a slow way to lose money.' },
    ],
  },

  timing_half_life: {
    base: 5,
    fallback: 'Whether the next model release helps or ends this is genuinely unclear.',
    terms: [
      { signal: 'proprietary_data', delta: 2.5, note: 'Better models make the data more valuable, not less. This one compounds.' },
      { signal: 'physical_world', delta: 2.5, note: 'The hard part is the world, and the world is not getting easier on schedule.' },
      { signal: 'integration_depth', delta: 2, note: 'Plumbing outlives models. It always has.' },
      { signal: 'regulated_domain', delta: 2, note: 'Regulation changes on its own timetable, which is slower than the labs.' },
      { signal: 'generative_product', delta: -1.5, note: 'The providers ship this capability directly, and each release narrows the gap.' },
      { signal: 'thin_wrapper_shape', delta: -3, note: 'The next model release is not an upgrade here. It is the extinction event.' },
    ],
  },
};

const clamp = (n: number) => Math.max(0, Math.min(10, n));

function scoreAxis(axis: RubricAxis, signals: Signals) {
  const model = MODEL[axis];
  const applied = model.terms
    .map((term) => ({ ...term, moved: term.delta * signals[term.signal] }))
    .filter((t) => Math.abs(t.moved) > 0.15)
    .sort((a, b) => Math.abs(b.moved) - Math.abs(a.moved));

  const raw = model.base + applied.reduce((sum, t) => sum + t.moved, 0);
  const value = Math.round(clamp(raw));

  // The note is the strongest mover, plus a second only when it pushes the
  // other way — a disagreement is worth showing, a pile-on is not.
  const primary = applied[0];
  if (!primary) return { value, note: model.fallback };

  const counter = applied.find((t) => Math.sign(t.moved) !== Math.sign(primary.moved));
  const note = counter ? `${primary.note} ${counter.note}` : primary.note;

  return { value, note };
}

export function scoreRubric(text: string): { rubric: Rubric; notes: RubricNotes } {
  const signals = extractSignals(text);
  const rubric = {} as Rubric;
  const notes = {} as RubricNotes;

  for (const axis of RUBRIC_AXES) {
    const { value, note } = scoreAxis(axis, signals);
    rubric[axis] = value;
    notes[axis] = note;
  }

  return { rubric, notes };
}
