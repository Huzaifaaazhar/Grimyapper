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

## Came up after moving to a local model

- **Grow the corpus.** 287 labelled petitions is small. The clearest path to a better classifier
  is another few hundred, especially in the classes that still fail: consumer generative
  products framed as retail, and plain software that merely sounds technical.
- **Active learning.** Log only the *probability* of each judgement (never the petition text)
  and surface the ones nearest the 0.45 boundary. Those are the examples worth labelling next,
  and labelling them is worth more than any amount of feature tinkering.
- **Calibration.** Reported confidence is distance from the boundary, which is honest but not
  calibrated. Platt scaling or isotonic regression on a held-out split would make "93% certain"
  mean what it says.
- **Per-axis rubric calibration.** The rubric model is hand-weighted. A set of human-labelled
  rubric scores would let it be fitted rather than asserted, and would give a real error bar per
  axis instead of an opinion.
- **A small local LLM for the decree only.** Ollama with Llama 3.2 3B or Qwen2.5 1.5B behind an
  `OLLAMA_URL` env var, used solely for the lament, with the composed corpus as the fallback
  whenever it is absent. Keeps the public deploy working while giving genuinely novel prose
  wherever someone runs it themselves.
- **Character n-grams.** Word bigrams miss morphology. Character 3–5 grams would help with
  typos, compounds and non-English petitions, at the cost of a larger weights file.
- **Publish the confusion matrix.** The training script already computes it; a small page
  showing which petitions the model gets wrong would be the most honest thing on the site.

## Came up while building

- **Distributed rate limiting.** The current limiter is per-instance. This mattered far more when
  every request spent money; now it only guards CPU, which is why it has dropped down the list.
- **Revealing the decree line by line.** It would land harder unsealed in order — the undoing,
  then the hour, then the lament. Judgement is now instant, so this would be pure theatre, which
  is arguably the point.
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
