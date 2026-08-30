import type { jsPDF as JsPDF } from 'jspdf';

import type { Charter } from './charter';
import { charterFilename } from './charter';

/**
 * The Charter of Sovereign Blessing, written straight into a PDF.
 *
 * Two deliberate departures from the obvious approach:
 *
 * 1. **No `html2canvas`.** Screenshotting the DOM would produce a raster — soft
 *    at any print size, ~2 MB, and unselectable — and it parses the page's real
 *    CSS, which for a Tailwind v4 app means modern colour syntax it does not
 *    understand. Everything below is drawn in vector primitives instead: crisp
 *    at any zoom, ~40 KB, and the text is real text a reader can copy.
 *
 * 2. **jsPDF's built-in Times, not the app's Cinzel and Garamond.** Embedding
 *    the real faces means shipping two TTFs base64'd into the client bundle for
 *    a button most visitors never press. Times is a Renaissance-lineage serif
 *    that sits honestly beside them, and the period is carried by the drawn
 *    ornament, which is where it should come from anyway.
 *
 * The module is dynamically imported at click time, so jsPDF's ~350 KB never
 * touches the initial page load.
 */

/* Colours as jsPDF wants them: 0–255 triples, matching the CSS tokens exactly. */
const VELLUM: RGB = [233, 223, 198];
const VELLUM_LIT: RGB = [242, 236, 219];
const INK: RGB = [42, 30, 18];
const INK_SOFT: RGB = [92, 74, 52];
const GILT: RGB = [212, 175, 55];
const GILT_DEEP: RGB = [138, 100, 18];
const WAX: RGB = [142, 31, 26];
const WAX_DARK: RGB = [94, 18, 15];
const VERMILION: RGB = [156, 43, 33];

type RGB = [number, number, number];

/** A4 landscape, in millimetres. */
const W = 297;
const H = 210;
const M = 14;

/*
 * One layout grid, named, because the first draft placed each block from its
 * own local constants and three of them silently overlapped: the florin caption
 * ran under the particulars column, and the virtue pips overprinted their own
 * scores. Columns that must not collide should be derived from shared edges,
 * not measured by eye.
 */
const BODY_TOP = 96;
const ATTEST_TOP = 158;

/** Left: the rating. Middle: the particulars. Right: the seven virtues. */
const COL_SCORE = M + 30;
const COL_SCORE_W = 52;
const COL_FACTS = M + 62;
const COL_FACTS_W = 88;
const COL_VIRTUE = M + 162;
const COL_VIRTUE_W = W - M - 8 - COL_VIRTUE;

export async function downloadCharter(charter: Charter): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  ground(doc);
  border(doc);
  masthead(doc, charter);
  particulars(doc, charter);
  virtues(doc, charter);
  attestation(doc, charter);

  doc.save(charterFilename(charter));
}

/* ------------------------------------------------------------------ the leaf */

function ground(doc: JsPDF): void {
  doc.setFillColor(...VELLUM);
  doc.rect(0, 0, W, H, 'F');

  /*
   * Age, faked the only way a vector PDF can: concentric rounded rectangles
   * stepping from the lit centre out to the darkened edge. Twenty-two steps is
   * where the banding stops being visible at print size.
   */
  const steps = 22;
  for (let i = steps; i > 0; i -= 1) {
    const t = i / steps;
    doc.setFillColor(
      Math.round(VELLUM[0] + (VELLUM_LIT[0] - VELLUM[0]) * (1 - t)),
      Math.round(VELLUM[1] + (VELLUM_LIT[1] - VELLUM[1]) * (1 - t)),
      Math.round(VELLUM[2] + (VELLUM_LIT[2] - VELLUM[2]) * (1 - t)),
    );
    const inset = (1 - t) * 62;
    doc.roundedRect(inset, inset * 0.7, W - inset * 2, H - inset * 1.4, 8, 8, 'F');
  }
}

