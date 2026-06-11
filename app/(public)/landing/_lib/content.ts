/**
 * Landing page content — single source for all copy and data structures.
 *
 * Every number on the landing page is specific and plausible on purpose:
 * vague claims read as marketing; precise ones read as telemetry. Amounts
 * are GBP. Merchant identifiers are pseudonymous (M-204 style) to mirror
 * how the real product displays cross-merchant context.
 */

export const ROUTES = {
  signup: '/signup',
  login: '/login',
  demo: '/demo',
  privacyPolicy: '/legal/privacy',
  dataHandling: '/legal/data-handling',
  dpa: '/legal/dpa',
  pilotTerms: '/legal/pilot-terms',
} as const;

export const NAV_LINKS = [
  { label: 'Network', href: '#network' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Pricing', href: '#pricing' },
] as const;

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const HERO = {
  eyebrow: 'Post-checkout fraud intelligence',
  headline: 'The fraud your payment processor never sees.',
  subhead:
    'Friendly fraud lives in the helpdesk — after checkout, after fulfilment, outside the card network. Unauth reads claims across merchants, so your team knows which ones the evidence supports before anyone replies.',
  primaryCta: 'Create a workspace',
  secondaryCta: 'See how the network works',
  factRow: ['38ms median lookup', 'k-anonymity ≥ 3 merchants', '0 automated decisions'],
} as const;

export const HERO_TICKET = {
  channel: 'Gorgias · #4821',
  subject: 'Package never arrived',
  from: 'Sophie H.',
  fromMeta: 's.hart••@gmail.com · first message',
  order: 'Order #UA-10482 · £162.40 · delivered 4 days ago',
  body: '“Hi — tracking says delivered but nothing ever came. I’d like a refund to my original card please.”',
  age: '2 min ago',
} as const;

export const HERO_PANEL = {
  title: 'Unauth · identity context',
  latency: '38ms',
  grade: 'B',
  gradeLabel: 'Probable match',
  stats: [
    { k: 'merchants', v: '4' },
    { k: 'claims / orders', v: '6 / 9' },
    { k: 'claim rate', v: '67%' },
  ],
  signals: [
    { name: 'email_hash', detail: '9f3b…12c8 · 4 merchants' },
    { name: 'device_hmac', detail: '71c2…0aa8 · 3 merchants' },
    { name: 'ship_addr', detail: 'token overlap 0.94' },
    { name: 'card_fingerprint', detail: 'bin + last4 · 2 merchants' },
  ],
  history: [
    { merchant: 'M-204', vertical: 'apparel', claim: 'INR claim', amount: '£89.00', outcome: 'refunded' },
    { merchant: 'M-117', vertical: 'beauty', claim: 'INR claim', amount: '£54.20', outcome: 'refunded' },
    { merchant: 'M-339', vertical: 'home', claim: 'chargeback', amount: '£212.00', outcome: 'evidence filed' },
  ],
  footer: 'Evidence only — your team makes the call.',
  action: 'Open case file',
} as const;

/* ── Network tape ──────────────────────────────────────────────────────── */

export const TAPE_ITEMS = [
  { k: 'SIGNAL', v: 'email_hash matched · 4 merchants' },
  { k: 'LOOKUP', v: '41ms · gorgias ticket #4821' },
  { k: 'CLAIM', v: 'linked · INR · £74.20' },
  { k: 'EVIDENCE', v: 'package assembled · CB-2291' },
  { k: 'K-ANON', v: 'gate held · 2 merchants < 3 · signal withheld' },
  { k: 'GRAPH', v: '+1 merchant · 11,406 new edges' },
  { k: 'AUTO-ACTIONS', v: '0 · by design' },
  { k: 'SIGNAL', v: 'device_hmac matched · 3 merchants' },
  { k: 'LOOKUP', v: '36ms · zendesk ticket #18250' },
  { k: 'CLAIM', v: 'linked · item-not-as-described · £39.99' },
] as const;

/* ── Integrations ──────────────────────────────────────────────────────── */

export const INTEGRATIONS = [
  { name: 'Shopify', src: '/integrations/shopify.svg' },
  { name: 'WooCommerce', src: '/integrations/woocommerce.svg' },
  { name: 'BigCommerce', src: '/integrations/bigcommerce.svg' },
  { name: 'Gorgias', src: '/integrations/gorgias.png' },
  { name: 'Zendesk', src: '/integrations/zendesk.svg' },
  { name: 'Freshdesk', src: '/integrations/freshdesk.svg' },
] as const;

export const INTEGRATIONS_LINE =
  'One order source, one helpdesk. Most teams are connected in about fifteen minutes.';

/* ── Blind spot ────────────────────────────────────────────────────────── */

export const BLIND_SPOT = {
  eyebrow: 'The blind spot',
  headline: 'A customer can defraud ten merchants in a row — and the card network sees nothing.',
  body: 'Checkout fraud is a solved problem. Friendly fraud begins after it: refund requests, “item not received” tickets, chargebacks on orders that were honestly fulfilled. None of it touches the payment rails, so none of it reaches your processor’s risk models.',
  railOneLabel: 'card network · what your processor sees',
  railOneEvents: ['AUTH ✓', 'CAPTURE ✓', 'SETTLE ✓'],
  railOneEnd: 'no further events',
  railTwoLabel: 'helpdesk · where the claims happen',
  railTwoEvents: [
    { merchant: 'M-204', text: '“never arrived” · refund issued' },
    { merchant: 'M-117', text: '“never arrived” · refund issued' },
    { merchant: 'M-339', text: 'photo proof refused · chargeback' },
    { merchant: 'M-512', text: '“wrong item” · refund demanded' },
    { merchant: 'you', text: 'ticket #4821 · just opened' },
  ],
  footnote: 'Unauth is the layer that reads across the second rail.',
} as const;

/* ── Network section ───────────────────────────────────────────────────── */

export const NETWORK = {
  eyebrow: 'The network',
  headline: 'One identity. Four merchants. A pattern no single store can see.',
  body: 'Each merchant sees one polite refund request. The graph sees the same hashed identity filing the same claim, store after store. Every merchant that joins adds edges — which is why the intelligence compounds and why it cannot be replicated by any tool that watches one store at a time.',
  points: [
    {
      title: 'Signals are gated, not pooled',
      body: 'A cross-merchant signal only surfaces once at least three independent merchants share it. Below the threshold, the network stays silent.',
    },
    {
      title: 'Density compounds',
      body: 'A new merchant doesn’t just protect itself — it adds edges that sharpen every existing match in the graph.',
    },
    {
      title: 'Store context works from day one',
      body: 'Your own order, refund, and ticket history is useful immediately. Network signals layer on top as density crosses the threshold.',
    },
  ],
} as const;

/* ── How it works ──────────────────────────────────────────────────────── */

export const HOW_IT_WORKS = {
  eyebrow: 'How it works',
  headline: 'Three steps. No SDK, no checkout changes, no payment integration.',
  steps: [
    {
      id: '01',
      title: 'Connect your store and helpdesk',
      body: 'OAuth into your commerce platform and helpdesk. Unauth ingests orders, fulfilments, refund history, and ticket content. CSV backfill is available for historical data.',
    },
    {
      id: '02',
      title: 'Identifiers are hashed before they leave',
      body: 'Emails, addresses, devices, and card fingerprints are hashed with HMAC-SHA256 and a salt unique to your tenant. The cross-merchant graph is built on digests — raw PII never enters it.',
    },
    {
      id: '03',
      title: 'Every claim arrives with its history',
      body: 'When a ticket opens, the identity record is already there: merchants matched, claim patterns, refund rate, and an A–D confidence grade for the match itself. If a chargeback follows, the evidence package is one click.',
    },
  ],
  hashDemo: {
    input: 's.hart@gmail.com',
    fn: 'HMAC-SHA256( salt_tenant , · )',
    output: '9f3b12c84a07…',
    note: 'per-tenant salt · 38ms median',
  },
  grades: [
    { grade: 'A', label: 'Definite' },
    { grade: 'B', label: 'Probable' },
    { grade: 'C', label: 'Possible' },
    { grade: 'D', label: 'Weak' },
  ],
  activeGrade: 'B',
} as const;

/* ── Evidence, not verdicts ────────────────────────────────────────────── */

export const EVIDENCE = {
  eyebrow: 'Evidence, not verdicts',
  headline: 'Unauth has never declined an order. It can’t.',
  body: 'There is no auto-block, no auto-refund, no auto-close — no code path for any of them. Unauth surfaces the identity record and assembles the evidence; your team decides how to respond. That separation is what keeps good customers safe and keeps the decision, and the liability, where it belongs: with you.',
  counters: [
    { v: '0', k: 'auto-declines issued' },
    { v: '0', k: 'tickets auto-closed' },
    { v: '0', k: 'refunds auto-decided' },
  ],
  manifest: {
    title: 'Evidence package · CB-2291',
    files: [
      { name: 'claim_timeline.json', meta: '11 events · 4 merchants' },
      { name: 'identity_signals.csv', meta: '12 signals · graded' },
      { name: 'delivery_confirmation.pdf', meta: 'carrier GPS + photo' },
      { name: 'cross_merchant_history.txt', meta: 'k-gated · pseudonymous' },
      { name: 'order_record.json', meta: '#UA-10482 · £162.40' },
    ],
    footer: 'assembled in 38ms · formatted for representment',
  },
} as const;

/* ── Privacy architecture ──────────────────────────────────────────────── */

export const PRIVACY = {
  eyebrow: 'Privacy architecture',
  headline: 'The network never sees a name.',
  body: 'Cross-merchant intelligence is only viable if no merchant ever exposes a customer to another. That constraint isn’t a policy we adopted — it’s the architecture the graph is built on.',
  demo: {
    input: 's.hart@gmail.com',
    rows: [
      { tenant: 'your tenant', salt: 'salt_a91f', digest: '9f3b12c84a07…' },
      { tenant: 'merchant M-204', salt: 'salt_c302', digest: 'e47a09d13b55…' },
    ],
    note: 'Different salts, different digests. Matching happens in graph space — plaintext never leaves the tenant boundary.',
  },
  facts: [
    {
      title: 'HMAC-SHA256, per-tenant salts',
      body: 'Identifiers are hashed inside your workspace with a salt no other tenant shares. A digest leaked from one tenant is useless against another.',
    },
    {
      title: 'k-anonymity, k ≥ 3',
      body: 'No cross-merchant signal surfaces unless at least three independent merchants share it. Two stores comparing notes is a privacy problem; a thresholded graph is not.',
    },
    {
      title: 'No raw PII in the graph',
      body: 'The network stores digests, claim outcomes, and timestamps. Names, emails, and addresses stay merchant-scoped, where they already live.',
    },
    {
      title: 'Merchant-scoped processing',
      body: 'Your raw data is processed inside your workspace and exportable on request. Leave, and your contribution to the graph is unwound.',
    },
  ],
} as const;

/* ── Case file (scenario) ──────────────────────────────────────────────── */

export const SCENARIO = {
  eyebrow: 'Case file',
  headline: 'Four merchants. Eleven weeks. £1,210.',
  body: 'A reconstruction from network data — the kind of pattern that is invisible to each merchant alone and obvious to the graph.',
  rows: [
    { date: 'Mar 04', merchant: 'M-204', vertical: 'apparel', event: '“Package never arrived” · refund requested', amount: '£89.00', outcome: 'refunded' },
    { date: 'Mar 22', merchant: 'M-117', vertical: 'beauty', event: 'Same claim · same address tokens', amount: '£54.20', outcome: 'refunded' },
    { date: 'Apr 10', merchant: 'M-339', vertical: 'home', event: 'Photo proof requested · customer refused', amount: '£212.00', outcome: 'chargeback' },
    { date: 'Apr 29', merchant: 'M-512', vertical: 'footwear', event: '“Wrong item received” · device_hmac match', amount: '£148.50', outcome: 'refunded' },
    { date: 'May 18', merchant: 'M-512', vertical: 'footwear', event: 'Second claim in 19 days', amount: '£706.30', outcome: 'chargeback' },
  ],
  total: '£1,210.00 refunded across the first four claims',
  punchline: 'Merchant #5 saw this file the moment the next ticket opened — and replied with the evidence already attached.',
} as const;

/* ── Pricing ───────────────────────────────────────────────────────────── */

export const PRICING = {
  eyebrow: 'Pricing',
  headline: 'Join the network free. Pay when the volume does.',
  note: 'Every plan includes store context, network participation, and hashed-signal contribution. No card required to start. No auto-actions on any plan.',
  featuredKey: 'pro',
  cta: 'Create a workspace',
  ctaCustom: 'Talk to us',
} as const;

/* ── FAQ ───────────────────────────────────────────────────────────────── */

export const FAQ = {
  eyebrow: 'Questions',
  headline: 'Asked by every fraud lead we talk to.',
  items: [
    {
      q: 'Will this block or decline any of my customers?',
      a: 'No. Unauth has no enforcement path — it cannot decline an order, close a ticket, or decide a refund. It surfaces an identity record and evidence; your team decides how to respond. This is a deliberate product boundary, not a missing feature.',
    },
    {
      q: 'Can other merchants see my customers’ data?',
      a: 'No. Identifiers are hashed with HMAC-SHA256 and a per-tenant salt before anything enters the graph, and cross-merchant signals only surface when at least three independent merchants share them. Other merchants see thresholded, pseudonymous patterns — never your customer records.',
    },
    {
      q: 'What does a confidence grade actually mean?',
      a: 'It grades the identity match, not the customer. An “A” means the data points are almost certainly the same person across records; a “D” means the link is weak. It is never a verdict on whether a claim is honest — that judgment stays with your team.',
    },
    {
      q: 'Is there enough network density to be useful for me?',
      a: 'Store-level context — your own claim rates, refund history, and ticket patterns — works from day one with no network at all. Cross-merchant signals appear as density crosses the k≥3 threshold around your customer base. We will tell you honestly what coverage looks like for your vertical before you commit.',
    },
    {
      q: 'What do I need to integrate?',
      a: 'One order source (Shopify, WooCommerce, or BigCommerce) and one helpdesk (Gorgias, Zendesk, or Freshdesk). Both are OAuth connections that take about fifteen minutes. CSV import covers historical backfill or evaluation without connecting anything.',
    },
    {
      q: 'Where does this stand with GDPR?',
      a: 'The architecture is built on data minimisation: merchant-scoped processing, hashed pseudonymous network signals, and no raw PII in the graph. We provide a DPA and data-handling documentation for your counsel to review before you process live EU customer data.',
    },
  ],
} as const;

/* ── Final CTA + footer ────────────────────────────────────────────────── */

export const FINAL_CTA = {
  headline: 'The next claim is already in someone else’s graph.',
  body: 'Create a workspace, connect your store and helpdesk, and see your own claim patterns within the hour.',
  cta: 'Create a workspace',
  subline: 'Free plan · no card · 100 context credits monthly · 0 auto-actions, ever',
} as const;

export const FOOTER = {
  tagline: 'Cross-merchant fraud intelligence for ecommerce claims.',
  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Live demo', href: ROUTES.demo },
      ],
    },
    {
      heading: 'Privacy',
      links: [
        { label: 'Privacy architecture', href: '#privacy' },
        { label: 'Privacy policy', href: ROUTES.privacyPolicy },
        { label: 'Data handling', href: ROUTES.dataHandling },
        { label: 'DPA', href: ROUTES.dpa },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'Sign in', href: ROUTES.login },
        { label: 'Create a workspace', href: ROUTES.signup },
        { label: 'Pilot terms', href: ROUTES.pilotTerms },
      ],
    },
  ],
  legal: 'Identifiers are hashed before they leave your store.',
} as const;
