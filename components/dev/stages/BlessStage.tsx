'use client';

import { useEffect, useState } from 'react';

import { BlessingScene } from '@/components/three/BlessingScene';
import { Hall } from '@/components/three/Hall';
import type { Capability } from '@/lib/motion/useCapability';

/** The blessing, scrubbable. */
export function BlessStage({
  scrub,
  playing,
  cap,
}: {
  scrub: number;
  playing: boolean;
  cap: Capability;
}) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      setT(((performance.now() - start) / 3600) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  if (!cap.ready) return null;
  if (!cap.webgl) {
    return (
      <div className="grid h-full place-items-center text-xs tracking-[0.2em] text-[#d4af37] uppercase">
        no webgl — still fallback
      </div>
    );
  }

  return (
    <Hall cap={cap} className="h-full w-full">
      <BlessingScene progress={playing ? t : scrub} particles={cap.particles} />
    </Hall>
  );
}
