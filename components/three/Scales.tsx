'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { atRest, springStep, type SpringState } from '@/lib/motion/physics';

/**
 * The balance, weighing.
 *
 * A damped harmonic oscillator, not a tween: the beam overshoots its target,
 * rings, and settles, with the ringing dying at a rate the damping ratio sets.
 * Tipping a beam with an ease looks like a dial being set; tipping it with a
 * spring looks like a mass being weighed, and the difference is entirely in
 * what happens after the first arrival.
 *
 * This is where the brief asked for a Rive state machine. `public/ASSETS.md`
 * records why there is none — the short version is that `.riv` is a compiled
 * binary from a GUI editor that nothing in this toolchain can produce, and
 * community files carry varying or absent licences. The behaviour asked for is
 * twelve lines of integrator, and keeping it here means the damping can be
 * tuned against the rest of the timeline rather than baked into an asset.
 */
export function Scales({
  /** -1 fully toward heresy, +1 fully toward favour, 0 level. */
  target,
  /** Beats the beam with small disturbances while the court is still reading. */
  unsettled = true,
  position = [0, 0, 0],
  scale = 1,
}: {
  target: number;
  unsettled?: boolean;
  position?: [number, number, number];
  scale?: number;
}) {
  const beam = useRef<THREE.Group>(null);
  const panL = useRef<THREE.Group>(null);
  const panR = useRef<THREE.Group>(null);
  const spring = useRef<SpringState>({ value: 0, velocity: 0 });
  const nudge = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    /*
     * While the court is still deliberating the beam is knocked about, so it
     * never sits level and never looks keyframed. The knocks are impulses on
     * velocity rather than offsets on position — adding to position fights the
     * spring, adding to velocity is what a real tap does.
     */
    if (unsettled && t - nudge.current > 0.55 + Math.random() * 0.7) {
      nudge.current = t;
      spring.current.velocity += (Math.random() - 0.5) * 6;
    }

    if (!atRest(spring.current, target) || unsettled) {
      spring.current = springStep(spring.current, target, delta, {
        stiffness: 46,
        // Clearly under-damped: it must visibly ring before it settles.
        zeta: 0.17,
        mass: 1,
      });
    }

    const tilt = THREE.MathUtils.clamp(spring.current.value, -1.6, 1.6) * 0.22;
    if (beam.current) beam.current.rotation.z = tilt;

    // The pans hang plumb however the beam tilts, and swing a little behind it.
    const lag = tilt * 0.55;
    if (panL.current) panL.current.rotation.z = -tilt + Math.sin(t * 2.1) * 0.02 - lag * 0.2;
    if (panR.current) panR.current.rotation.z = -tilt + Math.sin(t * 1.7 + 1.1) * 0.02 - lag * 0.2;
  });

  const brass = (
    <meshPhysicalMaterial
      color="#c9a227"
      roughness={0.34}
      metalness={0.92}
      clearcoat={0.3}
      envMapIntensity={1.4}
    />
  );

  return (
    <group position={position} scale={scale}>
      {/* Post and base. */}
      <mesh position={[0, -0.62, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.32, 0.06, 28]} />
        {brass}
      </mesh>
      <mesh position={[0, -0.1, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 1.0, 20]} />
        {brass}
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.06, 20, 16]} />
        {brass}
      </mesh>

      <group ref={beam} position={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.045, 0.045]} />
          {brass}
        </mesh>

        {/* Left pan: heresy. */}
        <group ref={panL} position={[-0.72, 0, 0]}>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.34, 6]} />
            {brass}
          </mesh>
          <mesh position={[0, -0.36, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.19, 0.045, 26]} />
            {brass}
          </mesh>
        </group>

        {/* Right pan: favour. */}
        <group ref={panR} position={[0.72, 0, 0]}>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.34, 6]} />
            {brass}
          </mesh>
          <mesh position={[0, -0.36, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.19, 0.045, 26]} />
            {brass}
          </mesh>
        </group>
      </group>
    </group>
  );
}
