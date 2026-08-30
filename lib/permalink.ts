import {
  DECLARATIONS,
  JudgeRequestSchema,
  MAX_CAPITAL_CHARS,
  MAX_CUSTOMER_CHARS,
  MAX_IDEA_CHARS,
  MAX_MOAT_CHARS,
  MAX_NAME_CHARS,
  type Declaration,
  type JudgeRequest,
} from './schemas';

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

/**
 * The fields, tab-separated — far shorter than JSON for the same content.
 *
 * Order is append-only and must stay that way: links already in the wild carry
 * three fields, so a decoder that reads positionally and defaults what is
 * missing keeps every one of them working. Reordering would silently reassign
 * somebody's saved verdict to different columns.
 */
export function encodePetition(req: JudgeRequest): string {
  return toBase64Url(
    [
      req.idea,
      req.name ?? '',
      req.customer ?? '',
      req.moat ?? '',
      req.capital ?? '',
      // Written blank, because the decoder already reads a missing column as
      // 'unstated'. Spelling it out would only lengthen every unstated link.
      req.declared === 'unstated' ? '' : (req.declared ?? ''),
    ]
      // Trailing empties cost URL length and decode to the same defaults anyway.
      .join('\t')
      .replace(/\t+$/, ''),
  );
}

/**
 * Decoding is a trust boundary: the token comes from a URL a stranger controls.
 * It goes through the same schema every submitted petition does, so a crafted
 * link cannot smuggle in a longer petition than the form allows.
 */
/**
 * The longest token the court will read.
 *
 * The bound is on the *encoded* token because that is what arrives in the URL.
 * It has to clear what the form can actually produce: the field caps sum to
 * about 1,180 characters, which is ~1,580 base64 in Latin script but three or
 * four times that in a script whose characters cost several bytes each. At the
 * old 2,048 a petition written in Chinese produced a link that looked fine,
 * copied fine, and 404'd on arrival.
 *
 * 4,096 covers ordinary content in any script and stays a URL that survives
 * being pasted into a chat window. It cannot cover *every* field maxed out in a
 * multi-byte script — nothing short of a database can — which is why
 * `canPermalink` exists rather than the UI assuming a link always works.
 */
const MAX_TOKEN_CHARS = 4096;

export function decodePetition(token: string): JudgeRequest | null {
  if (!token || token.length > MAX_TOKEN_CHARS) return null;

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

  const [idea = '', name = '', customer = '', moat = '', capital = '', declared = ''] =
    raw.split('\t');

  const overlong =
    idea.length > MAX_IDEA_CHARS ||
    name.length > MAX_NAME_CHARS ||
    customer.length > MAX_CUSTOMER_CHARS ||
    moat.length > MAX_MOAT_CHARS ||
    capital.length > MAX_CAPITAL_CHARS;
  if (overlong) return null;

  const parsed = JudgeRequestSchema.safeParse({
    idea,
    name,
    customer,
    moat,
    capital,
    // An older link has no sixth column, and a crafted one may have nonsense there.
    declared: (DECLARATIONS as readonly string[]).includes(declared)
      ? (declared as Declaration)
      : 'unstated',
  });
  return parsed.success ? parsed.data : null;
}

/**
 * No screen offers a link any more — the results page hands over a PDF instead.
 * The encoder stays because `/j/[token]` still serves every link already shared,
 * and a decoder is only trustworthy if something can produce the bytes it reads:
 * the round-trip tests are what keep the column order honest.
 */
export function permalinkPath(req: JudgeRequest): string {
  return `/j/${encodePetition(req)}`;
}

/**
 * Whether this petition survives the round trip.
 *
 * Encoding always succeeds; decoding is what can fail, and it fails on length
 * for petitions whose UTF-8 is far larger than their character count. Offering
 * a link that 404s when opened is worse than saying plainly that this one is
 * too long to carry, so the UI asks first.
 */
export function canPermalink(req: JudgeRequest): boolean {
  return decodePetition(encodePetition(req)) !== null;
}
