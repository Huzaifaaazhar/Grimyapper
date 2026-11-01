'use client';

import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

import { registerEases } from './eases';
import { thud } from './thud';

/**
 * The verdict sequence's clock.
 *
 * **Driven by wall time, not by the frame loop.** This is the important
 * decision in the file, and it was made after watching recordings rather than
 * reasoning about it.
 *
 * The obvious implementation is a GSAP timeline tweening a progress value, and
 * that is what this was. GSAP ticks on requestAnimationFrame, which is correct
 * for almost everything — but this sequence *is* the thing starving rAF. The
 * blessing renders god rays, bloom and three thousand particles; when a frame
 * costs more than a frame's worth of time the ticker fires rarely, and a
 * timeline that only advances on ticks barely advances at all. In the recorded
 * frames the charter was still mid-entrance on the last frame of a sixteen
 * second capture.
 *
 * GSAP's lag smoothing makes it worse — by default it pretends only 33ms
 * elapsed whenever a frame exceeds 500ms — but turning that off is not enough,
 * because a starved ticker still only advances when it fires.
 *
 * So progress is computed from `performance.now()` on an interval and the named
 * CustomEases are applied by hand through `gsap.parseEase`. The curves, which
 * are the whole point of the easing vocabulary, are unchanged; only the thing
 * sampling them has moved. The sequence now takes the same wall-clock time on a
 * machine rendering at 60fps and on one rendering at three, which is the
 * guarantee a reader waiting behind it actually needs.
 *
 * A slow device therefore sees a choppier sequence of the right length instead
 * of a smooth sequence of unbounded length.
 */

export type SequenceState = { progress: number; shake: number; done: boolean };

/* The beats, in seconds. The total is the overture's budget from the brief. */
const HANG_END = 0.42;
const BURN_END = 2.92;
const SLAM_AT = 1.87;
const SLAM_FOR = 0.62;
export const SEQUENCE_SECONDS = 3.2;

/** Ten updates a second is ample for a value feeding a shader uniform. */
const TICK_MS = 100;

export function useExecutionTimeline({
  play,
  reduced,
  sound,
  onDone,
}: {
  play: boolean;
  reduced: boolean;
  sound: boolean;
  onDone?: () => void;
}) {
  const [state, setState] = useState<SequenceState>({ progress: 0, shake: 0, done: false });

  /*
   * onDone is held in a ref and deliberately kept out of the effect's deps.
   *
   * Callers pass it as an inline arrow, so its identity changes on every parent
   * render — and this hook re-renders its parent on every tick. With onDone in
   * the dependency array that is a loop: tick, re-render, new callback, effect
   * re-runs, sequence restarts from zero, and it never reaches its end.
   */
  const done = useRef(onDone);
  done.current = onDone;

  const finished = useRef(false);
  const halt = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!play) return;
    registerEases();

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      setState({ progress: 1, shake: 0, done: true });
      done.current?.();
    };

    finished.current = false;

    if (reduced) {
      /*
       * No shaders, no particles, no shake — the caller drops those. The
       * sequence collapses to its final lit frame, held just long enough to
       * register as an event rather than a flicker.
       */
      setState({ progress: 1, shake: 0, done: false });
      const timer = window.setTimeout(finish, 200);
      halt.current = () => clearTimeout(timer);
      return () => clearTimeout(timer);
    }

    // Parsed once. These are the same curves the rest of the app animates on.
    const glide = gsap.parseEase('glide');
    const burn = gsap.parseEase('burn');
    const struck = gsap.parseEase('struck');

    const started = performance.now();
    let thudded = false;

    const id = window.setInterval(() => {
      const t = (performance.now() - started) / 1000;

      if (t >= SEQUENCE_SECONDS) {
        clearInterval(id);
        finish();
        return;
      }

      // A held beat, then the burn proper.
      const progress =
        t <= HANG_END
          ? glide(t / HANG_END) * 0.06
          : 0.06 + burn(Math.min(1, (t - HANG_END) / (BURN_END - HANG_END))) * 0.94;

      // One impact, over in two thirds of a second.
      let shake = 0;
      if (t >= SLAM_AT && t <= SLAM_AT + SLAM_FOR) {
        shake = struck((t - SLAM_AT) / SLAM_FOR);
        if (!thudded) {
          thudded = true;
          if (sound) thud();
        }
      }

      setState({ progress: Math.min(1, progress), shake, done: false });
    }, TICK_MS);

    halt.current = () => clearInterval(id);
    return () => clearInterval(id);
  }, [play, reduced, sound]);

  const skip = () => {
    halt.current?.();
    if (finished.current) return;
    finished.current = true;
    setState({ progress: 1, shake: 0, done: true });
    done.current?.();
  };

  return { ...state, skip, duration: SEQUENCE_SECONDS };
}
