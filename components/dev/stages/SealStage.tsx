'use client';

import { useEffect, useState } from 'react';

import { CourtEnvironment } from '@/components/three/CourtEnvironment';
import { Hall } from '@/components/three/Hall';
import { Particles } from '@/components/three/Particles';
import { WaxSeal } from '@/components/three/WaxSeal';
import type { Capability } from '@/lib/motion/useCapability';

/** The seal and the particle field, lit hard enough to judge the material. */
export function SealStage({
  scrub,
  playing,
  cap,
}: {
  scrub: number;
  playing: boolean;
  cap: Capability;
}) {
  // When playing, cycle the press so the spring can be watched repeatedly.
  const [auto, setAuto] = useState(1);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setAuto((p) => (p > 0.5 ? 0 : 1)), 1800);
    return () => clearInterval(id);
  }, [playing]);

  if (!cap.ready) return null;
  if (!cap.webgl) {
    return (
      <div className="grid h-full place-items-center text-xs tracking-[0.2em] text-[#d4af37] uppercase">
        no webgl — still fallback
      </div>
    );
  }

  const pressed = playing ? auto : scrub;

  return (
    <Hall cap={cap} className="h-full w-full">
      <ambientLight intensity={0.3} color="#4a3a28" />
      <directionalLight position={[2, 3, 2]} intensity={2.6} color="#ffd9a0" castShadow />
      <directionalLight position={[-2, 1, -1]} intensity={0.22} color="#6a7fd0" />
      <CourtEnvironment />

      <group position={[0, 0.05, 0]} rotation={[-Math.PI / 2.9, 0, 0]}>
        {/* The lathe profile runs to radius 1, so the disc is 2 units across;
            at the Hall's camera distance that filled the whole frame. */}
        <WaxSeal mark="G" scale={0.38} pressed={pressed} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#cdbd99" roughness={0.95} />
      </mesh>

      <Particles tone="ember" count={cap.particles} />
    </Hall>
  );
}
