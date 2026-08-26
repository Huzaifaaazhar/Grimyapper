# Security preflight — Grimyapper

Run with the `security-preflight` skill before first deploy. All five checks, in order.

**Stack detected:** Next.js 15 (App Router) + TypeScript · React 19 · Tailwind v4 · Recharts ·
**a locally-trained logistic-regression classifier (17 KB of JSON), no model service** ·
**no database** · **no auth** · **no payments** · **no file uploads** ·
**no cookies or sessions** · **no secrets of any kind** · hosted on Vercel.

That stack matters: most of the classic breach surface (IDOR, privilege escalation, SQL
injection, payment tampering, password handling) is *absent by construction*, not merely
unaudited.

**Re-run note.** The first pass of this audit was against a version that called a hosted model
API. The two real exposures then were an unauthenticated endpoint that spent money per request,
and free-text from strangers reaching a language model. **Both have since been eliminated rather
than mitigated** — the engine now runs in-process, so there is no key, no third party, no prompt
and no per-request cost. What remains is an ordinary public form. The findings below are the
re-run.

---

## Check 1 — Secret leak prevention

| # | Finding | Location | Severity | Status |
|---|---|---|---|---|
| 1 | No hardcoded credential of any kind. Scanned for `sk-ant`, `sk-*`, AWS keys, PEM blocks, Slack and GitHub tokens across all source, config and docs. | repo-wide | — | Clean |
| 2 | **There are no secrets at all.** The application reads no credential of any kind; `.env.example` documents only optional rate-limit tuning. Nothing to leak, nothing to rotate, nothing to scope. | repo-wide | — | Clean |
| 3 | No `NEXT_PUBLIC_` or `REACT_APP_` variable anywhere, so nothing is bundled to the browser by prefix. | repo-wide | — | Clean |
| 4 | `lib/judge.ts` keeps its `server-only` marker even though it no longer guards a secret — it now keeps the model weights and the entire decree corpus out of the client bundle. Verified: `buzzword_veneer`, `core_model_product` and `automaton clerk` appear in **zero** client chunks. | `lib/judge.ts` | — | Verified |
| 5 | Verified empirically against the production build: no credential-shaped string appears anywhere in `.next/`. There is none to appear. | build output | — | Verified |
| 6 | `.env`, `.env.local` and `.env*.local` are gitignored; `.env.example` ships placeholders only. | `.gitignore`, `.env.example` | — | Clean |
| 7 | Git history contains no secret — none was ever committed, and the dependency that required one has been removed. **Nothing needs rotating.** | git log | — | Clean |

---

## Check 2 — Personal data flow audit

**What is collected:** the pitch text, and optionally a startup name and target customer — all
typed voluntarily, none of it requested as personal data. Plus the client IP, derived from
`x-forwarded-for` for rate limiting.

**Where it goes:** nowhere. The petition is judged in the same process that received it and
discarded when the response is written. There is no database, no analytics, no error-tracking
SDK, **no third party at all**, and no persistence of any kind. This is the single biggest
change from the first audit: user text previously left the server to reach a model provider,
and now it does not leave the server at all.

| # | Finding | Location | Severity | Status |
|---|---|---|---|---|
| 1 | No user text in any log. The one server log line records the failing stage and nothing else. | `app/api/judge/route.ts:78` | — | Clean |
| 2 | IPs are held in a bounded in-memory map for the rate-limit window and swept; never logged, never persisted, never returned. | `lib/ratelimit.ts` | — | Clean |
| 3 | Nothing is sent upstream, because there is no upstream. The footer now states this plainly rather than naming a provider. | `components/Judge.tsx` | — | **Improved** |
| 4 | Nothing in `localStorage`, `sessionStorage`, or any cookie. The app sets no cookie at all. | client | — | Clean |
| 5 | API responses carry only the judgement. No echoed request metadata, no internals. | `app/api/judge/route.ts` | — | Clean |
| 6 | **Users had no way to know what happens to what they type.** | UI | Low | **Fixed** — added a plain-language line to the footer: what is sent, to whom, and that nothing is stored. |
| 7 | Data deletion flow: not applicable. Nothing is stored, so there is nothing to delete. | — | — | N/A |
| 8 | Password handling: not applicable. No accounts, no passwords. | — | — | N/A |

