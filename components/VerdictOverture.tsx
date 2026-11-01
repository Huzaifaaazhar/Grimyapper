'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useCapability } from '@/lib/motion/useCapability';
import { useExecutionTimeline } from '@/lib/motion/useExecutionTimeline';
import { enableSound, soundEnabled } from '@/lib/motion/thud';

/**
 * The sentence, delivered before the document that records it.
 *
 * There is no gauntlet any more. A cartoon hand pointing up or down is a label
 * stuck on the verdict; the document's own fate *is* the verdict, so an
 * execution burns the warrant and a blessing gilds the charter.
 *
 * The 3D is behind a dynamic import and only mounts once a sequence actually
 * starts, so three.js, the shaders and a GL context are costs paid by people
 * who reached a verdict rather than by everyone who loaded the form.
 *
 * Skippable from 0.8s by click, Escape, Enter or space. Anyone on their fourth
 * petition should not be made to sit through a fourth ceremony.
 */

const VerdictCanvas = dynamic(
  () => import('@/components/three/VerdictCanvas').then((m) => m.VerdictCanvas),
  { ssr: false, loading: () => null },
);

type Verdict = 'rejected' | 'blessed';

const COPY: Record<Verdict, { kicker: string; title: string; line: string }> = {
  rejected: {
    kicker: 'The court commits it to the fire',
    title: 'Execution',
    line: 'This venture is found lacking in the divine spark of artifice, and is banisht.',
  },
  blessed: {
    kicker: 'The court sets its gold upon it',
    title: 'Royal favour',
    line: 'This venture is wrought with thinking engines, and shall be assayed in full.',
  },
};

export function VerdictOverture({
  verdict,
  onDone,
}: {
  verdict: Verdict;
  onDone: () => void;
}) {
  const cap = useCapability();
  const [open, setOpen] = useState(true);
  const [skippable, setSkippable] = useState(false);
  const [lit, setLit] = useState(false);
  const dismissed = useRef(false);
  const copy = COPY[verdict];

  /*
   * The clock does not start until the scene can draw.
   *
   * Measured in the page: a blessing's median frame is 16.7ms and its first
   * one is 2731ms, because every shader in the scene compiles at the moment
   * the sequence begins. Since the timeline is wall-clock driven, that stall
   * does not stretch the sequence — it eats it, and the ceremony is over
   * before a second frame is drawn.
   *
   * So the title and the line are shown immediately, which is the part worth
   * reading anyway, and the 0–1 that drives the scene is held at zero until
   * `Warm` reports a drawn frame behind them.
   */
  const ready = !cap.webgl || cap.reduced || lit;

  /*
   * And a watchdog, because a scene that never reports — a lost context, a
   * driver that refuses a shader — must not leave the reader staring at a
   * takeover with no way out but the Skip control.
   *
   * Five seconds, which is far longer than it sounds. On any real GPU `Warm`
   * reports in a few hundred milliseconds and this timer is never reached, so
   * the only readers who wait are ones whose renderer is in trouble — and for
   * them the alternative is not a faster sequence, it is a sequence that plays
   * entirely inside a single stalled frame. The Skip control is already up at
   * 0.8s regardless, so nobody is held here against their will.
   */
  useEffect(() => {
    if (lit) return;
    const id = window.setTimeout(() => setLit(true), 5000);
    return () => clearTimeout(id);
  }, [lit]);

  const finish = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    setOpen(false);
    window.setTimeout(onDone, cap.reduced ? 0 : 380);
  }, [onDone, cap.reduced]);

  const timeline = useExecutionTimeline({
    play: cap.ready && ready,
    reduced: cap.reduced,
    sound: soundEnabled(),
    onDone: finish,
  });

  // The skip control appears after 0.8s, per the brief: early enough to escape,
  // late enough not to invite skipping before anything has happened.
  useEffect(() => {
    const id = window.setTimeout(() => setSkippable(true), 800);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        timeline.skip();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timeline, finish]);

  if (!open) return null;

  const crimson = verdict === 'rejected';

  return (
    <div
      className="hall fixed inset-0 z-50 flex flex-col overflow-hidden"
      role="alertdialog"
      aria-label={`${copy.title}. ${copy.line}`}
      style={{
        opacity: open ? 1 : 0,
        transition: cap.reduced ? 'none' : 'opacity 380ms ease',
      }}
    >
      {/*
       * The scene. Absent entirely without WebGL or under reduced motion — the
       * fallback below is the final lit frame as flat CSS, which is what those
       * readers get instead of a degraded animation.
       */}
      {/*
       * The scene takes the upper three fifths and the words the lower two.
       * Full-bleed, they collided: the subject of both sits at the centre of
       * the frame, so the title landed on top of the burning leaf.
       */}
      <div className="relative min-h-0 flex-[3]">
        {cap.webgl && !cap.reduced && (
          <VerdictCanvas
            verdict={verdict}
            progress={timeline.progress}
            shake={timeline.shake}
            cap={cap}
            onReady={() => setLit(true)}
          />
        )}
        {/* Scrim, so embers drifting down never sit behind the first line. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: 'linear-gradient(to bottom, transparent, #14100a)' }}
        />
      </div>

      {!cap.webgl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: crimson
              ? 'radial-gradient(ellipse at 50% 46%, rgba(196,66,58,0.5), rgba(94,18,15,0.42) 52%, transparent 76%)'
              : 'radial-gradient(ellipse at 50% 46%, rgba(255,236,170,0.55), rgba(212,175,55,0.3) 50%, transparent 74%)',
          }}
        />
      )}

      <div className="relative z-10 flex flex-[2] flex-col items-center justify-start px-6 pb-8 text-center">
        <p
          className="titling text-[0.66rem] sm:text-xs"
          style={{ color: crimson ? '#e08a7d' : '#f3d886' }}
        >
          {copy.kicker}
        </p>

        <h2
          className="blackletter mt-3 text-5xl leading-none sm:text-7xl"
          style={{ color: crimson ? '#e8b4aa' : '#f7e6b4' }}
        >
          {copy.title}
        </h2>

        <p className="mt-5 max-w-md text-lg leading-snug text-[rgba(233,223,198,0.78)] italic sm:text-xl">
          {copy.line}
        </p>

        {skippable && (
          <button
            type="button"
            onClick={() => {
              // A real gesture: the only place sound is ever armed.
              enableSound();
              timeline.skip();
              finish();
            }}
            className="titling mt-12 border border-[rgba(233,223,198,0.3)] px-6 py-2.5 text-[0.58rem] text-[rgba(233,223,198,0.55)] transition-colors hover:border-[rgba(233,223,198,0.6)] hover:text-[rgba(233,223,198,0.9)]"
          >
            Skip · read the decree
          </button>
        )}
      </div>
    </div>
  );
}
