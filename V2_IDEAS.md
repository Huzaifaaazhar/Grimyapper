# V2 ideas

Everything here was thought of *during* the v1 build and deliberately not built. The hard rule
on this project was: no new scope after work begins. An unshipped useless product is just
another unfinished project.

Nothing in this file is a commitment.

## Explicitly deferred in the brief

- **Sharing / OG image generation.** Render the death certificate to a PNG server-side so a
  rejection can be posted straight to LinkedIn without a screenshot. This is the single highest-value
  item on the list — the certificate is the shareable artefact and right now sharing it needs a
  manual crop.
- **A wall of rejected ideas.** A public feed of the funniest recent rejections. Needs a database,
  which needs moderation, which needs a moderation policy. That is a product, not a feature.
- **Saved history / permalinks.** `/judgement/{id}` so a verdict can be linked rather than
  screenshotted. Same dependency: storage.

## Came up while building

- **Distributed rate limiting.** The current limiter is per-instance (see the README's known
  limitation). Upstash Redis or Vercel KV would make the daily cap a real quota instead of a
  per-instance budget guard.
- **Streaming the verdict.** The rejector's output would land much harder revealed line by line —
  cause of death, then time of death, then the eulogy. v1 waits for the whole thing.
- **A "defend yourself" round.** After a rejection, let the founder submit one sentence of rebuttal
  and have the registrar reconsider (it never does).
- **Sensitivity sliders on the projection.** Let the reader drag growth or churn and watch the
  twelve-month table move. The model is already deterministic and in code, so this is cheap — it
  was cut only because it is scope.
- **Comparative scoring.** Show where this idea's composite sits against every other idea judged
  today. Needs storage.
- **Eval expansion.** The golden set is 20 cases. Adversarial cases (prompt injection attempts,
  empty submissions, non-English pitches) are asserted in code but not in the eval set — they
  should be, with an explicit expectation that the model stays in role.
- **Per-axis calibration eval.** Right now the eval asserts bounds on a few axes for a few cases.
  A proper calibration set would have human-labelled rubric scores and measure the evaluator's
  mean absolute error per axis.
- **Cost telemetry.** Log token usage per judgement (never user text) so the daily cap can be
  denominated in dollars rather than requests.
- **A second opinion.** Run the evaluator twice at different temperatures and show the spread.
  Honest about variance, and quietly the most interesting thing on the list.
