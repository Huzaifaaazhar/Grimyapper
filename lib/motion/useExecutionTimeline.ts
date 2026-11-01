'use client';

import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

import { registerEases } from './eases';
import { thud } from './thud';

/**
 * One master timeline per sequence, with labelled beats.
 *
 * The timeline owns *pacing* and nothing else: it writes two numbers, progress
 * and shake, into a state the scene reads. Keeping the staging out of here is
 * what lets the same sequence be scrubbed in the lab, played in the app, or
 * snapped to its final frame for reduced motion without three code paths.
 *
 * Returns the live values plus controls, so a caller can skip.
 */

export type SequenceState = { progress: number; shake: number; done: boolean };

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
  const tl = useRef<gsap.core.Timeline | null>(null);
  /*
   * onDone is held in a ref and deliberately kept out of the effect's deps.
   *
   * Callers pass it as an inline arrow, so its identity changes on every parent
   * render — and this hook re-renders its parent on every tick. With onDone in
   * the dependency array that is a loop: tick, re-render, new callback, effect
   * re-runs, timeline rebuilt from zero. The sequence restarts forever and the
   * burn never reaches its end, which is exactly how it showed up in the
   * recorded frames.
   */
  const done = useRef(onDone);
  done.current = onDone;
  // Mutated by the tweens, read once per tick: avoids a setState per property.
  const vals = useRef({ progress: 0, shake: 0 });
  const finished = useRef(false);

  useEffect(() => {
    if (!play) return;
    registerEases();

    if (reduced) {
      /*
       * No shaders burning, no shake, no particles — the caller drops those.
       * The sequence collapses to its final lit frame, held just long enough to
       * register as an event rather than a flicker.
       */
      setState({ progress: 1, shake: 0, done: false });
      const id = window.setTimeout(() => {
        setState({ progress: 1, shake: 0, done: true });
        done.current?.();
      }, 200);
      return () => clearTimeout(id);
    }

    finished.current = false;
    vals.current.progress = 0;
    vals.current.shake = 0;

    /*
     * Lag smoothing off for the duration of the sequence, and a wall-clock
     * backstop behind it.
     *
     * GSAP's default is lagSmoothing(500, 33): when a frame takes longer than
     * half a second it pretends only 33ms elapsed, so an animation never jumps
     * after a stall. That is the right default for a scroll-linked tween and
     * exactly wrong for a timed sequence — on a device that cannot keep up, the
     * timeline advances in 33ms steps per real half-second and a 2.9s sequence
     * takes twenty. Measured here at 23.4s under software rendering, against
     * 0.9s on the reduced-motion path.
     *
     * With smoothing off the timeline advances by real elapsed time: a slow
     * device sees a choppier sequence of the correct length, which is the right
     * trade for something the reader is waiting behind. The backstop then
     * guarantees an exit even if the ticker stops entirely — a backgrounded tab
     * suspends rAF, and nobody should return to a verdict page still showing
     * the curtain.
     */
    gsap.ticker.lagSmoothing(0);

    const timeline = gsap.timeline({
      onUpdate: () => {
        setState({ progress: vals.current.progress, shake: vals.current.shake, done: false });
      },
      onComplete: () => {
        if (finished.current) return;
        finished.current = true;
        setState({ progress: 1, shake: 0, done: true });
        done.current?.();
      },
    });

    timeline
      .addLabel('hang')
      // A held beat before anything happens. Without it the burn starts on the
      // same frame the curtain lifts and reads as a cut, not an event.
      .to(vals.current, { progress: 0.06, duration: 0.42, ease: 'glide' })

      .addLabel('catch')
      // Creeps, then runs: fire does not spread at a constant rate.
      .to(vals.current, { progress: 1, duration: 2.5, ease: 'burn' })

      .addLabel('slam', '-=1.05')
      // The impact: one recoil, six wiggles, gone in two thirds of a second.
      .to(
        vals.current,
        {
          shake: 1,
          duration: 0.62,
          ease: 'struck',
          onStart: () => {
            if (sound) thud();
          },
        },
        'slam',
      )
      .set(vals.current, { shake: 0 });

    tl.current = timeline;

    const backstop = window.setTimeout(
      () => {
        if (finished.current) return;
        finished.current = true;
        timeline.kill();
        setState({ progress: 1, shake: 0, done: true });
        done.current?.();
      },
      // The brief's cap for the overture. The timeline itself runs ~2.9s, so
      // on any device that keeps up this never fires; on one that does not, it
      // is what holds the sequence to its stated budget.
      4000,
    );

    return () => {
      clearTimeout(backstop);
      timeline.kill();
      tl.current = null;
      // Restore the default for anything else on the page that relies on it.
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [play, reduced, sound]);

  const skip = () => {
    if (finished.current) return;
    finished.current = true;
    tl.current?.kill();
    setState({ progress: 1, shake: 0, done: true });
    done.current?.();
  };

  return { ...state, skip, duration: 3.5 };
}
