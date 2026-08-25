import { RUBRIC_AXES, type Rubric, type RubricNotes } from '@/lib/schemas';
import { RUBRIC_HINTS, RUBRIC_LABELS, RUBRIC_PLAIN, RUBRIC_WEIGHTS } from '@/lib/scoring';

const PIPS = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * Ten lozenges, inked or left blank — how a tally is kept in a ledger, and
 * far more legible at a glance than a progress bar. Magnitude is carried by the
 * count, not by colour, so nothing here depends on hue.
 */
function Tally({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="flex items-center gap-[5px]"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-label={`${label}: ${value} of 10`}
    >
      {PIPS.map((pip) => {
        const inked = pip <= value;
        return (
          <span
            key={pip}
            aria-hidden
            className="h-[13px] w-[13px] rotate-45 border"
            style={{
              borderColor: 'rgba(42,30,18,0.65)',
              background: inked ? '#2a1e12' : 'transparent',
            }}
          />
        );
      })}
    </div>
  );
}

export function RubricBars({ rubric, notes }: { rubric: Rubric; notes: RubricNotes }) {
  return (
    <ol className="divide-y divide-[rgba(138,118,88,0.34)] border-y rule-faint">
      {RUBRIC_AXES.map((axis, i) => {
        const value = rubric[axis];
        return (
          <li key={axis} className="py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h4 className="text-[1.35rem] leading-tight text-ink">
                <span className="titling text-vermilion mr-2.5 text-[0.7rem]">
                  {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'][i]}
                </span>
                {RUBRIC_LABELS[axis]}
              </h4>
              <div className="flex items-baseline gap-4">
                {RUBRIC_WEIGHTS[axis] > 1 && (
                  <span className="titling text-[0.6rem] text-ink-faint">
                    counted {RUBRIC_WEIGHTS[axis]}-fold
                  </span>
                )}
                <span className="tabular text-base text-ink-soft">
                  {value} <span className="text-ink-faint">of 10</span>
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Tally value={value} label={RUBRIC_PLAIN[axis]} />
            </div>

            <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-ink">{notes[axis]}</p>
            <p className="mt-1.5 text-sm italic text-ink-faint">
              {RUBRIC_PLAIN[axis]} — {RUBRIC_HINTS[axis]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
