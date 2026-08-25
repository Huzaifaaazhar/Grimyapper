'use client';

import { useEffect, useState } from 'react';

import { WaxSeal } from './Ornaments';

const LINES = [
  'The clerks are consulting the ossuary of failed ventures…',
  'A boy has been sent to the archive. He is not a fast boy.',
  'Weighing thy venture against the great thinking engines…',
  'The assayer is sharpening his quill. This bodes ill.',
  'Consulting the almanac for the hour of thy ruin…',
  'Three merchants attempted this in the year twenty-four. We are looking them up.',
  'The wax is warming.',
  'The scribe has spilt ink upon the ledger. He is unharmed. Thy venture is not.',
];

export function LoadingCurtain() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % LINES.length), 2300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fade flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div
        className="relative"
        style={{ animation: 'fade 1.5s ease-in-out infinite alternate' }}
      >
        <WaxSeal mark="G" size={92} />
      </div>

      <p
        key={index}
        className="fade mt-10 max-w-lg text-2xl italic leading-snug text-ink sm:text-[1.7rem]"
        aria-live="polite"
      >
        {LINES[index]}
      </p>

      <p className="titling mt-8 text-xs text-ink-faint">The court deliberates</p>
    </div>
  );
}
