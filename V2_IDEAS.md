# V2 ideas — built

Everything in this file was originally written down as *deliberately not built*: the v1 rule was
no new scope after work begins. That rule has since been lifted on purpose, and this is the
record of what happened to each item.

**Fifteen of seventeen shipped. Two could not, and one of those was reinterpreted rather than
abandoned.** The reasons are below, item by item, including where the honest answer turned out
to be "measure it, then don't ship it".

---

## Shipped

### Sharing / OG image generation
The decree and the assay both render to a 1200×630 PNG through `next/og`, wired to the permalink
as `og:image`. Satori cannot use the `next/font` faces the site is set in, so Crimson Pro is
committed under `assets/fonts` (OFL) and forced into the deploy with `outputFileTracingIncludes`.
The first render overflowed its own card, which is the kind of thing only looking at the output
catches.

### Saved history / permalinks
Done **without a database**, which was the dependency that originally blocked it. Every stage of
the court is deterministic, so a judgement does not need to be *stored* to be linkable — the
token carries the petition and the verdict is re-derived identically on arrival. `/j/{token}`.

### A wall of rejected ideas — **not built**
This still needs a database, and the database was never the hard part: a public feed of
user-submitted content needs moderation, and moderation needs either staff or a service. See
[Not built](#not-built).

### Grow the corpus
287 → 388 labelled petitions, added specifically in the classes the first model got wrong rather
than more of what it already handled. Accuracy *fell* on the first retrain, because the new
examples were deliberately harder; fixing the features it exposed took it back up.

### Active learning
`npm run mine` ranks every known petition by distance from the decision boundary — those are the
examples worth labelling next. It found two confidently-wrong cases on its first run ("a tool
that **detects** duplicate rows", "**classifies** files by their extension") where the inference
patterns were firing on deterministic software. Fixing those took accuracy from 93.0% to 93.6%.
Live judgements are counted the same way at `/model`, probability only.

### Calibration
Platt scaling, fitted on out-of-fold scores. Brier **0.065 → 0.055**. Reported confidence is now
the calibrated probability of the branch taken, not distance from the boundary wearing a percent
sign. The reliability table is published at `/model`.

### Per-axis rubric calibration
Twelve petitions hand-scored on all seven axes (`evals/rubric-labels.ts`), with mean absolute
error measured per axis and gated in the eval. Currently **1.43 points out of ten** overall.
Stated plainly there and here: these are one author's labels, so this catches drift rather than
proving correctness.

### A small local LLM for the decree only
`OLLAMA_URL` + `OLLAMA_MODEL` and the lament — only the lament — is written by a local model,
with the composed corpus as the default rather than the fallback. Deliberately **not** applied on
permalinks: those re-derive their judgement, and a model would give a different lament each time,
so a shared link would stop matching what its author saw. Determinism is why permalinks need no
database and it is not worth trading for prose.

### Character n-grams — **shipped, but the measurement is the interesting part**
On aggregate held-out accuracy they are worth **nothing**: 93.0% with, 93.0% without, at six
times the features. But aggregate accuracy is not what they were for. Measured on the thing they
were actually added for — held-out cases with characters deliberately corrupted — they are
identical up to 10% corruption and worth **+8.4 points at 18%** (83.3% → 91.7%). So they buy
robustness to heavily mangled input and nothing else, which is a real if narrow benefit. Shipped
with the numbers recorded rather than quietly assumed to have helped.

### Publish the confusion matrix
`/model` publishes the held-out metrics, the confusion matrix, the calibration table, every
learned signal weight, the per-axis rubric error, the twenty petitions it gets wrong, and where
live judgements land. It is the most honest thing on the site.

### Distributed rate limiting
The limiter is now a pluggable store. Memory is the default; set `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` and the counters move to Redis over its REST API, making the cap a
real quota across instances. Tested against a mocked transport. It **fails open** when the store
is unreachable — correct here specifically because what is being guarded is CPU rather than
money; with a hosted model behind it, the safe direction would be the opposite.

### Revealing the decree line by line
The decree unseals in order — the venture, the undoing, the hour, the successor, then the lament.
Reduced-motion gets all of it at once.

### A "defend yourself" round
The court's line is that it has never once reconsidered, and the framing keeps the joke. The
mechanism is honest: the rebuttal is appended and the classifier genuinely runs again. A rebuttal
that *redefines what is being sold* wins the appeal; one that merely mentions a model as an
ingredient does not — which is exactly what the definition says, and why the joke survives a real
implementation. A rigged "it never works" would have been easier and much worse.

### Sensitivity sliders on the projection
Growth, conversion, price and churn are draggable and the whole twelve months re-runs in under a
millisecond. The most honest way to present numbers this invented is to hand over the dials.

### Comparative scoring — **reinterpreted**
"Against every other idea judged today" needs somewhere to keep today's verdicts. Comparing
against the corpus distribution needs nothing, is identical for every visitor, and does not shift
because of who else happened to turn up — which makes it the more honest comparison as well as
the cheaper one. Computed at training time into `score-distribution.json`.

### Eval expansion
The golden set went 20 → 33 cases. Adversarial and non-English petitions are now cases in their
own right rather than assertions buried in code, with a third expectation — `'any'` — for cases
where demanding a particular branch would be dishonest. A model trained on English petitions has
no business claiming to route German correctly; what it must do is never break, and that is what
is asserted.

### A second opinion — **reinterpreted**
The original idea was to run the evaluator twice at different temperatures and show the spread.
There is no temperature: the engine is deterministic and has no variance to sample. But the
*point* — being honest about how little the headline figure is worth — survives. Perturbing
growth and churn by a fifth and reporting the range the twelfth month lands in does the same job
truthfully.

### Cost telemetry — **superseded**
"Log token usage so the daily cap can be denominated in dollars." There are no tokens and no
dollars. What replaced it is the probability-only telemetry at `/model`, which measures the thing
that actually varies now: how often the model is unsure.

---

## Not built

### A wall of rejected ideas
Needs a database, and more importantly needs moderation. Building the feed is a day; running a
public feed of anonymous user-submitted content responsibly is a permanent obligation, and the
project has no one to carry it. The permalink work covers the part people actually wanted —
sharing a specific judgement — without taking that on.

The same reasoning is why `lib/permalink-guard.ts` refuses to reprint contact details but makes
no claim to detect abuse in general: partial content filtering is honest, and pretending it is
moderation would not be.

---

## New, from doing the above

- **Better rubric labels.** The calibration set has one labeller. Several independent scorers
  would let the *disagreement between them* be measured first, which is the floor below which no
  model's error can meaningfully fall.
- **A held-out typo corpus.** The character-gram benefit was measured with synthetic corruption.
  Real misspellings are not uniformly random and would be a better test.
- **Signed permalinks.** Would not stop abusive content — an abuser can put the same text through
  the form — but would stop hand-crafted links entirely, which narrows the surface.
- **Per-trade decree corpora as data.** The decree pools are in TypeScript. As data they could be
  contributed to without touching code.
