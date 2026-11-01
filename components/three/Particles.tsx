'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { SIMPLEX_3D } from '@/lib/motion/shaders';

/**
 * Embers and gold leaf, as GPU points.
 *
 * The old implementation moved eighty 2D dots on a canvas with one integration
 * step each per frame on the CPU. This does the integration in the vertex
 * shader instead, so the particle count stops being bounded by the main thread
 * and the motion can afford to be a curl-noise flow field rather than a drift.
 *
 * The distinction that matters visually: a flow field is divergence-free, so
 * particles swirl around each other and form the braided columns hot air
 * actually makes. Independent per-particle velocities, however carefully
 * randomised, always read as confetti.
 *
 * Nothing allocates per frame. Positions, seeds and lifetimes are baked into
 * static attributes once; the only per-frame write is a single uniform.
 */

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uRise;      // +1 embers rise, -1 gold leaf falls
uniform float uTurb;
uniform vec3  uBounds;

attribute float aSeed;
attribute float aLife;    // seconds this particle lives
attribute float aOffset;  // phase, so they are not born together
attribute float aScale;

varying float vAge;       // 0 newborn, 1 dying
varying float vSeed;

${SIMPLEX_3D}

/*
 * Curl of a 3D noise field. Taking the curl guarantees the field is
 * divergence-free, which is what makes particles orbit and braid instead of
 * all piling toward the same attractor.
 */
vec3 curl(vec3 p) {
  const float e = 0.1;
  float n1 = snoise(vec3(p.x, p.y + e, p.z));
  float n2 = snoise(vec3(p.x, p.y - e, p.z));
  float n3 = snoise(vec3(p.x, p.y, p.z + e));
  float n4 = snoise(vec3(p.x, p.y, p.z - e));
  float n5 = snoise(vec3(p.x + e, p.y, p.z));
  float n6 = snoise(vec3(p.x - e, p.y, p.z));
  float x = (n3 - n4) - (n1 - n2);
  float y = (n5 - n6) - (n3 - n4);
  float z = (n1 - n2) - (n5 - n6);
  return normalize(vec3(x, y, z) + 1e-6);
}

void main() {
  // Each particle loops on its own clock, so the field never resets as a whole.
  float t = mod(uTime + aOffset, aLife);
  float age = t / aLife;
  vAge = age;
  vSeed = aSeed;

  vec3 p = position;

  // Drift along the flow field. Integrated analytically against age rather
  // than stepped, so there is no state to store and no drift between frames.
  vec3 flow = curl(p * 0.55 + vec3(0.0, uTime * 0.07, aSeed * 7.3)) * uTurb;

  p += flow * age * 1.4;
  // Buoyancy, accelerating: embers do not rise at constant speed.
  p.y += uRise * age * age * uBounds.y * 1.15;
  // A slow lateral wander that is not the flow field, so columns still wobble.
  p.x += sin(uTime * 0.35 + aSeed * 19.0) * 0.12 * age;

  // Wrap horizontally so the field stays populated at the edges.
  p.x = mod(p.x + uBounds.x, uBounds.x * 2.0) - uBounds.x;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);

  // Fade in fast, burn most of the life, die out slowly.
  float fade = smoothstep(0.0, 0.06, age) * (1.0 - smoothstep(0.55, 1.0, age));

  /*
   * Size attenuation: nearer particles are genuinely larger, which is what
   * gives the field depth. Without it everything sits on one plane.
   *
   * The constant is the projected size of one world unit at one unit of depth.
   * It was 300 in the first pass, which at a camera distance of ~3 produced
   * hundred-pixel points — the screen went solid white the moment additive
   * blending stacked a few of them.
   */
  gl_PointSize = uSize * aScale * fade * (26.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_FRAG = /* glsl */ `
precision highp float;
varying float vAge;
varying float vSeed;
uniform float uRise;

void main() {
  // Round, soft-edged point. Squared falloff reads as a glow rather than a disc.
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  float alpha = pow(1.0 - r * 4.0, 1.9);

  vec3 col;
  if (uRise > 0.0) {
    // Embers cool as they climb: gold, through vermilion, to a dying char.
    vec3 hot  = vec3(1.0, 0.86, 0.42);
    vec3 warm = vec3(0.98, 0.42, 0.13);
    vec3 dead = vec3(0.34, 0.07, 0.03);
    col = mix(hot, warm, smoothstep(0.0, 0.45, vAge));
    col = mix(col, dead, smoothstep(0.5, 1.0, vAge));
  } else {
    // Gold leaf: catches the light as it tumbles, so brightness flickers with
    // the spin rather than fading monotonically.
    float catchLight = 0.55 + 0.45 * sin(vSeed * 31.0 + vAge * 22.0);
    col = mix(vec3(0.72, 0.52, 0.12), vec3(1.0, 0.93, 0.66), catchLight);
  }

  float life = 1.0 - smoothstep(0.55, 1.0, vAge);
  // Kept well under 1: these stack additively and a field of them at full
  // alpha washes the whole frame out.
  gl_FragColor = vec4(col, alpha * life * 0.42);
}
`;

export type Tone = 'ember' | 'gilt';

export function Particles({
  tone,
  count,
  bounds = [2.4, 2.2, 1.2],
}: {
  tone: Tone;
  count: number;
  bounds?: [number, number, number];
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  /*
   * Built once per (count, tone). Rebuilding on a quality step-down is a real
   * cost, but it happens at most twice in a sequence and a buffer sized for the
   * worst case would waste bandwidth on every device that never needs it.
   */
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const life = new Float32Array(count);
    const offset = new Float32Array(count);
    const scale = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (Math.random() * 2 - 1) * bounds[0];
      // Embers are born low and rise; leaf is born high and falls.
      pos[i * 3 + 1] =
        tone === 'ember'
          ? -bounds[1] * (0.5 + Math.random() * 0.5)
          : bounds[1] * (0.5 + Math.random() * 0.5);
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * bounds[2];

      seed[i] = Math.random();
      life[i] = 3.2 + Math.random() * 4.5;
      // Spread births across the whole lifetime so the field is already full on
      // frame one instead of erupting all at once.
      offset[i] = Math.random() * life[i];
      // A few large, many small: a uniform size reads as a texture, not a field.
      scale[i] = 0.35 + Math.pow(Math.random(), 2.4) * 1.5;
    }

    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    g.setAttribute('aOffset', new THREE.BufferAttribute(offset, 1));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    // The shader moves points far outside their start positions, so an
    // auto-computed box would cull the field the moment the camera turns.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
    return g;
  }, [count, tone, bounds]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: tone === 'ember' ? 2.1 : 1.7 },
      uRise: { value: tone === 'ember' ? 1 : -1 },
      uTurb: { value: tone === 'ember' ? 0.42 : 0.26 },
      uBounds: { value: new THREE.Vector3(...bounds) },
    }),
    [tone, bounds],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  /*
   * R3F disposes geometry and material attached to a primitive when it
   * unmounts, but the memo above can hand back a *new* geometry while the old
   * one is still attached, and that one is never seen by the reconciler. The
   * effect-free way to be sure is to dispose explicitly when the memo changes.
   */
  const previous = useRef<THREE.BufferGeometry | null>(null);
  if (previous.current && previous.current !== geometry) previous.current.dispose();
  previous.current = geometry;

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={PARTICLE_VERT}
        fragmentShader={PARTICLE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
