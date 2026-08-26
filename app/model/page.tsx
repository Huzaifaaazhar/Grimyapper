import type { Metadata } from 'next';
import Link from 'next/link';

import { Fleuron, Lozenges } from '@/components/Ornaments';
import { TelemetryPanel } from '@/components/TelemetryPanel';
import report from '@/lib/model/report.json';
import { MAX_AXIS_MAE } from '@/evals/rubric-labels';
import { RUBRIC_LABELS } from '@/evals/rubric-labels';
import { scoreRubric } from '@/lib/model/rubric';
import { RUBRIC_AXES } from '@/lib/schemas';
import { RUBRIC_PLAIN } from '@/lib/scoring';
import { snapshot } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The court shows its working — Grimyapper',
  description:
    'The held-out accuracy, confusion matrix, calibration and known errors of the classifier that decides which ventures Grimyapper assays.',
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-vellum px-4 py-4">
      <dt className="titling text-[0.6rem] text-ink-faint">{label}</dt>
      <dd className="tabular mt-1.5 text-2xl text-ink">{value}</dd>
      {note && <dd className="mt-1 text-[0.72rem] italic leading-snug text-ink-faint">{note}</dd>}
    </div>
  );
}

function Section({ numeral, title, aside, children }: {
  numeral: string; title: string; aside?: string; children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 double-rule pt-4">
        <h2 className="blackletter text-3xl text-ink">
          <span className="titling text-vermilion mr-3 align-middle text-xs">{numeral}</span>
          {title}
        </h2>
        {aside && <p className="max-w-sm text-sm italic text-ink-soft">{aside}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function ModelPage() {
  const { confusion, metrics, calibration, features, corpus } = report;

  // Rubric error is recomputed here rather than stored, so it can never go stale
  // relative to the scorer actually running on this deploy.
  const axisMae = RUBRIC_AXES.map((axis) => {
    const errs = RUBRIC_LABELS.map((l) => Math.abs(scoreRubric(l.idea).rubric[axis] - l.rubric[axis]));
    return { axis, mae: errs.reduce((s, x) => s + x, 0) / errs.length };
  });
  const overallMae =
    axisMae.reduce((s, a) => s + a.mae, 0) / axisMae.length;

  const maxWeight = Math.max(...report.signalWeights.map((s) => Math.abs(s.weight)));

  return (
    <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-28 pt-14 sm:pt-20">
      <header className="text-center">
        <p className="titling text-[0.66rem] text-ink-faint">Grimyapper · the court shows its working</p>
        <h1 className="blackletter mt-5 text-5xl leading-[0.95] text-ink sm:text-7xl">
          What the court
          <br />
          gets wrong
        </h1>
        <Fleuron className="mx-auto mt-7 max-w-md" />
        <p className="mx-auto mt-6 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
          A product that claims to judge accurately should be willing to publish how often it does
          not. Every figure here is measured on petitions the model never saw while it was being
          fitted, and the errors below are the real ones, not a flattering selection.
        </p>
      </header>

      <Section
        numeral="the first"
        title="Held-out accuracy"
        aside={`Five-fold cross-validation over ${corpus.total} labelled petitions. The vocabulary is rebuilt inside every fold, so no test text leaks into the fit.`}
      >
        <dl className="grid grid-cols-2 gap-px bg-[rgba(90,72,46,0.34)] sm:grid-cols-4">
          <Stat label="Accuracy" value={pct(metrics.accuracy)} />
          <Stat label="Precision" value={pct(metrics.precision)} note="of those called engine-built, how many were" />
          <Stat label="Recall" value={pct(metrics.recall)} note="of those that were, how many it caught" />
          <Stat label="F1" value={pct(metrics.f1)} />
        </dl>

        <div className="mt-8 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-start">
          <table className="border-collapse text-sm">
            <caption className="titling mb-3 text-left text-[0.6rem] text-ink-faint">
              Confusion matrix
            </caption>
            <thead>
              <tr>
                <th />
                <th className="titling px-4 pb-2 text-[0.58rem] text-ink-faint">said engine</th>
                <th className="titling px-4 pb-2 text-[0.58rem] text-ink-faint">said not</th>
              </tr>
            </thead>
            <tbody className="tabular">
              <tr>
                <th className="titling pr-4 text-right text-[0.58rem] text-ink-faint">was engine</th>
                <td className="border rule-faint bg-[rgba(63,107,82,0.12)] px-5 py-3 text-center text-lg text-ink">{confusion.tp}</td>
                <td className="border rule-faint bg-[rgba(156,43,33,0.1)] px-5 py-3 text-center text-lg text-vermilion">{confusion.fn}</td>
              </tr>
              <tr>
                <th className="titling pr-4 text-right text-[0.58rem] text-ink-faint">was not</th>
                <td className="border rule-faint bg-[rgba(156,43,33,0.1)] px-5 py-3 text-center text-lg text-vermilion">{confusion.fp}</td>
                <td className="border rule-faint bg-[rgba(63,107,82,0.12)] px-5 py-3 text-center text-lg text-ink">{confusion.tn}</td>
              </tr>
            </tbody>
          </table>

          <div className="text-sm leading-relaxed text-ink-soft">
            <p>
              The {confusion.fp} false positives are ordinary trades the court wrongly assayed;
              the {confusion.fn} false negatives are engine-built ventures it wrongly buried. The
              decision threshold sits at{' '}
              <span className="tabular text-ink">{report.threshold}</span> rather than the obvious
              0.5, because the definition says an unclear petition is treated as engine-built and
              left to the moat score to judge — so the two mistakes do not cost the same, and the
              boundary should not pretend they do.
            </p>
            <p className="mt-3">
              {features.total.toLocaleString()} learned features ({features.word.toLocaleString()}{' '}
              word and bigram, {features.character.toLocaleString()} character) alongside{' '}
              {features.signals} hand-built signals.
            </p>
          </div>
        </div>
      </Section>

      <Section
        numeral="the second"
        title="Is the confidence honest"
        aside="Platt scaling, fitted on out-of-fold scores. Fitting it on the training scores would calibrate against the model's own overconfidence."
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          Brier score{' '}
          <span className="tabular text-ink">{calibration.brierRaw}</span> raw →{' '}
          <span className="tabular text-verdigris">{calibration.brier}</span> calibrated. Lower is
          better. Below: what the court claimed, against how often it was actually right.
        </p>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[rgba(42,30,18,0.5)]">
              <th className="titling pb-2 text-left text-[0.58rem] text-ink-faint">stated band</th>
              <th className="titling pb-2 text-right text-[0.58rem] text-ink-faint">judgements</th>
              <th className="titling pb-2 text-right text-[0.58rem] text-ink-faint">said</th>
              <th className="titling pb-2 text-right text-[0.58rem] text-ink-faint">was</th>
              <th className="titling pb-2 text-right text-[0.58rem] text-ink-faint">gap</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {report.reliability.map((bin) => {
              const gap = bin.actual - bin.stated;
              return (
                <tr key={bin.lo} className="border-b border-[rgba(138,118,88,0.34)]">
                  <td className="py-2.5 text-ink-soft">
                    {(bin.lo * 100).toFixed(0)}–{(bin.hi * 100).toFixed(0)}%
                  </td>
                  <td className="py-2.5 text-right text-ink-faint">{bin.n}</td>
                  <td className="py-2.5 text-right text-ink-soft">{pct(bin.stated)}</td>
                  <td className="py-2.5 text-right text-ink">{pct(bin.actual)}</td>
                  <td className={`py-2.5 text-right ${gap >= 0 ? 'text-verdigris' : 'text-vermilion'}`}>
                    {gap >= 0 ? '+' : ''}{(gap * 100).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-sm italic leading-relaxed text-ink-faint">
          A positive gap means the court was more often right than it claimed, which is the
          direction to err in.
        </p>
      </Section>

      <Section
        numeral="the third"
        title="What the signals learned"
        aside="Twenty-one hand-built features. The weights are fitted, not chosen — the court did not decide these."
      >
        <ol className="divide-y divide-[rgba(138,118,88,0.3)] border-y rule-faint">
          {report.signalWeights.map((s) => {
            const positive = s.weight >= 0;
            return (
              <li key={s.name} className="flex items-center gap-4 py-2.5">
                <span className="w-52 shrink-0 text-sm text-ink-soft">{s.name.replace(/_/g, ' ')}</span>
                <span className="flex h-3 flex-1 items-center">
                  <span className="relative flex h-full w-full items-center justify-center">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-[rgba(90,72,46,0.4)]" />
                    <span
                      className="absolute h-2"
                      style={{
                        width: `${(Math.abs(s.weight) / maxWeight) * 48}%`,
                        [positive ? 'left' : 'right']: '50%',
                        background: positive ? '#2a1e12' : '#9c2b21',
                      }}
                    />
                  </span>
                </span>
                <span className={`tabular w-16 shrink-0 text-right text-sm ${positive ? 'text-ink' : 'text-vermilion'}`}>
                  {positive ? '+' : '−'}{Math.abs(s.weight).toFixed(2)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm italic leading-relaxed text-ink-soft">
          Ink to the right pushes toward engine-built; vermilion to the left pushes away. Two of
          these are worth pausing on: speaking of engines is weak evidence <em>against</em> being
          one, and the single loudest signal in either direction is simply sounding like an agency.
        </p>
      </Section>

      <Section
        numeral="the fourth"
        title="Where the rubric disagrees"
        aside={`Mean absolute error against ${RUBRIC_LABELS.length} petitions scored by hand on every axis. One labeller, so this catches drift rather than proving correctness.`}
      >
        <ol className="divide-y divide-[rgba(138,118,88,0.3)] border-y rule-faint">
          {axisMae.map(({ axis, mae }) => (
            <li key={axis} className="flex items-center gap-4 py-2.5">
              <span className="w-52 shrink-0 text-sm text-ink-soft">{RUBRIC_PLAIN[axis]}</span>
              <span className="h-2 flex-1 bg-[rgba(90,72,46,0.16)]">
                <span
                  className="block h-full bg-ink"
                  style={{ width: `${Math.min(100, (mae / MAX_AXIS_MAE) * 100)}%` }}
                />
              </span>
              <span className="tabular w-16 shrink-0 text-right text-sm text-ink">
                {mae.toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Overall <span className="tabular text-ink">{overallMae.toFixed(2)}</span> points out of
          ten, against a gate of {MAX_AXIS_MAE} per axis. The gate is deliberately loose: with a
          single labeller, anything tighter would measure agreement with one person&rsquo;s taste
          rather than correctness.
        </p>
      </Section>

      <Section
        numeral="the fifth"
        title="The petitions it gets wrong"
        aside="Held-out errors, nearest the decision boundary first. These are the next examples worth labelling."
      >
        <ol className="divide-y divide-[rgba(138,118,88,0.3)] border-y rule-faint">
          {report.mistakes.map((m, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className="tabular w-16 shrink-0 text-sm text-vermilion">
                {m.p.toFixed(3)}
              </span>
              <span className="titling w-28 shrink-0 text-[0.58rem] text-ink-faint">
                should be {m.label === 1 ? 'assayed' : 'buried'}
              </span>
              <span className="min-w-0 flex-1 text-[0.95rem] leading-snug text-ink">{m.text}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        numeral="the sixth"
        title="Where live judgements land"
        aside="Probability and branch only. No petition text is passed to this counter, so there is nothing here that could identify a submission."
      >
        <TelemetryPanel snapshot={snapshot()} threshold={report.threshold} />
      </Section>

      <footer className="mt-20">
        <Lozenges />
        <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-relaxed text-ink-soft">
          Regenerate every figure on this page with <span className="tabular text-ink">npm run train</span>.
          The eval harness fails the build if routing accuracy falls, if the rubric drifts from its
          labels, or if the committed weights stop matching the corpus.
        </p>
        <p className="mt-6 text-center">
          <Link href="/" className="blackletter text-2xl text-ink underline decoration-vermilion underline-offset-8">
            Back to the court
          </Link>
        </p>
      </footer>
    </main>
  );
}
