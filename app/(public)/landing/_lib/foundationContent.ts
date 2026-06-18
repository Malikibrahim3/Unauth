/**
 * Foundation-rebuild landing content — single source for all copy.
 *
 * Every figure is real and traceable:
 *   38ms median lookup        → existing hero telemetry (content.ts)
 *   k ≥ 3                     → K_ANONYMITY_MIN (lib/engine/weights.ts)
 *   6 identity signals        → IDENTITY_SIGNAL_WEIGHTS (lib/engine/weights.ts)
 *   A–D grades                → gradeToLetter (lib/engine/weights.ts)
 *   98.5% precision           → us_benchmark_v1 calibration at FLAG_THRESHOLD 44
 *   120-day window            → CE3_PRIOR_ORDER_WINDOW_DAYS (lib/engine/weights.ts)
 *   HMAC-SHA256 / per-tenant  → privacy architecture (content.ts)
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
    { label: 'Platform', href: '/landing#claim-decision' },
    { label: 'How it works', href: '/landing#claim-decision' },
    { label: 'Evidence', href: '/landing#evidence' },
    { label: 'Pricing', href: FL_ROUTES.pricing },
    { label: 'FAQ', href: '/landing#faq' },
  ],
  signIn: 'Sign in',
  cta: 'Connect store and helpdesk',
} as const;

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const FL_HERO = {
  eyebrow: 'Claim decision infrastructure',
  headlineLines: ['Every claim.', 'Full context.', 'One decision trail.'],
  subcopy:
    'Unauth assembles order, delivery, identity, evidence, claim history, and your merchant rules inside the helpdesk — so support teams can review refunds, replacements, and chargeback-risk claims before they escalate.',
  primaryCta: 'Connect store and helpdesk',
  secondaryCta: 'See claim decision demo',
  pinnedCta: 'Connect store and helpdesk',
  contactCta: 'Connect store and helpdesk',
  orderHistoryCard: {
    title: '01 Merchant-owned rules',
    status: 'Your policy logic — not Unauth’s verdict.',
    meta: 'Approve · Manual review · Deny',
    pattern: 'Recommendations are explainable and auditable.',
  },
  claimTimingCard: {
    title: '02 Context before escalation',
    status: 'Order, delivery, ticket, and claim history assembled.',
    meta: 'Inside Gorgias, Zendesk, or Freshdesk',
  },
  crossMerchantCard: {
    title: '03 Evidence, not verdicts',
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
    label: '03 EVIDENCE, NOT VERDICTS',
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
  title: 'Stronger at your store today. Stronger still as the network grows.',
  lead:
    'Unauth turns helpdesk claims into explainable, merchant-owned decisions — starting with your own order, delivery, identity, and claim history. Privacy-safe cross-merchant patterns layer on when available, without changing who approves the refund.',
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
      value: 'k ≥ 3',
      label: 'Network signals only when privacy threshold is met',
      source: 'K_ANONYMITY_MIN',
    },
  ],
} as const;

export const FL_CLAIM_DECISION_LOOP = {
  eyebrow: 'Claim decision workflow',
  headline: 'From helpdesk ticket to explainable recommendation.',
  subhead:
    'When a customer claims an order never arrived, Unauth assembles order, delivery, identity, evidence, prior claim history, merchant rules, and outcome history — then shows the next step with full traceability. Your team still decides.',
  steps: [
    {
      number: '01',
      title: 'Claim arrives',
      body: 'Customer says an order never arrived, arrived damaged, or needs refund review.',
    },
    {
      number: '02',
      title: 'Context assembled',
      body: 'Unauth pulls order, delivery, identity, evidence, prior claims, and outcome history.',
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
  title: 'Identity record',
  subtitle: 'hash 9f3b…12c8 · 4 merchants',
  valueLabel: 'Linked Exposure',
  value: '$1,210',
  compareA: { label: 'Claims / Orders', value: '6 / 9', delta: '67% claim rate', up: false },
  compareB: { label: 'Merchants', value: '4', delta: '3+ independent merchants · gate open', up: true },
  status: { label: 'Status', value: 'Evidence Ready' },
  rows: [
    { k: 'Match Grade', v: 'B · Probable' },
    { k: 'Signals Matched', v: '4 of 6' },
    { k: 'Strongest Signal', v: 'device_hmac' },
    { k: 'Addr. Overlap', v: '0.94' },
    { k: 'Lookup', v: '38ms' },
    { k: 'Auto-Actions', v: 'None' },
  ],
  spark: [4, 7, 5, 9, 8, 13, 11, 16, 14, 19, 17, 22],
} as const;

/* ── Statement (§ about) ───────────────────────────────────────────────── */

