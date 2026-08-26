import { normalise } from './text';

/**
 * Engineered features, alongside the bag-of-words.
 *
 * A bag-of-words model cannot separate "a bakery that uses ChatGPT for captions"
 * from "a model that writes captions" — both contain the same tokens. What
 * separates them is *what is being sold*, and that lives in sentence shape, not
 * in word counts. These patterns capture that shape, and the classifier learns
 * how much to trust each one.
 *
 * They are reused downstream: the rubric scorer and the decree generator read
 * the same signals, so one reading of the petition drives all three.
 */

export const SIGNAL_NAMES = [
  'core_model_product',
  'thin_wrapper_shape',
  'internal_use_shape',
  'proprietary_data',
  'integration_depth',
  'regulated_domain',
  'physical_world',
  'human_service',
  'marketplace',
  'retail_goods',
  'agency_or_consultancy',
  'hospitality_or_food',
  'b2b_buyer',
  'consumer_buyer',
  'ai_vocabulary',
  'automation_verb',
  'novelty_toy',
  'workflow_embedded',
  'generative_product',
  'buzzword_veneer',
  'deterministic_software',
] as const;

export type SignalName = (typeof SIGNAL_NAMES)[number];
export type Signals = Record<SignalName, number>;

type Rule = { re: RegExp; weight?: number };

