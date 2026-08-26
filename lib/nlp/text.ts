/** Text normalisation and tokenisation. Deliberately small and dependency-free. */

/** Collapse case, strip punctuation, normalise whitespace and common variants. */
export function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A short stop list. Kept deliberately small: words like "we", "our" and "for"
 * are stop words in most tasks but are exactly the signal that separates
 * "a bakery that uses AI" from "an AI that bakes", so they stay in.
 */
const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'is', 'are',
  'be', 'been', 'this', 'that', 'it', 'as', 'by', 'from', 'with', 'so',
]);

export function tokenise(text: string): string[] {
  return normalise(text)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Unigrams plus bigrams. Bigrams are what catch "chat with", "trained on". */
export function wordFeatures(text: string): string[] {
  const words = tokenise(text);
  const out: string[] = [...words];
  for (let i = 0; i < words.length - 1; i += 1) {
    out.push(`${words[i]}_${words[i + 1]}`);
  }
  return out;
}

/**
 * Character n-grams over the normalised text, word boundaries marked with `·`.
 *
 * Word features are brittle about morphology: "modle" and "model" share no
 * token at all, and neither do "bakery" and "bakerie". Character grams degrade
 * gracefully instead — a typo costs a few grams rather than the whole word —
 * which is what makes a misspelt petition still land in the right place.
 */
export function charFeatures(text: string, min = 3, max = 5): string[] {
  const padded = `·${normalise(text).replace(/ /g, '·')}·`;
  const out: string[] = [];
  for (let n = min; n <= max; n += 1) {
    for (let i = 0; i + n <= padded.length; i += 1) {
      out.push(`#${padded.slice(i, i + n)}`);
    }
  }
  return out;
}

/** The full feature string list: words, bigrams, and character grams. */
export function features(text: string, withChars = true): string[] {
  const words = wordFeatures(text);
  return withChars ? [...words, ...charFeatures(text)] : words;
}

/** Term frequency, as counts. */
export function termCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

/** FNV-1a. Used to seed the decree generator so a petition always reads alike. */
export function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
