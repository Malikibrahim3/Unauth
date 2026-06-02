import { t } from './_tokens';

export const LANDING_PRODUCT_LADDER = [
  {
    tier: 'Free · Evidence',
    title: 'Recover after the dispute exists',
    body: 'Evidence packs with order, delivery, customer, support, and dispute context. CE 3.0 readiness checks where required data exists; surfaces missing fields including IP/device. Replaces spreadsheets, screenshots, and manual dispute prep.',
    future: false,
  },
  {
    tier: 'Pro · Claim Confidence',
    title: 'Decide before you refund',
    body: 'Customer history search, claim and refund patterns, trust and risk signals, helpdesk widgets, and a review queue so you choose who to trust, review, or challenge. You keep the final decision.',
    future: false,
  },
  {
    tier: 'Advanced · Prevention',
    title: 'Stronger prevention workflows (planned)',
    body: 'Future-facing: live lookup and scoring, custom rules, review routing, and network intelligence. Checkout controls are planned — not live today.',
    future: true,
  },
  {
    tier: 'Enterprise · Network API',
    title: 'Partners query the network',
    body: 'Privacy-preserving trust and risk signal APIs for PSPs, BNPLs, acquirers, and platforms — aggregate intelligence without exposing another merchant\'s private customer records.',
    future: false,
  },
] as const;

export const LANDING_UPGRADE_LADDER = [
  { tier: 'Free', copy: 'Recover chargebacks with evidence packs and CE 3.0 readiness.' },
  { tier: 'Pro', copy: 'Decide refunds and claims with claim-confidence workflows.' },
  { tier: 'Advanced', copy: 'Prepare to prevent with stronger workflows (future-leaning).' },
  { tier: 'Enterprise / API', copy: 'Let partners query privacy-preserving network signals.' },
] as const;

export const LANDING_GOOD_CUSTOMERS_COPY =
  'Trust signals, claim confidence, and consistent history help resolve genuine claims faster and lower manual review burden. Unauth does not auto-approve customers across the network — merchants stay in control.';

export const LANDING_FREE_WEDGE_COPY = {
  title: 'Free replaces the messy evidence workflow',
  body: 'Stop rebuilding chargeback packets from spreadsheets, screenshots, tracking portals, and order timelines. Free evidence is a real wedge — why pay just to prepare dispute documentation?',
};

export const LANDING_PRIVACY_NETWORK_COPY =
  'Privacy-preserving, merchant-scoped records, aggregate signals, and thresholded network intelligence (k-anonymity gated). No private customer records are exposed across merchants — only patterns strong enough to meet network thresholds.';

export const LANDING_PRICING_TEASER = [
  { tier: 'Free Evidence', price: '£0', note: 'Evidence packs & CE 3.0 readiness checks' },
  { tier: 'Pro Claim Confidence', price: 'from £99/mo', note: 'Planned pricing · starting from' },
  { tier: 'Advanced Prevention', price: 'from £299/mo', note: 'Planned pricing · checkout controls not live' },
  { tier: 'Enterprise / API', price: 'Custom', note: 'Per-query licensing later' },
] as const;

const FAQ_FEATURED = [
  {
    q: 'What exactly is Unauth?',
    a: 'Unauth is a merchant-side trust network for ecommerce claims, chargebacks, and post-purchase risk. We link identity patterns across hashed signals, surface claim confidence and evidence strength, and help you review before you refund — without auto-declining orders or sharing raw customer records across merchants.',
  },
  {
    q: 'How do you get data from other merchants?',
    a: "Merchants contribute anonymised, hashed identity signals to the network graph. Raw customer records stay merchant-scoped; cross-merchant views use aggregate, thresholded signals — not another store's customer list.",
  },
  {
    q: "Can you see my customers' data?",
    a: "Your raw upload is processed inside your merchant workspace and is not exposed to other merchants. Network comparison uses HMAC-SHA256 identifiers, k-anonymity gates, and masked outputs so reports show relevant risk patterns without revealing another merchant's customer records.",
  },
  {
    q: 'Is this GDPR compliant?',
    a: 'Unauth is designed around data minimisation, merchant-scoped processing, and hashed network signals. You should review the data processing documentation with your legal team before using live EU customer data.',
  },
  {
    q: 'Do I need to integrate anything?',
    a: 'No. Export a CSV from your store - Shopify, WooCommerce, Stripe, or any platform - and upload it. No API keys, no developer, no checkout plugin. If you can export an order report, you can run an audit.',
  },
  {
    q: 'How long does an audit take?',
    a: "Around 20 minutes for most datasets. Files with 50,000+ orders may take slightly longer. You don't need to stay on the page - results will be ready when you return.",
  },
] as const;

