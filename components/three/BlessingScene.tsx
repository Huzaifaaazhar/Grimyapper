'use client';

import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, GodRays } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { CourtEnvironment } from '@/components/three/CourtEnvironment';
import { Particles } from '@/components/three/Particles';
import { WaxSeal } from '@/components/three/WaxSeal';
import { makeParchment } from '@/lib/motion/parchment';
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

/** The page, as a portrait leaf of parchment. */
const LEAF_W = 1.34;
const LEAF_H = 1.78;
/** The gilded frame, inset from the page edge by a scribe's margin. */
const BAND = 0.085;

/**
 * The gilded frame.
 *
 * A plain quad the size of the page with its middle discarded in the shader,
 * rather than a ring: `ringGeometry` with four segments is a diamond, and even
 * turned an eighth of a turn it can only ever be square. The charter is a
 * portrait page, so its border has to be portrait too.
 */
function GildedBorder({ reveal, sweep }: { reveal: number; sweep: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  /*
   * Memoised, and this is load-bearing.
   *
   * Written as an inline object in JSX, a fresh uniforms object is built on
   * every render and assigned over the material's own — wiping the values the
   * frame loop had just written. uReveal was therefore pinned at 0 and the
   * shader discarded every fragment, so no gold rendered in the app at all
   * even though the identical component worked in the lab, where nothing else
   * was re-rendering it.
   */
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSweep: { value: 0 },
      uReveal: { value: 0 },
      uSeed: { value: 3.1 },
      uInner: {
        value: new THREE.Vector2(0.5 - BAND / LEAF_W, 0.5 - BAND / LEAF_H),
      },
    }),
    [],
  );

  useFrame((state) => {
    if (!mat.current) return;
    // Written through the material's own ref — see BurningWarrant for why the
    // memoised prop object is not the one the compiled shader samples.
    mat.current.uniforms.uReveal.value = reveal;
    mat.current.uniforms.uSweep.value = sweep;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, 0, 0.004]}>
      <planeGeometry args={[LEAF_W, LEAF_H]} />
      <shaderMaterial
        ref={mat}
        vertexShader={FLAME_VERT}
        fragmentShader={GOLD_FRAG}
        uniforms={uniforms}
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

  /*
   * Pulled earlier across the board. The recorded frames showed four tiles of
   * empty hall under the title before anything arrived — the leaf has to be
   * present almost immediately and then be worked on, rather than the sequence
   * waiting for it.
   */
  /*
   * The page is drawn once, into a canvas, and released on unmount. Built in a
   * memo rather than a module constant because it touches `document`, which
   * does not exist during the server pass.
   */
  const page = useMemo(
    () =>
      makeParchment({
        heading: 'Royal Charter',
        subheading: 'By grace of the sovereign',
        accent: '#8a6412',
      }),
    [],
  );
  useEffect(() => () => page?.dispose(), [page]);

  const land = THREE.MathUtils.smoothstep(progress, 0.0, 0.14);
  const reveal = THREE.MathUtils.smoothstep(progress, 0.1, 0.5);
  const sweep = THREE.MathUtils.smoothstep(progress, 0.4, 0.85);
  const sealIn = THREE.MathUtils.smoothstep(progress, 0.62, 0.88);

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

      {/*
       * Page, border and seal move as one body.
       *
       * They were three siblings positioned independently, and it showed: the
       * leaf descended while the frame and the seal sat still in mid-air, so
       * nothing in the frame was attached to anything else. A charter is one
       * object; it arrives as one object.
       */}
      {/*
       * The lift is deliberately small. At 0.72 the page started well above
       * the top of the canvas and the first half of its entrance happened
       * off-screen — in the recordings the charter appeared to hang from the
       * top edge, cropped, for the whole opening beat. A page settling onto a
       * table only moves a little; what sells the arrival is the tilt coming
       * out of it and the shadow closing underneath, not the distance.
       */}
      <group
        position={[0, 0.02 + (1 - land) * 0.3, (1 - land) * 0.26]}
        rotation={[(1 - land) * -0.2, 0, (1 - land) * 0.045]}
      >
        {/* The leaf itself: a written page, not a coloured rectangle. */}
        <mesh receiveShadow>
          <planeGeometry args={[LEAF_W, LEAF_H]} />
          <meshStandardMaterial
            map={page}
            color="#ffffff"
            roughness={0.92}
            metalness={0}
          />
        </mesh>

        <GildedBorder reveal={reveal} sweep={sweep} />

        {/*
         * The seal is pressed ONTO the charter, at the foot of the page where
         * a seal goes — not floating in front of it. It was 0.26 at a 21°
         * tilt, which put a red ellipse the size of the heading across the
         * bottom edge and half outside the frame.
         *
         * It also arrives late on purpose. The gilding is finished by 0.5 and
         * the back half of the sequence had nothing in it but drifting dust;
         * the press is the event that earns that time, and it drops the last
         * of the way rather than fading up.
         */}
        {/*
         * +90° about X, not -90°.
         *
         * The lathe is built with its face along +Y in its own frame. A
         * rotation of -PI/2 maps that to -Z — pointing the seal's face away
         * from the camera — so every frame until the press showed its unlit
         * back as a dark brown disc, and it only turned red once the squash
         * spring flattened it enough for the front to catch the key light.
         * Watching it was what gave it away: wax that darkens as it is pressed
         * has the physics exactly backwards.
         *
         * It is also mounted on demand rather than hidden. `pressed` only
         * drives the squash spring, so a seal rendered from frame one sat
         * there at full size through the entire gilding and the press stopped
         * being an event at all — the charter simply arrived already sealed.
         */}
        {sealIn > 0.001 && (
          <group
            position={[0.33, -0.6 + (1 - sealIn) * 0.26, 0.014]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <WaxSeal mark="G" scale={0.15} pressed={sealIn} color="#8e1f1a" />
          </group>
        )}
      </group>

      {/*
       * Capped below the scene budget, and only here. The execution gets the
       * full allowance because it has no postprocessing to pay for; the
       * blessing is the only scene running god rays and bloom together, and
       * two thousand additively-blended motes on top of that is where the
       * frame time went. Gold dust reads as dust at this count — it is the
       * drift that sells it, not the quantity.
       */}
      {/*
       * Bounds pulled in to roughly the page. Spread across 1.9 x 1.8 the
       * motes filled the whole frame evenly and read as falling snow; gold
       * dust is something that comes off the leaf being gilded, so it belongs
       * over the leaf.
       */}
      {particles > 0 && (
        <Particles tone="gilt" count={Math.min(particles, 1100)} bounds={[1.5, 1.5, 0.8]} />
      )}

      {effects && sun && (
        <EffectComposer>
          {/*
           * Low strength on purpose. God rays at full weight turn a candlelit
           * court into a cathedral at noon; the brief asks for a soft
           * volumetric glow, which is the bottom of this effect's range.
           *
           * Deliberately cheap, too. God rays cost samples x pixels, and this
           * is the heaviest thing in either sequence by a wide margin: at
           * sixty samples and half resolution it was most of the frame. At
           * sixteen samples and a quarter resolution it costs roughly an
           * eighth of that, and the difference is invisible here because the
           * rays are soft, dim and blurred afterwards anyway — a quarter-res
           * buffer run through the blur pass looks the same as a half-res one
           * when the effect never rises above a clamp of 0.55.
           */}
          <GodRays
            sun={sun}
            samples={16}
            resolutionScale={0.25}
            kernelSize={KernelSize.MEDIUM}
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
