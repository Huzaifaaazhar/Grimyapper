'use client';

import { useState } from 'react';

import { CourtEnvironment } from '@/components/three/CourtEnvironment';
import { Flame } from '@/components/three/Flame';
import { Hall, type Quality } from '@/components/three/Hall';
import { Particles } from '@/components/three/Particles';
import { Scales } from '@/components/three/Scales';
import type { Capability } from '@/lib/motion/useCapability';

/**
 * The deliberation chamber: a candle that lights it, and a balance that weighs.
 *
 * The balance's target follows the stage the court has reached, so it is
 * visibly still unsettled while the ledger is being consulted and swings hard
 * when the question of artifice is finally put. It never comes fully to rest
 * here — the verdict happens after the curtain lifts.
 */
export function CurtainCanvas({ cap, stage }: { cap: Capability; stage: number }) {
  const [quality, setQuality] = useState<Quality>('high');
  const particles =
    quality === 'high'
      ? Math.round(cap.particles * 0.45)
      : quality === 'medium'
        ? Math.round(cap.particles * 0.2)
        : 0;

  // Early stages barely move it; the last one throws it.
  const target = stage < 0 ? 0 : stage === 0 ? 0.18 : stage === 1 ? -0.42 : 0.85;

  return (
    <Hall cap={cap} onQuality={setQuality} className="absolute inset-0">
      {/*
         * Brighter than the verdict scenes. There the burning page and the
         * gilding are their own light sources; here the only emitter is one
         * candle a metre and a half from the balance, and inverse-square left
         * the brass effectively black.
         */}
      <ambientLight intensity={0.26} color="#3a2f20" />
      {/* A low warm fill standing in for the rest of the chamber's candles. */}
      <pointLight position={[1.4, 0.9, 2.2]} color="#ffc070" intensity={3.2} distance={9} decay={2} />
      <CourtEnvironment resolution={64} />

      <group position={[-0.85, -0.2, 0.5]}>
        <Flame scale={0.9} />
        {/* The candle body, so the flame sits on something. */}
        <mesh position={[0, -0.34, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.085, 0.095, 0.56, 20]} />
          <meshStandardMaterial
            color="#efe6cb"
            roughness={0.75}
            emissive="#8a5a24"
            emissiveIntensity={0.22}
          />
        </mesh>
      </group>

      <Scales target={target} unsettled={stage < 2} position={[0.5, -0.05, 0.3]} scale={0.72} />

      {/* The table, to take the candle's long shadow. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#241a0e" roughness={0.95} />
      </mesh>

      {particles > 0 && <Particles tone="gilt" count={particles} bounds={[2.2, 1.8, 1.0]} />}
    </Hall>
  );
}