const FAQ_MORE = [
  {
    q: 'How is this different from a blocklist?',
    a: "Blocklists only flag signals you've already seen at your store. Unauth links identity patterns across merchants with privacy-preserving, thresholded network intelligence — so you can review claim confidence before refunding, not maintain a shared customer database.",
  },
  {
    q: 'What does a confidence grade actually mean?',
    a: 'Every identity cluster gets a grade — Definite, Probable, Possible, or Weak — based on how many signals match and how strong those matches are. Grades reflect claim-confidence strength, not a final refund decision. You decide what threshold you act on.',
  },
  {
    q: 'What do I actually get at the end?',
    a: 'A full audit report showing every identity cluster found, their confidence grade, the signals that linked them, their abuse history across the network, and a representment-ready case file for any cluster you want to dispute. Everything exportable.',
  },
  {
    q: 'What is a representment-ready case file?',
    a: 'To dispute a chargeback, you need documented evidence of order history and linked identity signals. Unauth builds CE 3.0-style evidence workflows where required data exists — transaction history, prior-order signal overlap, and readiness checks that flag missing IP/device fields. Merchants use outputs in dispute review at their discretion; outcomes are not guaranteed.',
  },
  {
    q: 'Does Unauth block orders automatically?',
    a: 'No, and deliberately so. We believe merchants should keep the decline decision. We surface the intelligence, you decide what to do with it. This also means we never create false positives that cost you a legitimate sale - that is your call to make, not ours.',
  },
  {
    q: 'How does pricing work?',
    a: 'Free evidence packs are £0. Pro claim confidence is planned from £99/mo, Advanced prevention from £299/mo (checkout controls not live yet), and Enterprise/API is custom. Pricing is indicative — billing is not wired in this release.',
  },
  {
    q: 'Who is Unauth for?',
    a: "US ecommerce merchants processing more than 1,000 orders a month who are seeing refund abuse, INR fraud, or chargeback rates they can't explain with their current tools. If you're smaller, a free audit is still worth running - you might be surprised what's already in your data.",
  },
  {
    q: 'How do I get started?',
    a: 'Export your order history as a CSV and upload it. No account, no card, no integration. You\'ll have a full report in around 20 minutes.',
  },
] as const;

export const FAQ_ALL = [...FAQ_FEATURED, ...FAQ_MORE];

export const HERO_SUBJECT_FIELDS = [
  { label: 'emails', rows: [['customer.a*****@examplemail.com', 'primary · 4 merchants'], ['c.a*****@examplemail.com', '2 merchants'], ['customer_a*****@example.com', '1 merchant'], ['c.a*****@example.com', '1 merchant · low confidence']] },
  { label: 'addresses', rows: [['4421 Larkspur Ln, Apt 3B, P*****', 'primary'], ['4421 Larspur Lane Apt 3B, P*****', 'misspelt · conf 0.98'], ['4421 Larkspur Ln #3B, P*****', 'normalised match']] },
  { label: 'payment', rows: [['Chase Sapphire Reserve •••• 4419', 'primary']] },
  { label: 'devices', rows: [['dev_hmac_71c2a8****', 'iPhone · Safari 17'], ['dev_hmac_9f3b12****', 'iPhone · Chrome 124']] },
  { label: 'phone', rows: [['+44 7*** ***1184', 'primary'], ['+44 7*** ***2209', 'variant · 2 merchants']] },
  { label: 'ip / geo', rows: [['82.***.***.114', 'LDN · AS15169'], ['81.***.***.203', 'MAN · AS15169'], ['91.***.***.77', 'LDN · AS15169']] },
  { label: 'browser', rows: [['Safari 17 · iPhone', 'primary'], ['Chrome 124 · iPhone', 'observed once']] },
  { label: 'delivery', rows: [['DPD · photo proof requested x3', ''], ['Royal Mail · no proof · 1 dispute']] },
] as const;

export function heroSubjectRowDelay(rowIndex: number): string {
  return `${220 + rowIndex * 58}ms`;
}

const heroSubjectRowCount = HERO_SUBJECT_FIELDS.reduce((count, field) => count + field.rows.length, 0);
export const heroMatchedDelay = 220 + heroSubjectRowCount * 58 + 180;
export const heroNetworkDelay = heroMatchedDelay + 170;
export const heroActionDelay = heroNetworkDelay + 5 * 60 + 180;
export const heroFooterDelay = heroActionDelay + 160;

export const COMPARISON_ROWS = [
  { cap: 'Resolves cross-merchant identity', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'linked across multiple merchants' },
  { cap: 'Catches friendly fraud / INR cycles', a: 'no' as const, b: 'partial' as const, c: 'yes' as const, note: 'post-purchase patterns' },
  { cap: 'Surfaces cross-merchant identity patterns', a: 'partial' as const, b: 'no' as const, c: 'yes' as const, note: 'thresholded network signals (k≥3 merchants)' },
  { cap: 'Explainable signals (no black box)', a: 'partial' as const, b: 'no' as const, c: 'yes' as const, note: 'every flag documented' },
  { cap: 'Generates representment-ready case file', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'chargeback evidence packet' },
  { cap: 'Works from CSV upload - no code required', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'start with exports you already have' },
  { cap: 'You keep the decline decision - no black box blocks', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'advises, never auto-blocks' },
  { cap: 'PII stays encrypted - never exposed in transit', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'client-side HMAC-SHA256' },
] as const;

export const COMPARISON_COLUMNS = [
  { name: 'Blocklists', sub: 'Flags repeat emails, IPs, or devices you have already seen', highlight: false, logo: false },
  { name: 'Checkout scoring', sub: 'Scores orders at checkout to catch payment fraud before approval', highlight: false, logo: false },
  { name: 'Unauth', sub: 'Claim confidence, evidence strength, and privacy-preserving network signals after checkout', highlight: true, logo: true },
] as const;

export const SHOPIFY_STEPS = [
  { step: '1', title: 'Connect store', copy: 'Install app and authorize your Shopify store.' },
  { step: '2', title: 'Auto-sync data', copy: 'Orders, fulfillment, and claim context start syncing immediately.' },
  { step: '3', title: 'Review and close cases', copy: 'Fraud team works a live queue with status + evidence links.' },
] as const;

export const FOOTER_STYLES_ESPRESSO = {
  shellBg: t.darkBg,
  shellBorder: t.darkBorder,
  text: 'rgba(245, 239, 229, 0.78)',
  heading: 'rgba(248, 242, 233, 0.96)',
  title: 'rgba(251, 247, 240, 0.98)',
  link: 'rgba(244, 237, 226, 0.9)',
  bottomBg: 'transparent' as const,
};
