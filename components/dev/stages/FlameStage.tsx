'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { Flame } from '@/components/three/Flame';
import { Hall } from '@/components/three/Hall';
import { flickerAt } from '@/lib/motion/physics';
import type { Capability } from '@/lib/motion/useCapability';

/**
 * The flame, alone, with surfaces placed specifically to show whether it is
 * really lighting them: a parchment plane behind, a floor it can throw a shadow
 * across, and a solid to catch the falloff.
 */

function Subjects() {
  const page = useRef<THREE.Mesh>(null);

  // Nothing here animates on its own. Anything that appears to move is being
  // moved by the flame's light, which is the point of the stage.
  useFrame((state) => {
    if (!page.current) return;
    const { sway } = flickerAt(state.clock.elapsedTime);
    page.current.rotation.y = sway * 0.012;
  });

  return (
    <>
      {/* The parchment, upright behind the candle. */}
      <mesh ref={page} position={[0.55, 0.25, -1.35]} receiveShadow>
        <planeGeometry args={[2.6, 1.9]} />
        <meshStandardMaterial color="#e9dfc6" roughness={0.92} metalness={0} />
      </mesh>

      {/* The table. Takes the long shadow. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#241a0e" roughness={0.95} metalness={0} />
      </mesh>

      {/* A solid to read the inverse-square falloff against. */}
      <mesh position={[-0.95, -0.3, -0.2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.62, 24]} />
        <meshStandardMaterial color="#8a7346" roughness={0.6} metalness={0.1} />
      </mesh>

      {/*
       * The candle body. The faint emissive stands in for wax's subsurface
       * scattering: with pure diffuse it rendered dead black, because a light
       * directly above a cylinder only grazes its vertical faces.
       */}
      <mesh position={[0, -0.34, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.56, 24]} />
        <meshStandardMaterial
          color="#efe6cb"
          roughness={0.75}
          metalness={0}
          emissive="#8a5a24"
          emissiveIntensity={0.22}
        />
      </mesh>
    </>
  );
}

export function FlameStage({ cap }: { scrub: number; playing: boolean; cap: Capability }) {
  if (!cap.ready) return null;

  if (!cap.webgl) {
    return (
      <div className="grid h-full place-items-center text-xs tracking-[0.2em] text-[#d4af37] uppercase">
        no webgl — the still fallback would render here
      </div>
    );
  }

  return (
    <Hall cap={cap} className="h-full w-full">
      {/* Barely any ambient: the flame has to do the work or the stage lies. */}
      <ambientLight intensity={0.06} color="#2b2318" />
      <Flame position={[0, -0.06, 0]} scale={1} />
      <Subjects />
    </Hall>
  );
}
