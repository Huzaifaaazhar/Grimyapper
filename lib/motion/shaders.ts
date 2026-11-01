/**
 * GLSL shared by the flame, the burn dissolve and the particles.
 *
 * Kept as one module so the noise basis is identical everywhere. Two shaders
 * using different noise implementations will drift out of phase, and in a scene
 * where a flame is supposed to be *lighting* the thing next to it, that reads
 * instantly as fake.
 */

/**
 * Ashima/Ian McEwan simplex noise, the standard WebGL1-safe implementation.
 * Public domain / MIT (https://github.com/ashima/webgl-noise), logged in
 * public/ASSETS.md terms as a code snippet rather than a binary asset.
 */
export const SIMPLEX_3D = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

/** Four-octave fractal noise built on the simplex above. */
export const FBM_3D = /* glsl */ `
float fbm3(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += snoise(p) * a;
    p *= 2.07;   // off-integer, so octaves never re-align into a visible beat
    a *= 0.5;
  }
  return s;
}
`;

/* ------------------------------------------------------------------ flame */

export const FLAME_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * The flame body.
 *
 * Built as a signed field rather than a drawn shape: a teardrop mask is
 * distorted by rising noise, and the colour is taken from how far inside that
 * field the fragment sits. That ordering matters — colouring a fixed silhouette
 * gives you a flickering *drawing*, which is what the old SVG candle was. Here
 * the silhouette itself is what moves, so the edges tear and re-form the way
 * combustion actually looks.
 *
 * Three bands, in the order a real flame has them from the wick up:
 *   - a blue base where the gas burns hottest and cleanest,
 *   - a white-hot core,
 *   - a long amber tongue fading to transparent at the tip.
 */
export const FLAME_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uFlicker;  // shared with the point light; see lib/motion/physics.ts
uniform float uSway;
uniform float uIntensity;

${SIMPLEX_3D}
${FBM_3D}

