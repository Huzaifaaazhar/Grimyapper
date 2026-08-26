import type { JudgeRequest } from './schemas';

/**
 * What a permalink is allowed to publish.
 *
 * Stateless permalinks have one cost, and it is worth naming plainly: the token
 * carries its own petition, so anyone can craft a link containing any text and
 * it will render on this site's own domain, under this site's own branding, and
 * unfurl that way in Slack or on a timeline. Nothing was stored and nothing was
 * moderated, but to a reader it looks published.
 *
 * Signing the token would not fix it — an abuser can put the same text through
 * the form and get a signed link. Content is the lever, and content filtering
 * without a moderation service is inherently partial. So this does the parts
 * that *are* reliable:
 *
 *   - contact details and other personal data are refused outright, which is
 *     the doxxing route and the one with a real victim;
 *   - permalinks are never indexed, so a crafted link cannot be laundered into
 *     a search result;
 *   - a refused petition still receives its judgement, but the page and the
 *     share image show the judgement without reprinting the text.
 *
 * What this does not do is detect abuse in general. That needs a moderation
 * service, which is the honest reason the public "wall of rejected ideas" is
 * still not built.
 */

const PERSONAL_DATA: Array<{ label: string; re: RegExp }> = [
  { label: 'an email address', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  // Loose on purpose: a run of digits that long is not part of a pitch.
  { label: 'a telephone number', re: /(?:\+?\d[\s()-]?){9,}/ },
  { label: 'a card or account number', re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ },
  { label: 'a postal address', re: /\b\d+\s+\w+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|court|way)\b/i },
  { label: 'a national insurance or social security number', re: /\b\d{3}-\d{2}-\d{4}\b/ },
];

export type GuardVerdict =
  | { publishable: true }
  | { publishable: false; reason: string };

export function guardPermalink(petition: JudgeRequest): GuardVerdict {
  const text = [petition.idea, petition.name, petition.customer].filter(Boolean).join(' ');

  for (const { label, re } of PERSONAL_DATA) {
    if (re.test(text)) {
      return {
        publishable: false,
        reason: `This petition appears to contain ${label}, so the court will not reprint it.`,
      };
    }
  }

  return { publishable: true };
}
