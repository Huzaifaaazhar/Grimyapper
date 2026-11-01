'use client';

import { gsap } from 'gsap';
import { useRef, useState } from 'react';

import { registerEases } from '@/lib/motion/eases';

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
  const scroll = useRef<HTMLSpanElement>(null);

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
          /*
           * The leaf rolls up into the button.
           *
           * A spinner would say "waiting"; this says what is being waited for.
           * The scroll narrows along its own width and lifts, which is the
           * shape a sheet makes when it is rolled for carrying — and it runs
           * for as long as the PDF takes rather than on a fixed loop, so a
           * slow first click (jsPDF is ~350 KB and lazily imported) is covered
           * rather than hidden.
           */
          let rolling: gsap.core.Tween | undefined;
          const el = scroll.current;
          if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            registerEases();
            rolling = gsap.to(el, {
              scaleX: 0.12,
              y: -3,
              duration: 0.5,
              ease: 'glide',
              yoyo: true,
              repeat: -1,
              transformOrigin: '50% 50%',
            });
          }
          try {
            await onDownload();
            setState('idle');
          } catch {
            setState('failed');
          } finally {
            rolling?.kill();
            if (el) gsap.set(el, { scaleX: 1, y: 0 });
          }
        }}
        disabled={state === 'writing'}
        className={`group inline-flex items-center gap-4 border-2 px-8 py-4 transition-colors disabled:cursor-wait disabled:opacity-60 ${frame}`}
      >
        <span
          ref={scroll}
          aria-hidden
          className={`inline-block text-xl ${gilt ? 'text-gold' : 'text-vermilion'}`}
        >
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
