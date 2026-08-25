'use client';

import { Fleuron, Lozenges, WaxSeal } from './Ornaments';
import type { RejectedResult } from '@/lib/schemas';

/** Deterministic, so the same petition always bears the same roll number. */
function rollNumber(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `MMXXVI · ${String(Math.abs(h) % 10000).padStart(4, '0')}`;
}

function Entry({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b rule-faint pb-5">
      <dt className="titling text-[0.66rem] text-vermilion">{label}</dt>
      <dd className="mt-2 text-xl leading-snug text-ink sm:text-[1.4rem]">{children}</dd>
    </div>
  );
}

export function DeathCertificate({ result, idea }: { result: RejectedResult; idea: string }) {
  const { rejection } = result;

  return (
    <article className="unfurl">
      {/* The letter: a darker board beneath, the leaf laid upon it. */}
      <div className="border-[3px] border-ink bg-[rgba(42,30,18,0.06)] p-2 shadow-[0_26px_60px_-28px_rgba(42,30,18,0.75)]">
        <div className="parchment relative border border-[rgba(90,72,46,0.4)] px-6 py-10 sm:px-14 sm:py-14">
          <div
            className="pointer-events-none absolute inset-2 border border-double border-[rgba(90,72,46,0.28)]"
            aria-hidden
          />

          <header className="relative text-center">
            <p className="titling text-[0.66rem] text-ink-faint">
              Sealed by the Guild of Doomed Enterprise
            </p>
            <h2 className="blackletter mt-5 text-4xl text-ink sm:text-6xl">
              Decree of Extinction
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm italic leading-relaxed text-ink-soft">
              Issued in the matter of a trade that shall not survive its meeting with a
              thinking engine.
            </p>
            <Fleuron className="mx-auto mt-6 max-w-sm" />
            <p className="titling mt-4 text-[0.66rem] text-ink-faint">
              Roll {rollNumber(idea)}
            </p>
          </header>

          <dl className="relative mt-12 space-y-6">
            <Entry label="The venture">{idea}</Entry>
            <Entry label="Manner of its undoing">{rejection.cause_of_death}</Entry>
            <Entry label="The hour appointed">{rejection.time_of_death}</Entry>
            <Entry label="Supplanted by">{rejection.ai_that_replaces_it}</Entry>
          </dl>

          <blockquote className="relative mt-11 border-l-[3px] border-vermilion pl-6">
            <p className="titling text-[0.66rem] text-vermilion">The lament</p>
            <p className="dropcap mt-3 text-2xl leading-snug text-ink sm:text-[1.75rem]">
              {rejection.eulogy}
            </p>
          </blockquote>

          <footer className="relative mt-14 double-rule pt-7">
            <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="blackletter text-3xl text-ink">Grimyapper</p>
                <p className="titling mt-1.5 text-[0.66rem] text-ink-faint">
                  Assayer of ventures · non-engine affairs
                </p>
                <p className="titling mt-4 text-[0.66rem] text-ink-faint">
                  Sealed this{' '}
                  {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <WaxSeal mark="G" size={116} animate className="self-center sm:self-end" />
            </div>
            <Lozenges className="mt-9" />
          </footer>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-lg text-center text-sm italic leading-relaxed text-ink-soft">
        No rubric was applied. No reckoning was made. This court does not assay a trade it
        expects to be swallowed whole as a mere convenience.
      </p>
    </article>
  );
}
