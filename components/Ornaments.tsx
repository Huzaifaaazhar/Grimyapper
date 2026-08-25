'use client';

import { useId } from 'react';

/** Shared manuscript furniture: rules, fleurons, and the wax. */

export function Fleuron({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-[rgba(90,72,46,0.3)]" />
      <span className="text-vermilion text-base leading-none">❦</span>
      <span className="h-px flex-1 bg-[rgba(90,72,46,0.3)]" />
    </div>
  );
}

export function Lozenges({ className = '' }: { className?: string }) {
  return (
    <div
      className={`text-vermilion select-none text-center text-sm tracking-[0.7em] ${className}`}
      aria-hidden
    >
      ✠ ❧ ✠
    </div>
  );
}

/**
 * Sealing wax, drawn rather than styled.
 *
 * A CSS blob reads as a glossy button — wax is matte, poured, and never round.
 * So the disc is displaced by turbulence to get an edge that wanders, a spill
 * of overflow beneath it, and the signet impression is cut by two offset
 * strokes (dark above, light below) so the mark reads as pressed into the wax
 * rather than printed on top of it.
 */
export function WaxSeal({
  mark = 'G',
  size = 108,
  className = '',
  animate = false,
  tilt = -7,
}: {
  mark?: string;
  size?: number;
  className?: string;
  animate?: boolean;
  tilt?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const edge = `wax-edge-${uid}`;
  const body = `wax-body-${uid}`;
  const spill = `wax-spill-${uid}`;

  return (
    <span
      className={`inline-block shrink-0 ${animate ? 'press' : ''} ${className}`}
      style={{ width: size, height: size, transform: `rotate(${tilt}deg)` }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
        <defs>
          <filter id={edge} x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045"
              numOctaves="3"
              seed="9"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="9"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          <radialGradient id={body} cx="36%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#c4423a" />
            <stop offset="42%" stopColor="#9d2620" />
            <stop offset="78%" stopColor="#7c1a16" />
            <stop offset="100%" stopColor="#5e120f" />
          </radialGradient>

          <radialGradient id={spill} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6d1613" />
            <stop offset="100%" stopColor="#5e120f" />
          </radialGradient>
        </defs>

        {/* the wax that ran out from under the signet */}
        <g filter={`url(#${edge})`} opacity="0.85">
          <circle cx="50" cy="51" r="45" fill={`url(#${spill})`} />
        </g>

        {/* the body of the seal */}
        <g filter={`url(#${edge})`}>
          <circle cx="50" cy="50" r="42" fill={`url(#${body})`} />
        </g>

        {/* the pressed rim: dark on the upper edge, light on the lower */}
        <circle cx="50" cy="50.9" r="33" fill="none" stroke="#4a0d0b" strokeWidth="2.6" opacity="0.5" />
        <circle cx="50" cy="49.4" r="33" fill="none" stroke="#e08a7d" strokeWidth="1.2" opacity="0.3" />
        <circle cx="50" cy="50" r="28.5" fill="none" stroke="#4a0d0b" strokeWidth="1" opacity="0.32" />

        {/* the signet mark, cut into the wax */}
        <g
          fontFamily="var(--font-cinzel), Georgia, serif"
          fontSize="38"
          fontWeight="700"
          textAnchor="middle"
        >
          {/* light catching the lower lip of the recess */}
          <text x="50" y="63" fill="#f2b6a8" opacity="0.55">
            {mark}
          </text>
          {/* shadow gathering in the upper wall */}
          <text x="50" y="60.6" fill="#360706" opacity="0.8">
            {mark}
          </text>
          {/* the floor of the impression: darker than the wax around it */}
          <text x="50" y="61.8" fill="#6b1210">
            {mark}
          </text>
        </g>
      </svg>
    </span>
  );
}
