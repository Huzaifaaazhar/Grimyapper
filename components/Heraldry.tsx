'use client';

import { useId } from 'react';

/**
 * The court's furniture, drawn rather than photographed.
 *
 * Everything here is vector: it scales to a phone or a 4K display without a
 * second asset, weighs a few hundred bytes gzipped and inherits the palette.
 * Gradient and filter ids are per-instance via `useId`, because two of these on
 * one page sharing an id would silently take each other's fills.
 *
 * The gauntlet used to live here. It is gone: the verdict is now carried by
 * what happens to the document rather than by a hand pointing at it, so there
 * is nothing for it to say. See components/three/ExecutionScene.tsx.
 */

/**
 * A tallow candle, the only clock a night court has.
 *
 * The flame is animated in CSS rather than SMIL so `prefers-reduced-motion` can
 * switch it off with the same rule that stops everything else.
 */
export function Candle({ size = 150, className = '' }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const wax = `wax-${uid}`;
  const halo = `halo-${uid}`;
  const fire = `fire-${uid}`;

  return (
    <svg
      viewBox="0 0 120 220"
      width={size}
      height={(size / 120) * 220}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={wax} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8a7346" />
          <stop offset="26%" stopColor="#efe6cb" />
          <stop offset="62%" stopColor="#d8caa4" />
          <stop offset="100%" stopColor="#7d6740" />
        </linearGradient>
        <radialGradient id={halo} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd479" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#e8a33c" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#e8a33c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={fire} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#c2410c" />
          <stop offset="38%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="46" r="58" fill={`url(#${halo})`} />

      {/* the body, with wax run down one side */}
      <path
        d="M44 74 L76 74 L78 200 Q78 208 70 208 L50 208 Q42 208 42 200 Z"
        fill={`url(#${wax})`}
      />
      <path d="M45 78 Q41 104 46 122 Q50 106 48 80 Z" fill="#f5eeda" opacity="0.75" />
      <ellipse cx="60" cy="74" rx="17" ry="5" fill="#f7f1de" />
      <path d="M52 66 L54 74 L66 74 L68 68 Q60 62 52 66 Z" fill="#efe6cb" opacity="0.85" />

      {/* the wick */}
      <path d="M60 66 L60 56" stroke="#3a2f1e" strokeWidth="2.6" strokeLinecap="round" />

      <g className="candle-flame" style={{ transformOrigin: '60px 58px' }}>
        <path d="M60 12 C74 32 72 46 60 58 C48 46 46 32 60 12 Z" fill={`url(#${fire})`} />
        <path d="M60 30 C66 40 65 48 60 55 C55 48 54 40 60 30 Z" fill="#fffbeb" opacity="0.85" />
      </g>
    </svg>
  );
}

/**
 * The balance. It never comes to rest, which is the point: the court is still
 * weighing while you watch it.
 */
export function Scales({ size = 190, className = '' }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const brass = `brass-${uid}`;

  return (
    <svg
      viewBox="0 0 220 190"
      width={size}
      height={(size / 220) * 190}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={brass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbeec2" />
          <stop offset="38%" stopColor="#d4af37" />
          <stop offset="74%" stopColor="#9a7118" />
          <stop offset="100%" stopColor="#6b4c0c" />
        </linearGradient>
      </defs>

      <g fill={`url(#${brass})`} stroke="#5a3f08" strokeWidth="1.6">
        {/* base and post */}
        <path d="M74 176 L146 176 Q152 176 152 182 L68 182 Q68 176 74 176 Z" />
        <rect x="103" y="46" width="14" height="132" rx="4" />
        <circle cx="110" cy="38" r="9" />

        <g className="balance-beam" style={{ transformOrigin: '110px 52px' }}>
          {/* the beam */}
          <rect x="26" y="47" width="168" height="9" rx="4.5" />
          {/* chains */}
          <g stroke="#8a6412" strokeWidth="2" fill="none">
            <path d="M40 56 L34 96 M40 56 L46 96" />
            <path d="M180 56 L174 96 M180 56 L186 96" />
          </g>
          {/* pans */}
          <path d="M14 96 L66 96 Q60 122 40 122 Q20 122 14 96 Z" />
          <path d="M154 96 L206 96 Q200 122 180 122 Q160 122 154 96 Z" />
        </g>
      </g>
    </svg>
  );
}
