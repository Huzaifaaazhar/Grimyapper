'use client';

import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Charter } from '@/components/Charter';
import { CourtCurtain } from '@/components/CourtCurtain';
import { DeathCertificate } from '@/components/DeathCertificate';
import { Dossier } from '@/components/Dossier';
import { Fleuron, Lozenges } from '@/components/Ornaments';
import { PitchForm } from '@/components/PitchForm';
import { VerdictOverture } from '@/components/VerdictOverture';
import type { JudgeRequest, JudgeResult } from '@/lib/schemas';

/** How long the court is seen to deliberate. See `CourtCurtain` on why it exists. */
const DELIBERATION_MS = 3600;

type Settled = { result: JudgeResult; petition: JudgeRequest; overturned?: string };

type Phase =
  | { kind: 'idle' }
  | { kind: 'judging' }
  | ({ kind: 'overture' } & Settled)
  | ({ kind: 'done' } & Settled)
  | { kind: 'error'; message: string };

/**
 * What the petitioner swore, held up against what the assayer found.
 *
 * This is the only place the declaration is used, and it is used after the
 * fact. The classifier never saw it — see `petition()` in `lib/judge.ts`.
 */
function Reckoning({ declared, found }: { declared: JudgeRequest['declared']; found: boolean }) {
  if (declared === 'unstated') return null;

  const claimed = declared === 'ai';
  if (claimed === found) {
    return (
      <p className="rise mx-auto mb-8 max-w-xl border-l-2 border-verdigris pl-4 text-sm italic leading-relaxed text-ink-soft">
        {claimed
          ? 'Thou didst swear this venture wrought with thinking engines, and the assayer, reading it, agrees.'
          : 'Thou didst disclaim thinking engines, and the assayer found none. The court thanks thee for thy candour, which is rarer than it ought to be.'}
      </p>
    );
  }

  return (
    <div className="rise mx-auto mb-10 max-w-xl border-2 border-vermilion bg-[rgba(156,43,33,0.07)] px-6 py-5 text-center">
      <p className="titling text-[0.6rem] text-vermilion">A discrepancy in the record</p>
      <p className="mt-3 leading-snug text-ink">
        {claimed
          ? 'Thou didst swear this venture wrought with thinking engines. The assayer, reading the petition itself, found none. The court rules upon what is written, not upon what is claimed.'
          : 'Thou didst disclaim thinking engines. The assayer found them in the petition regardless, and has assayed the venture in full. Modesty is noted and overruled.'}
      </p>
    </div>
  );
}

