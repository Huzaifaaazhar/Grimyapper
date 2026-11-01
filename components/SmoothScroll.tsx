'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

/**
 * Smooth scroll on the verdict page.
 *
 * The dossier is long — a rubric, six articles, two charts and a twelve-month
 * ledger — and a native wheel scroll through it against a parchment background
 * is jumpy in a way that undercuts everything else. Lenis interpolates the
 * scroll position instead, so the page carries rather than steps.
 *
 * Three things it is careful about:
 *
 *   - **It never runs under `prefers-reduced-motion`.** Hijacking scroll is
 *     exactly the kind of motion that triggers vestibular symptoms, and it is
 *     also the kind a reader cannot escape by looking away.
 *   - **It never runs on touch.** Mobile browsers already have momentum
 *     scrolling tuned to the platform, and overriding it costs the rubber-band,
 *     the scroll-to-top tap and the address-bar collapse for no gain.
 *   - **It stops while a sequence is on screen.** The curtain and the overture
 *     are fixed, full-screen and not scrollable; leaving a RAF loop running
 *     under them is wasted work on exactly the frames that need the budget
 *     most.
 */
export function SmoothScroll({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const lenis = new Lenis({
      // Long enough to feel carried, short enough that a flick still lands
      // where the reader expected it to.
      duration: 0.9,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      // Native behaviour on touch, as above.
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
