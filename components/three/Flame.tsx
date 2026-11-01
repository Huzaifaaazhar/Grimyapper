'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { FLAME_FRAG, FLAME_VERT } from '@/lib/motion/shaders';
import { flickerAt } from '@/lib/motion/physics';

/**
 * A candle that actually lights the room.
 *
 * The flame plane and the point light read the *same* `flickerAt(t)` scalar
 * every frame. That is the whole trick: when the flame gutters, the parchment,
 * the scales and the text all dim on the same frame, and the scene reads as lit
 * by this object rather than as a drawing of a flame placed next to some
 * separately-animated lighting.
 *
 * Nothing is allocated per frame. The uniforms object is built once and its
 * `.value` fields are written in place; `flickerAt` returns a small struct that
 * V8 keeps on the stack. A `new Vector3()` in here would be ~60 allocations a
 * second per instance and is exactly the kind of thing that makes a scene
 * stutter on a mid-range Android every time the collector runs.
 */
export function Flame({
  position = [0, 0, 0],
  scale = 1,
  castShadows = true,
}: {
  position?: [number, number, number];
  scale?: number;
  castShadows?: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const group = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlicker: { value: 0.7 },
      uSway: { value: 0 },
      uIntensity: { value: 1 },
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { intensity, sway } = flickerAt(t);

    uniforms.uTime.value = t;
    uniforms.uFlicker.value = intensity;
    uniforms.uSway.value = sway;

    if (light.current) {
      // The light is the flame's own brightness, squared so gutters read as
      // deeper than a linear mapping gives.
      light.current.intensity = 1.7 * intensity * intensity;
      // The source moves with the lean, so cast shadows swing with the flame
      // rather than sitting still under a moving light.
      light.current.position.x = sway * 0.05;
      light.current.position.y = 0.14 + intensity * 0.03;
    }
  });

  return (
    <group ref={group} position={position} scale={scale}>
      {/* The flame itself: a billboarded plane, additively blended. */}
      <mesh position={[0, 0.17, 0]}>
        {/*
         * 0.30 x 0.42 against a candle 0.2 across. The first pass made this
         * 0.6 x 0.95, which is roughly three times the candle's own height and
         * read as a bonfire on a stick. A real flame is about as tall as the
         * candle is wide.
         */}
        <planeGeometry args={[0.3, 0.42, 1, 1]} />
        <shaderMaterial
          ref={mat}
          vertexShader={FLAME_VERT}
          fragmentShader={FLAME_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/*
       * The warm light. Decay 2 is physically correct inverse-square, which is
       * what makes the falloff across the parchment look like candlelight
       * instead of a flat wash.
       */}
      {/*
       * Pushed forward on z as well as up. Directly overhead, the candle's own
       * front face only catches the light at grazing incidence and renders
       * black — physically correct and completely wrong-looking.
       */}
      <pointLight
        ref={light}
        position={[0, 0.14, 0.17]}
        color="#ffb55a"
        intensity={1.7}
        distance={9}
        decay={2}
        castShadow={castShadows}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0015}
        shadow-radius={6}
      />

      {/* A dim, cooler fill so unlit faces are not pure black. */}
      <pointLight position={[0, 0.5, 0.6]} color="#5a4a8a" intensity={0.35} distance={6} decay={2} />
    </group>
  );
}