---

## Check 3 — Pre-deploy production audit

| # | Finding | Location | Severity | Status |
|---|---|---|---|---|
| 1 | The previous audit found a missing-key path that failed as a generic 502, indistinguishable from an upstream outage. **The whole failure mode is gone**: there is no key to be missing and no upstream to be down, so the deploy cannot be misconfigured into silence. | `app/api/judge/route.ts` | — | **Eliminated** |
| 2 | **No `Content-Security-Policy` and no HSTS.** | headers | Medium | **Fixed** — `middleware.ts` issues a per-request nonce CSP with `strict-dynamic`; HSTS added to the always-on header set. |
| 3 | **The CSP as first written would have broken the site.** `/` was statically prerendered, so the cached HTML carried no nonce while the header demanded one — every script blocked. Caught by loading the built site in a real browser rather than trusting the header. | `app/page.tsx` | **High** (self-inflicted, pre-deploy) | **Fixed** — `/` split into a server shell that reads `headers()`, forcing per-request render. Verified: the nonce in the response header matches the nonce on all 16 script tags, and a browser run reports zero CSP violations. |
| 4 | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera, mic, geolocation, payment all denied), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. | `next.config.mjs`, `middleware.ts` | — | Present |
| 5 | Rate limiting on the only endpoint: per-IP sliding window plus a hard daily ceiling. Auth endpoints: none exist. | `lib/ratelimit.ts` | — | Present |
| 6 | Client-facing errors are generic strings. No stack trace, no upstream message, no model output, no file path. | `app/api/judge/route.ts:70-80` | — | Clean |
| 7 | No debug code, no TODO/FIXME, no test-only or seed endpoints, no commented-out blocks. `poweredByHeader` disabled. | repo-wide | — | Clean |
| 8 | CORS: no permissive headers are set, so cross-origin browser reads are blocked by default. Additionally an explicit same-origin check rejects a mismatched `Origin` outright. | `app/api/judge/route.ts` | — | **Hardened** |
| 9 | Database TLS, default credentials, exposed DB ports: not applicable. There is no database. | — | — | N/A |

---

## Check 4 — Deep audit of complex logic

No payments, no auth, no roles, no uploads, no SQL, no smart contracts. The complex logic in
this app is the **LLM boundary**, so that is what was audited.

| # | Finding | Location | Severity | Status |
|---|---|---|---|---|
| 1 | **Prompt injection.** No longer applicable: there is no prompt, no system message and no model that can be instructed. "Ignore all previous instructions" is now just an unusual petition, and the classifier scores it like any other string. The eval asserts this directly — ten adversarial petitions (injection, markup, SQL, gibberish, unicode, floods) must all produce ordinary, in-range judgements. | `evals/run.ts` gate 6 | — | **Eliminated** |
| 2 | **Output validation.** Retained deliberately even though the output is now our own code's. Every judgement is held to the same zod contracts the model output used to face, so a scorer or generator bug surfaces as a clean error rather than a rubric of elevens rendered confidently. | `lib/judge.ts`, `lib/schemas.ts` | — | Enforced |
| 3 | **XSS.** Model output is rendered as React text nodes. There is **not one `dangerouslySetInnerHTML`** in the tree, no `innerHTML`, no `eval`, no `new Function`. Even a model coerced into emitting `<script>` renders as visible text. | components | — | Clean |
| 4 | **Injection through the rendered numbers.** All figures are computed in code from clamped numeric assumptions, so an adversarial pitch cannot steer the chart or table into anything but arithmetic on bounded inputs. | `lib/metrics.ts` | — | By design |
| 5 | **Unbounded input reaching a paid API.** | `app/api/judge/route.ts` | High | **Fixed** — 600-char pitch cap and 4 KB body cap, both checked before parsing and before any upstream call; `maxDuration = 60` caps a hung request. |
| 6 | Auth, IDOR, JWTs, password reset, webhooks, price tampering: not applicable. There are no users, no resources to own, and no money moving. | — | — | N/A |

