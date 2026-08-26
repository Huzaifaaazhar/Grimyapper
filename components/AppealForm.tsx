'use client';

import { useState } from 'react';

import { MAX_REBUTTAL_CHARS, MIN_REBUTTAL_CHARS, type JudgeRequest, type JudgeResult } from '@/lib/schemas';

type Dismissal = { ruling: string; unmoved: string };

export function AppealForm({
  petition,
  onUpheld,
}: {
  petition: JudgeRequest;
  onUpheld: (judgement: JudgeResult, moved: string) => void;
}) {
  const [rebuttal, setRebuttal] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'spent'>('idle');
  const [dismissal, setDismissal] = useState<Dismissal | null>(null);
  const [error, setError] = useState('');

  const tooShort = rebuttal.trim().length < MIN_REBUTTAL_CHARS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || state !== 'idle') return;
    setState('sending');
    setError('');

    try {
      const res = await fetch('/api/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...petition, rebuttal: rebuttal.trim() }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body?.error ?? 'The court is silent.');
        setState('idle');
        return;
      }

      if (body.outcome === 'upheld') {
        onUpheld(body.judgement as JudgeResult, body.moved as string);
        return;
      }

      setDismissal({ ruling: body.ruling, unmoved: body.unmoved });
      setState('spent');
    } catch {
      setError('The messenger did not return.');
      setState('idle');
    }
  }

  if (dismissal) {
    return (
      <div className="rise mx-auto mt-8 max-w-xl border-2 border-[rgba(90,72,46,0.42)] bg-[rgba(42,30,18,0.05)] px-6 py-7 text-center">
        <p className="titling text-[0.62rem] text-vermilion">The appeal is dismissed</p>
        <p className="mt-3 text-[1.15rem] leading-snug text-ink">{dismissal.ruling}</p>
        <p className="mt-3 text-sm italic leading-relaxed text-ink-soft">{dismissal.unmoved}</p>
        <p className="titling mt-5 text-[0.6rem] text-ink-faint">
          Thou hast addressed the court. There is no second address.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-xl border-t rule-faint pt-8">
      <label htmlFor="rebuttal" className="titling block text-center text-[0.62rem] text-ink-faint">
        Thou may address the court once
      </label>
      <p className="mx-auto mt-2 max-w-md text-center text-sm italic leading-relaxed text-ink-soft">
        One sentence. The court has never once reconsidered — though it does, in fairness, read
        what thou writest and weigh it properly.
      </p>

      <textarea
        id="rebuttal"
        value={rebuttal}
        maxLength={MAX_REBUTTAL_CHARS}
        onChange={(e) => setRebuttal(e.target.value)}
        disabled={state !== 'idle'}
        rows={2}
        placeholder="But the engines cannot…"
        className="mt-5 w-full resize-none border-0 border-b bg-transparent px-0 py-2 text-center text-xl text-ink placeholder:text-[rgba(111,92,63,0.5)] rule-ink focus:border-vermilion focus:outline-none disabled:opacity-50"
      />

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <span className="text-xs italic text-ink-faint">
          {error || (state === 'sending' ? 'The court confers…' : ' ')}
        </span>
        <span className="tabular text-xs text-ink-faint">
          {MAX_REBUTTAL_CHARS - rebuttal.length}
        </span>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="submit"
          disabled={tooShort || state !== 'idle'}
          className="border-2 border-ink px-7 py-3 transition-colors hover:border-vermilion disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="blackletter text-2xl text-ink">Address the court</span>
        </button>
      </div>
    </form>
  );
}
