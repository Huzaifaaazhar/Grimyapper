'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

/**
 * Reports when the scene can actually draw.
 *
 * This exists because of a measurement, not a hunch. Instrumenting the page
 * during a blessing gave a median frame of 16.7ms, a 90th percentile of 34ms —
 * and a single frame costing **2731ms**. That one frame is the first one: the
 * god rays, the bloom, the gold shader, the particle shader and the
 * environment all compile at the moment the sequence begins.
 *
 * The sequence's clock is wall-clock driven on purpose (see
 * `useExecutionTimeline`), which makes that stall worse rather than better: the
 * timeline keeps the right duration and simply loses the frames, so the whole
 * thing is over before the second frame is drawn. The recorded capture showed
 * the charter still tilted mid-entrance on the last frame of a sixteen second
 * recording.
 *
 * So the clock waits for this. `gl.compile` is forced once on mount, and four
 * rendered frames then confirm the renderer is actually through it.
 *
 * Four, not one, because the compile happens in two waves and `gl.compile`
 * only covers the first. It walks the scene graph, so it warms the materials
 * on the meshes — but the postprocessing effects live in the composer, outside
 * that graph, and compile on the composer's first render instead. Timing the
 * page showed exactly that: two separate stalls, 1992ms and 2469ms, with
 * ordinary frames between them. Counting four frames spans both, since each
 * stall is one frame.
 *
 * In this sandbox WebGL runs on SwiftShader, so the number is unusually large;
 * on a real GPU the same compile is a few hundred milliseconds. Either way it
 * lands on the opening beat of a ceremony that cannot be skipped for 0.8s,
 * which is the worst place in the sequence to spend it.
 */
export function Warm({ onReady }: { onReady?: () => void }) {
  const { gl, scene, camera } = useThree();
  const frames = useRef(0);
  const fired = useRef(false);

  useEffect(() => {
    // Compiles every material in the scene against this camera, up front,
    // instead of lazily on first draw.
    gl.compile(scene, camera);
  }, [gl, scene, camera]);

  useFrame(() => {
    if (fired.current) return;
    frames.current += 1;
    if (frames.current >= 4) {
      fired.current = true;
      onReady?.();
    }
  });

  return null;
}
