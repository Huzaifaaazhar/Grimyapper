'use client';

import { useEffect, useState } from 'react';

import { BAND_COLORS } from '@/lib/scoring';
import type { Band } from '@/lib/schemas';

const SIZE = 200;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
/** 240° of sweep, opening downward. */
const SWEEP = 240;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = (SWEEP / 360) * CIRCUMFERENCE;

export function ScoreDial({ score, band }: { score: number; band: Band }) {
  const [shown, setShown] = useState(0);
  const color = BAND_COLORS[band].hex;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(score);
      return;
    }
    const start = performance.now();
    const DURATION = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(score * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const filled = (Math.max(0, Math.min(100, shown)) / 100) * ARC_LENGTH;

  return (
    <figure className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE * 0.86 }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Success likelihood ${score} out of 100. Band: ${band}.`}
          style={{ transform: `rotate(${90 + (360 - SWEEP) / 2}deg)` }}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(236,229,216,0.10)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="tabular font-display text-6xl leading-none text-bone">{shown}</span>
          <span className="label-caps mt-1 text-bone-3">out of 100</span>
        </div>
      </div>
      <figcaption
        className="label-caps mt-1 inline-flex items-center gap-2 border px-3 py-1.5"
        style={{ color, borderColor: `${color}66` }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
        {band} likelihood
      </figcaption>
    </figure>
  );
}
