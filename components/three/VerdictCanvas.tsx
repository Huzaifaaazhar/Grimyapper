'use client';

import { useState } from 'react';

import { BlessingScene } from '@/components/three/BlessingScene';
import { ExecutionScene } from '@/components/three/ExecutionScene';
import { Hall, type Quality } from '@/components/three/Hall';
import type { Capability } from '@/lib/motion/useCapability';

/**
 * The verdict's 3D layer, behind one dynamic import.
 *
 * Nothing above this file imports three.js, which is the whole point: the
 * petition form, the dossier and the charter all render without the renderer
 * ever being fetched. It arrives when a sequence starts and goes when the
 * sequence ends, taking its GL context with it.
 */
export function VerdictCanvas({
  verdict,
  progress,
  shake,
  cap,
}: {
  verdict: 'rejected' | 'blessed';
  progress: number;
  shake: number;
  cap: Capability;
}) {
  const [quality, setQuality] = useState<Quality>('high');

  /*
   * The step-down ladder. Particles go first because they are the cheapest
   * thing to lose and the most expensive to draw; postprocessing goes second
   * because without it the scene is dimmer but still correct. The shaders stay
   * to the end — losing them would leave nothing recognisable.
   */
  const particles =
    quality === 'high' ? cap.particles : quality === 'medium' ? Math.round(cap.particles * 0.4) : 0;
  const effects = quality === 'high';

  return (
    <Hall cap={cap} onQuality={setQuality} className="absolute inset-0">
      {verdict === 'rejected' ? (
        <ExecutionScene progress={progress} shake={shake} particles={particles} />
      ) : (
        <BlessingScene progress={progress} particles={particles} effects={effects} />
      )}
    </Hall>
  );
}
