'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { Fleuron, WaxSeal } from './Ornaments';
import { buildCharter } from '@/lib/charter';
import type { EvaluatedResult, JudgeRequest } from '@/lib/schemas';

/**
 * The Charter of Sovereign Blessing.
 *
 * Shown above the full dossier: the charter is the thing you screenshot, the
 * dossier is the thing you read. Both are drawn from `buildCharter`, and so is
 * the PDF, so all three say exactly the same words.
 */

type State = 'idle' | 'writing' | 'failed';

export function Charter({
  result,
  petition,
}: {
  result: EvaluatedResult;
  petition: JudgeRequest;
}) {
  const charter = useMemo(() => buildCharter(result, petition), [result, petition]);
  const [state, setState] = useState<State>('idle');

  const download = async () => {
    setState('writing');
    try {
      /*
       * jsPDF is ~350 KB and most visitors never press this. Loading it here
       * keeps it out of the initial bundle entirely, at the cost of a beat's
       * delay on the first click — which the "engrossing" label covers.
       */
      const { downloadCharter } = await import('@/lib/charter-pdf');
      await downloadCharter(charter);
      setState('idle');
    } catch {
      setState('failed');
    }
  };

  return (
    <motion.section
      className="mb-14"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="charter-heading"
    >
      <div className="scrollwork parchment relative px-6 py-10 shadow-[0_26px_60px_-30px_rgba(42,30,18,0.7)] sm:px-12 sm:py-12">
        <header className="text-center">
          <p className="titling text-[0.6rem] text-ink-faint">
            By grace of the sovereign court
          </p>
          <h2
            id="charter-heading"
            className="blackletter mt-4 text-4xl leading-none text-ink sm:text-6xl"
          >
            Charter of Sovereign Blessing
          </h2>
          <Fleuron className="mx-auto mt-5 max-w-xs" />
          <p className="titling mt-4 text-[0.58rem] text-vermilion">{charter.style}</p>
        </header>

        <p className="blackletter mt-9 text-center text-3xl leading-tight text-ink sm:text-5xl">
          {charter.venture}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base italic leading-relaxed text-ink-soft">
          {charter.verdict}
        </p>

        {/* the rating, and the particulars beside it */}
        <div className="mt-10 grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
          <div className="text-center">
            <p className="tabular text-6xl leading-none text-gold sm:text-7xl">
              {charter.florins}
            </p>
            <p className="titling mt-2 text-[0.56rem] text-ink-faint">of 100 floating florins</p>
            <p className="titling mt-1 text-[0.56rem] text-ink-faint">
              {charter.band} · {charter.percentileLabel} percentile
            </p>
          </div>

          <dl className="space-y-4">
            {(
              [
                ['Target guilds', charter.guilds],
                ['Treasury reserves', charter.treasury],
                ['Secret alchemy', charter.alchemy],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border-b pb-3 rule-faint last:border-b-0">
                <dt className="titling text-[0.58rem] text-vermilion">{label}</dt>
                <dd className="mt-1 leading-snug text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="mt-10 flex flex-col items-center gap-6 double-rule pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm italic leading-relaxed text-ink-soft">
              {charter.claimUpheld
                ? 'The petitioner swore this venture wrought with thinking engines, and the assayer agrees.'
                : 'The assayer, examining this venture unprompted, finds it wrought with thinking engines.'}
            </p>
            <p className="titling mt-4 text-[0.56rem] text-ink-faint">
              Roll {charter.roll} · sealed this {charter.sealedOn}
            </p>
          </div>
          <WaxSeal mark="G" size={84} animate className="shrink-0" />
        </footer>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={state === 'writing'}
          className="group inline-flex items-center gap-4 border-2 border-[var(--color-gilt-deep)] bg-[rgba(212,175,55,0.13)] px-8 py-4 transition-colors hover:bg-[rgba(212,175,55,0.24)] disabled:cursor-wait disabled:opacity-60"
        >
          <span aria-hidden className="text-xl text-gold">
            ⤓
          </span>
          <span className="blackletter text-2xl text-ink sm:text-3xl">
            {state === 'writing' ? 'The scribe is engrossing it…' : 'Download the sealed charter'}
          </span>
        </button>
        <p className="text-xs italic text-ink-faint">
          {state === 'failed'
            ? 'The scribe could not finish the leaf. Try once more.'
            : 'A single leaf, drawn in full, ready for the press.'}
        </p>
      </div>
    </motion.section>
  );
}
