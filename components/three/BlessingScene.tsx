'use client';

import { GodRays } from '@react-three/postprocessing';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

import { CourtEnvironment } from '@/components/three/CourtEnvironment';
import { Particles } from '@/components/three/Particles';
import { WaxSeal } from '@/components/three/WaxSeal';
import { FLAME_VERT, GOLD_FRAG } from '@/lib/motion/shaders';

/**
 * The blessing: the charter's border is gilded, then the light passes over it.
 *
 * This replaces the rotating conic ray burst, which was the most game-like
 * thing in the old overture — a hard-edged pinwheel spinning at a constant
 * rate, with no relationship to any light in the scene. Here there is an actual
 * emissive source behind the charter and god rays are sampled from it, so the
 * shafts sit where the geometry occludes the source and move because the source
 * moves.
 *
 * Driven by one 0–1 progress, like the execution:
 *   0.00–0.45  the border is traced in and gilds along a diagonal
 *   0.35–0.80  the specular sweep crosses the leaf
 *   0.55–1.00  gold dust settles, the seal presses
 */

/** The gilded frame, drawn as a ring of quads so the shader has real area. */
function GildedBorder({ reveal, sweep }: { reveal: number; sweep: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (!mat.current) return;
    // Written through the material's own ref — see BurningWarrant for why the
    // memoised prop object is not the one the compiled shader samples.
    mat.current.uniforms.uReveal.value = reveal;
    mat.current.uniforms.uSweep.value = sweep;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    /*
     * A four-segment ring is a diamond with its vertices on the axes, so it has
     * to be turned an eighth of a turn to sit square to the leaf. The radii are
     * then the corner distances: the flat edge sits at radius * cos(45°), which
     * is what the inner and outer numbers are solved for.
     */
    <mesh position={[0, 0.1, 0.012]} rotation={[0, 0, Math.PI / 4]}>
      <ringGeometry args={[1.1, 1.245, 4, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={FLAME_VERT}
        fragmentShader={GOLD_FRAG}
        uniforms={{
          uTime: { value: 0 },
          uSweep: { value: 0 },
          uReveal: { value: 0 },
          uSeed: { value: 3.1 },
        }}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export function BlessingScene({
  progress,
  particles,
  effects = true,
}: {
  progress: number;
  particles: number;
  /** Dropped on a quality step-down; postprocessing is the first thing to go. */
  effects?: boolean;
}) {
  // God rays need the actual mesh instance as its sun, so it is held in state
  // rather than a ref: the effect has to re-run once the mesh exists.
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  const sunRef = useRef<THREE.Mesh>(null);

  const reveal = THREE.MathUtils.smoothstep(progress, 0.02, 0.45);
  const sweep = THREE.MathUtils.smoothstep(progress, 0.35, 0.8);
  const sealIn = THREE.MathUtils.smoothstep(progress, 0.6, 0.85);

  useFrame(() => {
    if (sunRef.current && sunRef.current !== sun) setSun(sunRef.current);
    if (!sunRef.current) return;
    // The source brightens as the leaf gilds, so the shafts arrive with it
    // rather than being on from frame one.
    const m = sunRef.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.12 + reveal * 0.4;
  });

  return (
    <>
      <ambientLight intensity={0.22} color="#3a2f1e" />
      <CourtEnvironment />
      <directionalLight position={[2, 2.5, 2]} intensity={1.8} color="#ffd9a0" castShadow />
      <pointLight position={[0, 0.2, 1.6]} color="#ffdfa0" intensity={1.5 * reveal} distance={7} decay={2} />

      {/* The source the god rays are sampled from, behind the charter. */}
      {/*
       * Small, and placed behind the leaf's upper edge rather than its centre.
       * Centred and large, it bloomed straight through the charter and the
       * whole frame went white.
       */}
      <mesh ref={sunRef} position={[0, 1.15, -1.9]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#ffe9a8" transparent opacity={0.18} toneMapped={false} />
      </mesh>

      {/* The charter leaf itself. */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <planeGeometry args={[1.84, 1.84]} />
        <meshStandardMaterial color="#e9dfc6" roughness={0.9} metalness={0} />
      </mesh>

      <GildedBorder reveal={reveal} sweep={sweep} />

      <group position={[0.02, -0.72, 0.4]} rotation={[-Math.PI / 2.6, 0, 0]}>
        <WaxSeal mark="G" scale={0.26} pressed={sealIn} color="#8e1f1a" />
      </group>

      {particles > 0 && <Particles tone="gilt" count={particles} bounds={[1.9, 1.8, 1.0]} />}

      {effects && sun && (
        <EffectComposer>
          {/*
           * Low strength on purpose. God rays at full weight turn a candlelit
           * court into a cathedral at noon; the brief asks for a soft
           * volumetric glow, which is the bottom of this effect's range.
           */}
          <GodRays
            sun={sun}
            samples={30}
            density={0.88}
            decay={0.92}
            weight={0.22}
            exposure={0.14}
            clampMax={0.55}
            blur
          />
          <Bloom intensity={0.38} luminanceThreshold={0.86} luminanceSmoothing={0.25} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}
