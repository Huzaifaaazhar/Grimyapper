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
  onReady,
}: {
  verdict: 'rejected' | 'blessed';
  progress: number;
  shake: number;
  cap: Capability;
  /** Raised once the scene has compiled and drawn. The clock waits for it. */
  onReady?: () => void;
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
  /*
   * Postprocessing starts off on a coarse pointer rather than waiting for
   * PerformanceMonitor to notice. God rays and bloom together are the heaviest
   * thing in either scene, and stepping down after the fact means the first
   * second of the sequence — the part nobody can skip — is the worst one.
   */
  const effects = quality === 'high' && !cap.mobile;

  return (
    <Hall cap={cap} onQuality={setQuality} onReady={onReady} className="absolute inset-0">
      {verdict === 'rejected' ? (
        <ExecutionScene progress={progress} shake={shake} particles={particles} />
      ) : (
        <BlessingScene progress={progress} particles={particles} effects={effects} />
      )}
    </Hall>
  );
}
