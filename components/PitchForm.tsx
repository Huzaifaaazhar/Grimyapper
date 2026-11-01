'use client';

import { gsap } from 'gsap';
import { useId, useRef, useState } from 'react';

import { registerEases } from '@/lib/motion/eases';

import { Fleuron, WaxSeal } from './Ornaments';
import {
  MAX_CAPITAL_CHARS,
  MAX_CUSTOMER_CHARS,
  MAX_IDEA_CHARS,
  MAX_MOAT_CHARS,
  MAX_NAME_CHARS,
  MIN_IDEA_CHARS,
  type Declaration,
  type JudgeRequest,
} from '@/lib/schemas';

type Props = {
  onSubmit: (payload: JudgeRequest) => void;
  disabled: boolean;
};

/*
 * One line each, drawn as a ruled entry in a ledger rather than a boxed input.
 * `text-base` on the smallest size is not decoration: anything under 16px makes
 * iOS Safari zoom the viewport on focus, which threw the old form's layout out
 * the moment anyone touched a field.
 */
const FIELD =
  'w-full rounded-none border-0 border-b bg-transparent px-0 py-2 text-base text-ink placeholder:text-[rgba(111,92,63,0.5)] rule-ink transition-colors focus:border-vermilion focus:outline-none disabled:opacity-50 sm:text-lg ink-field';

const GUILD_SUGGESTIONS = [
  'Adjusters of the middling guilds',
  'Merchant captains',
  'Royal scholars',
  'Physicians and their apothecaries',
  'Masters of the building trades',
  'Clerks of the exchequer',
];

const TREASURY_SUGGESTIONS = [
  'Twelve moons of gold',
  'Five hundred gold florins',
  'The founder’s own purse',
  'A patron’s promise, unsigned',
];

function Legend({ numeral, title, gloss }: { numeral: string; title: string; gloss: string }) {
  return (
    <div className="double-rule pt-4">
      <h3 className="blackletter text-3xl leading-none text-ink sm:text-4xl">
        <span className="titling mr-3 align-middle text-xs text-vermilion">{numeral}</span>
        {title}
      </h3>
      <p className="mt-2 text-sm italic leading-relaxed text-ink-soft">{gloss}</p>
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="titling block text-[0.62rem] leading-relaxed text-ink-faint">
      {children}
    </label>
  );
}

/**
 * The declaration.
 *
 * A radio group and not a switch, for a reason worth stating: a switch has two
 * states and this question has three. "I have not said" is the honest default,
 * and it is a different thing from "no" — the court treats an unclaimed venture
 * differently from one that swore it had no engines and was found to have them.
 *
 * Whatever is chosen here, the assayer still reads the prose and decides for
 * itself. The declaration only ever gets held up against that finding.
 */
