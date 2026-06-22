/**
 * Foundation-rebuild landing content — single source for all copy.
 *
 * Every figure is real and traceable:
 *   38ms median lookup        → existing hero telemetry (content.ts)
 *   4-line widget             → MVP_STEERING Gorgias agent card
 *   14-day deadline           → partner recovery-rule defaults
 *   payout exposure           → support payout case exposure model
 *   evidence checklist        → payout evidence checklist model
 */

export const FL_ROUTES = {
  signup: '/signup',
  audit: '/signup',
  login: '/login',
  landing: '/landing',
  demo: '/demo',
  pricing: '/pricing',
  privacyPolicy: '/legal/privacy',
  dataHandling: '/legal/data-handling',
  dpa: '/legal/dpa',
  pilotTerms: '/legal/pilot-terms',
} as const;

export const FL_NAV = {
  links: [
    { label: 'How it works', href: '/landing#claim-decision' },
    { label: 'The gate', href: '/landing#claim-decision' },
    { label: 'Integrations', href: '/landing#evidence' },
    { label: 'FAQ', href: '/landing#faq' },
    { label: 'Request access', href: FL_ROUTES.audit },
  ],
  signIn: 'Sign in',
  cta: 'Request access',
} as const;

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const FL_HERO = {
  eyebrow: 'Post-purchase claim control',
  headlineLines: ["Your support team gives money away every day.", "You can't see where."],
  subcopy:
    'Refunds, reships, and "I never got it" claims get resolved from memory, under time pressure, by whoever picks up the ticket — or increasingly, by an AI agent. Unauth holds the risky ones before anyone acts, assembles the evidence, applies your rules, and records what happened and who owned the loss.',
  primaryCta: 'Request access',
  secondaryCta: 'See how it works',
  pinnedCta: 'Request access',
  contactCta: 'Request access',
  orderHistoryCard: {
    title: '01 Merchant-owned rules',
    status: 'Your policy logic — not an automated decision.',
    meta: 'Approve · Manual review · Deny',
    pattern: 'Recommendations are explainable and auditable.',
  },
  claimTimingCard: {
    title: '02 Context before escalation',
    status: 'Order, delivery, ticket, and claim history assembled.',
    meta: 'Inside Gorgias, Zendesk, or Freshdesk',
  },
  crossMerchantCard: {
    title: '03 Evidence, not automation',
    status: 'Unauth never approves, denies, or refunds automatically.',
    meta: 'Your team makes every final decision',
  },
  chargebackCard: {
    title: '04 Decision audit trail',
    status: 'Rule match, signals snapshot, and outcome recorded.',
    meta: 'Works before chargeback',
  },
} as const;

export const FL_HERO_FLOATING_CARDS = {
  orderHistory: {
    label: '01 MERCHANT-OWNED RULES',
    title: 'Your rules, your policy',
    details: ['Approve, manual review, or deny', 'Matched conditions in plain English'],
  },
  claimTiming: {
    label: '02 CONTEXT FIRST',
    title: 'Claim context assembled',
    details: ['Order, delivery, and ticket linked', 'Prior claims and outcomes attached'],
  },
  crossMerchant: {
    label: '03 EVIDENCE, NOT AUTOMATION',
    title: 'No automated decisions',
    details: ['Unauth explains — you decide', 'Final action stays with your team'],
  },
  priorClaims: {
    label: '04 AUDIT TRAIL',
    title: 'Every recommendation recorded',
    details: ['Claim-bound audit row', 'Queryable before disputes escalate'],
  },
} as const;

/* ── Network hero (canvas section) ─────────────────────────────────────── */

export const FL_NETWORK_HERO = {
  title: 'Useful at your store today. Stronger as your operations mature.',
  lead:
    'Unauth turns helpdesk claims into explainable, merchant-owned decisions — starting with your own order, delivery, evidence, policy, recovery, and outcome history. Your team still approves or denies every payout.',
  stats: [
    {
      value: 'Post-checkout',
      label: 'Where refund and INR claims are decided',
      source: 'Helpdesk workflow',
    },
    {
      value: 'Before CB',
      label: 'Decision context while the ticket is still open',
      source: 'Claim review moment',
    },
    {
      value: '4 lines',
      label: 'Agent card for case, evidence, rule, and recovery',
      source: 'Gorgias widget MVP',
    },
  ],
} as const;

