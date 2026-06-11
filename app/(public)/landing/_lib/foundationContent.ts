/**
 * Foundation-rebuild landing content — single source for all copy.
 *
 * Every figure is real and traceable:
 *   38ms median lookup        → existing hero telemetry (content.ts)
 *   k ≥ 3                     → K_ANONYMITY_MIN (lib/engine/weights.ts)
 *   6 identity signals        → IDENTITY_SIGNAL_WEIGHTS (lib/engine/weights.ts)
 *   A–D grades                → gradeToLetter (lib/engine/weights.ts)
 *   98.5% precision           → us_benchmark_v1 calibration at FLAG_THRESHOLD 44
 *   ~20 min audits            → FAQ copy (landingPageConstants.ts)
 *   120-day window            → CE3_PRIOR_ORDER_WINDOW_DAYS (lib/engine/weights.ts)
 *   HMAC-SHA256 / per-tenant  → privacy architecture (content.ts)
 */

export const FL_ROUTES = {
  signup: '/signup',
  audit: '/audit',
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
    { label: 'Product', href: '/landing#about' },
    { label: 'Network', href: '/landing#network' },
    { label: 'Evidence', href: '/landing#evidence' },
    { label: 'Pricing', href: FL_ROUTES.pricing },
    { label: 'Privacy', href: '/landing#privacy' },
  ],
  signIn: 'Sign in',
  cta: 'Run a free claim audit',
} as const;

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const FL_HERO = {
  // Stacked display lines — claim-centric; three-line rhythm with article intact.
  headlineLines: ['EVERY CLAIM', 'LEAVES', 'A TRAIL'],
  subheadLight: 'When a customer says "it never arrived," see whether they\'ve said it before',
  subheadBold: '— at your store, or anyone else\'s.',
  ctaNote: 'Read-only audit of your order history · no card · ~20 min',
  pinnedCta: 'Run a free claim audit',
  contactCta: 'Sign in',
  applyCta: 'Run a free claim audit',
} as const;

/* Floating identity record — mirrors the real product panel. */
export const FL_PHONE = {
  title: 'Identity record',
  subtitle: 'hash 9f3b…12c8 · 4 merchants',
  valueLabel: 'Linked Exposure',
  value: '£1,210',
  compareA: { label: 'Claims / Orders', value: '6 / 9', delta: '67% claim rate', up: false },
  compareB: { label: 'Merchants', value: '4', delta: 'k ≥ 3 · gate open', up: true },
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
  body: 'Unauth links hashed identity signals across participating merchants so post-checkout claims arrive with context attached. It never blocks orders, never denies refunds, and never makes the decision for you.',
  features: [
    { id: '01', title: 'Zero automated decisions, by design' },
    { id: '02', title: 'Every claim arrives with context' },
    { id: '03', title: 'Repeated signals are matched across merchants' },
    { id: '04', title: 'Evidence packs sit one click from the ticket' },
  ],
  cta: 'Run a free claim audit',
} as const;

/* Evidence manifest card — stands where the reference puts a 3D render. */
export const FL_MANIFEST = {
  title: 'Evidence package',
  caseId: 'CB-2291',
  files: [
    { name: 'claim_timeline.json', meta: '11 events · 4 merchants' },
    { name: 'identity_signals.csv', meta: '12 signals · graded' },
    { name: 'delivery_confirmation.pdf', meta: 'carrier GPS + photo' },
    { name: 'cross_merchant_history.txt', meta: 'k-gated · pseudonymous' },
    { name: 'order_record.json', meta: '#UA-10482 · £162.40' },
  ],
  footer: 'assembled in 38ms · formatted for representment',
} as const;

/* ── Stats bento — post-checkout chargeback pressure (sourced) ─────────── */

export const FL_BENTO = [
  {
    value: '45%',
    label: 'Of chargebacks merchants identify as fraudulent',
    tone: 'purple' as const,
  },
  {
    value: '$4.61',
    label: 'Cost for every $1 of fraud — US ecommerce & retail',
    tone: 'dark' as const,
  },
  {
    value: '$42B',
    label: 'Global chargeback cost forecast by 2028',
    tone: 'light' as const,
  },
] as const;

export const FL_BENTO_SOURCES = [
  'Mastercard / Ethoca, 2025 State of Chargebacks',
  'Mastercard, 2025 global chargebacks outlook',
  'LexisNexis Risk Solutions, 2025 True Cost of Fraud',
] as const;

