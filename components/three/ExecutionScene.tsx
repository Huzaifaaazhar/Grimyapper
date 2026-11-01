'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { BurningWarrant } from '@/components/three/BurningWarrant';
import { CourtEnvironment } from '@/components/three/CourtEnvironment';
import { Particles } from '@/components/three/Particles';
import { WaxSeal } from '@/components/three/WaxSeal';

/**
 * The execution, as one scene driven by a single 0–1 progress value.
 *
 * Every beat is a slice of that one number rather than its own clock, so the
 * whole sequence can be scrubbed, replayed, or jumped to its final frame for
 * reduced motion without any of the pieces falling out of step. The GSAP
 * timeline outside this component owns the *pacing*; this owns the *staging*.
 *
 * Beats:
 *   0.00–0.10  the warrant hangs, lit, intact
 *   0.08–0.70  it catches at the lower-left and burns inward
 *   0.55–0.85  the seal falls and lands
 *   0.60–1.00  ash lifts, the light dies back
 */
export function ExecutionScene({
  progress,
  shake = 0,
  particles,
}: {
  progress: number;
  /** Camera displacement, −1..1, driven by a CustomWiggle on the timeline. */
  shake?: number;
  particles: number;
}) {
  const { camera } = useThree();
  const rest = useRef(new THREE.Vector3(0, 0, 3.2));
  const key = useRef<THREE.PointLight>(null);

  useFrame(() => {
    /*
     * The shake moves the camera, not the subject. Shaking the objects would
     * leave the lighting and the background still and read as a jitter; moving
     * the eye makes the whole frame lurch the way a real impact does.
     */
    camera.position.set(rest.current.x + shake * 0.09, rest.current.y + shake * 0.055, rest.current.z);
    camera.lookAt(0, 0, 0);

    if (key.current) {
      // The fire is the light source while it burns, so the key swells with the
      // front and dies back as the page is consumed.
      const burn = THREE.MathUtils.smoothstep(progress, 0.08, 0.45);
      const spent = THREE.MathUtils.smoothstep(progress, 0.6, 0.95);
      key.current.intensity = 1.2 + burn * 3.2 * (1 - spent);
      // It sits at the burn front, which travels up the page.
      key.current.position.set(-0.6 + progress * 0.9, -0.9 + progress * 1.5, 0.55);
    }
  });

  // The seal arrives as the last scraps go, and lands hard.
  const sealIn = THREE.MathUtils.smoothstep(progress, 0.66, 0.86);
  const sealDrop = (1 - sealIn) * 2.4;

  return (
    <>
      <ambientLight intensity={0.09} color="#2a1f14" />
      <CourtEnvironment />

      {/* The fire's own light. */}
      <pointLight ref={key} color="#ff7a2a" intensity={1.2} distance={11} decay={2} />
      {/* A cold rim so the page edge separates from the black hall. */}
      <directionalLight position={[-2.5, 1.5, -1]} intensity={0.3} color="#4a5a9a" />

      <BurningWarrant progress={progress} position={[0, 0.16, 0]} rotation={[0, 0.09, 0.03]} width={1.28} height={1.7} />

      {/* The seal, falling in once the page is mostly gone. */}
      {/*
       * Lands low and forward, clear of the heading. Small: it is a signet, and
       * at 0.34 it covered half the leaf. The fire's key light is pulled off it
       * deliberately — black wax lit by a bonfire renders bright orange and
       * stops reading as wax at all.
       */}
      <group position={[0.02, -0.26 + sealDrop, 0.5]} rotation={[-Math.PI / 2.6, 0, 0]}>
        <WaxSeal mark="X" scale={0.3} pressed={sealIn} color="#5e120f" />
      </group>

      {/*
       * The seal's own key, rising as the fire dies. Without it the last frame
       * is a black disc on a black hall: the burn light is deliberately spent
       * by then, so something has to take over.
       */}
      <pointLight
        position={[0.7, 0.5, 1.5]}
        color="#ffb55a"
        intensity={sealIn * 5}
        distance={6}
        decay={2}
      />

      {/* Ash and embers lifting off the page. */}
      {particles > 0 && <Particles tone="ember" count={particles} bounds={[1.8, 2.0, 1.0]} />}
    </>
  );
}
