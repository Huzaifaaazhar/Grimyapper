import 'server-only';

import { RejectionSchema, type Rejection } from '../schemas';

/**
 * Optional: write the lament with a small local model instead of composing it.
 *
 * Set `OLLAMA_URL` (e.g. http://127.0.0.1:11434) and the decree's lament is
 * written fresh by whatever model `OLLAMA_MODEL` names — llama3.2:3b and
 * qwen2.5:1.5b are both plenty for one sentence. Leave it unset and nothing
 * changes: the composed corpus is the default, not the fallback-of-last-resort.
 *
 * This exists because the public deploy runs on serverless functions with no
 * GPU, ~1GB of memory and a cold start per request — a local model cannot live
 * there, and pretending otherwise would be the dishonest option. So the hosted
 * site stays fully composed and deterministic, and anyone running Grimyapper on
 * their own machine gets genuinely novel prose. Two behaviours, no lies about
 * which is which.
 *
 * Every failure path falls back to the composed decree, because a court that
 * cannot reach a local model should still issue a decree.
 */

const SYSTEM = `You are a weary court assayer in a medieval scriptorium who has, inexplicably, read next quarter's technology news. Write ONE sentence: the lament for a business about to be made obsolete by artificial intelligence.

Rules:
- Archaic register, entirely modern substance. That collision is the joke.
- Refer to AI only in period terms: "thinking engines", "an automaton clerk", "a familiar spirit bound in a rectangle of glass". Never write "AI", "software", "app", "startup" or any brand name.
- Savage about the venture's future, never about the person. No profanity, no personal attacks.
- Under 30 words. Output the sentence and nothing else — no quotes, no preamble, no explanation.`;

const TIMEOUT_MS = 8_000;

export function ollamaConfigured(): boolean {
  return Boolean(process.env.OLLAMA_URL);
}

/**
 * Returns a decree with the lament replaced, or the composed one untouched.
 * Never throws: the caller has a valid decree already.
 */
export async function embellishDecree(composed: Rejection, petition: string): Promise<Rejection> {
  const base = process.env.OLLAMA_URL;
  if (!base) return composed;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        system: SYSTEM,
        prompt: `The venture: ${petition}\n\nIts undoing: ${composed.cause_of_death}\n\nWrite the lament.`,
        stream: false,
        options: { temperature: 0.9, num_predict: 90 },
      }),
    });

    if (!response.ok) return composed;

    const body: unknown = await response.json();
    const raw = typeof body === 'object' && body !== null && 'response' in body
      ? String((body as { response: unknown }).response)
      : '';

    const lament = raw
      .replace(/\s+/g, ' ')
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .trim();

    // A local model is untrusted output like any other. It faces the same
    // contract the composed decree does, and loses if it fails.
    if (lament.length < 20 || lament.length > 400) return composed;

    const candidate = RejectionSchema.safeParse({ ...composed, eulogy: lament });
    return candidate.success ? candidate.data : composed;
  } catch {
    return composed;
  } finally {
    clearTimeout(timer);
  }
}
