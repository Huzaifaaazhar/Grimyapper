'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState, type ReactNode } from 'react';

import type { Capability } from '@/lib/motion/useCapability';

/**
 * The one WebGL canvas in the app.
 *
 * Mounted only while a sequence is on screen, never on the idle form, so the
 * three.js bundle and a GL context are costs paid by people who actually reach
 * a verdict. Everything inside it is reached through a dynamic import at the
 * call site, which is what keeps it out of the initial chunk.
 *
 * `quality` falls as PerformanceMonitor reports a declining framerate, and
 * every consumer of the scene reads it to shed work: fewer particles, then
 * postprocessing off. Stepping down is done in discrete notches rather than
 * continuously, because a particle count that drifts every frame produces
 * visible popping of its own.
 */
export type Quality = 'high' | 'medium' | 'low';

export function Hall({
  cap,
  children,
  onQuality,
  className = '',
}: {
  cap: Capability;
  children: ReactNode;
  onQuality?: (q: Quality) => void;
  className?: string;
}) {
  const [quality, setQuality] = useState<Quality>('high');

  const step = (next: Quality) => {
    setQuality((prev) => {
      if (prev === next) return prev;
      onQuality?.(next);
      return next;
    });
  };

  return (
    <Canvas
      className={className}
      // Capped per the brief. A retina phone at native DPR renders 9x the
      // fragments of a 1x one for a flame nobody is inspecting pixel by pixel.
      dpr={cap.dpr}
      gl={{
        antialias: false, // postprocessing does its own AA; MSAA here is wasted
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      camera={{ position: [0, 0, 3.2], fov: 42, near: 0.1, far: 24 }}
      shadows="soft"
      // Linear workflow, so the additive flame and the bloom behave.
      flat={false}
      frameloop="always"
    >
      <PerformanceMonitor
        // Sampled over ~200ms windows; two bad windows in a row steps down.
        ms={200}
        iterations={6}
        // Below ~0.6 of the refresh rate we are missing frames badly enough to act.
        bounds={(refreshRate) => (refreshRate > 90 ? [50, 90] : [45, 60])}
        onDecline={() => step(quality === 'high' ? 'medium' : 'low')}
        onIncline={() => step(quality === 'low' ? 'medium' : 'high')}
        // Hard fallback: the device cannot keep up at all.
        onFallback={() => step('low')}
        flipflops={3}
      >
        {children}
      </PerformanceMonitor>
    </Canvas>
  );
}
