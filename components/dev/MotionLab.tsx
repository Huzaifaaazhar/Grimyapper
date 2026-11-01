'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { EASES, registerEases } from '@/lib/motion/eases';
import { useCapability } from '@/lib/motion/useCapability';

/**
 * The motion bench.
 *
 * Each beat is mounted alone so it can be watched without the rest of the
 * sequence around it, and `scrub` drives the beat's progress directly rather
 * than letting it play — which is the only practical way to look hard at a
 * single frame of something that is over in 600ms.
 */

const FlameStage = dynamic(() => import('./stages/FlameStage').then((m) => m.FlameStage), {
  ssr: false,
  loading: () => <Loading label="flame" />,
});

function Loading({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center text-xs tracking-[0.2em] text-[#d4af37] uppercase">
      loading {label}…
    </div>
  );
}

const BEATS = [{ id: 'flame', label: 'Flame + candlelight', Stage: FlameStage }] as const;

export function MotionLab() {
  const [beat, setBeat] = useState<string>('flame');
  const [scrub, setScrub] = useState(0);
  const [playing, setPlaying] = useState(true);
  const cap = useCapability();

  // In an effect, not in render: registration touches the DOM and must not run
  // during the server pass.
  useEffect(() => registerEases(), []);

  const current = BEATS.find((b) => b.id === beat) ?? BEATS[0];
  const Stage = current.Stage;

  return (
    <main className="min-h-dvh bg-[#14100a] text-[#e9dfc6]">
      <header className="flex flex-wrap items-center gap-4 border-b border-[rgba(212,175,55,0.3)] px-5 py-3">
        <h1 className="text-sm tracking-[0.22em] text-[#d4af37] uppercase">Motion lab</h1>
        <select
          value={beat}
          onChange={(e) => setBeat(e.target.value)}
          className="border border-[rgba(212,175,55,0.4)] bg-transparent px-2 py-1 text-xs"
        >
          {BEATS.map((b) => (
            <option key={b.id} value={b.id} className="bg-[#14100a]">
              {b.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="border border-[rgba(212,175,55,0.4)] px-3 py-1 text-xs"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <label className="flex flex-1 items-center gap-3 text-xs">
          <span className="tabular-nums opacity-70">{scrub.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={scrub}
            onChange={(e) => {
              setPlaying(false);
              setScrub(Number(e.target.value));
            }}
            className="flex-1 accent-[#d4af37]"
          />
        </label>
        <span className="text-[10px] opacity-60">
          webgl {String(cap.webgl)} · {cap.particles}p · dpr {cap.dpr[1]}
        </span>
      </header>

      <div className="h-[calc(100dvh-3.25rem)]">
        <Stage scrub={scrub} playing={playing} cap={cap} />
      </div>

      <footer className="pointer-events-none fixed bottom-2 left-5 text-[10px] tracking-[0.18em] text-[rgba(233,223,198,0.35)] uppercase">
        eases: {EASES.join(' · ')}
      </footer>
    </main>
  );
}