/** A gilt double frame with the corners cut, and a fleuron in each. */
function border(doc: JsPDF): void {
  doc.setLineJoin('miter');

  doc.setDrawColor(...GILT_DEEP);
  doc.setLineWidth(1.1);
  doc.rect(M, M, W - M * 2, H - M * 2, 'S');

  doc.setDrawColor(...GILT);
  doc.setLineWidth(0.45);
  doc.rect(M + 2.6, M + 2.6, W - (M + 2.6) * 2, H - (M + 2.6) * 2, 'S');

  doc.setLineWidth(0.3);
  doc.setDrawColor(...INK_SOFT);
  doc.rect(M + 4.6, M + 4.6, W - (M + 4.6) * 2, H - (M + 4.6) * 2, 'S');

  // Corner fleurons: a quarter-round of three diminishing discs, turned to face
  // inward from each corner.
  const corners: Array<[number, number, number, number]> = [
    [M + 4.6, M + 4.6, 1, 1],
    [W - M - 4.6, M + 4.6, -1, 1],
    [M + 4.6, H - M - 4.6, 1, -1],
    [W - M - 4.6, H - M - 4.6, -1, -1],
  ];
  doc.setFillColor(...GILT_DEEP);
  for (const [cx, cy, sx, sy] of corners) {
    doc.circle(cx + 5 * sx, cy + 5 * sy, 1.5, 'F');
    doc.circle(cx + 10.5 * sx, cy + 4 * sy, 1, 'F');
    doc.circle(cx + 4 * sx, cy + 10.5 * sy, 1, 'F');
    doc.setDrawColor(...GILT);
    doc.setLineWidth(0.4);
    doc.line(cx + 7 * sx, cy + 7 * sy, cx + 17 * sx, cy + 7 * sy);
    doc.line(cx + 7 * sx, cy + 7 * sy, cx + 7 * sx, cy + 17 * sy);
  }
}

/* --------------------------------------------------------------- the heading */

function masthead(doc: JsPDF, c: Charter): void {
  centred(doc, 'BY GRACE OF THE SOVEREIGN COURT OF GRIMYAPPER', 30, {
    font: ['times', 'normal'],
    size: 8.5,
    color: INK_SOFT,
    charSpace: 1.5,
  });

  centred(doc, 'Charter of Sovereign Blessing', 44, {
    font: ['times', 'bold'],
    size: 30,
    color: INK,
  });

  rule(doc, 82, W - 82, 50.5);

  centred(doc, c.style.toUpperCase(), 57, {
    font: ['times', 'normal'],
    size: 8,
    color: VERMILION,
    charSpace: 1.8,
  });

  // The venture itself, given the most space on the leaf.
  const name = fit(doc, c.venture, W - 90, 22, 13, ['times', 'bold']);
  centred(doc, c.venture, 72, { font: ['times', 'bold'], size: name, color: INK });

  doc.setFont('times', 'italic');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK_SOFT);
  const pitch = doc.splitTextToSize(`“${c.petition}”`, W - 110) as string[];
  pitch.slice(0, 3).forEach((line, i) => {
    doc.text(line, W / 2, 81 + i * 5, { align: 'center' });
  });
}

/* ------------------------------------------------------------ the particulars */

