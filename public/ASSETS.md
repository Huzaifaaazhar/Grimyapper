# Third-party assets and licences

Every asset in this repository that did not originate here is logged below,
with where it came from and what its licence permits.

## Fonts

| Asset | Source | Licence |
|---|---|---|
| `assets/fonts/CrimsonPro-Regular.ttf` | [Crimson Pro](https://github.com/Fonthausen/CrimsonPro) | SIL OFL 1.1 — see `assets/fonts/OFL.txt` |
| `assets/fonts/CrimsonPro-Bold.ttf` | Crimson Pro | SIL OFL 1.1 |
| UnifrakturMaguntia, Cinzel, EB Garamond | Google Fonts, self-hosted by `next/font/google` at build time | SIL OFL 1.1 |

## Rive animations

**None.** This is deliberate, and worth recording rather than leaving as an
apparent omission.

The motion brief asked for Rive state machines for the character-like elements
(the scales of judgement, a quill hand, a herald). `.riv` files are a compiled
binary format authored in the Rive editor, which is a GUI application. Nothing
in this toolchain can produce one, so the only route would have been to take a
community file.

That was rejected on two grounds:

1. **Licensing.** Rive Community files are shared under varying terms and many
   carry no explicit licence at all. Shipping one into a public repository
   without a licence that clearly permits redistribution and commercial use is
   not a defensible position, and verifying that per-file is not something this
   environment can do reliably.
2. **Fit.** The scales need to settle *toward a specific verdict* with damping
   that the app controls. A sourced rig would have its own state machine, its
   own inputs and its own timing, and bending it to this would cost more than
   writing the motion directly.

So the scales are driven by a real damped-spring integrator in
`lib/motion/physics.ts` instead — overshoot, oscillation and settle, with the
damping ratio and target angle as parameters. That is the behaviour Rive was
asked for, built where it can be tuned against the rest of the timeline.

If a licensed `.riv` is supplied later, `components/three/Scales.tsx` is the
single place it would slot into.

## Audio

| Asset | Source | Licence |
|---|---|---|
| The execution thud | Synthesised at runtime from a WebAudio oscillator and gain envelope in `lib/motion/thud.ts` | n/a — no file, generated in the browser |

No audio file is shipped. The thud is a damped sine sweep built from primitives,
which avoids a licensing question entirely and is muted by default: it plays
only after an explicit user gesture enabling sound.