export function Judge({
  initial,
}: {
  /** Supplied by a permalink, which has already re-derived the judgement server-side. */
  initial?: { result: JudgeResult; petition: JudgeRequest };
}) {
  const [phase, setPhase] = useState<Phase>(
    initial ? { kind: 'done', ...initial } : { kind: 'idle' },
  );
  const resultRef = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    // A permalink arrives already decided; scrolling the reader away from the
    // top of a page they just opened would be rude.
    if (phase.kind === 'done' && !initial) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [phase.kind, initial]);

  const submit = useCallback(
    async (payload: JudgeRequest) => {
      setPhase({ kind: 'judging' });
      const started = Date.now();

      try {
        const res = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json();

        if (!res.ok) {
          // A failure gets no ceremony. Show it the moment it is known.
          setPhase({ kind: 'error', message: body?.error ?? 'The court is silent.' });
          return;
        }

        /*
         * The judgement itself took well under a millisecond, so the curtain is
         * held open for the rest of its span rather than flashing past. Anyone
         * who asked for reduced motion gets the answer immediately instead.
         */
        const remaining = still ? 0 : DELIBERATION_MS - (Date.now() - started);
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

        setPhase({ kind: 'overture', result: body as JudgeResult, petition: payload });
      } catch {
        setPhase({
          kind: 'error',
          message: 'The messenger did not return. Check thy connection to the world.',
        });
      }
    },
    [still],
  );

  const reset = () => setPhase({ kind: 'idle' });

  const settled = phase.kind === 'done' ? phase : null;

  return (
    <>
      <AnimatePresence>
        {phase.kind === 'judging' && <CourtCurtain duration={DELIBERATION_MS} />}
      </AnimatePresence>

      {phase.kind === 'overture' && (
        <VerdictOverture
          verdict={phase.result.outcome === 'rejected' ? 'rejected' : 'blessed'}
          onDone={() =>
            setPhase({
              kind: 'done',
              result: phase.result,
              petition: phase.petition,
              overturned: phase.overturned,
            })
          }
        />
      )}

      <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-28 pt-14 sm:pt-20">
        <header className="text-center">
          <p className="titling text-[0.66rem] text-ink-faint">Grimyapper · Assayer of ventures</p>

          <h1 className="blackletter mt-6 text-6xl leading-[0.92] text-ink sm:text-8xl">
            Should this
            <br />
            exist?
          </h1>

          <Fleuron className="mx-auto mt-8 max-w-lg" />

          <p className="mx-auto mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">
            Bring thy venture before the King&rsquo;s Court. Should it be built upon thinking
            engines, His Majesty may grant royal blessing and a parchment charter. Should it not,
            he shall order immediate execution and a sealed decree of extinction.
          </p>
        </header>

        <div ref={resultRef} className="scroll-mt-8">
          {phase.kind === 'idle' && (
            <div className="mt-14">
              <PitchForm onSubmit={submit} disabled={false} />
            </div>
          )}

          {/* The page beneath the curtain is inert, but must not collapse to nothing. */}
          {phase.kind === 'judging' && <div className="min-h-[50vh]" aria-hidden />}

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

          {settled && (
            <div className="pt-14">
              {settled.overturned && (
                <div className="rise mx-auto mb-10 max-w-xl border-2 border-verdigris bg-[rgba(63,107,82,0.08)] px-6 py-6 text-center">
                  <p className="titling text-[0.62rem] text-verdigris">The appeal is upheld</p>
                  <p className="mt-3 text-[1.15rem] leading-snug text-ink">{settled.overturned}</p>
                </div>
              )}

              <Reckoning
                declared={settled.petition.declared}
                found={settled.result.outcome === 'evaluated'}
              />

              {settled.result.outcome === 'rejected' ? (
                <DeathCertificate
                  result={settled.result}
                  idea={settled.petition.idea}
                  petition={settled.petition}
                  onAppealUpheld={(judgement, moved) =>
                    setPhase({
                      kind: 'overture',
                      result: judgement,
                      petition: settled.petition,
                      overturned: moved,
                    })
                  }
                />
              ) : (
                <>
                  <Charter result={settled.result} petition={settled.petition} />
                  <Dossier result={settled.result} idea={settled.petition.idea} />
                </>
              )}

              <div className="mt-14 flex justify-center">
                <button
                  type="button"
                  onClick={reset}
                  className="group inline-flex items-center gap-3 border-2 border-ink px-9 py-4 transition-colors hover:border-vermilion"
                >
                  <span
                    aria-hidden
                    className="text-vermilion transition-transform group-hover:-translate-x-1"
                  >
                    ❦
                  </span>
                  <span className="blackletter text-3xl text-ink">Summon another venture</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-24">
          <Lozenges />
          <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-relaxed text-ink-soft">
            Grimyapper is a jest with real machinery beneath it: a classifier trained on labelled
            petitions, seven virtues scored by a transparent model, and a deterministic reckoning
            of unit economics. It is not counsel upon money, and it has never once been right.
          </p>
          <p className="mt-5 text-center">
            <a
              href="/model"
              className="titling text-[0.62rem] text-ink-soft underline decoration-vermilion underline-offset-[6px] hover:text-vermilion"
            >
              See what the court gets wrong
            </a>
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-ink-faint">
            What becomes of thy petition: nothing. It is judged here, upon this very machine, by a
            model of some seventeen kilobytes that never leaves it. Thy words are sent to no other
            house, stored nowhere, written to no log, and forgotten the instant the answer is
            drawn. There is no account, no ledger of record, and no reckoning of visitors upon this
            page.
          </p>
        </footer>
      </main>
    </>
  );
}
