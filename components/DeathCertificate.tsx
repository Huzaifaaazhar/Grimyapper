'use client';

import type { RejectedResult } from '@/lib/schemas';

/** Deterministic per-idea so the same pitch always gets the same file number. */
function fileNumber(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h) % 1_000_000;
  return `AI-${String(n).padStart(6, '0')}`;
}

function Entry({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b rule-paper pb-4">
      <dt className="label-caps text-[#7a6a52]">{label}</dt>
      <dd className="mt-2 font-display text-xl leading-snug text-[#1c1611] sm:text-2xl">
        {children}
      </dd>
    </div>
  );
}

export function DeathCertificate({ result, idea }: { result: RejectedResult; idea: string }) {
  const { rejection } = result;
  const ref = fileNumber(idea);

  return (
    <article className="animate-rise">
      <div className="relative overflow-hidden border-[6px] border-[#1c1611] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]">
        <div className="paper-stock relative px-6 py-10 sm:px-12 sm:py-14">
          {/* engraved border */}
          <div
            className="pointer-events-none absolute inset-3 border border-dashed border-[#1c1611]/25"
            aria-hidden
          />

          <header className="relative text-center">
            <p className="label-caps text-[#7a6a52]">Bureau of Premature Ambition</p>
            <h2 className="mt-4 font-display text-4xl leading-none text-[#1c1611] sm:text-6xl">
              Certificate of Death
            </h2>
            <p className="mt-4 text-sm text-[#5c5040]">
              Issued in the matter of a business that will not survive contact with a model release.
            </p>
            <div className="mx-auto mt-6 flex max-w-md items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-[#1c1611]/25" />
              <span className="label-caps text-[#7a6a52]">{ref}</span>
              <span className="h-px flex-1 bg-[#1c1611]/25" />
            </div>
          </header>


          <dl className="relative mt-12 space-y-6">
            <Entry label="Deceased">{idea}</Entry>
            <Entry label="Cause of death">{rejection.cause_of_death}</Entry>
            <Entry label="Time of death">{rejection.time_of_death}</Entry>
            <Entry label="Replaced by">{rejection.ai_that_replaces_it}</Entry>
          </dl>

          <blockquote className="relative mt-10 max-w-full border-l-4 border-[#c0322b] pl-5 sm:max-w-[62%]">
            <p className="label-caps text-[#7a6a52]">Eulogy</p>
            <p className="mt-2 font-display text-2xl italic leading-snug text-[#1c1611] sm:text-3xl">
              “{rejection.eulogy}”
            </p>
          </blockquote>

          {/* Slammed across the lower right, the way a registrar actually stamps a file. */}
          <div
            className="animate-stamp pointer-events-none relative mt-8 flex select-none justify-end sm:absolute sm:bottom-28 sm:right-10 sm:mt-0 sm:block"
            aria-hidden
          >
            <div className="rotate-[-8deg] border-[5px] border-[#c0322b] px-4 py-1.5 opacity-90 sm:px-6 sm:py-2">
              <span className="font-display text-3xl tracking-[0.12em] text-[#c0322b] sm:text-5xl">
                REJECTED
              </span>
            </div>
          </div>

          <footer className="relative mt-12 flex flex-col gap-4 border-t rule-paper pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-2xl text-[#1c1611]">Grimyapper</p>
              <p className="label-caps mt-1 text-[#7a6a52]">Registrar, non-AI affairs</p>
            </div>
            <p className="label-caps text-[#7a6a52]">
              Filed {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </footer>
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-relaxed text-bone-3">
        No rubric was applied. No projection was run. The bureau does not evaluate businesses it
        expects to be absorbed as a feature.
      </p>
    </article>
  );
}
