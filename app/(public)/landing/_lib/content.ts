/**
 * Landing page content — single source for all copy and data structures.
 *
 * Every number on the landing page is specific and plausible on purpose:
 * vague claims read as marketing; precise ones read as telemetry. Amounts
 * are GBP. Merchant identifiers are pseudonymous (M-204 style) only in
 * historical sample data; live product copy leads with payout control.
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
  { label: 'How it works', href: '#how-it-works' },
  { label: 'The gate', href: '#how-it-works' },
  { label: 'Integrations', href: '#network' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Request access', href: '/signup' },
] as const;

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const HERO = {
  eyebrow: 'Post-purchase claim control',
  headline: "Your support team gives money away every day. You can't see where.",
  subhead:
    'Refunds, reships, and "I never got it" claims get resolved from memory, under time pressure, by whoever picks up the ticket — or increasingly, by an AI agent. Unauth holds the risky ones before anyone acts, assembles the evidence, applies your rules, and records what happened and who owned the loss.',
  primaryCta: 'Request access',
  secondaryCta: 'See how it works',
  factRow: ['Gate framing', 'No fabricated stats', 'Your rules decide'],
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
  title: 'Unauth · payout context',
  latency: '38ms',
  grade: 'B',
  gradeLabel: 'Evidence context',
  stats: [
    { k: 'prior cases', v: '4' },
    { k: 'payout exposure', v: '£162.40' },
    { k: 'evidence gaps', v: '2' },
  ],
  signals: [
    { name: 'delivery_status', detail: 'Delivered · proof requested' },
    { name: 'requested_action', detail: 'Refund to original payment method' },
    { name: 'merchant_rule', detail: 'Manual review · repeat INR' },
    { name: 'recovery_path', detail: 'Carrier claim evidence missing' },
  ],
  history: [
    { merchant: 'Own store', vertical: 'apparel', claim: 'INR claim', amount: '£89.00', outcome: 'refunded' },
    { merchant: 'Own store', vertical: 'beauty', claim: 'damaged item', amount: '£54.20', outcome: 'reshipped' },
    { merchant: 'Own store', vertical: 'home', claim: 'chargeback', amount: '£212.00', outcome: 'evidence filed' },
  ],
  footer: 'Evidence only — your team makes the call.',
  action: 'Open case file',
} as const;

/* ── Network tape ──────────────────────────────────────────────────────── */

export const TAPE_ITEMS = [
  { k: 'CASE', v: 'refund requested · £84.20 exposure' },
  { k: 'LOOKUP', v: '41ms · gorgias ticket #4821' },
  { k: 'CLAIM', v: 'INR · £74.20' },
  { k: 'EVIDENCE', v: 'package assembled · CB-2291' },
  { k: 'RULE', v: 'manual review · evidence missing' },
  { k: 'RECOVERY', v: 'carrier claim · evidence needed' },
  { k: 'AUTO-ACTIONS', v: '0 · by design' },
  { k: 'SIGNAL', v: 'delivery photo present · signature unavailable' },
  { k: 'LOOKUP', v: '36ms · zendesk ticket #18250' },
  { k: 'CLAIM', v: 'item-not-as-described · £39.99' },
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
  headline: 'A claim can look isolated when the evidence is scattered.',
  body: 'Refund requests, “item not received” tickets, replacements, and chargeback pressure usually live across orders, fulfilment records, and helpdesk conversations. Unauth brings that context into one claim review trail.',
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
  footnote: 'Unauth is the layer that links the helpdesk claim to the evidence trail.',
} as const;

/* ── Network section ───────────────────────────────────────────────────── */

export const NETWORK = {
  eyebrow: 'Payout workflow',
  headline: 'One ticket. One order. One decision trail.',
  body: 'A refund or reship request should not depend on scattered screenshots and memory. Unauth links the ticket to order history, delivery evidence, payout exposure, merchant policy, and recoverability before the agent replies.',
  points: [
    {
      title: 'Cases are structured',
      body: 'Every support payout case carries requested action, case reason, evidence status, payout exposure, and outcome.',
    },
    {
      title: 'Rules are explainable',
      body: 'Merchant-owned policy returns a recommendation and matched conditions; Unauth does not make the final decision.',
    },
    {
      title: 'Store context works from day one',
      body: 'Your own order, refund, ticket, delivery, and recovery history powers the workflow immediately.',
    },
  ],
} as const;

/* ── How it works ──────────────────────────────────────────────────────── */

