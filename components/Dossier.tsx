'use client';

import { ProjectionChart } from './ProjectionChart';
import { ProjectionTable } from './ProjectionTable';
import { RubricBars } from './RubricBars';
import { ScoreDial } from './ScoreDial';
import type { EvaluatedResult } from '@/lib/schemas';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-US');

function Section({
  index,
  title,
  aside,
  children,
}: {
  index: string;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b rule pb-3">
        <h3 className="font-display text-2xl text-bone">
          <span className="label-caps mr-3 align-middle text-bone-3">{index}</span>
          {title}
        </h3>
        {aside && <p className="text-xs text-bone-3">{aside}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Dossier({ result, idea }: { result: EvaluatedResult; idea: string }) {
  const a = result.assumptions;
  const final = result.months[result.months.length - 1];

  const assumptionRows: Array<[string, string]> = [
    ['Reachable users, year 1', num.format(Math.round(a.reachable_users_year1))],
    ['Monthly growth', pct(a.monthly_growth_rate)],
    ['Free → paid conversion', pct(a.free_to_paid_conversion)],
    ['Price per month', usd0.format(a.price_per_month_usd)],
    ['Monthly churn', pct(a.monthly_churn)],
    ['Monthly burn', usd0.format(a.monthly_burn_usd)],
  ];

  return (
    <article className="animate-rise">
      <div className="border rule bg-ink-2 px-6 py-10 sm:px-10 sm:py-12">
        <header className="border-b rule pb-8">
          <p className="label-caps text-bone-3">Evaluation dossier · classified as an AI startup</p>

          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-3xl leading-tight text-bone sm:text-5xl">
                “{result.verdict}”
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-bone-2">{idea}</p>
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-bone-3">
                Routing note: {result.classification.reason} (classifier confidence{' '}
                {pct(result.classification.confidence)}).
              </p>
            </div>
            <ScoreDial score={result.success_likelihood} band={result.band} />
          </div>
        </header>

        <Section
          index="I"
          title="Rubric"
          aside="Seven axes, 0–10. Composite is a weighted mean computed in code."
        >
          <RubricBars rubric={result.rubric} notes={result.rubric_notes} />
        </Section>

        <Section
          index="II"
          title="Seed assumptions"
          aside="The model supplies these six. Everything below is arithmetic."
        >
          <dl className="grid grid-cols-2 gap-px bg-[rgba(236,229,216,0.10)] sm:grid-cols-3">
            {assumptionRows.map(([label, value]) => (
              <div key={label} className="bg-ink-2 px-4 py-4">
                <dt className="text-xs leading-snug text-bone-3">{label}</dt>
                <dd className="tabular mt-1.5 font-mono text-lg text-bone">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section
          index="III"
          title="Twelve-month projection"
          aside="Two measures, two axes, two charts. Never one chart with two scales."
        >
          <ProjectionChart months={result.months} />
          <div className="mt-10">
            <ProjectionTable months={result.months} />
          </div>
          <p className="tabular mt-6 font-mono text-sm text-bone-2">
            Month 12: {num.format(final.users)} users · {num.format(final.paying)} paying ·{' '}
            {usd0.format(final.gross_mrr)} MRR · cumulative{' '}
            <span className={final.cumulative_net >= 0 ? 'text-verdant' : 'text-stamp-bright'}>
              {final.cumulative_net >= 0 ? '+' : '−'}
              {usd0.format(Math.abs(final.cumulative_net))}
            </span>
          </p>
        </Section>

        <footer className="mt-14 border-t rule pt-6">
          <p className="text-xs leading-relaxed text-bone-3">
            Projections are confidently made up. So is most of a seed deck. The rubric scores and
            seed assumptions come from a language model; every figure in the table is arithmetic
            applied to those six numbers. This is entertainment, not financial advice.
          </p>
        </footer>
      </div>
    </article>
  );
}
