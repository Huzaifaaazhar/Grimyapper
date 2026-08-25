'use client';

import { useRef, useState } from 'react';

import { MAX_CUSTOMER_CHARS, MAX_IDEA_CHARS, MAX_NAME_CHARS, MIN_IDEA_CHARS } from '@/lib/schemas';

type Props = {
  onSubmit: (payload: { idea: string; name: string; customer: string }) => void;
  disabled: boolean;
};

const fieldClass =
  'w-full rounded-none border-b bg-transparent px-0 py-2.5 text-bone placeholder:text-bone-3 rule focus:border-amber focus:outline-none transition-colors';

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
      className="animate-rise"
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
      <label htmlFor="idea" className="label-caps block text-bone-3">
        01 — The pitch
      </label>
      <textarea
        id="idea"
        ref={textareaRef}
        value={idea}
        maxLength={MAX_IDEA_CHARS}
        onChange={(e) => setIdea(e.target.value)}
        rows={4}
        disabled={disabled}
        placeholder="Pitch me your startup in a sentence or two."
        className={`${fieldClass} mt-3 resize-none font-display text-2xl leading-snug sm:text-3xl`}
        aria-describedby="idea-help"
      />

      <div id="idea-help" className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-bone-3">
          {touched && tooShort
            ? 'A sentence. At minimum. The bureau has standards.'
            : 'One or two sentences. No deck required.'}
        </p>
        <span
          className={`label-caps tabular ${remaining < 60 ? 'text-amber' : 'text-bone-3'}`}
          aria-live="polite"
        >
          {remaining}
        </span>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label-caps block text-bone-3">
            02 — Name <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="name"
            value={name}
            maxLength={MAX_NAME_CHARS}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            placeholder="Synergex"
            className={`${fieldClass} mt-2 text-base`}
          />
        </div>
        <div>
          <label htmlFor="customer" className="label-caps block text-bone-3">
            03 — Target customer <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="customer"
            value={customer}
            maxLength={MAX_CUSTOMER_CHARS}
            onChange={(e) => setCustomer(e.target.value)}
            disabled={disabled}
            placeholder="Mid-market insurance adjusters"
            className={`${fieldClass} mt-2 text-base`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="group mt-12 inline-flex w-full items-center justify-center gap-3 border border-stamp bg-stamp px-8 py-4 font-display text-2xl text-bone transition-all hover:bg-stamp-bright hover:border-stamp-bright disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        Judge it
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>
    </form>
  );
}
