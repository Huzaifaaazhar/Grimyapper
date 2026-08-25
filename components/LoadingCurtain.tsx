'use client';

import { useEffect, useState } from 'react';

const LINES = [
  'Consulting the graveyard of dead startups…',
  'Cross-referencing your idea against next quarter’s changelog…',
  'Asking a model whether it could just do this itself…',
  'Measuring the moat. Bringing a very short ruler…',
  'Checking whether anyone has ever paid for this…',
  'Warming up the rubber stamp…',
  'Estimating time-to-obsolescence in business days…',
  'Interviewing three founders who tried this in 2024…',
];

export function LoadingCurtain() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % LINES.length), 2100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-fade flex min-h-[38vh] flex-col items-center justify-center text-center">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-stamp-bright"
            style={{ animation: `fade 1.1s ease-in-out ${i * 0.18}s infinite alternate` }}
          />
        ))}
      </div>
      <p
        key={index}
        className="animate-fade mt-8 max-w-md font-display text-2xl leading-snug text-bone sm:text-3xl"
        aria-live="polite"
      >
        {LINES[index]}
      </p>
      <p className="label-caps mt-6 text-bone-3">Deliberating</p>
    </div>
  );
}
