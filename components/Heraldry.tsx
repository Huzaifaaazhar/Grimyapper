'use client';

import { useId } from 'react';

/**
 * The court's furniture, drawn rather than photographed.
 *
 * Everything here is vector: it scales to a phone or a 4K display without a
 * second asset, weighs a few hundred bytes gzipped, inherits the palette, and —
 * unlike a raster of a gauntlet — can be recoloured for the verdict it is
 * delivering. Gradient and filter ids are per-instance via `useId`, because two
 * of these on one page sharing an id would silently take each other's fills.
 */

const STEEL_STOPS = [
  ['0%', '#f0ece2'],
  ['22%', '#c9c3b6'],
  ['48%', '#8e887c'],
  ['72%', '#5d584f'],
  ['100%', '#3a3630'],
] as const;

const GILT_STOPS = [
  ['0%', '#fbeec2'],
  ['22%', '#f0d787'],
  ['48%', '#d4af37'],
  ['72%', '#a87d1c'],
  ['100%', '#6b4c0c'],
] as const;

/**
 * The royal gauntlet, delivering a sentence.
 *
 * One drawing serves both verdicts. A thumbs-down is not a mirrored thumbs-up,
 * it is the same hand turned over — so the whole group rotates 180°, which is
 * both the cheaper implementation and the anatomically correct one.
 */
export function Gauntlet({
  verdict,
  size = 260,
  className = '',
}: {
  verdict: 'up' | 'down';
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const plate = `plate-${uid}`;
  const cuff = `cuff-${uid}`;
  const glow = `glow-${uid}`;
  const stops = verdict === 'up' ? GILT_STOPS : STEEL_STOPS;
  const edge = verdict === 'up' ? '#5a3f08' : '#211e1a';
  const lame = verdict === 'up' ? 'rgba(90,64,10,0.55)' : 'rgba(24,22,19,0.55)';
  const shine = verdict === 'up' ? 'rgba(255,246,214,0.6)' : 'rgba(255,255,255,0.5)';

  return (
    <svg
      viewBox="0 0 230 226"
      width={size}
      height={(size / 230) * 226}
      className={className}
      role="img"
      aria-label={
        verdict === 'up'
          ? 'The royal gauntlet raises its thumb in favour'
          : 'The royal gauntlet turns its thumb down'
      }
    >
      <defs>
        <linearGradient id={plate} x1="12%" y1="0%" x2="88%" y2="100%">
          {stops.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={cuff} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={stops[3][1]} />
          <stop offset="34%" stopColor={stops[1][1]} />
          <stop offset="66%" stopColor={stops[2][1]} />
          <stop offset="100%" stopColor={stops[4][1]} />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor={verdict === 'up' ? '#ffe9a8' : '#c4423a'} stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="115" cy="113" rx="115" ry="113" fill={`url(#${glow})`} />

      {/*
       * Turned over for a sentence of death; upright for royal favour.
       *
       * Proportion is the whole problem here, and two earlier attempts got it
       * wrong in the same direction: a thumb drawn TALLER than the fist, rising
       * from a narrow pedestal cuff, does not read as a hand at all — it reads
       * as a shaft on a base, which is exactly what it looked like.
       *
       * What actually makes the gesture legible:
       *   - the fist dominates; the thumb is roughly half its height and stubby,
       *   - the four fingers are drawn SEPARATELY so the far edge is scalloped,
       *     which is the single strongest "this is a hand" cue in the silhouette,
       *   - the thumb tilts rather than standing perfectly vertical, and carries
       *     a nail at the tip,
       *   - the bracer is WIDER than the fist, so the wrist reads as a forearm
       *     rather than a stem holding something up.
       */}
      <g transform={verdict === 'down' ? 'rotate(180 115 113)' : undefined}>
        {/* the heel of the palm, behind everything */}
        <path
          d="M112 92 L86 92 C64 92 50 105 50 125 L50 156 C50 176 64 188 86 188 L112 188 Z"
          fill={`url(#${plate})`}
          stroke={edge}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        {/*
         * The four curled fingers, each its own plate. Their differing reach is
         * what scallops the knuckle edge — index furthest, little finger least.
         */}
        {[
          { y: 84, w: 104 },
          { y: 110, w: 110 },
          { y: 136, w: 103 },
          { y: 162, w: 92 },
        ].map(({ y, w }) => (
          <rect
            key={y}
            x="96"
            y={y}
            width={w}
            height="26"
            rx="13"
            fill={`url(#${plate})`}
            stroke={edge}
            strokeWidth="2.4"
          />
        ))}

        {/* light along the index plate, so the steel reads as convex */}
        <path
          d="M112 92 C142 87 172 89 192 96"
          fill="none"
          stroke={shine}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/*
         * The thumb: about half the fist's height, thick, and tilted. Drawn last
         * so it laps over the palm, with the web crease cut beneath it.
         */}
        <g transform="rotate(-9 70 100)">
          <path
            d="M50 104 C43 82 47 52 62 42 C75 33 93 39 94 57 C95 73 89 88 89 104 Z"
            fill={`url(#${plate})`}
            stroke={edge}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {/* the knuckle it bends on */}
          <path d="M49 78 C62 72 79 73 90 78" fill="none" stroke={lame} strokeWidth="2.4" />
          {/* the nail: the cue that settles it as a thumb and not a digit */}
          <path
            d="M58 56 C64 48 80 48 86 57 C80 66 64 66 58 56 Z"
            fill="none"
            stroke={lame}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </g>

        {/* the web between thumb and index */}
        <path
          d="M56 106 C74 98 88 104 96 118"
          fill="none"
          stroke={lame}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* the bracer: wider than the fist, so the wrist reads as a forearm */}
        <path
          d="M44 186 L196 186 L204 214 Q204 224 192 224 L48 224 Q36 224 36 214 Z"
          fill={`url(#${cuff})`}
          stroke={edge}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M42 206 L198 206" stroke={lame} strokeWidth="2" />
        {[70, 105, 140, 175].map((x) => (
          <circle key={x} cx={x} cy="196" r="3.2" fill={edge} opacity="0.6" />
        ))}
      </g>
    </svg>
  );
}

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
