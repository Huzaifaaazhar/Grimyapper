'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Embers } from './Embers';
import { Candle, Scales } from './Heraldry';

/**
 * The court retires to deliberate.
 *
 * A confession about this component: the judgement it covers takes roughly a
 * third of a millisecond. The classifier is arithmetic in this process, so
 * there is nothing to wait for. The curtain exists because a sentence delivered
 * instantly reads as a form validating, not as a court ruling — so `Judge`
 * holds it open for a fixed span and the stages below are paced to fill it.
 *
 * That is theatre, and it is named as theatre rather than dressed up as
 * progress: no percentage is shown, and the rule at the foot is a quill drawing
 * a line, not a bar claiming to measure anything.
 */

const STAGES = [
  'Consulting the sovereign’s ledger…',
  'Weighing treasury against heresy…',
  'Inspecting for artificial intelligence…',
] as const;

/** Rotating under the stages, so a second look at the curtain is not the first. */
const MARGINALIA = [
  'A boy has been sent to the archive. He is not a fast boy.',
  'The assayer is sharpening his quill. This bodes ill.',
  'Three merchants attempted this in the year twenty-four. We are looking them up.',
  'The scribe has spilt ink upon the ledger. He is unharmed.',
  'The wax is warming.',
  'The almanac is consulted for the hour of thy ruin.',
];

export function CourtCurtain({ duration = 3600 }: { duration?: number }) {
  const [stage, setStage] = useState(0);
  const [aside, setAside] = useState(() => Math.floor(Math.random() * MARGINALIA.length));
  const still = useReducedMotion();

  useEffect(() => {
    const per = duration / STAGES.length;
    const timers = STAGES.map((_, i) => window.setTimeout(() => setStage(i), i * per));
    const rotate = window.setInterval(
      () => setAside((i) => (i + 1) % MARGINALIA.length),
      Math.max(1400, per),
    );
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(rotate);
    };
  }, [duration]);

  return (
    <motion.div
      className="hall quire fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: still ? 0 : 0.45 }}
      role="status"
      aria-live="polite"
      aria-label="The court deliberates"
    >
      <Embers tone="gilt" density={48} />

      {/* candle at the left hand, the balance at the centre — as the bench sits */}
      <div className="relative flex items-end gap-6 sm:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: still ? 0 : 0.7, delay: still ? 0 : 0.1 }}
        >
          <Candle size={104} className="sm:hidden" />
          <Candle size={150} className="hidden sm:block" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: still ? 0 : 0.8, delay: still ? 0 : 0.2 }}
        >
          <Scales size={168} className="sm:hidden" />
          <Scales size={250} className="hidden sm:block" />
        </motion.div>
      </div>

      {/* the stages, struck through as each is passed */}
      <ol className="relative mt-12 w-full max-w-md space-y-4 text-center">
        {STAGES.map((line, i) => (
          <li key={line}>
            <motion.p
              className="titling text-[0.72rem] leading-relaxed sm:text-sm"
              animate={{
                opacity: i < stage ? 0.32 : i === stage ? 1 : 0.14,
                color: i === stage ? '#f3d886' : '#d4af37',
              }}
              transition={{ duration: still ? 0 : 0.5 }}
            >
              {line}
            </motion.p>
          </li>
        ))}
      </ol>

      {/* the quill draws its line across the foot of the page */}
      <div className="relative mt-10 w-full max-w-md">
        <div className="h-px w-full bg-[rgba(212,175,55,0.18)]" />
        <motion.div
          className="absolute inset-y-0 left-0 h-px bg-[var(--color-gilt)]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: still ? 0 : duration / 1000, ease: 'linear' }}
        />
        {!still && (
          <motion.span
            aria-hidden
            className="absolute -top-5 text-lg text-[var(--color-gilt-lit)]"
            initial={{ left: '0%' }}
            animate={{ left: '100%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
          >
            ✒
          </motion.span>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={aside}
          className="relative mt-10 max-w-sm text-center text-base italic leading-relaxed text-[rgba(233,223,198,0.62)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0 : 0.4 }}
        >
          {MARGINALIA[aside]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}
