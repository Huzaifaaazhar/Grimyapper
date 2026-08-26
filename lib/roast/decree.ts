import { hash32, normalise } from '../nlp/text';
import type { Rejection } from '../schemas';

/**
 * The decree of extinction, composed rather than generated.
 *
 * Without a model to write prose, variety has to come from structure: the
 * petition is sorted into a trade, and each trade supplies its own undoings,
 * laments and successors, which combine against shared pools. Every line is
 * written by hand, so the register never slips and the joke never misfires —
 * the cost is that the space is finite rather than infinite.
 *
 * Seeded from the petition, so the same venture always receives the same
 * decree. Judge it twice and the court does not change its mind.
 */

/** mulberry32 — small, fast, and good enough to shuffle jokes with. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Trade = {
  id: string;
  match: RegExp;
  undoing: string[];
  successor: string[];
  lament: string[];
};

const TRADES: Trade[] = [
  {
    id: 'food',
    match: /\b(bakery|baker|restaurant|cafe|café|coffee|kitchen|catering|brewery|bar|pub|juice|meal|food|butcher|grocer|sandwich|cheese|wine|vineyard)\b/,
    undoing: [
      'An automaton clerk shall know what every household intends to eat before the household does, and shall order it elsewhere',
      'The engines shall plan the week’s meals for every family in the parish, and thy name shall not appear in the plan',
      'A reckoning machine shall price thy competitors hourly and thy margin shall be the first thing it eats',
    ],
    successor: [
      'A familiar spirit that plans every meal and orders the parts',
      'An automaton kitchen that never salts twice',
      'A thinking engine with the whole parish’s appetite in its ledger',
    ],
    lament: [
      'It fed people well. The engines fed them adequately, and cheaper, and without ever being closed on a Monday',
      'It rose at four each morning. The engines do not rise, and do not stop',
      'The bread was honest. Honesty, it turns out, was never the constraint',
    ],
  },
  {
    id: 'pets',
    match: /\b(dog|dogs|pet|pets|cat|cats|walker|walking|grooming|kennel|veterinar\w*)\b/,
    undoing: [
      'An automaton clerk already knows every walker upon thy street, and asks no commission for the knowing',
      'The engines shall arrange the whole affair between neighbours, and thy fifth of the purse with it',
      'A familiar spirit with sight of every calendar shall do thy matching for nothing at all',
    ],
    successor: [
      'A familiar spirit with sight of thy calendar and thy coin',
      'An assistant that books a neighbour and settles the payment unasked',
      'A thinking engine that needs no fee for an introduction',
    ],
    lament: [
      'It matched dogs to strangers. So doth a map, and the map hath never once asked for a fifth of the purse',
      'The dogs were walked. They shall still be walked. Merely not by thee, and not for thy price',
      'It stood between two willing parties and charged them for the standing',
    ],
  },
  {
    id: 'retail',
    match: /\b(store|shop|selling|sell|subscription\s+box|handmade|artisanal|merch|e-?commerce|goods|candle|journal|clothing|jewell?ery|furniture|stationery)\b/,
    undoing: [
      'The engines shall find thy customer a nearer maker, a cheaper maker, and a maker who answers at midnight',
      'A reckoning machine shall compare thy wares against every rival in the realm before the customer has finished reading thy first line',
      'An automaton clerk shall design, price and ship the same object without ever having touched one',
    ],
    successor: [
      'An assistant that compares every maker in the realm in an instant',
      'A thinking engine that designs the object and finds the cheaper hand to make it',
      'A familiar spirit that shops on the customer’s behalf and is not charmed by thy branding',
    ],
    lament: [
      'The wares were lovely. Loveliness is not a moat, and the engines are not sentimental',
      'It sold objects to people. The engines sell objects to people faster, and never sleep in',
      'Each piece was made by hand. The engines noted this, and were unmoved',
    ],
  },
  {
    id: 'homeServices',
    match: /\b(clean\w*|plumb\w*|landscap\w*|garden\w*|laundr\w*|removal|handyman|electric\w*|repair|valet\w*|window|car\s+wash|decorat\w*)\b/,
    undoing: [
      'An automaton clerk shall dispatch the nearest willing hand directly, and the arranging that was thy trade shall cost nothing',
      'The engines shall quote, schedule and settle the work between two strangers without thee standing in the middle',
      'A thinking engine shall route every van in the parish better than thou ever did, and shall give the routing away',
    ],
    successor: [
      'An assistant that finds the nearest hand and settles the price',
      'A familiar spirit that arranges the work and takes no cut',
      'A thinking engine that dispatches without a dispatcher',
    ],
    lament: [
      'The work was honest and the arranging was the business. The engines arrange for free',
      'Someone must still hold the mop. It is simply no longer thy company that decides who',
      'It sold coordination. Coordination is the cheapest thing the engines make',
    ],
  },
  {
    id: 'agency',
    match: /\b(agency|studio|consultanc\w*|consulting|freelanc\w*|design|marketing|recruit\w*|staffing|translat\w*|copywrit\w*|pitch\s+deck|branding)\b/,
    undoing: [
      'The engines shall produce the first draft, the second draft and the invoice, and the client shall notice the difference in none of them',
      'An automaton clerk shall do in an afternoon what thy people bill for a fortnight, and shall not require a fortnight’s lunch',
      'A thinking engine shall render thy craft a checkbox in a tool the client already owns',
    ],
    successor: [
      'An automaton clerk that drafts, revises and never invoices for revisions',
      'A familiar spirit inside the tool the client already pays for',
      'A thinking engine that works at the price of electricity',
    ],
    lament: [
      'It sold hours. The engines do not keep hours, and cannot be persuaded to bill for them',
      'The taste was real. The taste was also the only part that could not be copied, and it was four per cent of the invoice',
      'It charged by the day for work that now takes a minute. The arithmetic was always going to arrive',
    ],
  },
  {
    id: 'fitness',
    match: /\b(gym|fitness|training|trainer|yoga|pilates|climb\w*|sport|workout|coach\w*)\b/,
    undoing: [
      'A familiar spirit shall write every plan, count every repetition and scold at no charge whatsoever',
      'The engines shall coach through the glass, in the customer’s own room, at the hour of their choosing',
      'An automaton clerk shall know the body better than thy instructor, and shall never be on holiday',
    ],
    successor: [
      'A familiar spirit that coaches through a rectangle of glass',
      'An automaton trainer that counts every repetition and forgets nothing',
      'A thinking engine with every body in the realm in its ledger',
    ],
    lament: [
      'It sold discipline. The engines sell discipline too, and do not require anyone to leave the house',
      'The encouragement was genuine. It was also the only part that could not be shipped',
      'People came for the coaching and stayed for the company. The engines have taken the coaching and left thee the company',
    ],
  },
  {
    id: 'property',
    match: /\b(estate\s+agent|propert\w*|landlord|rent\w*|tenanc\w*|letting|storage|housing|architect\w*|surveyor)\b/,
    undoing: [
      'An automaton clerk shall value, list and describe every dwelling in the realm before thou hast finished thy first viewing',
      'The engines shall arrange the whole transaction between buyer and seller, and thy percentage shall be the part they remove first',
      'A thinking engine shall know every price in the parish, and shall not be persuaded by thy adjectives',
    ],
    successor: [
      'An assistant that values, lists and negotiates without a commission',
      'A familiar spirit that knows every price in the parish',
      'A thinking engine that arranges the sale and keeps none of it',
    ],
    lament: [
      'It stood between two parties and charged a percentage for the standing. The engines charge nothing to stand',
      'The local knowledge was real, right up until it was written down and given away',
      'It sold access to information. Information is now free and rather better organised',
    ],
  },
  {
    id: 'logistics',
    match: /\b(courier|delivery|deliver\w*|haulage|logistics|freight|taxi|driver|fleet|shipping|transport)\b/,
    undoing: [
      'The engines shall route every vehicle in the realm, and the routing was the only part of thee that was not a wheel',
      'An automaton clerk shall match every parcel to the nearest carrier, and thy margin lived entirely in that matching',
      'A thinking engine shall price the journey better than thee, and shall do it for every carrier at once',
    ],
    successor: [
      'A thinking engine that routes every vehicle in the realm at once',
      'An automaton dispatcher that never sleeps and never guesses',
      'A familiar spirit that matches parcel to carrier for nothing',
    ],
    lament: [
      'Something must still be carried. The deciding of who carries it was thy business, and the deciding is now free',
      'It moved things from here to there. The engines decided the there, and kept the profitable half',
      'The vans were thine. The intelligence directing them was not, and never had been',
    ],
  },
  {
    id: 'education',
    match: /\b(tutor\w*|teach\w*|school|lesson|course|student|learn\w*|language|driving\s+school|camp|nursery|childcare)\b/,
    undoing: [
      'A familiar spirit shall teach any subject, at any hour, with infinite patience and no hourly rate',
      'The engines shall mark, explain and re-explain until the pupil understands, which no tutor has ever had the time to do',
      'An automaton clerk shall know precisely which idea the pupil is missing, which thou didst only ever guess at',
    ],
    successor: [
      'A familiar spirit that teaches any subject at any hour',
      'An automaton tutor with infinite patience and no hourly rate',
      'A thinking engine that knows exactly which idea is missing',
    ],
    lament: [
      'It taught well. The engines teach adequately, at three in the morning, for nothing',
      'The patience was the product, and patience is the one thing the engines have in unlimited supply',
      'Children learned here. They shall still learn. The learning simply stopped being a business',
    ],
  },
  {
    id: 'beauty',
    match: /\b(salon|barber|hair|nail|spa|beauty|grooming|tailor\w*|makeup|photograph\w*)\b/,
    undoing: [
      'The engines shall book, remind and reschedule for nothing, and the booking was where thy margin quietly lived',
      'An automaton clerk shall show the customer the result before a hand is laid upon them, and half shall decide against it',
      'A thinking engine shall fill thy chairs better than thee and shall then fill thy rival’s',
    ],
    successor: [
      'An assistant that books, reminds and reschedules for nothing',
      'A familiar spirit that shows the result before the scissors move',
      'A thinking engine that fills every chair in the parish',
    ],
    lament: [
      'The hands were skilled. Everything around the hands has been given away free',
      'It sold an appointment and a conversation. The appointment is now free; keep the conversation',
      'The craft survives. The business around the craft does not',
    ],
  },
  {
    id: 'professional',
    match: /\b(law|legal|solicitor|lawyer|accountan\w*|bookkeep\w*|payroll|audit|tax|compliance|paralegal|advis\w*)\b/,
    undoing: [
      'An automaton clerk shall read every document in the hour thy junior takes to find the folder',
      'The engines shall answer the ordinary question for nothing, and the ordinary question was most of thy ledger',
      'A thinking engine shall do the first four hours of every matter, and thou didst bill chiefly for the first four hours',
    ],
    successor: [
      'An automaton clerk that reads every document before breakfast',
      'A familiar spirit that answers the ordinary question for nothing',
      'A thinking engine that does the first four billable hours in four seconds',
    ],
    lament: [
      'It billed by the hour for work that no longer takes an hour. The arithmetic was always coming',
      'The judgement was worth paying for. The reading around it was ninety parts in a hundred, and the reading is free',
      'It sold expensive attention to cheap questions',
    ],
  },
  {
    id: 'hospitality',
    match: /\b(hotel|hostel|guest|co-?working|workspace|event|venue|wedding|tour|travel|booking)\b/,
    undoing: [
      'A familiar spirit shall plan the whole journey, book every part and never once suggest thy establishment',
      'The engines shall arrange it all directly between guest and house, and the arranging was thy entire trade',
      'An automaton clerk shall price every room in the realm nightly, and thine shall be found wanting at speed',
    ],
    successor: [
      'A familiar spirit that plans the journey and books every part',
      'An assistant that arranges the whole affair without an agent',
      'A thinking engine that prices every room in the realm each night',
    ],
    lament: [
      'The welcome was warm. The booking was the business, and the booking has been taken',
      'It arranged things for people who could not be bothered. The engines cannot be bothered either, and are free',
      'The rooms remain. The reason to come through thee does not',
    ],
  },
  {
    id: 'software',
    match: /\b(software|platform|dashboard|tool|app|saas|crm|system|invoicing|scheduling|tracking)\b/,
    undoing: [
      'The engines shall build this from a sentence, and the sentence shall be shorter than thy landing page',
      'An automaton clerk shall assemble the same thing inside the tool thy customer already pays for',
      'A thinking engine shall render this a feature, and features do not raise a second round',
    ],
    successor: [
      'A thinking engine that builds it from a single sentence',
      'A familiar spirit already living inside the tool they pay for',
      'An automaton clerk that ships this as a checkbox',
    ],
    lament: [
      'It was competently built and comfortably replaceable',
      'It solved the problem. So did the four other things already on the customer’s desk',
      'Nothing was wrong with it, which turned out not to be enough',
    ],
  },
];

const GENERIC: Omit<Trade, 'id' | 'match'> = {
  undoing: [
    'An automaton clerk shall do the whole of it, at the price of electricity, and shall not require a holiday',
    'The engines shall offer this freely as a mere convenience, and free is a price thou cannot meet',
    'A thinking engine shall absorb thy trade as a feature, and features do not have founders',
  ],
  successor: [
    'A familiar spirit bound in a rectangle of glass',
    'An automaton clerk that works for the price of electricity',
    'A thinking engine that ships this as a checkbox',
  ],
  lament: [
    'It was a reasonable idea, and reasonable is precisely what the engines are cheapest at',
    'It stood in the path of something very large and did not step aside',
    'Nothing here was foolish. That is what makes the burial so quick',
  ],
};

const HOURS = [
  'The third quarter of the year twenty-seven, upon the morning the engines offered it freely as a mere checkbox',
  'A Tuesday in the spring of twenty-eight, between one release of the engines and the next',
  'The feast of the second quarter, twenty-seven, when a rectangle of glass learned to do it unasked',
  'Some grey afternoon in twenty-seven, at the precise hour nobody thought to look',
  'The eleventh month of twenty-six, when the engines shipped it as a convenience and did not announce it',
  'Midwinter, twenty-seven, upon the release of an engine that was not even aimed at thee',
  'The fourth quarter of twenty-eight, when the last customer found a cheaper spirit',
  'A Thursday. The engines do not observe feast days, and neither shall thy creditors',
];

const OPENINGS = ['', '', '', 'In the ordinary course, ', 'Without malice, ', 'Quietly, and at speed, '];

function tradeFor(text: string): Trade | null {
  const hay = ` ${normalise(text)} `;
  return TRADES.find((t) => t.match.test(hay)) ?? null;
}

const pick = <T,>(pool: T[], r: () => number): T => pool[Math.floor(r() * pool.length) % pool.length];

/**
 * Join an opening clause to a clause that was written to start a sentence.
 * Without this you get "Quietly, and at speed, A familiar spirit shall…" — the
 * stray capital is the tell that the line was assembled rather than written.
 * Words that are capitalised for their own sake are left alone.
 */