export const FL_STATEMENT = {
  // Promoted display headline — the wedge claim, now the section's dominant line.
  displayLines: ['EVIDENCE,', 'NOT VERDICTS.'],
  // Secondary editorial sentence — supports the headline as context.
  pre: 'Whether the ticket says "never arrived" or the chargeback lands weeks later,',
  brand: 'Unauth',
  post: 'attaches cross-merchant claim context to the review —',
  postContinuation: 'graded evidence, assembled automatically,',
  postTail: 'decided by your team.',
  body: 'Unauth connects to your store and helpdesk, surfaces cross-merchant claim history, and attaches graded evidence to every ticket — automatically. No workflow changes. No automated decisions.',
  features: [
    { id: '01', title: 'Zero automated decisions, by design' },
    { id: '02', title: 'Every claim arrives with context' },
    { id: '03', title: 'Repeated patterns, matched across every merchant' },
    { id: '04', title: 'Evidence packs, one click from every ticket' },
  ],
} as const;

/* Evidence manifest card — stands where the reference puts a 3D render. */
export const FL_MANIFEST = {
  title: 'Evidence package',
  caseId: 'CB-2291',
  files: [
    { name: 'claim_timeline.json', meta: '11 events · 4 merchants' },
    { name: 'identity_signals.json', meta: '12 signals · graded' },
    { name: 'delivery_confirmation.pdf', meta: 'commerce fulfilment proof' },
    { name: 'cross_merchant_history.txt', meta: 'k-gated · pseudonymous' },
    { name: 'order_record.json', meta: '#UA-10482 · $162.40' },
  ],
  footer: 'assembled in 38ms · formatted for representment',
} as const;

/* ── Stats bento — fraud landscape (6 sourced stats) ──────────────────── */