/* ── Signals → evidence (espresso tabbed section) ──────────────────────── */

export const FL_SIGNALS_EVIDENCE = {
  displayLines: ['SIGNALS', 'BECOME', 'EVIDENCE'],
  subhead:
    'Four signal types. One evidence pack beside every claim. Your team decides.',
  cta: { label: 'Run a free claim audit', href: FL_ROUTES.audit },
  image: {
    src: '/statement-facility-v3.png',
    alt: 'Architectural illustration of Unauth’s cross-merchant evidence hub',
  },
  tabs: [
    {
      key: 'timing',
      tab: 'Claim timing',
      caseLine: ['CB-2291', 'Never arrived', '£162.40'],
      gradeLetter: 'B',
      gradeTier: 'Probable match',
      mainLine:
        '"Never arrived" for the third time — each claim opened after a confirmed delivery window.',
      details: [
        { k: 'Signals matched', v: '4 of 6' },
        { k: 'Matched across', v: '4 merchants · k ≥ 3' },
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
        'Carrier GPS puts the parcel at the door — the claim arrived four days after the scan.',
      details: [
        { k: 'Signals matched', v: '5 of 6' },
        { k: 'Matched across', v: '5 merchants · k ≥ 3' },
        { k: 'Delivery proof', v: 'carrier GPS + photo' },
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
        { k: 'Matched across', v: '3 merchants · k ≥ 3' },
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
        { k: 'Matched across', v: '4 merchants · k ≥ 3' },
        { k: 'Strongest signal', v: 'card_hmac' },
        { k: 'Prior disputes', v: '3 in 90 days' },
      ],
      assembledIn: '44ms',
    },
  ],
} as const;

/* ── How it works (setup flow) ─────────────────────────────────────────── */

export const FL_HOW_IT_WORKS = {
  displayLines: ['CONNECT ONCE.', 'REVIEW EVERY CLAIM', 'WITH CONTEXT.'],
  subhead:
    'Unauth connects to your ecommerce and support tools, audits historical claims, then attaches cross-merchant evidence to post-checkout reviews — without changing your refund workflow.',
  cta: { label: 'Run a free claim audit', href: FL_ROUTES.audit },
  privacyNote: 'Identifiers are hashed before they leave your store. Raw customer data never enters the network.',
  steps: [
    {
      id: '01',
      title: 'Connect your store',
      body: 'Import orders, claims, deliveries, refunds, and fulfilment records from your ecommerce stack.',
      note: 'Identifiers are hashed before they leave your store.',
    },
    {
      id: '02',
      title: 'Connect your helpdesk',
      body: 'Link claim tickets from tools like Gorgias, Zendesk, or your support inbox.',
      note: 'Raw customer data never enters the network.',
    },
    {
      id: '03',
      title: 'Run a historical audit',
      body: 'Unauth looks for repeated post-checkout patterns across your own history and the shared network.',
      note: null,
    },
    {
      id: '04',
      title: 'Review evidence in context',
      body: 'Your team sees the evidence pack beside the claim. No auto-declines. No workflow replacement.',
      note: null,
    },
  ],
  image: {
    src: '/setup-flow-visual.png',
    alt: 'Architectural illustration of a merchant store, Unauth intelligence hub, and helpdesk module connected for claim review setup',
  },
} as const;

/* ── Giant figures (§ numbers) ─────────────────────────────────────────── */

export const FL_FIGURES = {
  label: 'See your own numbers, not ours',
  body: 'Run a historical audit and see exactly how many repeated post-checkout patterns exist in your own claim history — before committing to anything. The 98.5% precision benchmark tells you what to expect when matches are found.',
  figures: [
    {
      value: '~20',
      unit: 'min',
      label: 'Historical audit',
      note: 'Typical pilot dataset · run on your own order history',
    },
    {
      value: '98.5',
      unit: '%',
      label: 'Benchmark precision',
      note: 'Synthetic benchmark · default threshold',
    },
  ],
  disclaimer:
    'Benchmark results depend on dataset quality, import size, and configured thresholds.',
  cta: 'Run a free claim audit',
} as const;

/* ── Programs (§ programs) ─────────────────────────────────────────────── */

export const FL_PROGRAMS = {
  displayLines: ['CLAIM', 'PROGRAMS'],
  breadcrumb: ['Store Context', 'Network Signals', 'Evidence Packs'],
  tabs: [
    {
      key: 'csv',
      tab: 'CSV Audit',
      title: 'CSV AUDIT',
      kicker: 'Historical backfill / Evaluation',
      index: '01',
      details: [
        { k: 'Input', v: 'One order-history CSV export' },
        { k: 'Turnaround', v: '≈ 20 minutes' },
        { k: 'Signals', v: '6 identity + behavioral patterns' },
        { k: 'Output', v: 'Graded clusters & flagged orders' },
      ],
    },
    {
      key: 'live',
      tab: 'Live Monitoring',
      title: 'LIVE MONITORING',
      kicker: 'Store + Helpdesk / OAuth',
      index: '02',
      details: [
        { k: 'Sources', v: 'Shopify · Woo · BigCommerce' },
        { k: 'Helpdesks', v: 'Gorgias · Zendesk · Freshdesk' },
        { k: 'Lookup', v: '38ms median per ticket' },
        { k: 'Setup', v: '≈ 15 minutes, no SDK' },
      ],
    },
    {
      key: 'evidence',
      tab: 'Chargeback Evidence',
      title: 'EVIDENCE PACKS',
      kicker: 'Representment-ready files',
      index: '03',
      details: [
        { k: 'Trigger', v: 'Linked claim or chargeback' },
        { k: 'Window', v: '120-day prior-order history' },
        { k: 'Contents', v: 'Timeline · signals · delivery proof' },
        { k: 'Format', v: 'One click, representment-ready' },
      ],
    },
    {
      key: 'network',
      tab: 'Network Context',
      title: 'NETWORK CONTEXT',
      kicker: 'Pseudonymous cross-merchant graph',
      index: '04',
      details: [
        { k: 'Hashing', v: 'HMAC-SHA256 · per-tenant salt' },
        { k: 'Gate', v: 'k-anonymity · ≥ 3 merchants' },
        { k: 'Exposure', v: 'Patterns only, never records' },
        { k: 'Decisions', v: 'Yours — always' },
      ],
    },
  ],
} as const;

/* ── Final CTA + footer ────────────────────────────────────────────────── */

export const FL_FINAL = {
  headlineLines: ['THE NEXT CLAIM', 'MAY ALREADY', 'HAVE CONTEXT'],
  body: 'Run a free claim audit and see whether repeated post-checkout patterns already exist in your order history. No card. No auto-actions. Your team decides.',
  cta: 'Run a free claim audit',
} as const;

export const FL_FAQ = {
  heading: 'Common questions',
  items: [
    {
      q: 'Will this flag or block legitimate customers?',
      a: 'No. Unauth never blocks orders, denies refunds, or takes any automated action. It attaches evidence context to the claim review — your team makes every decision.',
    },
    {
      q: 'What data actually leaves my store?',
      a: 'Identifiers (email, phone, device fingerprint) are HMAC-SHA256 hashed with a per-tenant salt before they leave your store. Raw customer data never enters the network — only irreversible hashed signals are shared, and only when k-anonymity thresholds are met (≥ 3 merchants).',
    },
    {
      q: 'Does it change my refund or dispute workflow?',
      a: 'No. Unauth sits beside your existing support and dispute workflows. It adds an evidence pack to the claim review — nothing is replaced, no new approval step is required, and your current tools keep working as they do today.',
    },
    {
      q: 'What does the free audit actually show me?',
      a: 'A graded report of repeated post-checkout patterns in your own order history — repeat claim identities, claim-rate clusters, delivery context gaps, and cross-merchant signal matches. You see real findings on your data before committing to anything.',
    },
    {
      q: 'What happens after the audit?',
      a: 'You keep the findings. If you want ongoing cross-merchant evidence and live claim review, we\'ll discuss a pilot. No card is required for the audit, and there\'s no obligation to continue.',
    },
  ],
} as const;

export const FL_FOOTER = {
  tagline: 'Cross-merchant identity evidence for ecommerce claim reviews.',
  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'Product', href: '/landing#about' },
        { label: 'Network', href: '/landing#network' },
        { label: 'Evidence', href: '/landing#evidence' },
        { label: 'Pricing', href: FL_ROUTES.pricing },
        { label: 'Live demo', href: FL_ROUTES.demo },
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
        { label: 'Run free audit', href: FL_ROUTES.audit },
        { label: 'Pilot terms', href: FL_ROUTES.pilotTerms },
      ],
    },
  ],
  legal: 'Identifiers are hashed before they leave your store.',
} as const;