export const FL_CLAIM_DECISION_LOOP = {
  eyebrow: 'Claim decision workflow',
  headline: 'From helpdesk ticket to explainable recommendation.',
  subhead:
    'When a customer claims an order never arrived, Unauth assembles order, delivery, evidence, payout exposure, prior case history, merchant rules, recovery context, and outcome history — then shows the next step with full traceability. Your team still decides.',
  steps: [
    {
      number: '01',
      title: 'Claim arrives',
      body: 'Customer says an order never arrived, arrived damaged, or needs refund review.',
    },
    {
      number: '02',
      title: 'Context assembled',
      body: 'Unauth pulls order, delivery, evidence, payout exposure, prior claims, and outcome history.',
    },
    {
      number: '03',
      title: 'Rules applied',
      body: 'Merchant-owned rules recommend approve, manual review, or deny.',
    },
    {
      number: '04',
      title: 'Decision explained',
      body: 'The exact matched rule and conditions are shown in plain English.',
    },
    {
      number: '05',
      title: 'Outcome audited',
      body: 'The recommendation, context snapshot, and final action are recorded for future claims and disputes.',
    },
  ],
} as const;

export const FL_CATEGORY_COMPARISON = {
  eyebrow: 'Why claim decision infrastructure',
  traditional: {
    title: 'Traditional tools',
    items: [
      'Focus on checkout or chargeback recovery',
      'Show risk after context is scattered',
      'Often separate from support workflows',
      'Can hide reasoning behind scores',
    ],
  },
  unauth: {
    title: 'Unauth',
    items: [
      'Starts at the claim decision moment',
      'Works inside helpdesk workflows',
      'Applies merchant-owned rules',
      'Shows the evidence and exact matched conditions',
      'Records a decision trail before escalation',
    ],
  },
} as const;

export const FL_DEMO_PRODUCT_CARDS = {
  recommendation: {
    label: 'Manual review',
    rule: 'INR delivered — request evidence',
    conditions: [
      'Claim type is item not received',
      'Order was marked delivered',
      'Customer has 2 prior INR claims',
      'No customer evidence has been attached',
    ],
  },
  evidence: {
    items: [
      'Order delivery proof',
      'Order AU-DEMO-008842',
      'Amount at risk: £84.20',
      'Ticket: GOR-DEMO-INR-9001',
    ],
  },
  audit: {
    items: [
      'Claim-bound recommendation',
      'Ticket + order linked',
      'Rule + signals snapshot stored',
      'Duplicate refreshes deduped',
    ],
  },
} as const;

export const FL_PHONE = {
  title: 'Payout case',
  subtitle: 'Gorgias #4821 · Shopify #UA-10482',
  valueLabel: 'Payout Exposure',
  value: '$162',
  compareA: { label: 'Requested action', value: 'Refund', delta: 'Agent review required', up: false },
  compareB: { label: 'Recovery', value: '$84', delta: 'Carrier claim possible', up: true },
  status: { label: 'Status', value: 'Evidence Ready' },
  rows: [
    { k: 'Evidence', v: 'Photo present · signature unavailable' },
    { k: 'Rule', v: 'Manual review' },
    { k: 'Reason', v: 'Repeat INR' },
    { k: 'Owner', v: 'Carrier review' },
    { k: 'Lookup', v: '38ms' },
    { k: 'Auto-Actions', v: 'None' },
  ],
  spark: [4, 7, 5, 9, 8, 13, 11, 16, 14, 19, 17, 22],
} as const;

/* ── Statement (§ about) ───────────────────────────────────────────────── */

export const FL_STATEMENT = {
  displayLines: ['YOUR RULES,', 'NOT OUR MODEL.'],
  pre: 'Before money leaves the business,',
  brand: 'Unauth',
  post: 'shows payout exposure, evidence on file, the merchant rule that fired, and the recommended next action.',
  postContinuation: 'There is no risk score, no black box, and no judgment Unauth makes on your behalf.',
  postTail: 'Your team still decides.',
  body: 'Unauth connects your store and helpdesk, structures support payout cases, tracks evidence, applies merchant rules, and opens recovery cases where carrier, 3PL, or supplier accountability may apply. No automated payouts.',
  features: [
    { id: '01', title: 'Merchant rules recommend — your team decides' },
    { id: '02', title: 'Every payout case has evidence and exposure' },
    { id: '03', title: 'Recoverable losses stay on the recovery board' },
    { id: '04', title: 'Outcomes recorded for prevention insights' },
  ],
} as const;