function particulars(doc: JsPDF, c: Charter): void {
  // The rating, set large as the headline number it is.
  doc.setFont('times', 'bold');
  doc.setFontSize(44);
  doc.setTextColor(...GILT_DEEP);
  doc.text(String(c.florins), COL_SCORE, BODY_TOP + 20, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...INK_SOFT);
  doc.setCharSpace(0.5);
  // Three short lines, not two long ones: at this tracking a single line of
  // "of 100 floating florins" is wider than the column it sits in.
  doc.text('OF 100 FLOATING FLORINS', COL_SCORE, BODY_TOP + 27, {
    align: 'center',
    maxWidth: COL_SCORE_W,
  });
  doc.text(c.band.toUpperCase(), COL_SCORE, BODY_TOP + 33, { align: 'center' });
  doc.text(`${c.percentileLabel.toUpperCase()} PERCENTILE`, COL_SCORE, BODY_TOP + 38, {
    align: 'center',
  });
  doc.setCharSpace(0);

  // A ruled column of the particulars beside it.
  const rows: Array<[string, string]> = [
    ['Target guilds', c.guilds],
    ['Treasury reserves', c.treasury],
    ['Secret alchemy', c.alchemy],
    ['Standing among ventures', c.standing],
  ];

  let y = BODY_TOP + 4;
  for (const [label, value] of rows) {
    doc.setFont('times', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...VERMILION);
    doc.setCharSpace(0.9);
    doc.text(label.toUpperCase(), COL_FACTS, y);
    doc.setCharSpace(0);

    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const wrapped = (doc.splitTextToSize(value, COL_FACTS_W) as string[]).slice(0, 2);
    wrapped.forEach((line, i) => doc.text(line, COL_FACTS, y + 4.6 + i * 4.2));

    y += 4.6 + wrapped.length * 4.2 + 3.4;
    doc.setDrawColor(...INK_SOFT);
    doc.setLineWidth(0.15);
    doc.line(COL_FACTS, y - 2.6, COL_FACTS + COL_FACTS_W, y - 2.6);
  }
}

/* --------------------------------------------------------- the seven virtues */

function virtues(doc: JsPDF, c: Charter): void {
  const x = COL_VIRTUE;
  const right = x + COL_VIRTUE_W;
  /* Pips first, then the number to their right, with a measured gap between. */
  const pipStep = 2.5;
  const pipsFrom = right - 12 - 9 * pipStep;

  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...VERMILION);
  doc.setCharSpace(0.9);
  doc.text('THE SEVEN VIRTUES, WEIGHED', x, BODY_TOP);
  doc.setCharSpace(0);

  c.virtues.forEach((v, i) => {
    const y = BODY_TOP + 8 + i * 7.8;

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(v.title, x, y);

    doc.setFontSize(6);
    doc.setTextColor(...INK_SOFT);
    doc.text(v.plain, x, y + 3.2);

    // Ten pips, filled to the score — a bar chart a scribe could have ruled.
    for (let p = 0; p < 10; p += 1) {
      const px = pipsFrom + p * pipStep;
      if (p < Math.round(v.score)) {
        doc.setFillColor(...GILT_DEEP);
        doc.circle(px, y - 1, 0.95, 'F');
      } else {
        doc.setDrawColor(...INK_SOFT);
        doc.setLineWidth(0.2);
        doc.circle(px, y - 1, 0.95, 'S');
      }
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(v.score.toFixed(1), right, y, { align: 'right' });
  });
}

/* ------------------------------------------------------------ the attestation */

function attestation(doc: JsPDF, c: Charter): void {
  const y = ATTEST_TOP;
  rule(doc, M + 12, W - M - 12, y);

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_SOFT);
  const attest = c.claimUpheld
    ? 'The petitioner swore this venture wrought with thinking engines, and the assayer, examining it, agrees.'
    : 'The assayer, examining this venture unprompted, finds it wrought with thinking engines.';
  doc.text(attest, M + 14, y + 7, { maxWidth: 148 });

  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `Strongest virtue: ${c.strongest.title} (${c.strongest.score.toFixed(1)}).  ` +
      `Weakest: ${c.weakest.title} (${c.weakest.score.toFixed(1)}).`,
    M + 14,
    y + 12.5,
    { maxWidth: 148 },
  );

  doc.setFontSize(6.5);
  doc.setCharSpace(0.8);
  doc.text(`ROLL ${c.roll}  ·  SEALED THIS ${c.sealedOn.toUpperCase()}`, M + 14, y + 19);
  doc.setCharSpace(0);

  doc.setFontSize(6);
  doc.text(
    'Grimyapper is a jest with real machinery beneath it. This is entertainment, and not counsel upon money.',
    M + 14,
    y + 23.5,
  );

  signature(doc, W - M - 116, y + 17);
  seal(doc, W - M - 32, y + 15);
}

