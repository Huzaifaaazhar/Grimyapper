/**
 * Motion physics, shared by the DOM layer and the 3D layer.
 *
 * Two things live here rather than inside the components that use them:
 *
 *   - the **flicker signal**. The brief's requirement that the candle "lights
 *     the hall" only reads as true if the flame's shape and the light's
 *     intensity move together. Two independent noise functions drift apart
 *     within a second and the eye catches it immediately, so both read one
 *     scalar computed here and passed down — the shader as a uniform, the
 *     light as an intensity multiplier.
 *   - the **damped spring**. The scales have to overshoot, oscillate and settle
 *     toward a verdict. That is a second-order system, not a tween, and writing
 *     it as one keeps the damping ratio tunable against the rest of the
 *     timeline. See `public/ASSETS.md` for why this is here rather than in Rive.
 */

/* ------------------------------------------------------------------ noise */

/** Deterministic hash → [0,1). Same input always gives the same value. */
function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

/** Smoothstep-interpolated value noise in one dimension. */
function valueNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  // Hermite fade, so the first derivative is continuous and the signal has no
  // visible corners when it drives a light.
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

/**
 * Fractal noise: four octaves, each half the amplitude and twice the rate.
 *
 * Returns roughly [0,1]. A flame driven by a single octave pulses on a
 * countable beat; the point of stacking them is that the period stops being
 * findable by eye, which is the whole difference between "flickering" and
 * "animated on a loop".
 */
export function fbm(x: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07; // not exactly 2, so octaves never re-align into a beat
  }
  return sum / norm;
}

/**
 * The candle's state at a moment in time.
 *
 * `intensity` is the light multiplier and the shader's brightness uniform.
 * `sway` moves both the flame's lean and the direction its shadows fall, which
 * is what makes the shadows read as cast by *this* flame rather than animated
 * alongside it.
 */
export type Flicker = { intensity: number; sway: number };

export function flickerAt(t: number): Flicker {
  // Two rates: a slow wander and a fast tremble, summed rather than averaged so
  // occasional gutters go lower than either alone would.
  const slow = fbm(t * 0.6);
  const fast = fbm(t * 3.4 + 11.7, 3);
  const intensity = 0.62 + slow * 0.26 + fast * 0.14;
  const sway = (fbm(t * 0.8 + 31.2) - 0.5) * 2;
  return { intensity, sway };
}

/* ----------------------------------------------------------------- spring */

export type SpringState = { value: number; velocity: number };

/**
 * One step of a damped harmonic oscillator, integrated semi-implicitly.
 *
 * `zeta` is the damping ratio: below 1 it overshoots and rings, at 1 it is
 * critically damped and merely settles. The scales want ~0.28 — clearly
 * ringing, clearly coming to rest — and a wax seal landing wants ~0.55, firm
 * with a single rebound.
 *
 * Semi-implicit (velocity updated before position) rather than explicit Euler
 * because explicit Euler gains energy at large steps and a scale that slowly
 * swings *wider* is a memorable bug.
 */
export function springStep(
  state: SpringState,
  target: number,
  dt: number,
  { stiffness = 120, zeta = 0.3, mass = 1 }: { stiffness?: number; zeta?: number; mass?: number } = {},
): SpringState {
  // Clamp the step so a backgrounded tab resuming with a half-second delta does
  // not launch the system.
  const h = Math.min(dt, 1 / 30);
  const omega = Math.sqrt(stiffness / mass);
  const damping = 2 * zeta * omega * mass;

  const force = -stiffness * (state.value - target) - damping * state.velocity;
  const velocity = state.velocity + (force / mass) * h;
  return { value: state.value + velocity * h, velocity };
}

/** Within a hair of the target and barely moving: safe to stop stepping. */
export function atRest(state: SpringState, target: number, epsilon = 0.0015): boolean {
  return Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon;
}
