/**
 * The court's easing vocabulary.
 *
 * Every curve here is a CustomEase, registered once. The rule the brief sets —
 * no `linear`, no default `ease` — is not arbitrary: both read as a value being
 * interpolated, which is exactly the "80s game" tell. Physical movement
 * anticipates, overshoots and settles, and those three phases have to be in the
 * curve itself rather than bolted on as extra tweens.
 *
 * Naming is by behaviour, not by where it happens to be used, so a curve can be
 * reused without its name lying about what it does.
 */

import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';

let registered = false;

/**
 * Browser only, and idempotent.
 *
 * GSAP defers its core initialisation until it can see a `document`, so on the
 * server `registerPlugin` quietly does nothing and the first `CustomWiggle.create`
 * then throws `xEase is not a function` — CustomWiggle resolves CustomEase
 * through that deferred core, not through the import. Both are DOM-bound
 * plugins with no meaning during SSR, so the whole function returns early
 * rather than being made to half-work there.
 *
 * Idempotent because React 19 strict mode mounts twice in development, and
 * re-registering the same ease id is wasted work on every mount.
 */
export function registerEases(): void {
  if (registered || typeof window === 'undefined') return;
  registered = true;
  gsap.registerPlugin(CustomEase, CustomWiggle);

  /* -------------------------------------------------------------- weight */

  /**
   * A heavy object falling and landing: a slow gather, a fast drop, one firm
   * settle with almost no bounce. The wax seal and the gauntlet-replacement
   * slam use this.
   */
  CustomEase.create('drop', 'M0,0 C0.04,-0.06 0.2,-0.08 0.38,0.14 0.54,0.34 0.66,1.04 0.78,1.02 0.88,1.01 0.94,1 1,1');

  /**
   * Anticipate-then-go: pulls back before moving. For anything that must look
   * like it decided to move rather than being teleported.
   */
  CustomEase.create('anticipate', 'M0,0 C0.08,-0.11 0.16,-0.12 0.3,0.04 0.46,0.23 0.6,0.9 0.72,0.99 0.82,1.06 0.92,1 1,1');

  /**
   * Overshoot and settle, gently. The default for UI that should feel sprung
   * without feeling cartoonish.
   */
  CustomEase.create('settle', 'M0,0 C0.14,0 0.26,0.52 0.38,0.82 0.5,1.12 0.6,1.06 0.72,1.02 0.84,0.99 0.92,1 1,1');

  /**
   * Slow in, long glide out. Used where something should feel *carried* —
   * parchment unrolling, a curtain lifting.
   */
  CustomEase.create('glide', 'M0,0 C0.2,0 0.3,0.16 0.42,0.42 0.56,0.72 0.7,0.94 0.82,0.98 0.9,1 0.96,1 1,1');

  /**
   * The quill: fast at the start of a stroke where the hand has momentum,
   * dragging at the end where it lifts. Deliberately asymmetric.
   */
  CustomEase.create('quill', 'M0,0 C0.02,0.18 0.08,0.52 0.2,0.7 0.36,0.94 0.58,0.98 0.74,0.99 0.86,1 0.94,1 1,1');

  /**
   * Burn: creeps, then runs. Fire does not spread at a constant rate, and a
   * dissolve on a linear ramp is the single most synthetic-looking thing a
   * shader can do.
   */
  CustomEase.create('burn', 'M0,0 C0.1,0.01 0.24,0.03 0.36,0.1 0.52,0.2 0.64,0.56 0.76,0.8 0.86,0.95 0.94,1 1,1');

  /* ------------------------------------------------------------- impact */

  /**
   * The chamber struck by a sentence. `anticipate` type so the first move is a
   * recoil rather than a jolt, and few enough wiggles that it reads as one
   * impact rather than a rattle.
   */
  CustomWiggle.create('struck', { wiggles: 6, type: 'anticipate' });

  /**
   * The flame's light guttering when a draught hits it. Random, so repeats are
   * not countable.
   */
  CustomWiggle.create('gutter', { wiggles: 10, type: 'random' });
}

/** Every named ease, so `/dev/motion` can list and preview them without drift. */
export const EASES = [
  'drop',
  'anticipate',
  'settle',
  'glide',
  'quill',
  'burn',
  'struck',
  'gutter',
] as const;

export type EaseName = (typeof EASES)[number];
