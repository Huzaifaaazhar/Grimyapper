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
| `npm test` | 63 unit tests — signals, classifier, rubric, decrees, scoring maths, projection model, rate limiter, schemas. |
| `npm run eval` | The golden-set eval harness and drift guard. Runs offline in about a tenth of a second. |
| `npm run train` | Refits the classifier from the labelled corpus and rewrites `lib/model/weights.json`. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Environment variables

There are none you need. The only settings are optional abuse limits:

| Variable | Default | Notes |
|---|---|---|
| `RATE_LIMIT_MAX` | `8` | Requests per IP per window. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Sliding window length. |
| `DAILY_JUDGEMENT_CAP` | `1500` | Ceiling on judgements per UTC day, per instance. |

No key, no model download, no provider account. Deploy it and it works.

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
| Accuracy | **95.1%** |
| Precision | 95.6% |
| Recall | 94.2% |
| F1 | 94.9% |
| Corpus | 287 labelled petitions, 138 / 149 split |
| Model size | 17 KB of JSON, checked into git |

The vocabulary is rebuilt from the training split inside every fold — building it over the
whole corpus first would leak the test fold's vocabulary into the fit and inflate every number
above.

**The decision threshold is 0.45, not 0.5.** The definition says an unclear petition is treated
as engine-built and left to the moat score to judge, so the two errors do not cost the same.
It also happened to be the best F1 in the sweep.

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

## The eval harness

An AI product whose whole premise is "I evaluate things accurately" should not itself be flaky.

```bash
npm run eval    # offline, no key, ~0.1s
```

Because the engine is local, this gates **every commit** instead of being the expensive job
everyone learns to skip. Six gates, all of which must pass:

| Gate | What it proves |
|---|---|
| 1. Routing | Each of the 20 golden cases goes down the right branch. Currently **20/20**. |
| 2. Judgement | Rubric expectations hold — a thin wrapper cannot score 9 on moat. |
| 3. Range | Every rubric value, assumption and monthly row inside its bounds; no empty notes. |
| 4. Arithmetic | Composite weights, band boundaries and the 12-month model still agree. |
| 5. Determinism | The same petition judged twice is byte-identical; decree variety above floor. |
| 6. Robustness | Injection attempts, markup, SQL, gibberish, unicode and floods still produce valid output. |

The golden cases in `evals/cases.ts` are **held out of the training corpus**, and `npm run train`
exits non-zero if one leaks in — so routing accuracy is always measured on unseen text.

**Drift guards.** The run fails if routing accuracy drops below `ROUTING_ACCURACY_THRESHOLD`
(0.9), if any assertion fails, or if the arithmetic moves. CI adds a second guard: it retrains
from scratch and fails if `lib/model/weights.json` differs from the committed file, so nobody
can edit a pattern or add training data without retraining. Training is deterministic, which is
what makes that check sound.

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