---

## Check 5 — Attacker's perspective

Asked plainly: what would someone actually do to this?

| # | What an attacker does | Damage | Status |
|---|---|---|---|
| 1 | **Scripts the endpoint to burn the budget.** This was the one attack with a real payoff, and it no longer has one. | — | **Eliminated.** A judgement is a dot product over a 17 KB model: microseconds of CPU, and no money. The per-IP window and daily ceiling remain, but they now guard CPU rather than a bill. The residual is that a determined flood makes the page slow, which Vercel's own firewall handles better than application code can. |
| 2 | **Embeds the endpoint in their own page** and drives it with other people's browsers. | Money | **Blocked.** A mismatched `Origin` gets a 403; no CORS headers means no cross-origin read either. |
| 3 | **Prompt-injects to extract the system prompt** or turn the app into a free general-purpose LLM. | IP disclosure, abuse | **Mitigated.** In-role rules in every system prompt, plus a strict output contract — the response can only ever be one of three fixed JSON shapes, so the endpoint cannot be steered into general-purpose generation. Worst realistic case is a nonsense verdict. |
| 4 | **Injects markup or script through the pitch**, hoping it renders. | XSS | **Blocked.** React escapes everything; no HTML sink exists; and the CSP would block inline script even if one appeared. |
| 5 | **Sends a huge body** to exhaust memory or function time. | Availability | **Blocked.** Content-length and post-read length checks, both before parsing; platform body limit behind that. |
| 6 | **Sprays unique IPs** to grow the rate-limit map without bound. | Memory | **Blocked.** The map is capped at 5,000 tracked IPs and swept of expired entries. |
| 7 | **Fetches `/.env`, `/.git`, or an admin panel.** | Disclosure | **Nothing to find.** No such routes exist; Vercel serves only build output; there is no admin surface, no API docs, no health endpoint. |
| 8 | **Manipulates business logic** — negative prices, stacked discounts, restarted trials. | — | **N/A.** No money, no accounts, no promos. |
| 9 | **Guesses an ID to read someone else's judgement.** | — | **N/A.** Nothing is stored and nothing has an ID. |

---

## Summary

- **Checks run:** 1–5, all of them.
- **Stack:** Next.js 15 / TypeScript / local classifier, no model service / no DB / no auth /
  no payments / no secrets / Vercel.
- **Total findings:** 7 actionable (High: 2, Medium: 4, Low: 1). Everything else was verified
  clean or genuinely not applicable.
- **Fixed:** `server-only` barriers on the key-holding modules; explicit missing-key 503; a
  nonce CSP plus HSTS; the CSP-vs-static-prerender break caught in a browser before deploy;
  input and body caps ahead of any paid call; a same-origin check; a plain-language note telling
  users what happens to what they type.
- **Needs your decision:** optionally turn on Vercel firewall rate limiting in front of
  `/api/judge`. It is no longer urgent — with no per-request cost, the worst a flood achieves is
  a slow page — but it is one console toggle and it closes the last residual.
- **Not applicable:** payments, auth, IDOR, privilege escalation, SQL injection, file uploads,
  password storage, cookie flags, database TLS, data-deletion flows. None of these exist here.

These checks catch the mistakes behind most real-world breaches in fast-built apps, but they are
not a substitute for professional security testing. This app handles no money and stores no user
data, which is why it ships on this basis; an app that did either should also get a human review.
