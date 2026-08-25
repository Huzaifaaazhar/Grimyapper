import { RUBRIC_AXES, type Rubric, type RubricNotes } from '@/lib/schemas';
import { RUBRIC_HINTS, RUBRIC_LABELS, RUBRIC_WEIGHTS } from '@/lib/scoring';

/** One hue, light→dark by magnitude: a sequential ramp, not eight identities. */
function toneFor(value: number): string {
  const t = Math.max(0, Math.min(10, value)) / 10;
  const lightness = 0.42 + t * 0.26;
  const chroma = 0.06 + t * 0.09;
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 88)`;
}

export function RubricBars({ rubric, notes }: { rubric: Rubric; notes: RubricNotes }) {
  return (
    <ol className="divide-y divide-[rgba(236,229,216,0.10)] border-y rule">
      {RUBRIC_AXES.map((axis) => {
        const value = rubric[axis];
        return (
          <li key={axis} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h4 className="font-display text-xl text-bone">{RUBRIC_LABELS[axis]}</h4>
              <div className="flex items-baseline gap-3">
                {RUBRIC_WEIGHTS[axis] > 1 && (
                  <span className="label-caps text-bone-3">×{RUBRIC_WEIGHTS[axis]} weight</span>
                )}
                <span className="tabular font-mono text-sm text-bone-2">
                  {value}
                  <span className="text-bone-3">/10</span>
                </span>
              </div>
            </div>

            <div
              className="mt-3 h-2 w-full bg-[rgba(236,229,216,0.08)]"
              role="meter"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={`${RUBRIC_LABELS[axis]}: ${value} out of 10`}
            >
              <div
                className="h-full rounded-r-[4px] transition-[width] duration-700 ease-out"
                style={{ width: `${(value / 10) * 100}%`, background: toneFor(value) }}
              />
            </div>

            <p className="mt-3 text-sm leading-relaxed text-bone-2">{notes[axis]}</p>
            <p className="mt-1 text-xs text-bone-3">{RUBRIC_HINTS[axis]}</p>
          </li>
        );
      })}
    </ol>
  );
}
