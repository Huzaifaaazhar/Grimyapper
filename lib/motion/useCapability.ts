'use client';

/**
 * What this device can actually render, decided once.
 *
 * Three independent questions get asked here rather than at each call site,
 * because the answers have to agree: a machine that cannot do WebGL must also
 * not be handed a particle budget, and a reader who asked for reduced motion
 * must not get a shader even if their GPU would manage it happily.
 */

import { useEffect, useState } from 'react';

export type Capability = {
  /** WebGL2 is available and a context was actually obtained, not merely implied. */
  webgl: boolean;
  /** The reader asked for less motion. Overrides everything below it. */
  reduced: boolean;
  /** Coarse pointer and/or small viewport: budget accordingly. */
  mobile: boolean;
  /** How many particles this device gets. 0 when there is nothing to render on. */
  particles: number;
  /** Device pixel ratio range for the R3F canvas, capped per the brief. */
  dpr: [number, number];
  /** Settled: false on the very first render, before the checks have run. */
  ready: boolean;
};

const BLIND: Capability = {
  webgl: false,
  reduced: false,
  mobile: false,
  particles: 0,
  dpr: [1, 1.75],
  ready: false,
};

/**
 * Probing costs a context, so it is done once per page load and cached. Creating
 * and discarding WebGL contexts repeatedly is a reliable way to hit the
 * browser's context limit and have an unrelated canvas go blank later.
 */
let probed: boolean | null = null;

function probeWebGL(): boolean {
  if (probed !== null) return probed;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    probed = Boolean(gl);
    // Hand the context back immediately; we only wanted the answer.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return probed;
  } catch {
    probed = false;
    return false;
  }
}

export function useCapability(): Capability {
  const [cap, setCap] = useState<Capability>(BLIND);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');

    const resolve = () => {
      const reduced = motionQuery.matches;
      const mobile = coarseQuery.matches || window.innerWidth < 768;
      const webgl = reduced ? false : probeWebGL();

      setCap({
        webgl,
        reduced,
        mobile,
        // The brief's budget: 2-4k desktop, 600-1k mobile. These are ceilings;
        // PerformanceMonitor steps down from here at runtime.
        particles: !webgl ? 0 : mobile ? 800 : 3000,
        dpr: [1, mobile ? 1.5 : 1.75],
        ready: true,
      });
    };

    resolve();
    // Someone can turn reduced motion on without reloading, and a tablet can be
    // rotated across the mobile threshold.
    motionQuery.addEventListener('change', resolve);
    coarseQuery.addEventListener('change', resolve);
    return () => {
      motionQuery.removeEventListener('change', resolve);
      coarseQuery.removeEventListener('change', resolve);
    };
  }, []);

  return cap;
}
