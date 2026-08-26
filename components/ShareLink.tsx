'use client';

import { useEffect, useState } from 'react';

import { permalinkPath } from '@/lib/permalink';
import type { JudgeRequest } from '@/lib/schemas';

/**
 * The permalink. There is no record to link to — the judgement is a pure
 * function of the petition, so the link carries the petition and the court
 * re-derives the identical verdict on arrival.
 */
export function ShareLink({ petition }: { petition: JudgeRequest }) {
  const [href, setHref] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHref(`${window.location.origin}${permalinkPath(petition)}`);
    setCopied(false);
  }, [petition]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard refused; the input below is selectable, which is the fallback.
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-xl border-t rule-faint pt-7 text-center">
      <p className="titling text-[0.62rem] text-ink-faint">Carry this judgement elsewhere</p>
      <p className="mx-auto mt-2 max-w-md text-sm italic leading-relaxed text-ink-soft">
        Nothing is stored. The link holds the petition itself, and the court reaches the same
        verdict every time it is opened.
      </p>

      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row">
        <input
          readOnly
          value={href}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Permalink to this judgement"
          className="tabular min-w-0 flex-1 border rule-ink bg-[rgba(255,250,235,0.5)] px-3 py-2.5 text-xs text-ink-soft focus:border-vermilion focus:outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="border-2 border-ink px-5 py-2.5 transition-colors hover:border-vermilion sm:shrink-0"
        >
          <span className="titling text-[0.62rem] text-ink">
            {copied ? 'Copied' : 'Copy the link'}
          </span>
        </button>
      </div>
    </div>
  );
}
