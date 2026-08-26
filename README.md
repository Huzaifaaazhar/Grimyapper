# Grimyapper — *Should This Exist?*

**Live: [grimyapper.vercel.app](https://grimyapper.vercel.app)**

A single-page app that judges startup ideas, and has a split personality about it.

- **Pitch an AI startup** → it gets evaluated seriously: a seven-axis rubric, a composite
  success score computed in code, and a deliberately over-precise twelve-month projection of
  users, paying accounts, MRR, burn and cumulative net.
- **Pitch anything else** → it does not get evaluated. It gets a sealed decree of extinction on
  aged parchment, under a wax seal, with a one-line lament explaining which thinking engine ate it.

**It runs no LLM.** Judgement comes from a logistic-regression classifier trained on a labelled
corpus, a transparent per-axis rubric model, and a composed decree generator — 17 KB of weights
and some arithmetic, all in-process. No API key, no model download, no inference service, no
per-request cost, and nothing you type ever leaves the server.

The comedy is the wrapper. The engineering is the point: a real trained classifier with
held-out metrics, features designed against the errors they were meant to fix, a scoring
function that lives in code rather than in a prompt, a deterministic unit-economics model, and
an eval harness fast enough to gate every commit.

## The design

It is set as an illuminated manuscript, because a court that issues sealed decrees should look
like one.

- **Type.** UnifrakturMaguntia (blackletter) for display only — it is beautiful and unreadable
  in quantity. Cinzel, the Renaissance revival of Trajan's inscriptional capitals, for headings
  and labels. EB Garamond, a Claude Garamond of about 1540, for every word of running text.
- **Pigments.** The ones a scriptorium actually had: iron-gall ink, vermilion for rubrication,
  verdigris, lapis, gold leaf. Every pigment that carries text was contrast-checked against the
  parchment before it went in, so the costume never costs legibility. The score bands map to
  vermilion / gold / verdigris — period colours that still read as red, amber, green.
- **The wax is drawn, not styled.** A CSS blob reads as a glossy button. The seal is an SVG disc
  displaced by fractal turbulence so its edge wanders, with a spill of overflow beneath it and a
  signet impression cut by two offset strokes — dark on the upper wall, light on the lower lip —
  so the mark reads as pressed into the wax rather than printed on it.
- **The rubric is a tally, not a bar chart.** Ten lozenges per virtue, inked or left blank, the
  way a count is kept in a ledger. Magnitude is carried by the number of marks, so nothing
  depends on hue.
- **Legibility is never traded for flavour.** Every rubric axis carries its plain modern name and
  a plain modern hint beneath the courtly one; the ledger's medieval column headings each carry
  their ordinary term underneath; and the rubric notes themselves stay in plain, precise English,
  because an investor has to be able to read them and learn something true. The costume is worn
  by the headings and the verdict, never by the analysis.
- **Parchment only.** There is no dark mode for the fifteenth century — a deliberate commitment
  to one look rather than an omission.

---

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
```

That is the whole setup. **There is no API key and no configuration** — the court runs
in-process, so a clone starts working immediately and the deployed site needs no secrets.

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm test` | 90 unit tests — signals, classifier, rubric, decrees, appeals, permalinks, telemetry, rate limiters, scoring maths, projection model, schemas. |
| `npm run eval` | The golden-set eval harness and drift guard. Runs offline in about a tenth of a second. |
| `npm run train` | Refits the classifier and rewrites the three model artefacts. |
| `npm run mine` | Ranks known petitions by distance from the decision boundary — the next ones worth labelling. |
| `npm run smoke` | Checks a running server actually renders. `BASE_URL=https://… npm run smoke` points it at a deploy. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Environment variables

There are none you need. Everything below is optional.

| Variable | Default | Notes |
|---|---|---|
| `RATE_LIMIT_MAX` | `8` | Requests per IP per window. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Sliding window length. |
| `DAILY_JUDGEMENT_CAP` | `1500` | Ceiling on judgements per UTC day. |
| `UPSTASH_REDIS_REST_URL` | — | Set with the token below to move rate-limit counters into Redis, making the cap a real quota across instances instead of a per-instance guard. |
| `UPSTASH_REDIS_REST_TOKEN` | — | |
| `OLLAMA_URL` | — | e.g. `http://127.0.0.1:11434`. Writes the decree's lament with a local model instead of composing it. |
| `OLLAMA_MODEL` | `llama3.2:3b` | Any small local model will do; it writes one sentence. |

No key, no model download, no provider account. Deploy it and it works.

> **On the local model.** It is optional on purpose. The public deploy runs on serverless
> functions with no GPU, ~1GB of memory and a cold start per request — a local model cannot live
> there, and pretending otherwise would be the dishonest option. So the hosted site stays fully
> composed and deterministic, and anyone running Grimyapper on their own machine gets genuinely
> novel prose. It is also never applied to permalinks: those re-derive their judgement, and a
> model would give a different lament each time, so a shared link would stop matching what its
> author saw.

---

## How it works

```
petition
   │
   ▼
CLASSIFIER ─── logistic regression, tf-idf + 20 engineered signals ───┐
   │                                                                  │
  not engine-built                                        engine-built │
   │                                                                  │
   ▼                                                                  ▼
DECREE GENERATOR                                          RUBRIC MODEL
composed from a hand-written corpus,                      7 axes, transparent linear model
seeded by the petition                                             │
                                                                   ▼
                                              code computes the composite, the band,
                                              the six seed assumptions and all 12 rows
```

Everything runs inside one server route. There is no model service, no API key, and no
network call — a judgement is a few hundred microseconds of arithmetic.

### The classifier

**Logistic regression** over two feature blocks:

1. **tf-idf** on word unigrams and bigrams learned from the corpus, sublinear term frequency,
   L2-normalised so a long petition does not outweigh a short one.
2. **Twenty engineered signals** — regex families capturing sentence *shape* rather than
   vocabulary, scaled 1.5× so they are not outvoted by ~500 noisy tf-idf columns.

The signals exist because bag-of-words cannot do this job alone. "A bakery that uses ChatGPT
for captions" and "a model that writes captions" contain almost the same tokens; what separates
them is **what is being sold**, which lives in sentence shape. So `core_model_product`,
`internal_use_shape` and the rest hand that structure to the model directly.

The most useful feature is an **interaction term**. `buzzword_veneer` fires only when an AI
adjective sits on top of a noun from an ordinary trade — "AI-powered premium dog walking" is a
dog-walking business. Neither half means much alone, so the model cannot learn it from the two
features separately; the product has to be handed to it.

**Held-out performance** (5-fold stratified cross-validation, printed by `npm run train`):

| | |
|---|---|
| Accuracy | **93.6%** |
| Precision | 91.5% |
| Recall | 95.8% |
| F1 | 93.6% |
| Corpus | 388 labelled petitions, 190 / 198 split |
| Features | 5,098 learned (766 word, 4,332 character) + 21 signals |
| Model size | 158 KB of JSON, checked into git |

All of it is published at [`/model`](https://grimyapper.vercel.app/model), including the
confusion matrix, the calibration table, every learned signal weight and the twenty petitions it
gets wrong.

> The number was 95.1% on a 287-petition corpus and *fell* when the corpus grew. That is not a
> regression — 101 of the new petitions were chosen precisely because the first model got that
> kind wrong, so the benchmark got harder. Chasing the old number by removing them would have
> improved the metric and the product not at all.

The vocabulary is rebuilt from the training split inside every fold — building it over the
whole corpus first would leak the test fold's vocabulary into the fit and inflate every number
above.

**The decision threshold is 0.45, not 0.5.** The definition says an unclear petition is treated
as engine-built and left to the moat score to judge, so the two errors do not cost the same.
It also happened to be the best F1 in the sweep.

**Confidence is calibrated, not asserted.** Platt scaling fitted on out-of-fold scores takes the
Brier score from 0.065 to 0.055, so "93% certain" now means the model was right about 93% of the
time when it said that. Before, it was distance from the boundary wearing a percent sign.

**Character n-grams are in, and the measurement is worth reading.** On aggregate accuracy they
are worth nothing — 93.0% with, 93.0% without, at six times the features. But aggregate accuracy
is not what they were added for. On held-out cases with characters deliberately corrupted they
are identical up to 10% corruption and worth **+8.4 points at 18%** (83.3% → 91.7%). A narrow
benefit, measured rather than assumed.

Two findings worth reporting, because the model disagreed with the obvious guess:

- **`ai_vocabulary` learned a negative weight.** Merely saying "AI" is *evidence against* being
  an AI startup, which matches how the phrase is actually used.
- **`agency_or_consultancy` is the strongest single signal** in either direction (−1.8). The
  clearest thing about a petition is often what it is *not*.

### The rubric

A transparent linear model per axis: a base, moved by the same signals the classifier reads.
The note under each score is assembled from the terms that actually moved it, so the
explanation cannot drift away from the arithmetic the way a generated one can. When two terms
disagree, both are shown.

### Improving it

`npm run mine` ranks every known petition by how close the model came to flipping. A petition at
p = 0.46 against a 0.45 threshold is a coin toss the model happened to win, and one more label
there moves the boundary further than fifty more examples of something already handled at 0.99.
It also lists anything the model gets *confidently* wrong, which is a different and more urgent
problem — usually a feature firing where it should not.

That is not decoration. Its first run found two confident errors ("a tool that **detects**
duplicate rows", "**classifies** files by their extension") where the inference patterns were
firing on ordinary deterministic software. Fixing them took accuracy from 93.0% to 93.6% and left
zero confident errors behind.

### The decree

There is no model to write prose, so variety comes from structure. The petition is sorted into
one of thirteen trades, each supplying its own undoings, laments and successors, combined
against shared pools and seeded from the petition text. Every line is hand-written, so the
register never slips — the trade-off is that the space is finite rather than infinite. It is
**at least 10,368 distinct decrees per trade**, and the eval fails if that ever drops below 500.

Seeded from the petition, so the same venture always receives the same decree. Judge it twice
and the court does not change its mind.

### What the model decides, and what it doesn't

The rubric model produces seven scores and six seed assumptions. It does **not** produce the
final score, the band, or any of the twelve monthly figures — those come from `lib/scoring.ts`
and `lib/metrics.ts`:

- **Composite** — a weighted mean of the seven axes, normalised to 0–100. Wrapper/platform risk
  and moat carry ×2, problem intensity ×1.5, the rest ×1. Bands: <40 Low, 40–70 Medium, >70 High.
- **Projection** — month 1 is seeded so month 12 lands on `reachable_users_year1`; churn hits
  the existing paying base before the month's new signups convert; burn is flat for v1.

### The rubric axes

| Axis | Weight | What it asks |
|---|---|---|
| Problem intensity | ×1.5 | Must-have, or vitamin? |
| Wrapper / platform risk | ×2 | **Inverted.** 10 = safe. 0 = the providers ship this next week. |
| Moat beyond the model | ×2 | Proprietary data, workflow lock-in, integrations, network effects. |
| Distribution | ×1 | Can they reach customers cheaply? |
| Willingness to pay | ×1 | Real budget, or "cool but free"? |
| Unit economics | ×1 | Do inference costs eat the margin? |
| Timing / half-life | ×1 | How fast does model progress obsolete it? |

A thin wrapper is still an AI startup — it gets evaluated, and then the moat and wrapper-risk
axes do the judging.

## What else it does

### Permalinks, with no database
Every stage of the court is deterministic, so a judgement does not need to be *stored* to be
linkable. `/j/{token}` carries the petition in the token and re-derives the identical verdict on
arrival. That is permalinks, saved history and sharing with no storage, no ids, no moderation
queue and nothing to leak.

It has one cost, named plainly rather than buried: anyone can craft a link containing any text
and it renders on this site's domain under this site's branding. `lib/permalink-guard.ts` refuses
to reprint contact details — the doxxing route, and the one with a real victim — and permalinks
are never indexed, so a crafted link cannot be laundered into a search result. It makes no claim
to detect abuse in general; that needs a moderation service, which is the honest reason the
public "wall of rejected ideas" is still not built.

### Share images
The decree and the assay each render to a 1200×630 PNG through `next/og`, wired to the permalink
as `og:image`, cached at the edge because the image is a pure function of the token.

### The appeal
After a rejection the founder may address the court once. The court's line is that it has never
reconsidered, and the framing keeps the joke — but the mechanism is honest: the rebuttal is
appended and the classifier genuinely runs again. A rebuttal that redefines *what is being sold*
wins the appeal; one that merely mentions a model as an ingredient does not, which is exactly
what the definition says. A rigged "it never works" would have been easier and much worse.

### Sliders on the projection
Growth, conversion, price and churn are draggable and the twelve months re-run instantly. The
most honest way to present numbers this invented is to hand over the dials — and to report the
range the twelfth month lands in when growth and churn move by a fifth.

### A smoke test, because a 200 is not proof

`npm run smoke` boots the built server and asserts on the *markup*, not the status code.

It exists because of one specific bug. A relative `og:image` with no `metadataBase` resolves to
localhost in development — a warning — and **throws in production**. The page body rendered
perfectly, so the build, the unit tests, the eval and a `curl` all passed, while the rejected
metadata promise blanked the page on hydration with "Application error: a client-side exception
has occurred".

React leaves two fingerprints when that happens, and both are cheap to look for:
`data-dgst` on a failed boundary, and `"error":"$Z"` for a rejected promise. Neither appears in
a status code. CI runs the smoke test with `VERCEL_PROJECT_PRODUCTION_URL` set so metadata
resolves the way it does on the deploy, which is the half that only ever broke remotely.

It found a second bug on its first run: `/j/not-a-real-token` is valid base64url, and the default
`TextDecoder` substitutes replacement characters rather than rejecting — so a typo'd link decoded
to mojibake, passed validation, and got a straight-faced judgement instead of a 404.

### /model
The held-out metrics, the confusion matrix, the calibration table, every learned signal weight,
the per-axis rubric error, the petitions it gets wrong, and where live judgements land on the
probability scale. A product that claims to judge accurately should publish how often it does
not.

The live counter records **probability and branch only** — petition text is never passed to it,
so there is nothing there that could identify a submission.

## The eval harness

An AI product whose whole premise is "I evaluate things accurately" should not itself be flaky.

```bash
npm run eval    # offline, no key, ~0.1s
```

Because the engine is local, this gates **every commit** instead of being the expensive job
everyone learns to skip. Six gates, all of which must pass:

| Gate | What it proves |
|---|---|
| 1. Routing | Each strictly-expected golden case goes down the right branch. Currently **22/22**. |
| 2. Judgement | Rubric expectations hold — a thin wrapper cannot score 9 on moat. |
| 3. Range | Every rubric value, assumption and monthly row inside its bounds; no empty notes. |
| 4. Arithmetic | Composite weights, band boundaries and the 12-month model still agree. |
| 5. Determinism | The same petition judged twice is byte-identical; decree variety above floor. |
| 6. Calibration | The rubric stays within 2 points per axis of hand-scored labels. Currently **1.43** overall. |

33 golden cases in all. The other 11 are adversarial and non-English petitions, asserted
**well-formed rather than routed**: a model trained on English has no business claiming to route
German correctly, and an injection string is not really either kind of venture. What they must do
is come back valid, in range and free of echoed input, and that is what is checked.

The golden cases in `evals/cases.ts` are **held out of the training corpus**, and `npm run train`
exits non-zero if one leaks in — so routing accuracy is always measured on unseen text.

**Drift guards.** The run fails if routing accuracy drops below `ROUTING_ACCURACY_THRESHOLD`
(0.9), if the rubric drifts from its labels, if any assertion fails, or if the arithmetic moves.
CI adds a second guard: it retrains from scratch and fails if any of the three committed model
artefacts (`weights.json`, `report.json`, `score-distribution.json`) differs, so nobody can edit
a pattern or add training data without retraining. Training is deterministic — verified — which
is what makes that check sound.

Raise the threshold as the model improves; never lower it quietly.

## Security

`security-preflight` was run over the codebase before deploy; full findings are in
[`SECURITY-PREFLIGHT.md`](./SECURITY-PREFLIGHT.md). Moving off a hosted model removed three
whole categories of risk rather than mitigating them:

| Area | State |
|---|---|
| Secrets | **There are none.** No API key, no provider account, nothing to leak, rotate or rate-limit. |
| Third-party data flow | **None.** Petitions are judged in-process and never leave the server. Nothing is stored, logged or transmitted. |
| Prompt injection | **Not applicable.** There is no prompt and no model to instruct. The eval still asserts that injection attempts produce ordinary judgements. |
| Cost abuse | **Eliminated.** A judgement costs CPU microseconds, not money. Rate limiting stays, but it now guards CPU rather than a budget. |
| Input limits | 600 chars of petition, 4 KB of body, checked before parsing. |
| Output validation | The same zod contracts the model output used to face. A scorer bug surfaces as an error, not a rubric of elevens. |
| Errors | Generic text only. No stack traces, no internals. |
| Headers | Nonce-based CSP with `strict-dynamic`, HSTS, `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, restrictive `Permissions-Policy`. |

The rate limiter is still in-process, so on Vercel the effective ceiling is roughly
*(cap × warm instances)*. That mattered when every request spent money; now it only guards
against someone wasting CPU, and the worst case is a slow page rather than a bill.

These checks catch the mistakes behind most real-world breaches in fast-built apps, but they are
not a substitute for professional security testing.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Recharts · zod · Vitest · deployed on
Vercel. **No ML runtime, no model download, no inference service** — the classifier is 17 KB of
JSON and about eighty lines of arithmetic. No database, no auth, no API key, no state beyond
React.

Both projection charts are drawn in the same ink on purpose. Each panel holds one series and is
named by its own heading, so colour has nothing left to encode — and two measures on different
scales never share one pair of axes, which is the ordinary way a chart lies.

## Scope

v1 is the flow above and nothing else. Ideas that arrived after work began live in
[`V2_IDEAS.md`](./V2_IDEAS.md), which is where they stay.

## Disclaimer

Projections are confidently made up. So is most of a seed deck. Grimyapper is entertainment,
not investment advice.