const PATTERNS: Record<SignalName, Rule[]> = {
  // The thing being sold IS the model's output.
  core_model_product: [
    { re: /\b(a|an|our|the)\s+(ai\s+)?(model|agent|classifier|network|engine)\s+(that|which|to)\b/ },
    // Nouns that already imply learning may take the broad verb list.
    { re: /\b(model|agent|classifier|network|copilot|assistant)\s+(that|which)\s+(reads|writes|drafts|detects|predicts|generates|extracts|summari[sz]es|transcribes|classifies|flags|scores|answers|watches|monitors|grades|triages)\b/ },
    // "software"/"tool"/"system" are neutral — deterministic software also reads
    // and extracts — so they only count with a verb that requires judgement.
    { re: /\b(software|tool|system|engine|platform)\s+(that|which)\s+(predicts|detects|classifies|recogni[sz]es|understands|grades|triages|diagnoses|forecasts|generates|summari[sz]es|transcribes)\b/ },
    // Vision reads a medium, not a file format.
    { re: /\b(vision|visual)\s+(software|system|model)\b/ },
    { re: /\b(from|of)\s+(a\s+)?(photograph|photo|image|video|footage|scan|x-?ray|slide)s?\b/ },
    // The subject is the technique itself: "machine learning that flags…",
    // "AI that watches…". Same product shape, different noun in the slot.
    { re: /\b(machine\s+learning|computer\s+vision|deep\s+learning|an?\s+ai|ml|a\s+model|our\s+model)\s+(that|which)\s+\w+s\b/ },
    // A first-person claim to do the inference: "we predict…", "we classify…".
    { re: /\bwe\s+(predict|forecast|detect|classify|score|extract|transcribe|generate|recogni[sz]e)\b/ },
    { re: /\b(trained|fine-?tuned|fine\s?tuned)\s+(on|upon)\b/ },
    { re: /\bwe\s+(train|build|fit)\s+(a|an|our|the)\s+\w*\s*(model|classifier|network|engine)\b/ },
    { re: /\b(it|which|that)\s+(predicts|detects|forecasts|classifies|generates|recommends)\b/ },
    { re: /\bai[- ]?(powered|native|first)\s+\w+\s+(that|which)\s+(reads|writes|drafts|detects|predicts|generates)\b/ },
    { re: /\b(autonomous|ai)\s+agents?\b/ },
    { re: /\bforecast(ing)?\s+model\b/ },
  ],

  // An interface laid directly over a public model, with nothing underneath.
  thin_wrapper_shape: [
    { re: /\bchat\s+with\s+your\b/ },
    { re: /\b(paste|upload)\s+(your\s+)?(text|pdf|document|file)s?\b.*\b(and|then)\b/ },
    { re: /\b(gpt|chatgpt|claude|gemini|llm)\s+(wrapper|prompt|prompts)\b/ },
    { re: /\bprompt\s+(library|pack|marketplace|templates?)\b/ },
    { re: /\b(writes?|generates?)\s+(your|my)\s+\w+\s+(for\s+you|using\s+(chatgpt|gpt|ai))\b/ },
    { re: /\busing\s+(chatgpt|gpt-?4|gpt)\b/ },
    { re: /\bmakes?\s+it\s+sound\s+(more\s+)?\w+\b/ },
    { re: /\bask\s+(it\s+)?(questions|things)\s+about\s+(it|your)\b/ },
    { re: /\bprompt\s+(pack|packs|marketplace)\b/ },
    { re: /\bone\s+click\b/ },
    { re: /\bturns?\s+(any|your)\s+\w+\s+into\b/ },
    { re: /\b(browser\s+extension|chrome\s+extension)\b/ },
  ],

  // AI is a tool the business uses, not the thing the customer buys.
  internal_use_shape: [
    { re: /\bwe\s+use\s+(ai|chatgpt|gpt|an?\s+ai\s+\w+|machine\s+learning)\b/ },
    { re: /\buses?\s+(ai|chatgpt|gpt|an?\s+ai\s+\w+)\s+(to|for)\b/ },
    { re: /\b(internally|behind\s+the\s+scenes|in\s+the\s+back\s+office)\b/ },
    { re: /\bour\s+(staff|team|recruiters|paralegals|writers|designers|crew)\s+use\b/ },
    { re: /\b(to|which)\s+(write|schedule|plan|draft)\s+our\s+\w+/ },
    { re: /\bsaves?\s+(us|me)\s+(a\s+lot\s+of\s+)?time\b/ },
    { re: /\bwe\s+(still\s+)?(bill|charge)\s+(clients\s+)?(by\s+the\s+hour|per|a\s+\w+\s+fee)\b/ },
  ],

  proprietary_data: [
    // Qualifiers routinely sit between the adjective and the noun — "proprietary
    // claims data", "our own labelled repair records" — so allow a few words.
    { re: /\b(proprietary|our\s+own|exclusive|labelled|labeled|in-?house)\s+(\w+\s+){0,2}(data|dataset|corpus|records|archive|history|logs)\b/ },
    { re: /\b(one|two|three|four|five|ten|\d+)\s+years?\s+of\s+(\w+\s+){0,3}(data|records|history|audio|imagery|filings)\b/ },
    { re: /\bdata\s+(moat|advantage|we\s+own|nobody\s+else)\b/ },
    { re: /\b(historical|historic)\s+(\w+\s+){0,2}(data|records|loss)\b/ },
    { re: /\b(our|its)\s+own\s+(fleet\s+)?(telemetry|labelled|labeled)\b/ },
  ],

  integration_depth: [
    { re: /\bintegrat(es?|ion|ed)\s+(with|into)\b/ },
    { re: /\b(ehr|emr|erp|crm|epic|salesforce|sap|quickbooks|core\s+banking)\b/ },
    { re: /\b(plugs?|sits)\s+into\s+(their|the|existing)\b/ },
    { re: /\bexisting\s+workflow\b/ },
  ],

  regulated_domain: [
    { re: /\b(insurance|insurer|claims?|underwrit\w+)\b/ },
    { re: /\b(medical|clinical|patient|radiolog\w+|hospital|diagnos\w+|health\s?care)\b/ },
    { re: /\b(legal|compliance|regulatory|audit|kyc|aml|tax)\b/ },
    { re: /\b(bank|banking|lending|credit\s+risk|financial\s+services)\b/ },
    { re: /\b(pharma\w*|clinical\s+trial)\b/ },
  ],

  physical_world: [
    // "camera" is deliberately not here on its own — renting camera equipment
    // to film crews is not a vision company. It counts only in a sensing context.
    { re: /\b(drone|robot|lidar|satellite|telemetry|hardware)\b/ },
    { re: /\b(sensor|cctv|security\s+footage|overhead\s+camera|cameras?\s+(that|which|on))\b/ },
    { re: /\b(inspect\w*|weld\w*|pipeline|factory|warehouse|assembly\s+line|crop|field)\b/ },
    { re: /\b(delivery|logistics|fleet|truck|shipping)\b/ },
  ],

  human_service: [
    { re: /\b(walker|walkers|cleaner|cleaners|tutor|tutors|therapist|barber|plumber|electrician|nanny|handyman)\b/ },
    { re: /\b(we|our)\s+(clean|walk|cut|repair|install|deliver|cater|teach|coach)\b/ },
    { re: /\b(salon|spa|clinic|gym|studio|barbershop|franchise)\b/ },
    { re: /\b(grooming|groomer|valet\w*|childcare|nursery|removals?|catering)\b/ },
    { re: /\b(vetted|trusted|local)\s+\w*\s*(professionals?|providers?|walkers?|cleaners?)\b/ },
  ],

  marketplace: [
    { re: /\b(marketplace|two-?sided|connects?\s+\w+\s+with|matching\s+\w+\s+(with|to))\b/ },
    { re: /\b(booking|bookings)\s+platform\b/ },
    { re: /\b(buyers?\s+and\s+sellers?)\b/ },
  ],

  retail_goods: [
    { re: /\b(subscription\s+box|handmade|artisanal|small-?batch|shipped|store\s+selling|online\s+store|we\s+sell)\b/ },
    { re: /\b(journals?|candles?|clothing|apparel|jewell?ery|furniture|sauce|coffee\s+beans|merch)\b/ },
    { re: /\b(e-?commerce|dropship\w*)\b/ },
  ],

  agency_or_consultancy: [
    { re: /\b(agency|studio|consultancy|consulting|freelanc\w+|boutique)\b/ },
    { re: /\b(we\s+design|we\s+build|we\s+write|per\s+project|retainer|placement\s+fee)\b/ },
    { re: /\b(recruit\w+|staffing)\s+(agency|firm)\b/ },
  ],

  hospitality_or_food: [
    { re: /\b(bakery|restaurant|cafe|café|coffee\s+shop|food\s+truck|brewery|catering|bar|hotel|hostel)\b/ },
    { re: /\b(co-?working|workspace)\b/ },
    { re: /\b(menu|pastr\w+|bread|meals?)\b/ },
  ],

  b2b_buyer: [
    { re: /\b(enterprise|b2b|teams?|companies|firms?|carriers?|insurers?|hospitals?|departments?)\b/ },
    { re: /\b(per\s+seat|per\s+user|annual\s+contract|procurement|pilot)\b/ },
    { re: /\b(mid-?market|smb|small\s+businesses)\b/ },
  ],

  consumer_buyer: [
    { re: /\b(consumers?|everyday\s+people|anyone|students?|hobbyists?|creators?|users\s+can)\b/ },
    { re: /\b(app\s+for\s+(your|people)|free\s+tier|freemium)\b/ },
    { re: /\b(dating|social|game|meme|fun)\b/ },
  ],

  ai_vocabulary: [
    { re: /\b(ai|a\.i\.|artificial\s+intelligence)\b/ },
    { re: /\b(llm|gpt|chatgpt|claude|gemini|transformer|embedding|rag)\b/ },
    { re: /\b(machine\s+learning|ml|neural|deep\s+learning|computer\s+vision)\b/ },
  ],

  automation_verb: [
    { re: /\b(automat\w+|autonomous\w*)\b/ },
    { re: /\b(without\s+(a\s+)?human|replaces?\s+the\s+\w+|no\s+humans?\s+needed)\b/ },
    { re: /\b(drafts?|triages?|routes?|reconciles?|extracts?)\b/ },
  ],

  novelty_toy: [
    { re: /\b(for\s+fun|novelty|meme|joke|silly|just\s+for)\b/ },
    { re: /\b(turns?\s+your\s+\w+\s+into)\b/ },
    { re: /\b(avatar|filter|sticker|emoji)s?\b/ },
  ],

  generative_product: [
    { re: /\b(chatbot|chat\s+bot|companion|girlfriend|boyfriend|persona|character)\b/ },
    { re: /\b(generates?|creates?|makes?|writes?|draws?)\s+(you\s+)?(a|an|your)\b/ },
    { re: /\b(avatar|portrait|artwork|image|logo|headshot)s?\b/ },
    { re: /\b(ai)\s+(that|which)\s+(writes|generates|draws|makes|names)\b/ },
    { re: /\b(tarot|horoscope|astrolog\w+|fortune)\b/ },
    { re: /\bai-?generated\b/ },
    { re: /\bgenerated\s+(\w+\s+){0,2}(art|covers?|images?|photography|stories|story|poetry|voiceovers?|copy|music)\b/ },
  ],

  workflow_embedded: [
    // "ticket" is deliberately absent: a ticketing platform for music venues is
    // ordinary software, and the word alone dragged it toward the wrong class.
    { re: /\b(workflow|pipeline|queue|worklist|case\s+management)\b/ },
    { re: /\b(day-?to-?day|every\s+day|daily)\s+\w*\s*(work|job|shift)\b/ },
    { re: /\b(system\s+of\s+record)\b/ },
  ],

  /*
   * Software that is configured rather than trained. This is the mirror image of
   * buzzword_veneer: there the AI words were decoration, here the *verbs* are
   * decoration. A tool that "extracts tables using their layout coordinates" or
   * "routes tickets by the rules you configure" reads and extracts and routes,
   * and learns nothing. Without this the model reads those verbs as inference.
   */
  deterministic_software: [
    { re: /\b(by\s+the\s+)?rules?\s+(you|they)\s+(configure|set|define)\b/ },
    { re: /\b(threshold|schedule|template|rule)s?\s+you\s+(set|choose|define)\b/ },
    { re: /\b(layout\s+coordinates|file\s+extensions?|keywords?|regular\s+expressions?)\b/ },
    // "classifies files by their extension" is a sort, not a judgement. The
    // giveaway is that the criterion is named, and it is an attribute lookup.
    { re: /\bby\s+(their|its|the)\s+(extension|name|size|date|type|id|reference|number)\b/ },
    { re: /\bduplicate\s+(rows?|records?|files?|entries|lines?)\b/ },
    { re: /\b(reference|invoice|order)\s+numbers?\b/ },
    { re: /\balerts?\s+you\s+when\b/ },
    { re: /\b(csv|json|xml|sftp|webhook|api)\b/ },
    { re: /\b(syncs?|backs?\s+up|uploads?|exports?|imports?)\s+(your|the|it)\b/ },
    { re: /\b(cron|uptime|single\s+sign-?on|feature\s+flag|dead\s+letter|proration|dunning)\b/ },
    { re: /\bmatching\s+on\s+keywords\b/ },
    { re: /\b(predicts\s+nothing|simply\s+reports)\b/ },
  ],

  // Computed in extractSignals from the others; it has no patterns of its own.
  buzzword_veneer: [],
};

