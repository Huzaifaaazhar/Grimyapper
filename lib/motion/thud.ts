/**
 * The thud, synthesised rather than shipped as a file.
 *
 * A sample would mean an asset with a licence to track; this is an oscillator
 * and two envelopes, which costs nothing and can be tuned by ear in code.
 *
 * **Silent by default.** Nothing plays until `enableSound()` has been called
 * from a real user gesture. Browsers block autoplay anyway, but the point here
 * is editorial rather than technical: a verdict page that makes a noise at
 * someone who did not ask for one is rude, and a muted `<audio>` that unmutes
 * itself on the second visit is worse.
 */

let ctx: AudioContext | null = null;
let armed = false;

/** Call from a click or key press. Until then `thud()` does nothing. */
export function enableSound(): void {
  armed = true;
}

export function soundEnabled(): boolean {
  return armed;
}

function context(): AudioContext | null {
  if (!armed || typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Safari suspends the context until a gesture; resuming is a no-op otherwise.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/**
 * One low impact: a sine swept downward with a fast attack and a long tail,
 * plus a short noise transient for the slap of contact.
 *
 * The sweep is what makes it read as weight. A fixed-pitch sine is a beep; a
 * pitch falling from 150Hz to 40Hz over a fifth of a second is a thing landing.
 */
export function thud(): void {
  const ac = context();
  if (!ac) return;

  const now = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.35;
  out.connect(ac.destination);

  // The body.
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(1, now + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

  osc.connect(env).connect(out);
  osc.start(now);
  osc.stop(now + 0.8);

  // The contact transient: 40ms of filtered noise.
  const frames = Math.floor(ac.sampleRate * 0.04);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;

  const noiseEnv = ac.createGain();
  noiseEnv.gain.setValueAtTime(0.5, now);
  noiseEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  noise.connect(lp).connect(noiseEnv).connect(out);
  noise.start(now);

  // Everything above is garbage once it has rung out.
  window.setTimeout(() => out.disconnect(), 1000);
}
