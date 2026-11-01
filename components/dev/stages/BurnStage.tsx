'use client';

import { ExecutionScene } from '@/components/three/ExecutionScene';
import { Hall } from '@/components/three/Hall';
import { useExecutionTimeline } from '@/lib/motion/useExecutionTimeline';
import type { Capability } from '@/lib/motion/useCapability';

/** The execution, scrubbable. */
export function BurnStage({
  scrub,
  playing,
  cap,
}: {
  scrub: number;
  playing: boolean;
  cap: Capability;
}) {
  const live = useExecutionTimeline({ play: playing, reduced: cap.reduced, sound: false });

  if (!cap.ready) return null;
  if (!cap.webgl) {
    return (
      <div className="grid h-full place-items-center text-xs tracking-[0.2em] text-[#d4af37] uppercase">
        no webgl — still fallback
      </div>
    );
  }

  const progress = playing ? live.progress : scrub;
  const shake = playing ? live.shake : 0;

  return (
    <Hall cap={cap} className="h-full w-full">
      <ExecutionScene progress={progress} shake={shake} particles={cap.particles} />
    </Hall>
  );
}