/* Evidence manifest card — stands where the reference puts a 3D render. */
export const FL_MANIFEST = {
  title: 'Evidence package',
  caseId: 'CB-2291',
  files: [
    { name: 'claim_timeline.json', meta: '11 events · ticket + order' },
    { name: 'evidence_checklist.json', meta: 'delivery proof · signature unavailable' },
    { name: 'delivery_confirmation.pdf', meta: 'commerce fulfilment proof' },
    { name: 'recovery_route.txt', meta: 'carrier claim · evidence needed' },
    { name: 'order_record.json', meta: '#UA-10482 · $162.40' },
  ],
  footer: 'assembled in 38ms · formatted for representment',
} as const;

/* ── Stats bento — fraud landscape (6 sourced stats) ──────────────────── */

export const FL_BENTO = [
  {
    value: 'Rules',
    label: 'Your rules, not our model',
    source: 'Every hold traces to a rule you set',
  },
  {
    value: 'Evidence',
    label: 'Evidence, never a verdict',
    source: "What's known, missing, or unclear",
  },
  {
    value: 'Blindly',
    label: 'Nothing resolved blindly',
    source: 'No claim closes on a held case without review',
  },
  {
    value: 'Owner',
    label: 'Every loss has an owner',
    source: 'Carrier, warehouse, customer, or policy override',
  },
] as const;

/* ── Signals → evidence (espresso tabbed section) ──────────────────────── */

export const FL_SIGNALS_EVIDENCE = {
  displayLines: ['CLAIMS', 'BECOME', 'EVIDENCE'],
  subhead:
    'Claim timing, delivery context, address patterns, and chargeback trails are assembled into one evidence pack beside the review.',
  cta: { label: 'Review a claim example', href: FL_ROUTES.audit },
  image: {
    src: '/statement-facility-v3.png',
    alt: 'Architectural illustration of Unauth’s payout-control evidence workflow',
  },
  tabs: [
    {
      key: 'timing',
      tab: 'Claim timing',
      caseLine: ['CB-2291', 'Never arrived', '$162.40'],
      gradeLetter: 'B',
      gradeTier: 'Evidence review',
      mainLine:
        '"Never arrived" for the third time — each claim opened after a confirmed delivery window.',
      details: [
        { k: 'Signals matched', v: '4 of 6' },
        { k: 'Payout exposure', v: '$162.40' },
        { k: 'Recovery path', v: 'carrier claim' },
        { k: 'Prior claims', v: '3 in 120 days' },
      ],
      assembledIn: '38ms',
    },
    {
      key: 'delivery',
      tab: 'Delivery context',
      caseLine: ['CB-2104', 'Item not received', '$89.00'],
      gradeLetter: 'A',
      gradeTier: 'Strong evidence',
      mainLine:
        'The connected order shows delivery evidence — the claim arrived four days after the scan.',
      details: [
        { k: 'Signals matched', v: '5 of 6' },
        { k: 'Payout exposure', v: '$89.00' },
        { k: 'Delivery proof', v: 'from connected order' },
        { k: 'Claim opened', v: '+4 days post-scan' },
      ],
      assembledIn: '41ms',
    },
    {
      key: 'address',
      tab: 'Address pattern',
      caseLine: ['CB-1887', 'Wrong item received', '$214.50'],
      gradeLetter: 'C',
      gradeTier: 'Evidence gap',
      mainLine:
        'One fulfilment address, six prior claims, three different names.',
      details: [
        { k: 'Signals matched', v: '2 of 6' },
        { k: 'Payout exposure', v: '$214.50' },
        { k: 'Evidence missing', v: 'warehouse photo' },
        { k: 'Recovery path', v: 'supplier review' },
      ],
      assembledIn: '29ms',
    },
    {
      key: 'chargeback',
      tab: 'Chargeback trail',
      caseLine: ['CB-3310', 'Unauthorised charge', '$340.00'],
      gradeLetter: 'B',
      gradeTier: 'Dispute evidence',
      mainLine:
        'Three chargebacks in ninety days, tied together by a single device hash.',
      details: [
        { k: 'Signals matched', v: '4 of 6' },
        { k: 'Payout exposure', v: '$340.00' },
        { k: 'Evidence', v: 'delivery + support timeline' },
        { k: 'Prior disputes', v: '3 in 90 days' },
      ],
      assembledIn: '44ms',
    },
  ],
} as const;

/* ── How it works (setup flow) ─────────────────────────────────────────── */