void main(){
  vec2 uv = vUv;

  // Lean the whole flame with the draught, more at the tip than the base.
  uv.x += uSway * 0.08 * pow(uv.y, 2.0);

  // Centre horizontally; y runs 0 at the wick to 1 at the tip.
  vec2 p = vec2(uv.x - 0.5, uv.y);

  // Rising turbulence. Subtracting time from y makes the noise travel upward,
  // which is what gives the tongue its licking motion.
  float n = fbm3(vec3(p * 3.2, uTime * 1.6 - uv.y * 2.4));

  // The teardrop: pinched at the wick, swelling just above it, tapering to the
  // tip. The first pass was widest at y=0, which gave the flame a flat base and
  // made it read as a tube rather than something attached to a wick.
  float swell = smoothstep(0.0, 0.13, uv.y);
  float width = 0.26 * swell * (1.0 - pow(uv.y, 1.6)) * (0.82 + uFlicker * 0.3);
  float d = abs(p.x) - width;

  // Let the noise eat into the edge. Scaled by height so the base stays stable
  // and only the upper flame tears.
  d += n * 0.085 * smoothstep(0.0, 0.45, uv.y);

  // Inside-ness, 1 at the axis falling to 0 at the torn edge. The ramp is wide
  // on purpose: a tight one quantises into visible bands once the additive
  // blend lands in an 8-bit buffer.
  float body = 1.0 - smoothstep(-0.055, 0.06, d);
  // Cut the flame off below the wick and above the tip.
  body *= smoothstep(0.0, 0.06, uv.y) * (1.0 - smoothstep(0.72, 1.0, uv.y));

  if (body <= 0.001) discard;

  // How deep inside the body this fragment is: drives the colour ramp.
  float core = 1.0 - smoothstep(0.0, 0.5, abs(p.x) / max(width, 0.001));
  float heat = core * (1.0 - smoothstep(0.1, 0.62, uv.y));

  vec3 blue  = vec3(0.26, 0.45, 1.0);
  vec3 white = vec3(1.0, 0.96, 0.82);
  vec3 amber = vec3(1.0, 0.62, 0.16);
  vec3 deep  = vec3(0.86, 0.22, 0.04);

  // Base → core → tongue → cooling tip.
  vec3 col = mix(deep, amber, smoothstep(0.0, 0.45, heat));
  col = mix(col, white, smoothstep(0.52, 0.92, heat));
  // The blue sits only in the lowest slice, where it belongs.
  /*
   * The blue sits in the lowest slice only, but strongly — it is the single cue
   * that reads as combustion rather than as a glowing shape.
   *
   * Written as 1.0 - smoothstep(lo, hi, y), NOT smoothstep(hi, lo, y). The
   * latter has edge0 > edge1, which GLSL leaves explicitly undefined; it
   * silently returned nothing useful and the blue base never appeared at all.
   */
  float base = 1.0 - smoothstep(0.02, 0.22, uv.y);
  col = mix(col, blue, base * core);

  float alpha = body * (0.55 + uFlicker * 0.45) * uIntensity;
  gl_FragColor = vec4(col * (0.75 + uFlicker * 0.55), alpha);
}
`;

/* ----------------------------------------------------------- heat shimmer */

/**
 * Screen-space refraction above the flame.
 *
 * Samples whatever has already been rendered, offset by a noise field that
 * rises and widens with height, so the parchment and the text visibly wobble in
 * the column of hot air rather than the shimmer being a separate decorative
 * layer floating in front of them.
 */
export const SHIMMER_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform float uTime;
uniform float uFlicker;
uniform float uStrength;
uniform vec2 uOrigin;   // the flame tip, in screen space

${SIMPLEX_3D}

void main(){
  vec2 d = vUv - uOrigin;

  // Only above the flame, and only within a cone that widens as it rises.
  float height = max(d.y, 0.0);
  float cone = 1.0 - smoothstep(0.0, 0.08 + height * 0.5, abs(d.x));
  float fade = (1.0 - smoothstep(0.0, 0.42, height)) * cone;

  if (fade <= 0.001) { gl_FragColor = texture2D(uScene, vUv); return; }

  float n1 = snoise(vec3(vUv * 18.0, uTime * 1.1));
  float n2 = snoise(vec3(vUv * 31.0 + 5.3, uTime * 1.7));

  // Mostly lateral: hot air rises in columns, so the horizontal wobble is the
  // one that reads. Vertical offset is half, which keeps text legible.
  vec2 offset = vec2(n1, n2 * 0.5) * 0.004 * uStrength * fade * (0.6 + uFlicker * 0.7);
  gl_FragColor = texture2D(uScene, vUv + offset);
}
`;

/* ------------------------------------------------------------ burn dissolve */

/**
 * The warrant catching fire.
 *
 * `uProgress` is a threshold swept across a noise field, so the paper goes in a
 * ragged front rather than a wipe. The front itself is drawn in two bands —
 * char behind, incandescent edge at the boundary — because a dissolve without a
 * glowing edge reads as the texture being erased, not burned.
 *
 * `uOrigin` is the corner it catches at, and distance from it is folded into
 * the threshold so the burn genuinely spreads from one point inward.
 */
export const BURN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPage;
uniform float uProgress;
uniform float uTime;

${SIMPLEX_3D}
${FBM_3D}

