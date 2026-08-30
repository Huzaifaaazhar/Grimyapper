'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { Embers } from './Embers';
import { Gauntlet } from './Heraldry';
import { WaxSeal } from './Ornaments';

/**
 * The sentence, delivered before the document that records it.
 *
 * The overture is a curtain over the whole viewport that runs once and then
 * dismisses itself. It is skippable at any moment — by click, by Escape, or by
 * waiting — because a person on their fourth petition should not be made to sit
 * through it a fourth time.
 *
 * Under `prefers-reduced-motion` the whole thing collapses to a still frame
 * held briefly: the gauntlet and the words are the content, the shaking and the
 * flash are decoration, and only the decoration is dropped.
 */

type Verdict = 'rejected' | 'blessed';

const COPY: Record<Verdict, { kicker: string; title: string; line: string; seal: string }> = {
  rejected: {
    kicker: 'His Majesty turns his thumb',
    title: 'Execution',
    line: 'This venture is found lacking in the divine spark of artifice, and is banisht.',
    seal: 'Condemned',
  },
  blessed: {
    kicker: 'His Majesty raises his thumb',
    title: 'Royal favour',
    line: 'This venture is wrought with thinking engines, and shall be assayed in full.',
    seal: 'Blessed',
  },
};

export function VerdictOverture({
  verdict,
  onDone,
  hold = 2900,
}: {
  verdict: Verdict;
  onDone: () => void;
  hold?: number;
}) {
  const still = useReducedMotion();
  const [open, setOpen] = useState(true);
  const dismissed = useRef(false);
  const copy = COPY[verdict];

  /*
   * One dismissal path, however it was triggered. Without the ref, a click
   * landing in the same tick as the timer would call `onDone` twice and the
   * caller would advance two phases.
   */
  useEffect(() => {
    const finish = () => {
      if (dismissed.current) return;
      dismissed.current = true;
      setOpen(false);
      // Long enough for the exit transition, short enough not to feel stuck.
      window.setTimeout(onDone, still ? 0 : 420);
    };

    const timer = window.setTimeout(finish, still ? 1100 : hold);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', finish);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', finish);
    };
  }, [hold, onDone, still]);

  const crimson = verdict === 'rejected';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="hall fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0 : 0.35 }}
          role="alertdialog"
          aria-label={`${copy.title}. ${copy.line}`}
        >
          <Embers tone={crimson ? 'ember' : 'gilt'} density={crimson ? 78 : 56} />

          {/* the flash: crimson for a sentence of death, gold for favour */}
          {!still && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: crimson
                  ? 'radial-gradient(ellipse at 50% 45%, rgba(196,66,58,0.62), rgba(94,18,15,0.5) 55%, transparent 78%)'
                  : 'radial-gradient(ellipse at 50% 45%, rgba(255,236,170,0.7), rgba(212,175,55,0.34) 52%, transparent 76%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.24, 0.4] }}
              transition={{ duration: 1.5, times: [0, 0.12, 0.4, 1], delay: 0.55 }}
            />
          )}

          {/* the rays behind a blessing, which a condemnation does not get */}
          {!crimson && !still && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,232,160,0.14) 0deg 5deg, transparent 5deg 13deg)',
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 0.9, rotate: 22 }}
              transition={{ duration: 7, ease: 'linear', delay: 0.5 }}
            />
          )}

          <div
            className={`relative flex flex-col items-center text-center ${
              crimson && !still ? 'struck' : ''
            }`}
            style={crimson && !still ? { animationDelay: '0.58s' } : undefined}
          >
            <motion.div
              // The hand comes down from above, and lands hard.
              initial={{ opacity: 0, y: still ? 0 : -160, scale: still ? 1 : 0.72 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={
                still
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 180, damping: 13, mass: 1.1, delay: 0.15 }
              }
            >
              <Gauntlet verdict={crimson ? 'down' : 'up'} size={190} className="sm:hidden" />
              <Gauntlet verdict={crimson ? 'down' : 'up'} size={250} className="hidden sm:block" />
            </motion.div>

            <motion.p
              className="titling mt-8 text-[0.66rem] sm:text-xs"
              style={{ color: crimson ? '#e08a7d' : '#f3d886' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: still ? 0 : 0.85, duration: still ? 0 : 0.5 }}
            >
              {copy.kicker}
            </motion.p>

            <motion.h2
              className="blackletter mt-3 text-5xl leading-none sm:text-7xl"
              style={{ color: crimson ? '#e8b4aa' : '#f7e6b4' }}
              initial={{ opacity: 0, scale: still ? 1 : 1.25 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: still ? 0 : 0.85, duration: still ? 0 : 0.55 }}
            >
              {copy.title}
            </motion.h2>

            <motion.p
              className="mt-5 max-w-md text-lg italic leading-snug text-[rgba(233,223,198,0.78)] sm:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: still ? 0 : 1.15, duration: still ? 0 : 0.5 }}
            >
              {copy.line}
            </motion.p>

            {/* the wax comes down onto the sentence */}
            <motion.div
              className="relative mt-9"
              initial={{ opacity: 0, scale: still ? 1 : 2.6, rotate: still ? -7 : -30 }}
              animate={{ opacity: 1, scale: 1, rotate: -7 }}
              transition={
                still
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 320, damping: 15, delay: 1.35 }
              }
            >
              <WaxSeal mark={crimson ? 'X' : 'G'} size={86} tilt={0} />
              <p
                className="titling mt-3 text-[0.6rem]"
                style={{ color: crimson ? '#e08a7d' : '#f3d886' }}
              >
                {copy.seal}
              </p>
            </motion.div>

            <motion.p
              className="titling mt-10 text-[0.58rem] text-[rgba(233,223,198,0.4)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: still ? 0 : 1.9, duration: 0.6 }}
            >
              Touch anywhere to read the decree
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
