'use client';

import { useEffect, useState } from 'react';

import { BAND_COLORS } from '@/lib/scoring';
import type { Band } from '@/lib/schemas';

const SIZE = 212;
const STROKE = 13;
const RADIUS = (SIZE - STROKE) / 2 - 10;
const SWEEP = 240;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC = (SWEEP / 360) * CIRCUMFERENCE;
const ROTATION = 90 + (360 - SWEEP) / 2;

/** Graduations, as on the limb of an astrolabe. */
const TICKS = Array.from({ length: 11 }, (_, i) => i * 10);

export function ScoreDial({ score, band }: { score: number; band: Band }) {
  const [shown, setShown] = useState(0);
  const { hex: color, label } = BAND_COLORS[band];

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(score);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1000);
      setShown(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const filled = (Math.max(0, Math.min(100, shown)) / 100) * ARC;

  return (
    <figure className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE * 0.88 }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Likelihood of success: ${score} of one hundred. Judged ${label}.`}
        >
          <g style={{ transform: `rotate(${ROTATION}deg)`, transformOrigin: 'center' }}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="rgba(90,72,46,0.22)"
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            />
            {/* the ruled limb */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS + STROKE / 2 + 1}
              fill="none"
              stroke="rgba(42,30,18,0.55)"
              strokeWidth={1}
              strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS - STROKE / 2 - 1}
              fill="none"
              stroke="rgba(42,30,18,0.55)"
              strokeWidth={1}
              strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
            />
          </g>

          {TICKS.map((t) => {
            const angle = ((ROTATION + (t / 100) * SWEEP) * Math.PI) / 180;
            const outer = RADIUS + STROKE / 2 + 8;
            const inner = RADIUS + STROKE / 2 + 2;
            const cx = SIZE / 2;
            const cy = SIZE / 2;
            const major = t % 50 === 0;
            return (
              <line
                key={t}
                x1={cx + Math.cos(angle) * inner}
                y1={cy + Math.sin(angle) * inner}
                x2={cx + Math.cos(angle) * (major ? outer + 3 : outer)}
                y2={cy + Math.sin(angle) * (major ? outer + 3 : outer)}
                stroke="rgba(42,30,18,0.6)"
                strokeWidth={major ? 1.6 : 1}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
          <span className="lining blackletter text-6xl leading-none text-ink">{shown}</span>
          <span className="titling mt-2 text-[0.6rem] text-ink-faint">of one hundred</span>
        </div>
      </div>

      <figcaption
        className="titling mt-1 inline-flex items-center gap-2.5 border-2 px-4 py-1.5 text-[0.66rem]"
        style={{ color, borderColor: color }}
      >
        <span
          className="inline-block h-2 w-2 rotate-45"
          style={{ background: color }}
          aria-hidden
        />
        {label}
      </figcaption>
    </figure>
  );
}