function Declare({
  value,
  onChange,
  disabled,
}: {
  value: Declaration;
  onChange: (v: Declaration) => void;
  disabled: boolean;
}) {
  const name = useId();
  const options: Array<[Declaration, string, string]> = [
    ['ai', 'Wrought with AI', 'It thinks'],
    ['none', 'Lacking AI', 'It does not'],
    ['unstated', 'I shall not say', 'Let the court find out'],
  ];

  return (
    <fieldset disabled={disabled} className="mt-8">
      <legend className="titling text-[0.62rem] text-ink-faint">
        Is it wrought with thinking engines?
      </legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {options.map(([v, label, gloss]) => {
          const id = `${name}-${v}`;
          const on = value === v;
          return (
            <div key={v}>
              <input
                type="radio"
                id={id}
                name={name}
                value={v}
                checked={on}
                onChange={() => onChange(v)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={`flex cursor-pointer flex-col items-center gap-1 border-2 px-3 py-3.5 text-center transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vermilion ${
                  on
                    ? 'border-vermilion bg-[rgba(156,43,33,0.09)]'
                    : 'border-[rgba(90,72,46,0.3)] hover:border-[rgba(90,72,46,0.6)]'
                }`}
              >
                <span
                  className={`titling text-[0.6rem] ${on ? 'text-vermilion' : 'text-ink-soft'}`}
                >
                  {label}
                </span>
                <span className="text-xs italic text-ink-faint">{gloss}</span>
              </label>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs italic leading-relaxed text-ink-faint">
        Thy word is recorded, not obeyed. The assayer reads the petition itself and rules on what
        it finds there.
      </p>
    </fieldset>
  );
}

export function PitchForm({ onSubmit, disabled }: Props) {
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [moat, setMoat] = useState('');
  const [capital, setCapital] = useState('');
  const [declared, setDeclared] = useState<Declaration>('unstated');
  const [touched, setTouched] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const tooShort = idea.trim().length < MIN_IDEA_CHARS;
  const remaining = MAX_IDEA_CHARS - idea.length;

  return (
    <form
      className="rise"
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (tooShort || disabled) {
          ideaRef.current?.focus();
          return;
        }
        /*
         * The letter is folded and sealed before it is sent.
         *
         * Submitting used to swap the form out for the curtain on the next
         * frame, which is a cut. Folding it gives the gesture an object: the
         * leaf collapses along its own horizontal axis, tips away, and is gone
         * — and only then does the court retire. The judgement request is
         * already in flight underneath, so this costs nothing but the beat.
         */
        const send = () =>
          onSubmit({
          idea: idea.trim(),
          name: name.trim(),
          customer: customer.trim(),
            moat: moat.trim(),
            capital: capital.trim(),
            declared,
          });

        const el = formRef.current;
        if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          send();
          return;
        }

        registerEases();
        gsap
          .timeline({ onComplete: send })
          .to(el, {
            scaleY: 0.04,
            // Folded sheets do not stay flat to the eye; it tips as it closes.
            rotateX: 42,
            transformOrigin: '50% 50%',
            transformPerspective: 900,
            duration: 0.42,
            ease: 'anticipate',
          })
          .to(el, { opacity: 0, scale: 0.92, duration: 0.16, ease: 'glide' }, '-=0.08');
      }}
    >
      {/* --------------------------------------------------- I. the core artifice */}

      <Legend
        numeral="the first"
        title="The core artifice"
        gloss="What the venture is, and whether it thinks."
      />

      <div className="mt-8">
        <Label htmlFor="name">By what name is it known</Label>
        <input
          id="name"
          value={name}
          maxLength={MAX_NAME_CHARS}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          autoComplete="off"
          placeholder="The Synergx Engine"
          className={`${FIELD} mt-3`}
        />
      </div>

      <Declare value={declared} onChange={setDeclared} disabled={disabled} />

      <div className="mt-8">
        <Label htmlFor="idea">Thy petition</Label>
        <textarea
          id="idea"
          ref={ideaRef}
          value={idea}
          maxLength={MAX_IDEA_CHARS}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          disabled={disabled}
          placeholder="Set down in a sentence or two what the venture does."
          className={`${FIELD} quire mt-3 min-h-[6.5rem] resize-y leading-relaxed sm:text-xl`}
          aria-describedby="idea-help"
          aria-invalid={touched && tooShort}
        />
        <div id="idea-help" className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
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
      </div>

      {/* ------------------------------------------- II. market and guild metrics */}

      <div className="mt-14">
        <Legend
          numeral="the second"
          title="Market &amp; guild metrics"
          gloss="Whom thou wouldst serve, what coin thou hast, and what keeps thieves out. All three may be left blank; the court will note that thou didst."
        />

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <Label htmlFor="customer">Target guilds</Label>
            <input
              id="customer"
              list="guild-suggestions"
              value={customer}
              maxLength={MAX_CUSTOMER_CHARS}
              onChange={(e) => setCustomer(e.target.value)}
              disabled={disabled}
              autoComplete="off"
              placeholder="Adjusters of the middling guilds"
              className={`${FIELD} mt-3`}
            />
            <datalist id="guild-suggestions">
              {GUILD_SUGGESTIONS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>

          <div>
            <Label htmlFor="capital">Treasury reserves</Label>
            <input
              id="capital"
              list="treasury-suggestions"
              value={capital}
              maxLength={MAX_CAPITAL_CHARS}
              onChange={(e) => setCapital(e.target.value)}
              disabled={disabled}
              autoComplete="off"
              placeholder="Twelve moons of gold"
              className={`${FIELD} mt-3`}
              aria-describedby="capital-help"
            />
            <datalist id="treasury-suggestions">
              {TREASURY_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p id="capital-help" className="mt-2 text-xs italic text-ink-faint">
              Recorded upon the charter. Never weighed — coin says nothing of artifice.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Label htmlFor="moat">The secret alchemy</Label>
          <textarea
            id="moat"
            value={moat}
            maxLength={MAX_MOAT_CHARS}
            onChange={(e) => setMoat(e.target.value)}
            rows={2}
            disabled={disabled}
            placeholder="What alchemy protects thy venture from common thieves?"
            className={`${FIELD} quire mt-3 min-h-[4.5rem] resize-y leading-relaxed`}
            aria-describedby="moat-help"
          />
          <p id="moat-help" className="mt-2 text-xs italic text-ink-faint">
            This the assayer does read, and weigh, along with the petition itself.
          </p>
        </div>
      </div>

      <Fleuron className="mx-auto mt-14 max-w-sm" />

      <div className="mt-10 flex flex-col items-center gap-4">
        <button
          type="submit"
          disabled={disabled}
          className="group relative inline-flex items-center gap-4 border-2 border-ink bg-[rgba(42,30,18,0.04)] px-8 py-4 transition-colors hover:border-vermilion hover:bg-[rgba(156,43,33,0.09)] disabled:cursor-not-allowed disabled:opacity-40 sm:px-10"
        >
          <span className="blackletter text-2xl text-ink transition-colors group-hover:text-vermilion sm:text-3xl">
            Seal it and send
          </span>
          <WaxSeal mark="G" size={34} className="shrink-0" />
        </button>
        <p className="text-center text-xs italic text-ink-faint">
          Judgement is rendered forthwith. A refusal may be appealed once.
        </p>
      </div>
    </form>
  );
}