/** "AI-powered", "machine-learning-enhanced", "data-first" and their relatives. */
const VENEER_ADJECTIVE =
  /\b(ai|a\.i\.|artificial\s+intelligence|machine[- ]learning|ml|blockchain|data)[- ]?(powered|driven|enabled|first|native|enhanced|led|backed)\b/;

/** Each signal is the fraction of its patterns that matched, in 0..1. */
export function extractSignals(text: string): Signals {
  const hay = ` ${normalise(text)} `;
  const out = {} as Signals;
  for (const name of SIGNAL_NAMES) {
    const rules = PATTERNS[name];
    let hits = 0;
    for (const rule of rules) if (rule.re.test(hay)) hits += 1;

    /*
     * Saturating on the number of matches, NOT the fraction of patterns matched.
     *
     * Dividing by rules.length was backwards: it meant that adding a pattern to
     * a signal weakened every match of it, so the best-specified signals scored
     * lowest. One hit is most of the evidence; further hits confirm it.
     *   1 hit → 0.55   2 → 0.80   3 → 0.91
     */
    out[name] = hits === 0 ? 0 : 1 - Math.pow(0.45, hits);
  }

  /*
   * An interaction term, and the most useful feature in the whole set.
   *
   * "AI-powered premium dog walking" is a dog-walking business. No single word
   * says so — the giveaway is an AI adjective sitting on top of a noun from an
   * ordinary trade. Neither half means much alone, so the model cannot learn it
   * from the two features separately; the product has to be handed to it.
   */
  const ordinaryTrade = Math.min(
    1,
    out.human_service + out.retail_goods + out.hospitality_or_food + out.agency_or_consultancy,
  );
  const veneer = VENEER_ADJECTIVE.test(hay) ? 1 : 0;
  out.buzzword_veneer = veneer * ordinaryTrade;

  return out;
}

/** True when at least one pattern for the signal fired. */
export const fired = (s: Signals, name: SignalName) => s[name] > 0;