/** A sovereign's hand: one flowing stroke, drawn deterministically. */
function signature(doc: JsPDF, x: number, y: number): void {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.55);
  doc.setLineJoin('round');
  // Relative cubic segments: [dx1,dy1, dx2,dy2, dx,dy] per curve.
  doc.lines(
    [
      [2, -5, 5, 2, 6, -4],
      [3, -4, 4, 6, 7, 1],
      [3, -5, 6, 4, 9, -2],
      [4, -2, 7, 5, 12, 0],
    ],
    x,
    y,
    [1, 1],
    'S',
    false,
  );
  doc.setLineWidth(0.3);
  doc.line(x - 1, y + 4, x + 38, y + 4);

  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...INK_SOFT);
  doc.setCharSpace(0.9);
  doc.text('HIS MAJESTY, BY HIS OWN HAND', x - 1, y + 8);
  doc.setCharSpace(0);
}

/** The wax: an irregular disc, a pressed rim, and the signet mark. */
function seal(doc: JsPDF, cx: number, cy: number): void {
  const R = 13;

  /*
   * Deterministic jitter around the rim, so the wax is never a circle. The
   * angles are fixed rather than random: the same charter downloaded twice must
   * produce the same document, byte-comparable.
   */
  const wobble = [1.04, 0.97, 1.06, 0.99, 1.03, 0.95, 1.05, 1.0, 0.96, 1.04, 0.98, 1.02];
  doc.setFillColor(...WAX_DARK);
  for (let i = 0; i < wobble.length; i += 1) {
    const a = (i / wobble.length) * Math.PI * 2;
    doc.circle(cx + Math.cos(a) * R * 0.34, cy + Math.sin(a) * R * 0.34, R * 0.72 * wobble[i], 'F');
  }

  doc.setFillColor(...WAX);
  doc.circle(cx, cy, R * 0.92, 'F');

  doc.setDrawColor(...WAX_DARK);
  doc.setLineWidth(0.7);
  doc.circle(cx, cy, R * 0.68, 'S');
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, R * 0.58, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 232, 220);
  doc.text('G', cx, cy + 3.2, { align: 'center' });
}

/* ------------------------------------------------------------------ plumbing */

function rule(doc: JsPDF, x1: number, x2: number, y: number): void {
  doc.setDrawColor(...GILT_DEEP);
  doc.setLineWidth(0.4);
  doc.line(x1, y, x2, y);
  doc.setFillColor(...VERMILION);
  doc.circle((x1 + x2) / 2, y, 1.1, 'F');
  doc.setFillColor(...GILT_DEEP);
  doc.circle((x1 + x2) / 2 - 7, y, 0.7, 'F');
  doc.circle((x1 + x2) / 2 + 7, y, 0.7, 'F');
}

function centred(
  doc: JsPDF,
  text: string,
  y: number,
  opts: { font: [string, string]; size: number; color: RGB; charSpace?: number },
): void {
  doc.setFont(opts.font[0], opts.font[1]);
  doc.setFontSize(opts.size);
  doc.setTextColor(...opts.color);
  if (opts.charSpace) doc.setCharSpace(opts.charSpace);
  doc.text(text, W / 2, y, { align: 'center' });
  if (opts.charSpace) doc.setCharSpace(0);
}

/** Shrink a line until it fits the measure, rather than letting it run off. */
function fit(
  doc: JsPDF,
  text: string,
  maxWidth: number,
  from: number,
  min: number,
  font: [string, string],
): number {
  doc.setFont(font[0], font[1]);
  let size = from;
  while (size > min) {
    doc.setFontSize(size);
    if (doc.getTextWidth(text) <= maxWidth) break;
    size -= 0.5;
  }
  return size;
}