export const HOW_IT_WORKS = {
  eyebrow: 'How it works',
  headline: 'Three steps. No order blocking. No automated decisions.',
  steps: [
    {
      id: '01',
      title: 'Connect your store and helpdesk',
      body: 'OAuth into your commerce platform and helpdesk. Unauth ingests orders, fulfilments, refund history, ticket content, and available historical context from those connected systems.',
    },
    {
      id: '02',
      title: 'Payout exposure and evidence are assembled',
      body: 'Unauth links the ticket to the order, delivery proof, requested action, missing evidence, and potential recovery route.',
    },
    {
      id: '03',
      title: 'Every claim arrives with policy context',
      body: 'When a ticket opens, the payout case shows prior store history, evidence status, the matched rule, and the recommended next action. If a chargeback follows, the evidence package is one click.',
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

/* ── Evidence, not automated decisions ─────────────────────────────────── */

export const EVIDENCE = {
  eyebrow: 'Evidence, not automated decisions',
  headline: 'Unauth has never declined an order. It can’t.',
  body: 'There is no auto-block, no auto-refund, no auto-close — no code path for any of them. Unauth surfaces the identity record, applies your rules, and assembles the evidence; your team decides how to respond.',
  counters: [
    { v: '0', k: 'auto-declines issued' },
    { v: '0', k: 'tickets auto-closed' },
    { v: '0', k: 'refunds auto-decided' },
  ],
  manifest: {
    title: 'Evidence package · CB-2291',
    files: [
      { name: 'claim_timeline.json', meta: '11 events · order + ticket' },
      { name: 'evidence_checklist.json', meta: 'delivery proof · signature unavailable' },
      { name: 'delivery_confirmation.pdf', meta: 'commerce fulfilment proof' },
      { name: 'recovery_route.txt', meta: 'carrier claim · evidence needed' },
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
      title: 'Case-scoped context',
      body: 'Unauth surfaces context for the payout case under review, not reusable customer lists or automatic denial workflows.',
    },
    {
      title: 'No raw PII in the graph',
      body: 'Operational records store the evidence, rule match, outcome, and recovery status. Names, emails, and addresses stay merchant-scoped, where they already live.',
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
  headline: 'One helpdesk case. £162.40 exposure. A recovery route.',
  body: 'A reconstruction from store, delivery, and support data — the kind of payout decision that becomes expensive when the evidence trail is scattered.',
  rows: [
    { date: '09:14', merchant: 'Ticket', vertical: 'Gorgias', event: '“Package never arrived” · refund requested', amount: '£162.40', outcome: 'open' },
    { date: '09:15', merchant: 'Order', vertical: 'Shopify', event: 'Marked delivered · delivery photo present', amount: '£162.40', outcome: 'evidence attached' },
    { date: '09:16', merchant: 'Rule', vertical: 'Policy', event: 'Repeat INR within 60 days · delivery photo unavailable', amount: '£162.40', outcome: 'manual review' },
    { date: '09:17', merchant: 'Recovery', vertical: 'Carrier', event: 'Carrier claim potentially available', amount: '£84.20', outcome: 'evidence needed' },
  ],
  total: '£162.40 payout exposure reviewed before the reply',
  punchline: 'The agent saw the rule, evidence gaps, and recovery path before money left the business.',
} as const;

/* ── Pricing ───────────────────────────────────────────────────────────── */

export const PRICING = {
  eyebrow: 'Pricing',
  headline: 'Start payout control free. Pay when the volume does.',
  note: 'Every plan includes store context, evidence checklists, merchant rules, and payout workflow. No card required to start. No auto-actions on any plan.',
  featuredKey: 'pro',
  cta: 'Request access',
  ctaCustom: 'Talk to us',
} as const;

/* ── FAQ ───────────────────────────────────────────────────────────────── */

export const FAQ = {
  eyebrow: 'Common questions',
  headline: 'Common questions',
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

/* ── Final CTA + footer ────────────────────────────────────────────────── */

export const FINAL_CTA = {
  headline: 'The next claim deserves a decision trail.',
  body: 'Connect your store and helpdesk. Unauth backfills your claim history and starts holding risky claims on live tickets.',
  cta: 'Request access',
  subline: 'Onboarding a small group of design partners now.',
} as const;

export const FOOTER = {
  tagline: 'Claim decision infrastructure for ecommerce helpdesk teams.',
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
        { label: 'Request access', href: ROUTES.signup },
        { label: 'Pilot terms', href: ROUTES.pilotTerms },
      ],
    },
  ],
  legal: 'Identifiers are hashed before they leave your store.',
} as const;
