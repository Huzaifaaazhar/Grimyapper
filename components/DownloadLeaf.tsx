'use client';

import { useState } from 'react';

/**
 * One button, one action: hand the reader the document as a PDF.
 *
 * Shared by the charter and the decree so the two verdicts behave identically —
 * the same label states, the same failure text, the same lazy import of jsPDF,
 * which is ~350 KB and must never sit in the initial bundle.
 */
export function DownloadLeaf({
  label,
  busyLabel,
  note,
  onDownload,
  tone = 'gilt',
}: {
  label: string;
  busyLabel: string;
  note: string;
  onDownload: () => Promise<void>;
  tone?: 'gilt' | 'vermilion';
}) {
  const [state, setState] = useState<'idle' | 'writing' | 'failed'>('idle');

  const gilt = tone === 'gilt';
  const frame = gilt
    ? 'border-[var(--color-gilt-deep)] bg-[rgba(212,175,55,0.13)] hover:bg-[rgba(212,175,55,0.24)]'
    : 'border-vermilion bg-[rgba(156,43,33,0.08)] hover:bg-[rgba(156,43,33,0.16)]';

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={async () => {
          setState('writing');
          try {
            await onDownload();
            setState('idle');
          } catch {
            setState('failed');
          }
        }}
        disabled={state === 'writing'}
        className={`group inline-flex items-center gap-4 border-2 px-8 py-4 transition-colors disabled:cursor-wait disabled:opacity-60 ${frame}`}
      >
        <span aria-hidden className={`text-xl ${gilt ? 'text-gold' : 'text-vermilion'}`}>
          ⤓
        </span>
        <span className="blackletter text-2xl text-ink sm:text-3xl">
          {state === 'writing' ? busyLabel : label}
        </span>
      </button>
      <p className="text-center text-xs italic text-ink-faint">
        {state === 'failed' ? 'The scribe could not finish the leaf. Try once more.' : note}
      </p>
    </div>
  );
}