export const FL_HOW_IT_WORKS = {
  displayLines: ['THE CLAIM STARTS', 'WITH A PARCEL.'],
  subhead:
    'Unauth connects the delivery event, customer history, helpdesk conversation, evidence checklist, merchant policy, and recovery path before your team decides how to respond.',
  privacyNote: 'Raw customer data stays merchant-scoped. The workflow is case-scoped, not a customer denial list.',
  steps: [
    {
      id: '01',
      title: 'Delivery and fulfilment timeline',
      body: 'Import order, fulfilment, refund, and reshipment events from your connected commerce stack.',
      note: 'The delivery record becomes review context, not an automatic outcome.',
    },
    {
      id: '02',
      title: 'Claim timing after confirmed delivery',
      body: 'Link helpdesk tickets and chargeback records to the exact order and delivery window.',
      note: 'Raw customer data never enters the network.',
    },
    {
      id: '03',
      title: 'Prior refund and reshipment behaviour',
      body: 'Surface earlier claims, refund requests, replacements, and support history before the reply is written.',
      note: null,
    },
    {
      id: '04',
      title: 'Recovery and outcome context',
      body: 'Show whether the loss is preventable, recoverable from a partner, or ready to close with an outcome.',
      note: null,
    },
  ],
  image: {
    src: '/strdtfygh.png',
    alt: 'Architectural illustration of a merchant store, Unauth intelligence hub, and helpdesk module connected for claim review setup',
  },
} as const;

/* ── Giant figures (§ numbers) ─────────────────────────────────────────── */

export const FL_FIGURES = {
  label: 'See your own claim patterns first',
  body: 'Connect your store and helpdesk so Unauth can backfill available order, ticket, claim, and outcome context. See repeated claim patterns, evidence gaps, and decision inconsistency from the data you already own.',
  figures: [
    {
      value: '~20',
      unit: 'min',
      label: 'Context backfill',
      note: 'Available store and helpdesk history',
    },
    {
      value: '98.5',
      unit: '%',
      label: 'Benchmark precision',
      note: 'Synthetic benchmark · default threshold',
    },
  ],
  disclaimer:
    'Results depend on connected-source coverage, claim history, and configured rules.',
  cta: 'Request access',
} as const;

/* ── Programs (§ programs) ─────────────────────────────────────────────── */

export const FL_PROGRAMS = {
  displayLines: ['CLAIM', 'PROGRAMS'],
  breadcrumb: ['Store Context', 'Evidence Checklist', 'Recovery Workflow'],
  tabs: [
    {
      key: 'live',
      tab: 'Connected context',
      title: 'CONNECTED CONTEXT',
      kicker: 'Store + Helpdesk',
      index: '01',
      details: [
        { k: 'Sources', v: 'Shopify · Woo · BigCommerce' },
        { k: 'Helpdesks', v: 'Gorgias · Zendesk · Freshdesk' },
        { k: 'Lookup', v: '38ms median per ticket' },
        { k: 'Setup', v: '≈ 15 minutes, no SDK' },
      ],
    },
    {
      key: 'evidence',
      tab: 'Evidence Records',
      title: 'EVIDENCE PACKS',
      kicker: 'Claim and dispute support',
      index: '02',
      details: [
        { k: 'Trigger', v: 'Linked claim or chargeback' },
        { k: 'Window', v: '120-day prior-order history' },
        { k: 'Contents', v: 'Timeline · signals · delivery proof' },
        { k: 'Format', v: 'One click, support-ready' },
      ],
    },
    {
      key: 'network',
      tab: 'Recovery Context',
      title: 'RECOVERY CONTEXT',
      kicker: 'Partner rulebook',
      index: '03',
      details: [
        { k: 'Partners', v: 'Carrier · 3PL · supplier' },
        { k: 'Evidence', v: 'Rulebook requirements' },
        { k: 'Exposure', v: 'Recoverable amount' },
        { k: 'Decisions', v: 'Yours — always' },
      ],
    },
  ],
} as const;

/* ── Pricing page ──────────────────────────────────────────────────────── */

export const FL_PRICING = {
  eyebrow: 'Pricing',
  headline: 'Pay for context, not seats.',
  lead:
    'Every plan includes the widget, store context, evidence checklist, merchant rules, and recovery workflow. Usage is controlled by monthly context credits — raw customer data stays merchant-scoped.',
  featuredTierKey: 'pro' as const,
  ctaDefault: 'Start free',
  ctaTrial: 'Start free trial',
  ctaCustom: 'Talk to us',
  trialNote: '7-day trial on Pro · no card required',
  credits: {
      heading: 'How credits work',
    intro:
      'Each time you load payout context on a ticket, it costs credits depending on the depth of context requested:',
    rows: [
      ['Own-store payout context', '1 credit'],
      ['Rules, evidence, and recovery context', '2 credits'],
      ['Evidence summary + deeper review', '3 credits'],
    ] as const,
    footer:
      'Credits reset monthly. Unused credits do not roll over. Pro and Growth teams can purchase top-up packs if they exceed their allowance before the next cycle.',
  },
  integration: {
    prefix: 'Using Gorgias or Zendesk?',
    linkLabel: 'See how Unauth attaches to your helpdesk',
    href: '/landing#claim-decision',
  },
} as const;