export const FL_BENTO = [
  {
    value: '$4.61',
    label: 'Cost for every $1 of fraud — US ecommerce & retail',
    source: 'LexisNexis 2025 True Cost of Fraud Study',
  },
  {
    value: '$46.1B',
    label: 'Global chargeback losses forecast by 2029',
    source: 'Mastercard / Datos Insights 2026',
  },
  {
    value: '$103B',
    label: 'Lost to fraudulent returns in 2024',
    source: 'Appriss Retail + Deloitte + NRF',
  },
  {
    value: '75%',
    label: 'Of chargebacks are friendly fraud, not criminal attacks',
    source: 'Visa',
  },
  {
    value: '16%',
    label: 'Of consumers admit filing false claims — even when satisfied',
    source: 'Sift Q4 2025 Digital Trust Index',
  },
  {
    value: '18%',
    label: 'Net chargeback recovery rate for merchants who fight back',
    source: 'Chargebacks911 2024 Chargeback Field Report',
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
    alt: 'Architectural illustration of Unauth’s cross-merchant evidence hub',
  },
  tabs: [
    {
      key: 'timing',
      tab: 'Claim timing',
      caseLine: ['CB-2291', 'Never arrived', '$162.40'],
      gradeLetter: 'B',
      gradeTier: 'Probable match',
      mainLine:
        '"Never arrived" for the third time — each claim opened after a confirmed delivery window.',
      details: [
        { k: 'Signals matched', v: '4 of 6' },
        { k: 'Matched across', v: '4 merchants · 3+ independent merchants' },
        { k: 'Strongest signal', v: 'device_hmac' },
        { k: 'Prior claims', v: '3 in 120 days' },
      ],
      assembledIn: '38ms',
    },
    {
      key: 'delivery',
      tab: 'Delivery context',
      caseLine: ['CB-2104', 'Item not received', '$89.00'],
      gradeLetter: 'A',
      gradeTier: 'Definite match',
      mainLine:
        'The connected order shows delivery evidence — the claim arrived four days after the scan.',
      details: [
        { k: 'Signals matched', v: '5 of 6' },
        { k: 'Matched across', v: '5 merchants · 3+ independent merchants' },
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
      gradeTier: 'Possible match',
      mainLine:
        'One fulfilment address, six prior claims, three different names.',
      details: [
        { k: 'Signals matched', v: '2 of 6' },
        { k: 'Matched across', v: '3 merchants · 3+ independent merchants' },
        { k: 'Address overlap', v: '0.94' },
        { k: 'Strongest signal', v: 'address_tokens' },
      ],
      assembledIn: '29ms',
    },
    {
      key: 'chargeback',
      tab: 'Chargeback trail',
      caseLine: ['CB-3310', 'Unauthorised charge', '$340.00'],
      gradeLetter: 'B',
      gradeTier: 'Probable match',
      mainLine:
        'Three chargebacks in ninety days, tied together by a single device hash.',
      details: [
        { k: 'Signals matched', v: '4 of 6' },
        { k: 'Matched across', v: '4 merchants · 3+ independent merchants' },
        { k: 'Strongest signal', v: 'card_hmac' },
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
    'Unauth connects the delivery event, customer history, helpdesk conversation, and cross-merchant claim patterns before your team decides how to respond.',
  privacyNote: 'Identifiers are hashed before they leave your store. Raw customer data never enters the network.',
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
      title: 'Cross-merchant pattern context',
      body: 'Show whether the claim is isolated or matches repeated behaviour across participating merchants.',
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
  cta: 'Connect store and helpdesk',
} as const;

/* ── Programs (§ programs) ─────────────────────────────────────────────── */

export const FL_PROGRAMS = {
  displayLines: ['CLAIM', 'PROGRAMS'],
  breadcrumb: ['Store Context', 'Network Signals', 'Evidence Packs'],
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
      tab: 'Network Context',
      title: 'NETWORK CONTEXT',
      kicker: 'Pseudonymous cross-merchant graph',
      index: '03',
      details: [
        { k: 'Hashing', v: 'HMAC-SHA256 · per-tenant salt' },
        { k: 'Gate', v: 'k-anonymity · ≥ 3 merchants' },
        { k: 'Exposure', v: 'Patterns only, never records' },
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
    'Every plan includes the widget, store context, and pseudonymous network context. Usage is controlled by monthly context credits — raw cross-merchant customer data is never exposed.',
  featuredTierKey: 'pro' as const,
  ctaDefault: 'Start free',
  ctaTrial: 'Start free trial',
  ctaCustom: 'Talk to us',
  trialNote: '7-day trial on Pro · no card required',
  credits: {
    heading: 'How credits work',
    intro:
      'Each time you run an identity check on a ticket, it costs credits depending on the depth of context requested:',
    rows: [
      ['Own-store context only', '1 credit'],
      ['Full network context', '2 credits'],
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
      a: 'Every plan includes the widget, store context, and pseudonymous network context. Free includes 100 monthly context credits, Pro includes 1,000, Growth includes 5,000, and Scale uses dedicated monthly volume agreed at onboarding.',
    },
    {
      q: 'Will it always be free?',
      a: 'Free remains a real entry point for occasional claim review and network participation, but higher-volume teams will need more monthly context credits, history, controls, and support.',
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
  body: 'Connect your store and helpdesk so Unauth can backfill available claim context, show repeated patterns, highlight evidence gaps, and apply merchant-owned rules to live helpdesk claims with zero automated decisions.',
  cta: 'Connect store and helpdesk',
} as const;

export const FL_FAQ = {
  heading: 'Common questions',
  items: [
    {
      q: 'How is this different from Shopify Protect or Stripe Radar?',
      a: 'Shopify Protect and Stripe Radar work at the transaction layer. They help assess payment risk before or during checkout. Unauth works after the transaction, at the claim layer, where refund requests, INR claims, return misuse, and chargeback pressure usually appear. When a claim reaches your support team, Unauth adds evidence and can apply your configured rules to show a traceable recommendation.',
    },
    {
      q: 'How do you distinguish a genuine customer complaint from abuse?',
      a: 'Unauth does not make that decision. Your team does. We assemble claim context — order history, delivery status, prior claims, identity consistency, and matched cross-merchant patterns when available. Your configured rules return a traceable recommendation. The agent still owns the final decision.',
    },
    {
      q: 'How does Unauth help before a chargeback?',
      a: 'Unauth works at the helpdesk claim moment — while the ticket is still open. It shows delivery proof, prior claim behaviour, and merchant-rule recommendations with matched conditions in plain language, so your team can request evidence or escalate consistently before a dispute is filed.',
    },
    {
      q: 'Will this flag or block legitimate customers?',
      a: 'No. Unauth never blocks orders, denies refunds, or takes automated action against customers. Even when a merchant rule returns a recommendation, it is only shown as context inside the claim review. Your team decides what action to take.',
    },
    {
      q: 'What data actually leaves my store?',
      a: 'Raw customer data does not enter the network. Identifiers such as email, phone, and device fingerprint are HMAC-SHA256 hashed with a per-tenant salt before they leave your environment. The network uses privacy-safe signals and threshold controls to identify repeated patterns without exposing customer records between merchants. Your rules remain scoped to your merchant account.',
    },
    {
      q: 'We\'re a single merchant — does this work without network data?',
      a: 'Yes. Unauth still helps you structure your own claim history, spot repeat behaviour, connect identity signals, and apply your own rules to each review. The network makes the evidence stronger over time, but single-merchant value starts from your own order, refund, support, and policy history.',
    },
    {
      q: 'Does it change my refund or dispute workflow?',
      a: 'No. Unauth sits beside your existing support and dispute process. It adds an evidence pack and, if configured, a rule-based recommendation to the ticket. Your team keeps using the tools and policies they already use.',
    },
    {
      q: 'Who controls the recommendation rules?',
      a: 'The merchant does. Rules are configured in your dashboard using your own policy logic. Unauth evaluates those rules against the evidence signals and shows which rule matched, which conditions passed, and why the recommendation appeared.',
    },
  ],
} as const;

export const FL_FOOTER = {
  tagline: 'Claim decision infrastructure for helpdesk refund and chargeback-risk reviews.',
  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'Platform', href: '/landing#claim-decision' },
        { label: 'How it works', href: '/landing#claim-decision' },
        { label: 'Evidence', href: '/landing#evidence' },
        { label: 'Pricing', href: FL_ROUTES.pricing },
        { label: 'Claim decision demo', href: '/landing#claim-decision' },
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
        { label: 'Connect store and helpdesk', href: FL_ROUTES.audit },
        { label: 'Pilot terms', href: FL_ROUTES.pilotTerms },
      ],
    },
  ],
  legal: 'Identifiers are hashed before they leave your store.',
  legalRules: 'Recommendations are generated from merchant-configured rules. No action is taken automatically.',
} as const;
