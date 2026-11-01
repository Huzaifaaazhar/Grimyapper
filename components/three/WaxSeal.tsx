'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { fbm, springStep, type SpringState } from '@/lib/motion/physics';

/**
 * The wax seal, as an object rather than a drawing.
 *
 * The old seal was an SVG disc with turbulence on its edge — convincing while
 * it sat still, and obviously flat the moment anything asked it to move in
 * three dimensions. This is a real mesh:
 *
 *   - a disc whose rim is displaced by noise, because poured wax never sets
 *     round and a perfect circle is the single clearest tell;
 *   - MeshPhysicalMaterial with low metalness, a clearcoat for the glossy skin
 *     that forms as wax cools, and sheen standing in for the way light bleeds a
 *     little way into the body;
 *   - the signet cut in as real geometry, so the impression self-shadows and
 *     catches a specular edge on one wall instead of being painted on.
 *
 * The press is a damped spring on scale, not a tween: it lands, squashes wider
 * than it is tall, rebounds once and settles. Wax spreads on impact, so the
 * squash is deliberately non-uniform.
 */

/** Builds the disc once: a lathe profile, then noise displacement on the rim. */
function useWaxGeometry(segments = 96) {
  return useMemo(() => {
    /*
     * The profile, from the axis outward then down the rim. The slight dome and
     * the rounded shoulder are what let the clearcoat read: a flat cylinder
     * gives one specular hotspot and looks like plastic.
     */
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0, 0.088),
      new THREE.Vector2(0.28, 0.086),
      new THREE.Vector2(0.55, 0.079),
      new THREE.Vector2(0.78, 0.066),
      new THREE.Vector2(0.9, 0.05),
      new THREE.Vector2(0.97, 0.028),
      new THREE.Vector2(1.0, 0.0),
      new THREE.Vector2(0.96, -0.012),
      new THREE.Vector2(0.0, -0.016),
    ];

    /*
     * Left in the lathe's own frame: the disc lies in XZ with its normal along
     * +Y. Rotating the geometry here was the first attempt and it broke the
     * press — the squash scales Y, so once the geometry was tipped, Y was a
     * direction *within* the disc and the stamp stretched it into an oval
     * instead of flattening it. Orientation is the caller's job; this component
     * only ever scales along the normal.
     */
    const geo = new THREE.LatheGeometry(profile, segments);

    // Push the rim in and out with low-frequency noise so the outline wanders.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      const radius = Math.hypot(v.x, v.y);
      if (radius < 0.001) continue;
      const angle = Math.atan2(v.y, v.x);
      // Two octaves around the circumference, plus a wider lobe, so the edge
      // has both a gentle ovality and local bites out of it.
      const wobble =
        (fbm(angle * 1.6 + 3.1) - 0.5) * 0.11 + (fbm(angle * 4.7 + 11.9) - 0.5) * 0.045;
      // Only the outer part moves; the face stays flat enough to take a signet.
      const falloff = THREE.MathUtils.smoothstep(radius, 0.45, 1.0);
      const scale = 1 + wobble * falloff;
      v.x *= scale;
      v.y *= scale;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [segments]);
}

export function WaxSeal({
  mark = 'G',
  position = [0, 0, 0],
  scale = 1,
  /** 0 before the press, 1 once it has landed. Drive this from the timeline. */
  pressed = 1,
  color = '#8e1f1a',
}: {
  mark?: string;
  position?: [number, number, number];
  scale?: number;
  pressed?: number;
  color?: string;
}) {
  // Two nested groups: the outer one settles the tilt, the inner one squashes
  // along the normal. Doing both on one node is what mixed the axes up.
  const orient = useRef<THREE.Group>(null);
  const squashed = useRef<THREE.Group>(null);
  const geometry = useWaxGeometry();

  // Spring state lives in a ref: it must survive renders without causing them.
  const squash = useRef<SpringState>({ value: 0, velocity: 0 });
  const landed = useRef(false);

  useLayoutEffect(() => {
    landed.current = false;
    squash.current = { value: 0, velocity: 0 };
  }, [pressed]);

  useFrame((state, delta) => {
    if (!squashed.current || !orient.current) return;

    // Drive the spring toward 1 once the timeline says the stamp has landed.
    squash.current = springStep(squash.current, pressed, delta, {
      stiffness: 260,
      // Under-damped, but only just: wax rebounds once, it does not wobble.
      zeta: 0.42,
      mass: 1,
    });

    const s = squash.current.value;
    // Non-uniform on purpose. Wax displaced by a signet goes outward, so the
    // disc is briefly wider than its rest size while being much thinner.
    const spread = 1 + Math.max(0, 1 - s) * 0.22;
    const flatten = THREE.MathUtils.lerp(2.6, 1, THREE.MathUtils.clamp(s, 0, 1));

    // Y is the disc's normal here, so this genuinely flattens it.
    squashed.current.scale.set(scale * spread, scale * flatten, scale * spread);

    // A whisper of settle on the tilt, so it does not land perfectly square.
    const t = state.clock.elapsedTime;
    orient.current.rotation.y = -0.12 + (1 - s) * 0.1 + Math.sin(t * 0.4) * 0.004;
  });

  return (
    <group ref={orient} position={position}>
      <group ref={squashed}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          roughness={0.44}
          metalness={0.02}
          /* Clearcoat reflects the environment and attenuates the diffuse
             beneath it. Against a near-black hall that made the face read as a
             void, so the environment carries real bounce and this is dialled
             back from 0.85. */
          envMapIntensity={1.6}
          // The cooled skin on poured wax: a thin, slightly rough gloss layer
          // sitting over a matte body.
          clearcoat={0.55}
          clearcoatRoughness={0.34}
          // Sheen fakes the shallow light bleed that makes wax look soft rather
          // than like painted resin. Cheaper and more stable than transmission,
          // which needs a second render pass per frame.
          sheen={0.6}
          sheenRoughness={0.55}
          sheenColor="#e2735f"
          reflectivity={0.35}
        />
      </mesh>

      {/*
       * The signet, cut in as geometry. Sunk below the face so it self-shadows:
       * the upper wall of the recess goes dark and the lower lip catches the
       * key light, which is what reads as "pressed into" rather than "printed
       * on top of".
       */}
      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.66, 0.035, 10, 48]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.58}
          metalness={0.02}
          clearcoat={0.5}
          clearcoatRoughness={0.45}
        />
      </mesh>

        <SignetMark mark={mark} color={color} />
      </group>
    </group>
  );
}

/**
 * The letter, extruded and sunk.
 *
 * Rendered as a slightly darker, rougher solid pushed below the seal's face.
 * Text geometry would need a font payload; at the size this is ever seen, a
 * bevelled plate carries the same read for none of the weight.
 */
function SignetMark({ mark, color }: { mark: string; color: string }) {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#808080'; // neutral: no displacement
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000'; // sunk
    ctx.font = `bold ${size * 0.62}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mark, size / 2, size / 2 + size * 0.03);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }, [mark]);

  useLayoutEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;

  return (
    <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[0.52, 48]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.62}
        metalness={0.02}
        // The canvas drives both: the letter is physically lower AND its walls
        // get a normal, so it shades correctly from any light direction.
        bumpMap={texture}
        bumpScale={-0.9}
        clearcoat={0.4}
        clearcoatRoughness={0.5}
      />
    </mesh>
  );
}
