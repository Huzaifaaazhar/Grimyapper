import { JudgeRequestSchema, MAX_CUSTOMER_CHARS, MAX_IDEA_CHARS, MAX_NAME_CHARS, type JudgeRequest } from './schemas';

/**
 * Permalinks without a database.
 *
 * Every judgement is a pure function of the petition — the classifier, the
 * rubric model and the decree generator are all deterministic — so a verdict
 * does not need to be *stored* to be linkable. Put the petition in the URL and
 * the court re-derives the identical judgement on demand.
 *
 * That gives permalinks, saved history and shareable results with no storage,
 * no ids, no moderation queue and nothing to leak. The cost is a longer URL and
 * the fact that a link carries its own petition in plain sight, which for a
 * page that publishes its verdict anyway is not a cost at all.
 */

/** URL-safe base64 without padding, in both directions, working on UTF-8. */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  /*
   * `fatal: true` matters more than it looks. The default decoder silently
   * substitutes U+FFFD for invalid bytes, so a typo'd link like
   * `/j/not-a-real-token` decoded to mojibake, passed the length check, and got
   * a straight-faced judgement instead of a 404. Throwing here is what turns
   * "not valid UTF-8" into "not a real roll".
   */
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** The three fields, tab-separated — far shorter than JSON for the same content. */
export function encodePetition(req: JudgeRequest): string {
  return toBase64Url([req.idea, req.name ?? '', req.customer ?? ''].join('\t'));
}

/**
 * Decoding is a trust boundary: the token comes from a URL a stranger controls.
 * It goes through the same schema every submitted petition does, so a crafted
 * link cannot smuggle in a longer petition than the form allows.
 */
export function decodePetition(token: string): JudgeRequest | null {
  if (!token || token.length > 2048) return null;

  let raw: string;
  try {
    raw = fromBase64Url(token);
  } catch {
    return null;
  }

  /*
   * Random bytes can still happen to be valid UTF-8. A petition is prose, so
   * anything carrying control characters or a replacement char is not one,
   * whatever the decoder made of it.
   */
  if (/[\u0000-\u0008\u000b-\u001f\u007f\ufffd]/.test(raw)) return null;

  const [idea = '', name = '', customer = ''] = raw.split('\t');
  if (idea.length > MAX_IDEA_CHARS || name.length > MAX_NAME_CHARS || customer.length > MAX_CUSTOMER_CHARS) {
    return null;
  }

  const parsed = JudgeRequestSchema.safeParse({ idea, name, customer });
  return parsed.success ? parsed.data : null;
}

export function permalinkPath(req: JudgeRequest): string {
  return `/j/${encodePetition(req)}`;
}
