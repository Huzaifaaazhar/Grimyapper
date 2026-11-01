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
        onDone?.();
      }, 200);
      return () => clearTimeout(id);
    }

    finished.current = false;
    vals.current.progress = 0;
    vals.current.shake = 0;

    const timeline = gsap.timeline({
      onUpdate: () => {
        setState({ progress: vals.current.progress, shake: vals.current.shake, done: false });
      },
      onComplete: () => {
        if (finished.current) return;
        finished.current = true;
        setState({ progress: 1, shake: 0, done: true });
        onDone?.();
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
    return () => {
      timeline.kill();
      tl.current = null;
    };
  }, [play, reduced, sound, onDone]);

  const skip = () => {
    if (finished.current) return;
    finished.current = true;
    tl.current?.kill();
    setState({ progress: 1, shake: 0, done: true });
    onDone?.();
  };

  return { ...state, skip, duration: 3.5 };
}
