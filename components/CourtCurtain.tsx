'use client';

import dynamic from 'next/dynamic';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useEffect, useRef, useState } from 'react';

import { registerEases } from '@/lib/motion/eases';
import { useCapability } from '@/lib/motion/useCapability';

/**
 * The court retires to deliberate.
 *
 * A confession the old version already carried and this one keeps: the
 * judgement underneath takes about a third of a millisecond. The classifier is
 * arithmetic in this process; there is nothing to wait for. The curtain exists
 * because a sentence delivered instantly reads as a form validating, not as a
 * court ruling, so `Judge` holds it open and the beats below are paced to fill
 * it. No percentage is shown, because there is nothing to measure.
 *
 * What changed is the staging. One GSAP master timeline owns the pacing; the
 * title inks in letter by letter via SplitText; each stage name writes on with
 * a quill-pressure stroke; and the balance is a real damped oscillator rather
 * than a CSS loop swinging on a countable beat.
 */

const CurtainCanvas = dynamic(
  () => import('@/components/three/CurtainCanvas').then((m) => m.CurtainCanvas),
  { ssr: false, loading: () => null },
);

const STAGES = [
  'Consulting the sovereign’s ledger',
  'Weighing treasury against heresy',
  'Inspecting for artificial intelligence',
] as const;

export function CourtCurtain({ duration = 3600 }: { duration?: number }) {
  const cap = useCapability();
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [stage, setStage] = useState(-1);

  useEffect(() => {
    if (!cap.ready) return;
    registerEases();

    if (cap.reduced) {
      // Everything at once, held still. The words are the content; the inking
      // and the balance are decoration, and only decoration is dropped.
      setStage(STAGES.length - 1);
      return;
    }

    gsap.registerPlugin(SplitText);

    /*
     * gsap.context scopes every tween it creates, so one revert() on unmount
     * undoes the animations *and* SplitText's DOM surgery. Without it, a
     * curtain unmounted mid-run leaves split character spans behind in the
     * heading.
     */
    const ctx = gsap.context(() => {
      /*
       * `aria: 'auto'` is not optional here: splitting a heading into
       * per-character spans makes most screen readers announce it one letter at
       * a time. The option restores a readable label on the parent and hides
       * the pieces from the accessibility tree.
       */
      const split = title.current
        ? SplitText.create(title.current, { type: 'chars', aria: 'auto' })
        : null;

      const tl = gsap.timeline();

      if (split) {
        tl.addLabel('ink').from(
          split.chars,
          {
            opacity: 0,
            // Blackletter is written with a broad nib: strokes arrive from the
            // upper left and the ink spreads into the parchment, so the letters
            // drop and sharpen rather than fading up uniformly.
            yPercent: -34,
            rotate: -7,
            filter: 'blur(5px)',
            duration: 0.5,
            ease: 'quill',
            stagger: { each: 0.028, from: 'start' },
          },
          'ink',
        );
      }

      // The stages, paced across what is left after the title has inked.
      const per = (duration / 1000 - 0.7) / STAGES.length;
      STAGES.forEach((_, i) => {
        tl.call(() => setStage(i), undefined, 0.7 + i * per);
      });

      return () => split?.revert();
    }, root);

    return () => ctx.revert();
  }, [cap.ready, cap.reduced, duration]);

  return (
    <div
      ref={root}
      className="hall fixed inset-0 z-50 flex flex-col overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="The court deliberates"
    >
      <div className="relative min-h-0 flex-[3]">
        {cap.webgl && !cap.reduced && <CurtainCanvas cap={cap} stage={stage} />}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(to bottom, transparent, #14100a)' }}
        />
      </div>

      <div className="relative z-10 flex flex-[2] flex-col items-center px-6 pb-8">
        <h2
          ref={title}
          className="blackletter text-center text-4xl leading-none text-[#f3d886] sm:text-5xl"
        >
          The court deliberates
        </h2>

        <ol className="mt-8 w-full max-w-md space-y-4 text-center">
          {STAGES.map((line, i) => (
            <li key={line}>
              <QuillLine text={line} state={i < stage ? 'past' : i === stage ? 'now' : 'next'} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * A stage name written on with a quill.
 *
 * The stroke is an SVG path whose dash offset is animated — DrawSVG's
 * mechanism, done directly because a single path needs no plugin — along a
 * slightly bowed line. The bow is the effect: a nib held by a hand does not
 * travel dead straight, and a perfectly level rule reads as a progress bar
 * where a bowed one reads as a pen stroke.
 */
function QuillLine({ text, state }: { text: string; state: 'past' | 'now' | 'next' }) {
  const path = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = path.current;
    if (!el) return;
    registerEases();

    const len = el.getTotalLength();
    gsap.set(el, { strokeDasharray: len });

    if (state === 'now') {
      gsap.fromTo(
        el,
        { strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 0.62, ease: 'quill' },
      );
      return () => {
        gsap.killTweensOf(el);
      };
    }

    gsap.set(el, { strokeDashoffset: state === 'past' ? 0 : len });
  }, [state]);

  return (
    <span className="relative inline-block">
      <span
        className="titling text-[0.72rem] transition-opacity duration-500 sm:text-sm"
        style={{
          color: state === 'now' ? '#f3d886' : '#d4af37',
          opacity: state === 'past' ? 0.34 : state === 'now' ? 1 : 0.16,
        }}
      >
        {text}
      </span>
      <svg
        aria-hidden
        className="pointer-events-none absolute -bottom-1.5 left-0 h-2 w-full overflow-visible"
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
      >
        <path
          ref={path}
          d="M0.5 2.4 C22 1.1, 54 1.0, 99.5 2.1"
          fill="none"
          stroke="#d4af37"
          strokeWidth={state === 'now' ? 1.5 : 1}
          strokeLinecap="round"
          opacity={state === 'next' ? 0 : 0.85}
        />
      </svg>
    </span>
  );
}
