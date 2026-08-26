'use client';

import { Fleuron, Lozenges, WaxSeal } from './Ornaments';
import { ProjectionExplorer } from './ProjectionExplorer';
import { RubricBars } from './RubricBars';
import { ScoreDial } from './ScoreDial';
import { SCORE_DISTRIBUTION, percentileFor, standingFor } from '@/lib/model/percentile';
import type { EvaluatedResult } from '@/lib/schemas';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const coin = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-US');

function Section({
  numeral,
  title,
  aside,
  children,
}: {
  numeral: string;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 double-rule pt-4">
        <h3 className="blackletter text-3xl text-ink sm:text-4xl">
          <span className="titling text-vermilion mr-3 align-middle text-xs">{numeral}</span>
          {title}
        </h3>
        {aside && <p className="max-w-sm text-sm italic text-ink-soft">{aside}</p>}
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function Dossier({ result, idea }: { result: EvaluatedResult; idea: string }) {
  const a = result.assumptions;
  const percentile = percentileFor(result.success_likelihood);

  const articles: Array<[string, string, string]> = [
    ['Souls within the year', num.format(Math.round(a.reachable_users_year1)), 'reachable users'],
    ['Increase each month', pct(a.monthly_growth_rate), 'monthly growth'],
    ['Of these, who pay', pct(a.free_to_paid_conversion), 'free → paid'],
    ['The monthly tithe', coin.format(a.price_per_month_usd), 'price per month'],
    ['Who fall away', pct(a.monthly_churn), 'monthly churn'],
    ['Thy monthly outlay', coin.format(a.monthly_burn_usd), 'burn'],
  ];

  return (
    <article className="unfurl">
      <div className="border-[3px] border-ink bg-[rgba(42,30,18,0.06)] p-2 shadow-[0_26px_60px_-28px_rgba(42,30,18,0.75)]">
        <div className="parchment relative border border-[rgba(90,72,46,0.4)] px-6 py-10 sm:px-12 sm:py-14">
          <header>
            <p className="titling text-center text-[0.66rem] text-ink-faint">
              Roll of assay · judged a venture of thinking engines
            </p>
            <Fleuron className="mx-auto mt-5 max-w-md" />

            <div className="mt-9 grid items-center gap-12 lg:grid-cols-[1fr_auto]">
              <div>
                <h2 className="blackletter text-4xl leading-tight text-ink sm:text-5xl">
                  {result.verdict}
                </h2>
                <p className="dropcap mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink">
                  {idea}
                </p>
                <p className="mt-5 max-w-xl border-l-2 border-[rgba(138,118,88,0.5)] pl-4 text-sm italic leading-relaxed text-ink-soft">
                  Thus routed: {result.classification.reason} The clerk was{' '}
                  {pct(result.classification.confidence)} certain.
                </p>
              </div>
              <div className="flex flex-col items-center gap-4">
                <ScoreDial score={result.success_likelihood} band={result.band} />
                <p className="max-w-[15rem] text-center text-sm italic leading-relaxed text-ink-soft">
                  This places it in the{' '}
                  <span className="tabular not-italic text-ink">{percentile}th</span> percentile of
                  the {SCORE_DISTRIBUTION.n} engine-built ventures upon this court&rsquo;s roll —{' '}
                  {standingFor(percentile)}.
                </p>
              </div>
            </div>
          </header>

          <Section
            numeral="the first"
            title="The seven virtues"
            aside="Each weighed from nought to ten. The sum is struck in code, not guessed at."
          >
            <RubricBars rubric={result.rubric} notes={result.rubric_notes} />
          </Section>

          <Section
            numeral="the second"
            title="Articles presumed"
            aside="These six the assayer supplies. Every figure that follows is arithmetic."
          >
            <dl className="grid grid-cols-2 gap-px bg-[rgba(90,72,46,0.34)] sm:grid-cols-3">
              {articles.map(([label, value, plain]) => (
                <div key={label} className="bg-vellum px-4 py-4">
                  <dt className="text-sm leading-snug text-ink-soft">{label}</dt>
                  <dd className="tabular mt-1.5 text-xl text-ink">{value}</dd>
                  <dd className="text-[0.7rem] italic text-ink-faint">{plain}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section
            numeral="the third"
            title="A reckoning of twelve months"
            aside="Two measures, two plots. Never one plot bearing two scales."
          >
            <ProjectionExplorer base={result.assumptions} />
          </Section>

          <footer className="mt-16 double-rule pt-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
                These projections are confidently invented. So is most of a seed deck. The seven
                scores and the six articles come from a thinking engine; every figure in the
                ledger is arithmetic worked upon those six numbers. This is entertainment, and
                not counsel upon money.
              </p>
              <WaxSeal mark="G" size={84} className="shrink-0 self-end" />
            </div>
            <Lozenges className="mt-8" />
          </footer>
        </div>
      </div>
    </article>
  );
}
