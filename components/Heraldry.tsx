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
      viewBox="0 0 200 252"
      width={size}
      height={(size / 200) * 252}
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

      <ellipse cx="100" cy="122" rx="98" ry="122" fill={`url(#${glow})`} />

      {/*
       * Turned over for a sentence of death; upright for royal favour.
       *
       * The silhouette is doing all the work here, so it is built the way the
       * gesture actually reads: a thumb nearly as tall as the fist and set
       * outboard of it, a wrist narrower than both, and the finger divisions
       * confined to the right-hand side. Full-width bands on an even-width
       * body — the first attempt — made a barrel, not a hand.
       */}
      <g transform={verdict === 'down' ? 'rotate(180 100 126)' : undefined}>
        {/* the thumb, drawn first so the fist laps over its root */}
        <path
          d="M48 130 C41 98 45 52 60 32 C71 17 92 19 97 38 C102 57 99 100 99 130 Z"
          fill={`url(#${plate})`}
          stroke={edge}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* the joints it articulates on */}
        <path d="M46 98 C60 92 84 92 98 98" fill="none" stroke={lame} strokeWidth="2.4" />
        <path d="M49 64 C62 58 84 59 97 65" fill="none" stroke={lame} strokeWidth="2" />
        <path
          d="M58 38 C68 31 84 32 93 39"
          fill="none"
          stroke={shine}
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/*
         * The fist. Wider than it is tall and bulging along the knuckle side,
         * which is what separates a fist from the rounded box the first two
         * attempts produced.
         */}
        <path
          d="M44 140 C44 118 58 108 80 108 L142 108 C166 108 180 122 180 144
             C180 162 177 176 173 189 C167 202 156 211 140 211
             L74 211 C56 211 44 199 44 179 Z"
          fill={`url(#${plate})`}
          stroke={edge}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        {/* the crease where the thumb leaves the heel of the palm */}
        <path
          d="M52 148 C72 139 89 147 97 168"
          fill="none"
          stroke={lame}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* the curled fingers, stacked on the knuckle side only */}
        <path
          d="M106 148 C132 141 160 143 178 152"
          fill="none"
          stroke={lame}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M110 179 C134 172 157 174 173 183"
          fill="none"
          stroke={lame}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* light along the curled index, so the plate reads as convex */}
        <path
          d="M98 120 C126 113 154 116 175 130"
          fill="none"
          stroke={shine}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* the vambrace: distinctly narrower than the fist, flaring beyond it */}
        <path
          d="M70 208 L154 208 L166 239 Q166 251 151 251 L73 251 Q58 251 58 239 Z"
          fill={`url(#${cuff})`}
          stroke={edge}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M64 230 L160 230" stroke={lame} strokeWidth="2" />
        {/* rivets */}
        {[88, 112, 136].map((x) => (
          <circle key={x} cx={x} cy="220" r="3.2" fill={edge} opacity="0.6" />
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
