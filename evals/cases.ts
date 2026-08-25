/**
 * Golden set for Grimyapper.
 *
 * `expect` is the branch the classifier must route to. `rubric` adds assertions
 * on the evaluator's output for the cases where the rubric is the point — a thin
 * wrapper that scores a 9 on moat is a broken evaluator, not an opinion.
 */
export type EvalCase = {
  id: string;
  group: 'ai' | 'non-ai' | 'wrapper' | 'uses-ai' | 'ambiguous';
  idea: string;
  name?: string;
  customer?: string;
  expect: 'evaluated' | 'rejected';
  /** Only set where we also want to test the evaluator, not just routing. */
  rubric?: {
    moat_beyond_model?: { max?: number; min?: number };
    wrapper_platform_risk?: { max?: number; min?: number };
  };
};

export const CASES: EvalCase[] = [
  /* ------------------------------------------------ unambiguous AI startups */
  {
    id: 'ai-claims-agent',
    group: 'ai',
    idea:
      'An agent that reads incoming insurance claims, extracts the structured fields, and drafts the adjuster decision with a cited rationale.',
    customer: 'Mid-market property insurers',
    expect: 'evaluated',
  },
  {
    id: 'ai-weld-vision',
    group: 'ai',
    idea:
      'A computer-vision system that inspects pipeline weld joints from drone footage and flags defects before a human inspector climbs the rig.',
    expect: 'evaluated',
    rubric: { wrapper_platform_risk: { min: 4 } },
  },
  {
    id: 'ai-speech-coaching',
    group: 'ai',
    idea:
      'A speech model fine-tuned on Punjabi and Urdu call-centre audio that coaches agents in real time on their live calls.',
    expect: 'evaluated',
  },
  {
    id: 'ai-shrink-forecast',
    group: 'ai',
    idea:
      'We train a forecasting model on three years of proprietary grocery-waste data to predict shrink per SKU per store per day.',
    customer: 'Regional grocery chains',
    expect: 'evaluated',
    rubric: { moat_beyond_model: { min: 4 } },
  },
  {
    id: 'ai-code-review',
    group: 'ai',
    idea:
      'An LLM code-review agent that learns each team conventions from their merged pull requests and enforces them on new ones.',
    expect: 'evaluated',
  },

  /* ---------------------------------------- thin wrappers: evaluated, low moat */
  {
    id: 'wrapper-professional-text',
    group: 'wrapper',
    idea: 'A website where you paste text and a large language model makes it sound more professional.',
    expect: 'evaluated',
    rubric: { moat_beyond_model: { max: 3 }, wrapper_platform_risk: { max: 3 } },
  },
  {
    id: 'wrapper-chat-with-pdf',
    group: 'wrapper',
    idea: 'Chat with your PDF. You upload a PDF and ask questions about it and the model answers.',
    expect: 'evaluated',
    rubric: { moat_beyond_model: { max: 3 }, wrapper_platform_risk: { max: 3 } },
  },
  {
    id: 'wrapper-linkedin-posts',
    group: 'wrapper',
    idea: 'An app that writes your LinkedIn posts for you. You give it a topic and ChatGPT writes the post.',
    expect: 'evaluated',
    rubric: { moat_beyond_model: { max: 3 } },
  },
  {
    id: 'wrapper-prompt-library',
    group: 'wrapper',
    idea: 'We sell a curated library of our best ChatGPT prompts in a nice searchable interface.',
    expect: 'evaluated',
    rubric: { moat_beyond_model: { max: 3 }, wrapper_platform_risk: { max: 3 } },
  },

  /* -------------------------------------------- unambiguous non-AI businesses */
  {
    id: 'non-hot-sauce',
    group: 'non-ai',
    idea: 'A monthly subscription box of small-batch artisanal hot sauces, delivered to your door.',
    expect: 'rejected',
  },
  {
    id: 'non-dog-walking',
    group: 'non-ai',
    idea: 'A marketplace connecting dog owners with vetted local dog walkers in their neighbourhood.',
    expect: 'rejected',
  },
  {
    id: 'non-coworking',
    group: 'non-ai',
    idea: 'A co-working space in Lahore with very good coffee, fast wifi, and private call booths.',
    expect: 'rejected',
  },
  {
    id: 'non-deck-agency',
    group: 'non-ai',
    idea: 'A boutique design agency that builds pitch decks for founders raising a Series A. We charge per deck.',
    expect: 'rejected',
  },
  {
    id: 'non-leather-journals',
    group: 'non-ai',
    idea: 'An online store selling handmade leather-bound journals and refills, shipped worldwide.',
    expect: 'rejected',
  },

  /* --------------------------------- uses AI internally, still not an AI startup */
  {
    id: 'uses-bakery-captions',
    group: 'uses-ai',
    idea: 'A neighbourhood bakery. We use ChatGPT to write our Instagram captions, which saves a lot of time.',
    expect: 'rejected',
  },
  {
    id: 'uses-law-firm',
    group: 'uses-ai',
    idea:
      'A law firm. Our paralegals use an AI assistant to speed up document review, but we bill clients by the hour like any firm.',
    expect: 'rejected',
  },
  {
    id: 'uses-landscaping',
    group: 'uses-ai',
    idea: 'A landscaping company. We use an AI tool internally to schedule our crews and routes more efficiently.',
    expect: 'rejected',
  },
  {
    id: 'uses-recruiting-agency',
    group: 'uses-ai',
    idea:
      'A recruiting agency placing engineers. Our recruiters use AI sourcing tools internally; clients pay us a placement fee.',
    expect: 'rejected',
  },
  {
    id: 'uses-buzzword-dogs',
    group: 'uses-ai',
    idea: 'A blockchain-enabled, AI-powered synergy platform for premium dog walking.',
    expect: 'rejected',
  },

  /* --------------- genuinely ambiguous: the definition says treat as AI startup */
  {
    id: 'ambiguous-radiology-triage',
    group: 'ambiguous',
    idea: 'Software that helps radiologists triage their scan worklist so the urgent cases surface first.',
    customer: 'Hospital radiology departments',
    expect: 'evaluated',
  },
];

/** Build fails below this. Raise it as the prompts get better; never lower it quietly. */
export const ROUTING_ACCURACY_THRESHOLD = 0.9;
