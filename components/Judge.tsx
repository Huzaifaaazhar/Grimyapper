'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DeathCertificate } from '@/components/DeathCertificate';
import { Dossier } from '@/components/Dossier';
import { LoadingCurtain } from '@/components/LoadingCurtain';
import { Fleuron, Lozenges } from '@/components/Ornaments';
import { PitchForm } from '@/components/PitchForm';
import type { JudgeResult } from '@/lib/schemas';

type Phase =
  | { kind: 'idle' }
  | { kind: 'judging' }
  | { kind: 'done'; result: JudgeResult; idea: string }
  | { kind: 'error'; message: string };

export function Judge() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase.kind === 'done') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [phase.kind]);

  const submit = useCallback(
    async (payload: { idea: string; name: string; customer: string }) => {
      setPhase({ kind: 'judging' });
      try {
        const res = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok) {
          setPhase({ kind: 'error', message: body?.error ?? 'The court is silent.' });
          return;
        }
        setPhase({ kind: 'done', result: body as JudgeResult, idea: payload.idea });
      } catch {
        setPhase({
          kind: 'error',
          message: 'The messenger did not return. Check thy connection to the world.',
        });
      }
    },
    [],
  );

  const reset = () => setPhase({ kind: 'idle' });

  return (
    <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-28 pt-14 sm:pt-20">
      <header className="text-center">
        <p className="titling text-[0.66rem] text-ink-faint">
          Grimyapper · Assayer of ventures
        </p>

        <h1 className="blackletter mt-6 text-6xl leading-[0.92] text-ink sm:text-8xl">
          Should this
          <br />
          exist?
        </h1>

        <Fleuron className="mx-auto mt-8 max-w-lg" />

        <p className="mx-auto mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">
          Bring thy venture before the court. Should it be built upon thinking engines, it shall
          be assayed against seven virtues and a reckoning of twelve months. Should it not, thou
          shalt receive a sealed decree of extinction, and no reckoning at all.
        </p>
      </header>

      <div ref={resultRef} className="scroll-mt-8">
        {phase.kind === 'idle' && (
          <div className="mt-14 border-y-2 border-[rgba(42,30,18,0.4)] py-12">
            <PitchForm onSubmit={submit} disabled={false} />
          </div>
        )}

        {phase.kind === 'judging' && (
          <div className="pt-12">
            <LoadingCurtain />
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="rise pt-14">
            <div className="border-2 border-vermilion bg-[rgba(156,43,33,0.07)] px-7 py-9 text-center">
              <p className="titling text-[0.66rem] text-vermilion">The filing has failed</p>
              <p className="blackletter mt-4 text-3xl leading-snug text-ink">{phase.message}</p>
            </div>
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="border-2 border-ink px-8 py-3.5 transition-colors hover:border-vermilion"
              >
                <span className="blackletter text-2xl text-ink">Petition anew</span>
              </button>
            </div>
          </div>
        )}

        {phase.kind === 'done' && (
          <div className="pt-14">
            {phase.result.outcome === 'rejected' ? (
              <DeathCertificate result={phase.result} idea={phase.idea} />
            ) : (
              <Dossier result={phase.result} idea={phase.idea} />
            )}

            <div className="mt-14 flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="group inline-flex items-center gap-3 border-2 border-ink px-9 py-4 transition-colors hover:border-vermilion"
              >
                <span aria-hidden className="text-vermilion transition-transform group-hover:-translate-x-1">
                  ❦
                </span>
                <span className="blackletter text-3xl text-ink">Bring forth another</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-24">
        <Lozenges />
        <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-relaxed text-ink-soft">
          Grimyapper is a jest with real machinery beneath it: a classifier trained on labelled
          petitions, seven virtues scored by a transparent model, and a deterministic reckoning of
          unit economics. It is not counsel upon money, and it has never once been right.
        </p>
        <p className="mx-auto mt-3.5 max-w-2xl text-center text-xs leading-relaxed text-ink-faint">
          What becomes of thy petition: nothing. It is judged here, upon this very machine, by a
          model of some seventeen kilobytes that never leaves it. Thy words are sent to no other
          house, stored nowhere, written to no log, and forgotten the instant the answer is drawn.
          There is no account, no ledger of record, and no reckoning of visitors upon this page.
        </p>
      </footer>
    </main>
  );
}
