'use client';

import { useRef, useState } from 'react';

import { WaxSeal } from './Ornaments';
import { MAX_CUSTOMER_CHARS, MAX_IDEA_CHARS, MAX_NAME_CHARS, MIN_IDEA_CHARS } from '@/lib/schemas';

type Props = {
  onSubmit: (payload: { idea: string; name: string; customer: string }) => void;
  disabled: boolean;
};

const field =
  'w-full rounded-none border-0 border-b bg-transparent px-0 py-2 text-ink placeholder:text-[rgba(111,92,63,0.55)] rule-ink focus:border-vermilion focus:outline-none transition-colors';

function Numeral({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-vermilion mr-2 font-[family-name:var(--font-title)] tracking-[0.16em]">
      {children}
    </span>
  );
}

export function PitchForm({ onSubmit, disabled }: Props) {
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tooShort = idea.trim().length < MIN_IDEA_CHARS;
  const remaining = MAX_IDEA_CHARS - idea.length;

  return (
    <form
      className="rise"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (tooShort || disabled) {
          textareaRef.current?.focus();
          return;
        }
        onSubmit({ idea: idea.trim(), name: name.trim(), customer: customer.trim() });
      }}
    >
      <label htmlFor="idea" className="titling block text-xs text-ink-faint">
        <Numeral>I</Numeral> Thy petition
      </label>

      <textarea
        id="idea"
        ref={textareaRef}
        value={idea}
        maxLength={MAX_IDEA_CHARS}
        onChange={(e) => setIdea(e.target.value)}
        rows={4}
        disabled={disabled}
        placeholder="Set down thy venture in a sentence or two."
        className={`${field} mt-4 resize-none text-2xl leading-[1.62rem] sm:text-[1.7rem]`}
        aria-describedby="idea-help"
      />

      <div id="idea-help" className="mt-3 flex items-baseline justify-between gap-4">
        <p className="text-sm italic text-ink-soft">
          {touched && tooShort
            ? 'A sentence at the least. The clerks will not read fragments.'
            : 'A sentence or two. No ledger of accounts is required.'}
        </p>
        <span
          className={`tabular text-xs ${remaining < 60 ? 'text-vermilion' : 'text-ink-faint'}`}
          aria-live="polite"
        >
          {remaining} characters remain
        </span>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="titling block text-xs text-ink-faint">
            <Numeral>II</Numeral> By what name is it known
          </label>
          <input
            id="name"
            value={name}
            maxLength={MAX_NAME_CHARS}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            placeholder="The Synergex Company"
            className={`${field} mt-3 text-lg`}
          />
        </div>
        <div>
          <label htmlFor="customer" className="titling block text-xs text-ink-faint">
            <Numeral>III</Numeral> Whom dost thou intend to serve
          </label>
          <input
            id="customer"
            value={customer}
            maxLength={MAX_CUSTOMER_CHARS}
            onChange={(e) => setCustomer(e.target.value)}
            disabled={disabled}
            placeholder="Adjusters of the middling guilds"
            className={`${field} mt-3 text-lg`}
          />
        </div>
      </div>

      <div className="mt-14 flex flex-col items-center gap-4">
        <button
          type="submit"
          disabled={disabled}
          className="group relative inline-flex items-center gap-4 border-2 border-ink bg-[rgba(42,30,18,0.04)] px-10 py-4 transition-colors hover:bg-[rgba(156,43,33,0.09)] hover:border-vermilion disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="blackletter text-3xl text-ink transition-colors group-hover:text-vermilion">
            Seal it and send
          </span>
          <WaxSeal mark="G" size={34} className="shrink-0" />
        </button>
        <p className="text-xs italic text-ink-faint">
          Judgement is rendered forthwith, and cannot be appealed.
        </p>
      </div>
    </form>
  );
}