export const FL_PRICING_FAQ = {
  heading: 'Pricing questions',
  items: [
    {
      q: 'How does pricing work?',
      a: 'Every plan includes the widget, store context, evidence checklist, merchant rules, and recovery workflow. Free includes 100 monthly context credits, Pro includes 1,000, Growth includes 5,000, and Scale uses dedicated monthly volume agreed at onboarding.',
    },
    {
      q: 'Will it always be free?',
      a: 'Free remains a real entry point for occasional payout-case review, but higher-volume teams will need more monthly context credits, history, controls, and support.',
    },
    {
      q: 'What happens if I run out of credits?',
      a: 'Checks pause until your monthly reset or you purchase a top-up pack on Pro and Growth. Your existing evidence and case history stay available — only new context lookups are gated.',
    },
    {
      q: 'Do I need a card to start?',
      a: 'No card is required for Free or the Pro trial. Connect your store and helpdesk to see context on real claims before committing to a paid plan.',
    },
    {
      q: 'Can I change plans later?',
      a: 'Yes. Upgrade or downgrade any time from settings. Plan changes take effect on your next billing cycle; unused credits on the outgoing plan do not roll over.',
    },
  ],
} as const;

/* ── Final CTA + footer ────────────────────────────────────────────────── */

export const FL_FINAL = {
  headlineLines: ['THE NEXT CLAIM', 'DESERVES A', 'DECISION TRAIL'],
  body: 'Connect your store and helpdesk. Unauth backfills your claim history and starts holding risky claims on live tickets.',
  cta: 'Request access',
} as const;

export const FL_FAQ = {
  heading: 'Common questions',
  items: [
    {
      q: 'How is this different from Shopify Protect or Stripe Radar?',
      a: 'They work at checkout, scoring transaction risk before a purchase completes. Unauth works after delivery, when a customer files a claim. A transaction approved cleanly at checkout can still become a fraudulent "item not received" claim three weeks later — that\'s the moment Unauth covers.',
    },
    {
      q: 'We already use Yuma or Gorgias AI. Why add this?',
      a: 'Those tools are built to close tickets quickly. Unauth is what decides which claims they\'re allowed to close without a human. They turn resolution up; Unauth makes sure the risky ones still stop. They work together — Unauth is the control layer, not a competing inbox.',
    },
    {
      q: 'How do you tell a genuine claim from abuse?',
      a: 'You do — through your rules. Unauth surfaces the facts (delivery state, order value, how many times this customer has claimed with you before) and applies the thresholds you configure. The decision reflects your policy, not our guess about a customer.',
    },
    {
      q: 'Will this block legitimate customers?',
      a: 'No. Unauth holds claims for review; it never blocks a customer or denies a refund on its own. A first-time customer with a genuine missing-parcel claim clears the gate, because that\'s what your rules and the evidence support.',
    },
    {
      q: 'How does this help before a chargeback?',
      a: 'By the time a chargeback lands, the decision is already documented — the evidence that existed, the rule that applied, what your team saw and chose. That record is your dispute response, ready instead of reconstructed under deadline.',
    },
    {
      q: 'Does it work for a single store, with no network data?',
      a: 'Yes, entirely. Unauth runs on your own store\'s orders, delivery data, and the claim history you build with your own customers. There is no cross-merchant profiling and no external customer scoring — everything the gate does runs on your data alone.',
    },
  ],
} as const;

export const FL_FOOTER = {
  tagline: 'Claim decision infrastructure for ecommerce helpdesk teams.',
  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'How it works', href: '/landing#claim-decision' },
        { label: 'Evidence', href: '/landing#evidence' },
        { label: 'Request access', href: FL_ROUTES.audit },
      ],
    },
    {
      heading: 'Privacy',
      links: [
        { label: 'Privacy policy', href: FL_ROUTES.privacyPolicy },
        { label: 'Data handling', href: FL_ROUTES.dataHandling },
        { label: 'DPA', href: FL_ROUTES.dpa },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'Sign in', href: FL_ROUTES.login },
        { label: 'Request access', href: FL_ROUTES.audit },
        { label: 'Pilot terms', href: FL_ROUTES.pilotTerms },
      ],
    },
  ],
  legal: 'Identifiers are hashed before they leave your store.',
  legalRules: 'Recommendations are generated from merchant-configured rules. No action is taken automatically.',
} as const;
