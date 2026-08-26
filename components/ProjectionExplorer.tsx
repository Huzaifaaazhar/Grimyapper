'use client';

import { useMemo, useState } from 'react';

import { ProjectionChart } from './ProjectionChart';
import { ProjectionTable } from './ProjectionTable';
import { HORIZON_MONTHS, projectTwelveMonths } from '@/lib/metrics';
import type { Assumptions } from '@/lib/schemas';

const coin = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-US');

type Knob = {
  key: keyof Assumptions;
  label: string;
  plain: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
};

const KNOBS: Knob[] = [
  {
    key: 'monthly_growth_rate',
    label: 'Increase each month',
    plain: 'monthly growth',
    min: 0,
    max: 0.6,
    step: 0.005,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'free_to_paid_conversion',
    label: 'Of these, who pay',
    plain: 'free → paid',
    min: 0,
    max: 0.4,
    step: 0.002,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'price_per_month_usd',
    label: 'The monthly tithe',
    plain: 'price per month',
    min: 1,
    max: 900,
    step: 1,
    format: (v) => coin.format(v),
  },
  {
    key: 'monthly_churn',
    label: 'Who fall away',
    plain: 'monthly churn',
    min: 0,
    max: 0.4,
    step: 0.002,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
];

/**
 * The reckoning, with the assumptions left in the reader's hands.
 *
 * The projection model is pure, deterministic and already in the browser, so
 * dragging a slider re-runs the whole twelve months in under a millisecond.
 * That is the honest way to present numbers this invented: rather than defend
 * one set of figures, hand over the dials and let the reader watch how little
 * it takes to turn a triumph into a bankruptcy.
 */
export function ProjectionExplorer({ base }: { base: Assumptions }) {
  const [assumptions, setAssumptions] = useState<Assumptions>(base);
  const touched = KNOBS.some((k) => assumptions[k.key] !== base[k.key]);

  const months = useMemo(() => projectTwelveMonths(assumptions), [assumptions]);
  const final = months[months.length - 1];

  /*
   * The spread, which is the honest replacement for "run it twice at different
   * temperatures". Nothing here is stochastic, so there is no variance to
   * sample — but the numbers are still enormously sensitive to inputs that were
   * themselves estimates. Perturbing growth and churn by a fifth shows how much
   * of the headline figure is load-bearing and how much is decoration.
   */
  const spread = useMemo(() => {
    const outcomes = [-0.2, 0.2].flatMap((dg) =>
      [-0.2, 0.2].map((dc) =>
        projectTwelveMonths({
          ...assumptions,
          monthly_growth_rate: Math.max(0, assumptions.monthly_growth_rate * (1 + dg)),
          monthly_churn: Math.min(0.95, Math.max(0, assumptions.monthly_churn * (1 + dc))),
        })[HORIZON_MONTHS - 1],
      ),
    );
    const mrr = outcomes.map((o) => o.gross_mrr);
    return { low: Math.min(...mrr), high: Math.max(...mrr) };
  }, [assumptions]);

  return (
    <div>
      <ProjectionChart months={months} />

      <div className="mt-9 border rule-faint bg-[rgba(255,250,235,0.34)] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b rule-faint pb-3">
          <p className="titling text-[0.66rem] text-ink">Turn the dials thyself</p>
          {touched && (
            <button
              type="button"
              onClick={() => setAssumptions(base)}
              className="titling text-[0.6rem] text-vermilion underline underline-offset-4"
            >
              Restore the court&rsquo;s figures
            </button>
          )}
        </div>

        <p className="mt-3 text-sm italic leading-relaxed text-ink-soft">
          Every figure below the chart is arithmetic worked upon these four. Move one and watch how
          little it takes to turn a triumph into a bankruptcy — which is the most honest thing this
          court can show thee about its own projection.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {KNOBS.map((knob) => {
            const value = assumptions[knob.key];
            const changed = value !== base[knob.key];
            return (
              <div key={knob.key}>
                <label
                  htmlFor={`knob-${knob.key}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="text-sm text-ink-soft">
                    {knob.label} <span className="text-[0.7rem] italic text-ink-faint">({knob.plain})</span>
                  </span>
                  <span
                    className={`tabular text-sm ${changed ? 'text-vermilion' : 'text-ink'}`}
                  >
                    {knob.format(value)}
                  </span>
                </label>
                <input
                  id={`knob-${knob.key}`}
                  type="range"
                  min={knob.min}
                  max={knob.max}
                  step={knob.step}
                  value={value}
                  onChange={(e) =>
                    setAssumptions((a) => ({ ...a, [knob.key]: Number(e.target.value) }))
                  }
                  className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-none bg-[rgba(90,72,46,0.3)] accent-[#9c2b21]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <ProjectionTable months={months} />
      </div>

      <p className="tabular mt-7 border-t rule-faint pt-4 text-[1.05rem] leading-relaxed text-ink">
        By the twelfth month: {num.format(final.users)} souls, {num.format(final.paying)} paying,{' '}
        {coin.format(final.gross_mrr)} in rents, and the coffers standing at{' '}
        <span className={final.cumulative_net >= 0 ? 'text-verdigris' : 'text-vermilion'}>
          {final.cumulative_net >= 0 ? '+' : '−'}
          {coin.format(Math.abs(final.cumulative_net))}
        </span>
        .
      </p>

      <p className="mt-2 text-sm italic leading-relaxed text-ink-soft">
        Move growth and churn by a fifth in either direction and that same twelfth month lands
        anywhere between {coin.format(spread.low)} and {coin.format(spread.high)}. The court
        offers this not as a confidence interval but as a warning about the whole exercise.
      </p>
    </div>
  );
}
