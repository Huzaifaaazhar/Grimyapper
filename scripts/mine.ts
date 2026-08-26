/**
 * Boundary mining — `npm run mine`
 *
 * Active learning, in the only form available to a project with no production
 * logs: score everything the repository already knows about, and rank it by how
 * close the model came to flipping.
 *
 * A petition at p = 0.46 against a 0.45 threshold is a coin toss the model
 * happened to win. Those are the examples where one more label moves the
 * decision boundary, and they are worth more than another fifty examples of
 * something already handled at p = 0.99. This prints the shortlist.
 *
 * It also prints anything the model gets *confidently* wrong, which is a
 * different and more urgent problem: a confident error usually means a feature
 * is firing where it should not.
 */
import { CORPUS } from '../data/corpus';
import { CASES } from '../evals/cases';
import { MODEL_THRESHOLD, classify } from '../lib/model/classifier';

const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const AMBER = '\x1b[33m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

type Scored = {
  text: string;
  label: 0 | 1 | null;
  source: string;
  probability: number;
  distance: number;
  wrong: boolean;
};

function main() {
  const pool: Array<{ text: string; label: 0 | 1 | null; source: string }> = [
    ...CORPUS.map((e) => ({ text: e.text, label: e.label, source: 'corpus' })),
    ...CASES.filter((c) => c.expect !== 'any').map((c) => ({
      text: c.idea,
      label: (c.expect === 'evaluated' ? 1 : 0) as 0 | 1,
      source: `golden:${c.group}`,
    })),
  ];

  const scored: Scored[] = pool.map((item) => {
    const { probability, is_ai_startup } = classify(item.text);
    return {
      ...item,
      probability,
      distance: Math.abs(probability - MODEL_THRESHOLD),
      wrong: item.label !== null && (is_ai_startup ? 1 : 0) !== item.label,
    };
  });

  const truncate = (t: string, n = 76) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

  console.log(`\n${BOLD}Boundary mining${OFF} ${DIM}· ${scored.length} known petitions · threshold ${MODEL_THRESHOLD}${OFF}`);

  const uncertain = [...scored].sort((a, b) => a.distance - b.distance).slice(0, 15);
  console.log(`\n${BOLD}Nearest the boundary${OFF} ${DIM}— label more like these first${OFF}\n`);
  for (const s of uncertain) {
    const mark = s.wrong ? `${RED}✗${OFF}` : ' ';
    console.log(
      `  ${mark} p=${s.probability.toFixed(3)} ${DIM}±${s.distance.toFixed(3)}${OFF}  ` +
        `${DIM}${s.source.padEnd(16)}${OFF} ${truncate(s.text)}`,
    );
  }

  const confidentlyWrong = scored
    .filter((s) => s.wrong && s.distance > 0.25)
    .sort((a, b) => b.distance - a.distance);

  console.log(`\n${BOLD}Confidently wrong${OFF} ${DIM}— usually a feature firing where it should not${OFF}\n`);
  if (confidentlyWrong.length === 0) {
    console.log(`  ${DIM}none${OFF}`);
  } else {
    for (const s of confidentlyWrong.slice(0, 12)) {
      console.log(
        `  ${RED}✗${OFF} p=${s.probability.toFixed(3)} want ${s.label}  ` +
          `${DIM}${s.source.padEnd(16)}${OFF} ${truncate(s.text)}`,
      );
    }
  }

  const band = scored.filter((s) => s.distance <= 0.1).length;
  console.log(
    `\n${AMBER}${band}${OFF} of ${scored.length} petitions ` +
      `(${((band / scored.length) * 100).toFixed(1)}%) sit within 0.1 of the boundary.`,
  );
  console.log(
    `${DIM}Live judgements landing in that band are counted at /model — if the share there ` +
      `runs well above this one, real petitions are harder than the corpus.${OFF}\n`,
  );
}

main();
