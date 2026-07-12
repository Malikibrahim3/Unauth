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
    { label: 'What you recover', href: '/landing#what-you-recover' },
    { label: 'The gate', href: '/landing#how-it-works' },
    { label: 'Integrations', href: '/landing#integrations' },
    { label: 'FAQ', href: '/landing#faq' },
  ],
  signIn: 'Sign in',
  cta: 'Request access',
} as const;

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const FL_HERO = {
  eyebrow: '',
  headlineLines: [
    'Your team loses it. Your AI loses it faster.',
    'Unauth gets it back.',
  ],
  subtitle:
    'The claim gate that catches refunds, recovers carrier losses, and stops repeat claimants — before anyone pays out.',
  body: '',
  primaryCta: 'Request access',
  secondaryCta: 'See how it works',
  pinnedCta: 'Request access',
  contactCta: 'Request access',
  orderHistoryCard: {
    title: '01 Merchant-owned rules',
    status: 'Your policy logic — not an automated decision.',
    meta: 'Cleared · Held · Logged',
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
  title: 'Three kinds of money, all leaking quietly. Unauth catches each one.',
  lead:
    'A refund or reship request should not depend on scattered screenshots and memory. Unauth links the ticket to order history, delivery evidence, loss ownership, merchant policy, and recoverability before the agent replies.',
  stats: [
    {
      value: 'Mistake',
      label: 'Money you give away by mistake',
      source: 'Stopped at the gate',
    },
    {
      value: 'Owed',
      label: 'Money someone else owes you',
      source: 'Chased, not written off',
    },
    {
      value: 'Disputes',
      label: 'Money you lose in disputes',
      source: 'Defended with a ready record',
    },
  ],
} as const;

export const FL_CLAIM_DECISION_LOOP = {
  eyebrow: 'How it works',
  headline: "None of this is possible after the fact. It only works if you catch the claim before it's paid.",
  subhead:
    "You cannot recover a loss you have already refunded and forgotten. The evidence goes stale. The carrier's claim window closes. The pattern stays invisible.",
  steps: [
    {
      number: '01',
      title: 'A claim arrives',
      body: 'In your helpdesk, exactly as it does today.',
    },
    {
      number: '02',
      title: 'The gate checks it',
      body: "Delivery proof, order value, this customer's full claim history with you, recovery route, and which of your rules apply.",
    },
    {
      number: '03',
      title: 'Safe claims pass straight through',
      body: 'First-time customer, low value, clean delivery? Cleared instantly. Nothing slows down that should not.',
    },
    {
      number: '04',
      title: 'Risky claims are held',
      body: 'Your AI agent is stopped from auto-refunding. A human sees the order, evidence, claim history, exact rule, loss owner, and recovery case.',
    },
    {
      number: '05',
      title: 'The outcome is recorded',
      body: 'Decision, evidence, loss owner, and recovery route are documented permanently.',
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
    label: 'Held',
    rule: 'Delivered with signature — 4th claim this quarter',
    conditions: [
      'Item not received claim',
      'Delivery proof attached',
      'Customer has prior claims with you',
      'Human review before any refund',
    ],
  },
  evidence: {
    items: [
      'Delivery proof',
      'Order #UA-10482',
      'Claim history with you',
      'Carrier or warehouse recovery route',
    ],
  },
  audit: {
    items: [
      'Decision recorded',
      'Evidence snapshot stored',
      'Loss owner attributed',
      'Recovery case queued',
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
    { k: 'Rule', v: 'Held before refund' },
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
  displayLines: ['BUILT INTO YOUR', 'EXISTING STACK.'],
  subhead:
    'Connect your commerce platform, set your policy logic, and let every inbound claim arrive with the evidence your team needs to decide.',
  privacyNote: 'Raw customer data stays merchant-scoped. The workflow is case-scoped, not a customer denial list.',
  steps: [
    {
      id: '1.0',
      title: 'Connect',
      body: 'Link your store',
      note: 'Connect Shopify, BigCommerce, or WooCommerce through OAuth. No engineering project required.',
    },
    {
      id: '2.0',
      title: 'Configure',
      body: 'Set your rules',
      note: 'Define when claims should pass, hold, or escalate using your own policy logic.',
    },
    {
      id: '3.0',
      title: 'Enrich',
      body: 'Claims enrich automatically',
      note: 'Every inbound claim is checked against order history, delivery context, claim history, and recovery context.',
    },
    {
      id: '4.0',
      title: 'Review',
      body: 'See the gate result',
      note: 'The ticket opens with evidence, the matched rule, loss ownership, recovery route, and a traceable audit row. Your team decides.',
    },
  ],
  image: {
    src: '/strdtfygh.png',
    alt: 'Architectural illustration of a merchant store, Unauth intelligence hub, and helpdesk module connected for claim review setup',
  },
} as const;

/* ── Giant figures (§ numbers) ─────────────────────────────────────────── */

export const FL_FIGURES = {
  label: 'See the losses before they disappear',
  body: 'Connect your store and helpdesk. Unauth starts catching claims before they are paid, attributes every loss, and builds the recovery queue while the evidence is still fresh.',
  figures: [
    {
      value: '£6.2k',
      unit: '',
      label: 'Carrier fault',
      note: 'Recoverable before the claim window closes',
    },
    {
      value: '£3.1k',
      unit: '',
      label: '3PL fault',
      note: 'Wrong-item and short-shipment recovery',
    },
  ],
  disclaimer:
    'Illustrative monthly breakdown. Actual results depend on your volumes, rules, and evidence coverage.',
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
    href: '/landing#how-it-works',
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
  headlineLines: ['SEE WHERE THE MONEY', 'SHOULD COME BACK FROM.'],
  body: 'Connect your store and helpdesk. Unauth catches every claim before it is paid, attributes the loss, and hands your team the recovery case while the window is still open.',
  cta: 'Request access',
} as const;

export const FL_FAQ = {
  heading: 'Common questions',
  items: [
    {
      q: 'How does Unauth actually get money back?',
      a: "For every claim it works out who owns the loss — carrier, warehouse, customer, or a policy override. Where a loss is recoverable, it assembles the claim with the deadline attached. Lost-in-transit parcels are the carrier's liability. Wrong-item shipments are the 3PL's. Unauth builds the case so you go and collect it instead of writing it off. You stay in control of submitting.",
    },
    {
      q: 'Why does it have to catch the claim before it\'s paid?',
      a: "Because you cannot recover a loss you have already refunded and forgotten. The carrier's claim window closes. The evidence goes stale. The pattern stays invisible. Catching it before the refund is the only moment the money is still yours to keep or recover.",
    },
    {
      q: 'How does the customer history work — do you track people across other stores?',
      a: "No. Unauth only uses a customer's claim history with you — claims they have filed on your own store. There is no shared database, no cross-merchant profile, no external score. The pattern you see is built from your own data and it stays yours. The difference is that Unauth surfaces it at the one moment it matters, before your team or your AI acts on it.",
    },
    {
      q: 'We already use Yuma or Gorgias AI. Why add this?',
      a: "They close tickets fast. Unauth decides which ones they are allowed to close without a human — and flags the recoverable ones before the money is gone. They turn resolution up. The gate makes sure the risky and recoverable claims still stop. They work together.",
    },
    {
      q: 'Will this slow down legitimate claims?',
      a: 'Low-risk claims — first-time customer, no unusual signals, clean delivery — pass straight through at full speed. Only claims that match your configured rules are held. You control the thresholds. Genuine customers with genuine problems are not affected.',
    },
    {
      q: 'How do you tell a real complaint from abuse?',
      a: 'You do, through your rules. Unauth surfaces the facts — delivery state, order value, how many times this customer has claimed with you, whether the evidence is consistent — and applies the thresholds you configure. The decision reflects your policy, not our guess about a customer.',
    },
  ],
} as const;

export const FL_FOOTER = {
  tagline: 'Post-purchase loss recovery for ecommerce support teams.',
  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'The gate', href: '/landing#how-it-works' },
        { label: 'What you recover', href: '/landing#what-you-recover' },
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
  legal: 'Customer history is built from your own store data only.',
  legalRules: 'Every hold traces to your rules, your evidence, and a recorded decision.',
} as const;