void main(){
  vec4 page = texture2D(uPage, vUv);

  // Ragged front: large-scale noise for the overall shape, fine noise for the
  // frayed edge of the char line.
  float coarse = fbm3(vec3(vUv * 4.5, 0.0)) * 0.5 + 0.5;
  float fine   = fbm3(vec3(vUv * 22.0, uTime * 0.3)) * 0.5 + 0.5;
  float grain  = coarse * 0.78 + fine * 0.22;

  /*
   * Spread from the chosen corner. Normalised by the corner-to-corner distance
   * so reach is 0..1 whatever the page aspect, which keeps the front's
   * travel predictable: at uProgress 1 the whole leaf is guaranteed gone.
   */
  float reach = distance(vUv, vec2(0.02, 0.98)) / 1.386;
  float field = grain * 0.34 + reach * 0.66;

  /*
   * Only just over-travels. At 1.3 the leaf was gone by progress 0.84 and the
   * last sixth of the sequence played to an empty frame; the burn should finish
   * as the seal arrives, not well before it.
   */
  float front = uProgress * 1.12;

  // A wide band: the char and the ember line both have to be legible at speed,
  // and a tight front reads as a wipe rather than as burning.
  float band = 0.14;
  if (field < front - band) discard;

  float edge = smoothstep(front - band, front, field);

  // Char: the paper darkens and loses saturation before it goes.
  vec3 char_ = mix(vec3(0.06, 0.04, 0.03), page.rgb, smoothstep(0.0, 0.5, edge));

  // The incandescent line, vermilion through gold, hottest right at the front.
  float ember = (1.0 - edge) * smoothstep(front - band, front - band * 0.15, field);
  vec3 emberCol = mix(vec3(0.61, 0.17, 0.13), vec3(1.0, 0.78, 0.26), pow(ember, 0.6));

  vec3 col = mix(char_, emberCol, ember);
  // Bloom picks this up: the edge is pushed well above 1.
  col += emberCol * ember * 1.6;

  gl_FragColor = vec4(col, page.a);
}
`;

/* --------------------------------------------------------------- gold leaf */

/**
 * Burnished gold with a specular sweep travelling across it.
 *
 * Two things separate real gold leaf from a yellow fill. First, it is
 * *anisotropic*: the burnishing leaves directional grain, so the highlight is a
 * streak along the grain rather than a round hotspot. Second, the metal is
 * almost entirely reflection — its colour comes from what it reflects, tinted,
 * not from a diffuse term. Both are faked here rather than ray-traced: a moving
 * band provides the reflection, the grain stretches it, and the result is
 * tinted by the gold tokens the rest of the app already uses.
 *
 * uSweep runs 0..1 and is driven by the timeline, so the light passes once on
 * cue rather than looping on its own clock.
 */
export const GOLD_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uSweep;    // position of the travelling highlight, 0..1
uniform float uReveal;   // how much of the leaf has been gilded, 0..1
uniform float uSeed;

${SIMPLEX_3D}

void main(){
  // Burnishing grain: fine, directional, and fixed to the surface.
  float grain = snoise(vec3(vUv.x * 160.0, vUv.y * 9.0, uSeed)) * 0.5 + 0.5;

  /*
   * The gilding front, travelling along the diagonal the border is traced on.
   *
   * Written as 1.0 - smoothstep(front, along): the leaf is gilded BEHIND the
   * front. The first version compared against 1.0 - along, which meant that at
   * uReveal 1 only the last sixteenth of the surface passed and everything else
   * was discarded, so no gold ever appeared at all.
   */
  float along = (vUv.x * 0.62 + vUv.y * 0.38);
  float gilded = 1.0 - smoothstep(uReveal - 0.02, uReveal + 0.16, along);
  if (gilded <= 0.001) discard;

  // The sweep: a narrow band crossing at an angle, stretched along the grain
  // so it reads as a streak rather than a disc.
  float band = 1.0 - abs(along - uSweep) * 7.0;
  band = max(band, 0.0);
  float spec = pow(band, 2.4) * (0.55 + grain * 0.75);

  vec3 deep   = vec3(0.541, 0.392, 0.071);   // --color-gilt-deep  #8a6412
  vec3 gold   = vec3(0.831, 0.686, 0.216);   // --color-gilt       #d4af37
  vec3 lit    = vec3(0.953, 0.847, 0.525);   // --color-gilt-lit   #f3d886
  vec3 white  = vec3(1.0, 0.98, 0.9);

  // Base metal, varied by the grain so it is never a flat fill.
  vec3 col = mix(deep, gold, grain);
  col = mix(col, lit, spec * 0.85);
  // The very centre of the sweep blows past white: bloom picks this up.
  col = mix(col, white, pow(band, 7.0));

  // A hot rim right at the gilding front, as the leaf catches.
  float front = 1.0 - smoothstep(0.0, 0.07, abs(along - uReveal));
  col += lit * front * 0.9;

  gl_FragColor = vec4(col, gilded);
}
`;