function joinClause(opening: string, clause: string): string {
  if (!opening) return clause;
  const head = clause.slice(0, clause.indexOf(' ') === -1 ? clause.length : clause.indexOf(' '));
  const isProperNoun = head.length > 1 && head.slice(1) !== head.slice(1).toLowerCase();
  const body = isProperNoun ? clause : clause.charAt(0).toLowerCase() + clause.slice(1);
  return `${opening}${body}`;
}

/** Compose a decree. Deterministic in `text`, so a petition always reads alike. */
export function composeDecree(text: string): Rejection {
  const trade = tradeFor(text);
  const r = rng(hash32(text));

  const undoing = [...(trade?.undoing ?? []), ...GENERIC.undoing];
  const successor = [...(trade?.successor ?? []), ...GENERIC.successor];
  const lament = [...(trade?.lament ?? []), ...GENERIC.lament];

  return {
    verdict: 'REJECTED',
    cause_of_death: `${joinClause(pick(OPENINGS, r), pick(undoing, r))}.`,
    time_of_death: `${pick(HOURS, r)}.`,
    eulogy: `${pick(lament, r)}.`,
    ai_that_replaces_it: pick(successor, r),
  };
}

/** Exposed for the eval harness: how many distinct decrees a trade can produce. */
export function decreeVariety(): { trades: number; minCombinations: number } {
  const perTrade = TRADES.map(
    (t) =>
      (t.undoing.length + GENERIC.undoing.length) *
      (t.lament.length + GENERIC.lament.length) *
      (t.successor.length + GENERIC.successor.length) *
      HOURS.length *
      OPENINGS.length,
  );
  return { trades: TRADES.length, minCombinations: Math.min(...perTrade) };
}
