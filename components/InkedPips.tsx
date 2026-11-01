'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

import { registerEases } from '@/lib/motion/eases';

/**
 * A lozenge that is stamped in rather than faded in.
 *
 * Each pip arrives like a seal being pressed: it comes in oversized and
 * slightly turned, overshoots as it meets the page, and settles square. The
 * stagger across the row is what makes it read as a tally being struck one mark
 * at a time instead of a bar filling.
 *
 * `ScrollTrigger` is deliberately not used. These sit inside a dossier that is
 * already revealed by its own timeline, and attaching a second scroll-driven
 * system to the same elements means two owners for one property. The row
 * animates once, when it first appears.
 */
export function InkedPips({
  value,
  label,
  max = 10,
}: {
  value: number;
  label: string;
  max?: number;
}) {
  const row = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = row.current;
    if (!el || played.current) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      played.current = true;
      return;
    }

    registerEases();
    played.current = true;

    const ctx = gsap.context(() => {
      const inked = el.querySelectorAll('[data-inked="true"]');
      gsap.from(inked, {
        scale: 2.1,
        // Each lands at its own slight angle, as a hand-struck mark would.
        rotate: () => -28 + Math.random() * 16,
        opacity: 0,
        duration: 0.42,
        ease: 'drop',
        stagger: { each: 0.045, from: 'start' },
        // The pips are already rotated 45° by CSS; without this GSAP would
        // compose its own rotation on top and they would land as squares.
        transformOrigin: '50% 50%',
      });
    }, el);

    return () => ctx.revert();
  }, [value]);

  return (
    <div
      ref={row}
      className="flex items-center gap-[5px]"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${label}: ${value} of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((pip) => {
        const inked = pip <= value;
        return (
          <span
            key={pip}
            aria-hidden
            data-inked={inked ? 'true' : 'false'}
            className="h-[13px] w-[13px] rotate-45 border"
            style={{
              borderColor: 'rgba(42,30,18,0.65)',
              background: inked ? '#2a1e12' : 'transparent',
            }}
          />
        );
      })}
    </div>
  );
}
