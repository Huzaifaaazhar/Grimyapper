# Grimyapper — *Should This Exist?*

**Live: [grimyapper.vercel.app](https://grimyapper.vercel.app)**

A single-page app that judges startup ideas, and has a split personality about it.

- **Pitch an AI startup** → it gets evaluated seriously: a seven-axis rubric, a composite
  success score computed in code, and a deliberately over-precise twelve-month projection of
  users, paying accounts, MRR, burn and cumulative net.
- **Pitch anything else** → it does not get evaluated. It gets a death certificate, on aged
  paper, with a red `REJECTED` stamp and a one-line eulogy explaining which AI feature ate it.

The comedy is the wrapper. The engineering is the point: a classifier, structured outputs
validated with zod, a scoring function that lives in code rather than in a prompt, a
deterministic unit-economics model, an eval harness with a build gate, and a route that keeps
the API key server-side and rate-limits strangers.

---

## Run it

```bash
npm install
cp .env.example .env.local     # then put a real ANTHROPIC_API_KEY in it
npm run dev                    # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm test` | 31 unit tests — scoring maths, projection model, rate limiter, schemas. No API key needed. |
| `npm run eval` | The golden-set eval harness. **Needs an API key** — it makes real calls. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **yes** | — | Server-side only. Never prefix it with `NEXT_PUBLIC_`. |
| `JUDGE_MODEL` | no | `claude-haiku-4-5` | All three LLM roles use one model. |
| `RATE_LIMIT_MAX` | no | `8` | Requests per IP per window. |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Sliding window length. |
| `DAILY_JUDGEMENT_CAP` | no | `1500` | Hard ceiling on judgements per UTC day, per instance. |

On Vercel, set these under **Project → Settings → Environment Variables**. `ANTHROPIC_API_KEY`
belongs to Production, Preview and Development, then redeploy.

> **The live deploy needs its key set.** Until `ANTHROPIC_API_KEY` exists in the Vercel project,
> the page loads and the form works, but every submission returns a 503 — deliberately, so a
> missing key looks like a missing key and not like an Anthropic outage. Add the key, redeploy,
> and both branches come alive. While you are in the dashboard, set a spend cap on the key and
> turn on Vercel's firewall rate limiting for `/api/judge`; those are the two residual items
> from the security preflight that code in this repo cannot close.

---

## How it works

```
pitch
  │
  ▼
CLASSIFIER ──── is this an AI startup? ────┐
  │                                        │
  no                                      yes
  │                                        │
  ▼                                        ▼
REJECTOR                               EVALUATOR
death certificate                      rubric 0–10 × 7  +  six seed assumptions
(comedy only, no numbers)                       │
                                                ▼
                                       code computes the composite score,
                                       the band, and all twelve monthly rows
```

All three roles run behind one server route, `POST /api/judge`. The browser never talks to
Anthropic and never sees the key.

### What the model decides, and what it doesn't

The evaluator returns rubric scores and **six seed assumptions** — reachable users, growth,
conversion, price, churn, burn. It is explicitly *not* asked for the final score, the band, or
any of the twelve monthly figures. Those come from `lib/scoring.ts` and `lib/metrics.ts`:

- **Composite** — a weighted mean of the seven axes, normalised to 0–100. Wrapper/platform risk
  and moat carry ×2, problem intensity ×1.5, the rest ×1. Bands: <40 Low, 40–70 Medium, >70 High.
- **Projection** — month 1 is seeded so month 12 lands on `reachable_users_year1`; churn hits the
  existing paying base before the month's new signups convert; burn is flat for v1.

That split is deliberate. It makes the numbers consistent between runs, unit-testable, and
impossible for the model to hallucinate into incoherence.

### The rubric

| Axis | Weight | What it asks |
|---|---|---|
| Problem intensity | ×1.5 | Must-have, or vitamin? |
| Wrapper / platform risk | ×2 | **Inverted.** 10 = safe. 0 = OpenAI ships this next week. |
| Moat beyond the model | ×2 | Proprietary data, workflow lock-in, integrations, network effects. |
| Distribution | ×1 | Can they reach customers cheaply? |
| Willingness to pay | ×1 | Real budget, or "cool but free"? |
| Unit economics | ×1 | Do inference costs eat the margin? |
| Timing / half-life | ×1 | How fast does model progress obsolete it? |

A thin GPT wrapper is still an AI startup — it gets evaluated, and then the moat and wrapper-risk
axes do the judging.

---

## The eval harness

An AI product whose whole premise is "I evaluate things accurately" should not itself be flaky.

```bash
npm run eval
```

**20 golden cases** in `evals/cases.ts`, across five groups: unambiguous AI startups,
thin GPT wrappers, unambiguous non-AI businesses, "uses AI but isn't an AI startup"
(the bakery-with-ChatGPT case), and one genuinely ambiguous pitch.

It checks three things:

1. **Routing** — does the classifier send each case down the branch it should?
2. **Range** — are the evaluator's rubric values and assumptions inside their bounds?
3. **Judgement** — do the cases with rubric expectations meet them? A thin wrapper that scores
   9 on moat is a broken evaluator, not a difference of opinion.

Plus an offline check that the composite score still equals the weighted mean and the band
boundaries haven't moved — that one runs without an API key.

**Prompt-drift guard.** The run exits non-zero if routing accuracy falls below
`ROUTING_ACCURACY_THRESHOLD` (currently 0.9), if any range or judgement assertion fails, or if
the offline maths check fails. `.github/workflows/ci.yml` runs it on every change to a prompt,
a schema, or the scoring code — so a prompt edit that quietly breaks routing fails the build
instead of shipping. Raise the threshold as the prompts improve; never lower it quietly.

---

## Security

`security-preflight` was run over the whole codebase before deploy. Full findings are in
[`SECURITY-PREFLIGHT.md`](./SECURITY-PREFLIGHT.md). Summary:

| Area | State |
|---|---|
| API key | Server-side only. `lib/judge.ts` and `lib/prompts.ts` are marked `server-only`, so importing either from a client component is a **build error**, not a silent leak. Verified absent from every shipped client chunk. |
| Rate limiting | Per-IP sliding window (8/min) plus a hard per-UTC-day ceiling (1500) on `/api/judge`. |
| Input limits | 600 chars of pitch, 4 KB of body, checked before parsing. Rejected cheaply, before any spend. |
| Prompt injection | The pitch is wrapped in a `<submission>` envelope and every system prompt carries rules that outrank anything inside it. Nothing the model returns is ever treated as markup. |
| Output validation | Loose schema out to the model, strict zod contract on the way back, with clamping. One retry, then it fails closed to a generic message. |
| Error responses | Generic text only. No stack traces, no model output, no upstream detail. |
| Headers | Nonce-based CSP with `strict-dynamic`, HSTS, `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, a restrictive `Permissions-Policy`. |
| Personal data | Nothing is stored. No database, no accounts, no analytics, no logging of user text. IPs live in memory for the rate-limit window only. |
| Secrets in git | None, ever. Nothing to rotate. |

**Known limitation, stated plainly:** the rate limiter is in-process. Vercel runs several
serverless instances, so the effective ceiling is roughly *(cap × warm instances)* — a budget
guard, not an airtight quota. The airtight version needs shared state, and a datastore is out
of scope for v1. Put Vercel's platform firewall rate limiting in front of the route as well, and
set a spend cap on the Anthropic key.

These checks catch the mistakes behind most real-world breaches in fast-built apps, but they are
not a substitute for professional security testing.

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Recharts · zod · Anthropic SDK ·
Vitest · deployed on Vercel. No database, no auth, no state beyond React.

## Scope

v1 is the flow above and nothing else. Ideas that arrived after work began live in
[`V2_IDEAS.md`](./V2_IDEAS.md), which is where they stay.

## Disclaimer

Projections are confidently made up. So is most of a seed deck. Grimyapper is entertainment,
not investment advice.
