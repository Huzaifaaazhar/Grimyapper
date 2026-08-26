import type { TelemetrySnapshot } from '@/lib/telemetry';

/**
 * The live histogram of where judgements land on the decision scale.
 *
 * One series, so colour encodes nothing and the bars are simply ink — except
 * the bucket the threshold falls in, marked in vermilion because that is the
 * bucket where the model is least sure and the reader should look.
 */
export function TelemetryPanel({
  snapshot,
  threshold,
}: {
  snapshot: TelemetrySnapshot;
  threshold: number;
}) {
  const { total, evaluated, rejected, nearBoundary, uncertainBand, sinceMinutes, histogram } =
    snapshot;

  if (total === 0) {
    return (
      <p className="text-sm italic leading-relaxed text-ink-soft">
        No petitions judged by this instance yet. The counter is in memory and resets whenever the
        server does, so an empty panel usually means a recent deploy rather than an empty court.
      </p>
    );
  }

  const peak = Math.max(...histogram.map((b) => b.count), 1);
  const uncertainShare = (nearBoundary / total) * 100;

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px bg-[rgba(90,72,46,0.34)] sm:grid-cols-4">
        {[
          ['Judged', String(total), `in the last ${sinceMinutes} min`],
          ['Assayed', String(evaluated), 'sent to the rubric'],
          ['Buried', String(rejected), 'sent to the decree'],
          ['Close calls', `${uncertainShare.toFixed(1)}%`, `within ${uncertainBand} of the line`],
        ].map(([label, value, note]) => (
          <div key={label} className="bg-vellum px-4 py-4">
            <dt className="titling text-[0.6rem] text-ink-faint">{label}</dt>
            <dd className="tabular mt-1.5 text-2xl text-ink">{value}</dd>
            <dd className="mt-1 text-[0.72rem] italic leading-snug text-ink-faint">{note}</dd>
          </div>
        ))}
      </dl>

      <figure className="mt-8">
        <figcaption className="titling mb-4 text-[0.6rem] text-ink-faint">
          Judgements by probability · the line marks the {threshold} threshold
        </figcaption>
        <div className="flex h-40 items-end gap-1.5">
          {histogram.map((bin) => {
            const straddles = threshold >= bin.from && threshold < bin.to;
            return (
              <div key={bin.from} className="flex flex-1 flex-col items-center justify-end gap-2">
                <span className="tabular text-[0.65rem] text-ink-faint">{bin.count || ''}</span>
                <div
                  className="w-full"
                  style={{
                    height: `${Math.max(2, (bin.count / peak) * 100)}%`,
                    background: straddles ? '#9c2b21' : '#2a1e12',
                  }}
                  title={`${bin.from.toFixed(1)}–${bin.to.toFixed(1)}: ${bin.count}`}
                />
                <span className="tabular text-[0.6rem] text-ink-faint">
                  {bin.from.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </figure>

      <p className="mt-5 text-sm leading-relaxed text-ink-soft">
        Petitions piling up against the vermilion bar are the ones the model is least sure about,
        and they are where another few labelled examples would buy the most.{' '}
        <span className="tabular text-ink">npm run mine</span> ranks the known petitions the same
        way, so the two can be compared: if the live share of close calls runs well above the
        corpus&rsquo;s, real petitions are harder than the ones the model was fitted on.
      </p>
    </div>
  );
}
