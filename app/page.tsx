'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DeathCertificate } from '@/components/DeathCertificate';
import { Dossier } from '@/components/Dossier';
import { LoadingCurtain } from '@/components/LoadingCurtain';
import { PitchForm } from '@/components/PitchForm';
import type { JudgeResult } from '@/lib/schemas';

type Phase =
  | { kind: 'idle' }
  | { kind: 'judging' }
  | { kind: 'done'; result: JudgeResult; idea: string }
  | { kind: 'error'; message: string };

export default function Page() {
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
          setPhase({ kind: 'error', message: body?.error ?? 'Something went wrong.' });
          return;
        }
        setPhase({ kind: 'done', result: body as JudgeResult, idea: payload.idea });
      } catch {
        setPhase({ kind: 'error', message: 'Could not reach the bureau. Check your connection.' });
      }
    },
    [],
  );

  const reset = () => setPhase({ kind: 'idle' });

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-24 pt-16 sm:pt-24">
      <header className="border-b rule pb-10">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 bg-stamp-bright" aria-hidden />
          <span className="label-caps text-bone-3">Grimyapper · est. whenever</span>
        </div>
        <h1 className="mt-6 font-display text-5xl leading-[0.95] text-bone sm:text-7xl">
          Should this
          <br />
          exist?
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-bone-2">
          Pitch a startup. If it is an AI startup, it gets a real rubric, a score, and a
          suspiciously precise twelve-month projection. If it is not, it gets a death certificate.
        </p>
      </header>

      <div ref={resultRef} className="scroll-mt-8">
        {phase.kind === 'idle' && (
          <div className="pt-12">
            <PitchForm onSubmit={submit} disabled={false} />
          </div>
        )}

        {phase.kind === 'judging' && (
          <div className="pt-12">
            <LoadingCurtain />
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="animate-rise pt-12">
            <div className="border border-stamp/50 bg-stamp/10 px-6 py-8">
              <p className="label-caps text-stamp-bright">Filing failed</p>
              <p className="mt-3 font-display text-2xl text-bone">{phase.message}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-8 border rule px-6 py-3 font-display text-xl text-bone transition-colors hover:border-amber hover:text-amber"
            >
              Try again
            </button>
          </div>
        )}

        {phase.kind === 'done' && (
          <div className="pt-12">
            {phase.result.outcome === 'rejected' ? (
              <DeathCertificate result={phase.result} idea={phase.idea} />
            ) : (
              <Dossier result={phase.result} idea={phase.idea} />
            )}

            <div className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="group inline-flex items-center gap-3 border rule px-8 py-4 font-display text-2xl text-bone transition-colors hover:border-amber hover:text-amber"
              >
                <span aria-hidden className="transition-transform group-hover:-translate-x-1">
                  ←
                </span>
                Judge another
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-24 border-t rule pt-8">
        <p className="text-xs leading-relaxed text-bone-3">
          Grimyapper is a comedy instrument with real machinery behind it: a classifier, a
          seven-axis rubric scored in code, and a deterministic unit-economics model. It is not
          investment advice, and it has never been right about anything.
        </p>
      </footer>
    </main>
  );
}
