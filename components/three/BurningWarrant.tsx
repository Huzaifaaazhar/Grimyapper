'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { makeParchment } from '@/lib/motion/parchment';

import { BURN_FRAG, FLAME_VERT } from '@/lib/motion/shaders';

/**
 * The warrant, catching at one corner and burning inward.
 *
 * This replaces the thumbs-down gauntlet entirely. A cartoon hand telling you
 * the verdict is a label; watching the document itself be destroyed *is* the
 * verdict, and it suits a court that issues sealed decrees far better.
 *
 * The page is drawn onto a canvas rather than screenshotted from the DOM, for
 * the same reason the charter PDF is drawn: html2canvas has to parse the real
 * stylesheet, which for Tailwind v4 means colour syntax it does not understand,
 * and it would hand back a soft raster. Here the heading is real text and the
 * body is ruled strokes — at the size and duration this is seen, legible lines
 * of body copy would be noise anyway, and the heading is the part that has to
 * read before it chars.
 */

function useWarrantTexture(heading: string, subheading: string) {
  // The page itself now lives in lib/motion/parchment, shared with the
  // charter. Keeping two copies of it is what let the blessing's leaf stay a
  // flat brown square while this one was a real document.
  return useMemo(
    () => makeParchment({ heading, subheading, accent: '#9c2b21' }),
    [heading, subheading],
  );
}

export function BurningWarrant({
  progress,
  heading = 'Decreed Warrant',
  subheading = 'of extinction',
  width = 1.5,
  height = 2.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  /** 0 intact, 1 fully consumed. Driven by the GSAP timeline. */
  progress: number;
  heading?: string;
  subheading?: string;
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const texture = useWarrantTexture(heading, subheading);
  const mesh = useRef<THREE.Mesh>(null);
  const geo = useRef<THREE.PlaneGeometry>(null);
  /*
   * The uniforms are written through the material's own reference, not through
   * the memoised object passed as a prop.
   *
   * Mutating the prop object looked right and did nothing: the char curl (plain
   * JS on the geometry) tracked progress correctly while the burn shader stayed
   * frozen at zero, which is what gave it away. Whatever the renderer does with
   * that prop, the object the compiled material samples is the one hanging off
   * the material itself, so that is the one to write to.
   */
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uPage: { value: texture },
      uProgress: { value: 0 },
      uTime: { value: 0 },
    }),
    [texture],
  );

  useLayoutEffect(() => () => texture?.dispose(), [texture]);

  /*
   * The char curl.
   *
   * Vertices near the burn front are pulled back and up, so the paper visibly
   * rolls away from the fire rather than the pixels simply vanishing. Doing it
   * on the CPU over a 24x32 grid is cheap and keeps the displacement in sync
   * with the same corner-distance field the shader burns along — matching that
   * in a vertex shader would mean duplicating the noise, and the two would
   * drift.
   */
  const rest = useRef<Float32Array | null>(null);

  useFrame((state) => {
    /*
     * The entrance. The leaf drops in and settles over the first tenth of the
     * sequence, before anything catches. Without it the warrant was simply
     * present on frame one, which is the single clearest weight failure the
     * recorded frames showed: nothing in the scene had been *placed*, it had
     * only appeared.
     */
    if (mesh.current) {
      const land = THREE.MathUtils.smoothstep(progress, 0.0, 0.1);
      // Eased by hand rather than by GSAP: this is a function of progress, so
      // it stays correct when the sequence is scrubbed or snapped.
      const e = 1 - Math.pow(1 - land, 3);
      mesh.current.position.y = position[1] + (1 - e) * 1.1;
      mesh.current.rotation.x = rotation[0] + (1 - e) * 0.35;
      mesh.current.rotation.z = rotation[2] - (1 - e) * 0.12;
    }

    if (mat.current) {
      mat.current.uniforms.uProgress.value = progress;
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    const g = geo.current;
    if (!g) return;
    const pos = g.attributes.position as THREE.BufferAttribute;
    if (!rest.current) rest.current = Float32Array.from(pos.array as Float32Array);

    const base = rest.current;
    const front = progress * 1.25;

    for (let i = 0; i < pos.count; i += 1) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      // Same corner the shader catches at, in the plane's own UV space.
      const u = x / width + 0.5;
      const v = y / height + 0.5;
      const reach = Math.hypot(u - 0.02, v - 0.98);

      // How close this vertex is to the front, 0 away from it, 1 at it.
      const near = Math.max(0, 1 - Math.abs(reach - front) * 7);
      const curl = near * near * 0.22;

      pos.setXYZ(i, x, y + curl * 0.5, base[i * 3 + 2] + curl);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
  });

  if (!texture) return null;

  return (
    <mesh ref={mesh} position={position} rotation={rotation}>
      {/* Enough segments to curl smoothly, few enough to update per frame. */}
      <planeGeometry ref={geo} args={[width, height, 24, 32]} />
      <shaderMaterial
        ref={mat}
        vertexShader={FLAME_VERT}
        fragmentShader={BURN_FRAG}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
