'use client';

import { Environment } from '@react-three/drei';

/**
 * The reflections the wax and the gold see.
 *
 * Deliberately *not* `<Environment preset="…">`. That fetches an HDRI from
 * raw.githack.com at runtime, which this app's own CSP blocks (`connect-src
 * 'self'`) and which would contradict a stated property of the product: it
 * makes no external calls and nothing about a petition ever leaves the machine.
 * Adding a third-party CDN to the critical path of a verdict animation for the
 * sake of a reflection map is a bad trade twice over.
 *
 * So the environment is built here instead: a handful of emissive planes
 * arranged like the room actually is — hot and low on one side where the candle
 * stands, cold and high on the other, dark everywhere else. drei renders them
 * to a cubemap once (`frames={1}`) and the result is a static PMREM, so the
 * per-frame cost is nil.
 *
 * It also looks *better* than a studio preset here. A sunset HDRI puts a bright
 * horizon band across the wax, which reads as outdoors; a court at night should
 * show one warm source and a lot of nothing.
 */
export function CourtEnvironment({ resolution = 128 }: { resolution?: number }) {
  return (
    <Environment frames={1} resolution={resolution} background={false}>
      {/* The candle: the key, low and warm. */}
      <mesh position={[-1.4, -0.4, 1.6]} scale={[2.2, 1.6, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#ffc070" toneMapped={false} />
      </mesh>

      {/* A dim warm bounce off the parchment opposite it. */}
      <mesh position={[2.2, 0.1, 0.6]} rotation={[0, -Math.PI / 2.4, 0]} scale={[2.6, 2, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#b98a4a" toneMapped={false} />
      </mesh>

      {/* Cold fill from above, so unlit faces are not dead black. */}
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 6, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#39405e" toneMapped={false} />
      </mesh>

      {/* The hall itself: near-black, matching --color-hall. */}
      <mesh scale={[14, 14, 14]}>
        <boxGeometry />
        <meshBasicMaterial color="#2a2118" side={1} toneMapped={false} />
      </mesh>
    </Environment>
  );
}
