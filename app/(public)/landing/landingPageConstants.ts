import { t } from './_tokens';
import {
  LANDING_BILLING_TRANSPARENCY,
  LANDING_FAQ_ALWAYS_FREE,
  LANDING_PRICING_TIERS,
  LANDING_TIER_CHART,
} from '@/lib/billing/landingTierChart';

export {
  LANDING_BILLING_TRANSPARENCY,
  LANDING_FAQ_ALWAYS_FREE,
  LANDING_PRICING_TIERS,
  LANDING_TIER_CHART,
};

export const LANDING_PRODUCT_LADDER = LANDING_TIER_CHART.filter(
  (tier) => tier.key !== 'enterprise',
).map((tier) => ({
  tier: tier.name,
  title: tier.tagline,
  body: tier.features.slice(0, 3).join(' · '),
  future: false,
}));

export const LANDING_UPGRADE_LADDER = [
  {
    tier: 'Free',
    copy: 'Join the network with useful day-one store context, helpdesk presence, and monthly context credits for occasional case review.',
  },
  {
    tier: 'Pro',
    copy: 'Review claims regularly inside support with deeper context, more credits, evidence summaries, and extended history.',
  },
  {
    tier: 'Growth',
    copy: 'Support high-volume claim review with multi-store coverage, longer history, advanced reporting, and more monthly credits.',
  },
  {
    tier: 'Scale',
    copy: 'Custom context infrastructure for case-scoped API or bulk workflows, security review, and embedded operations.',
  },
] as const;

export const LANDING_GOOD_CUSTOMERS_COPY =
  'Store context and pseudonymous network signals help teams review genuine cases faster without turning customers into permanent risk records. Unauth provides context, not decisions.';

export const LANDING_UNAUTH_WEDGE_COPY = {
  title: 'Unauth replaces the messy evidence workflow',
  body: 'Stop rebuilding chargeback packets from spreadsheets, screenshots, tracking portals, and order timelines. The product is built on your store data from day one — no waiting for a network.',
};

export const LANDING_PRIVACY_NETWORK_COPY =
  'Privacy-preserving, merchant-scoped records and thresholded pseudonymous network intelligence (k-anonymity N≥3). Other merchants’ raw customer data is never exposed — only linked patterns strong enough to meet network thresholds.';

const FAQ_FEATURED = [
  LANDING_FAQ_ALWAYS_FREE,
  {
    q: 'What exactly is Unauth?',
    a: 'Unauth is a context and intelligence network for claim and customer review. We link pseudonymous signals, surface case context for merchant review, and help support teams assemble evidence without making refund, fulfilment, account, or eligibility decisions.',
  },
  {
    q: 'How do you get data from other merchants?',
    a: "Merchants contribute anonymised, hashed identity signals to the shared identity network. Raw customer records stay merchant-scoped; cross-merchant views use aggregate, thresholded signals — not another store's customer list.",
  },
  {
    q: "Can you see my customers' data?",
    a: "Your raw upload is processed inside your merchant workspace and is not exposed to other merchants. Network comparison uses HMAC-SHA256 identifiers, k-anonymity gates, and masked outputs so reports show relevant pseudonymous patterns without revealing another merchant's customer records.",
  },
  {
    q: 'Is this GDPR compliant?',
    a: 'Unauth is designed around data minimisation, merchant-scoped processing, and hashed network signals. You should review the data processing documentation with your legal team before using live EU customer data.',
  },
  {
    q: 'Do I need to integrate anything?',
    a: 'For live monitoring, yes: connect one order source and one helpdesk. CSV import is available for historical backfill or evaluation if you are not ready to connect yet.',
  },
  {
    q: 'How long does an audit take?',
    a: "Around 20 minutes for most datasets. Files with 50,000+ orders may take slightly longer. You don't need to stay on the page — results will be ready when you return.",
  },
] as const;

const FAQ_MORE = [
  {
    q: 'How is this different from a reusable customer list?',
    a: "Unauth is designed to answer case questions, not help build customer denial lists. Context unlocks are case-scoped, network data is pseudonymous, and raw cross-merchant customer records are never exposed.",
  },
  {
    q: 'What does a confidence grade actually mean?',
    a: 'Identity confidence reflects how strongly available data points appear linked. It does not mean a customer should be approved, rejected, refunded, denied, blocked, or punished.',
  },
  {
    q: 'What do I actually get at the end?',
    a: 'A reviewable record of store context, pseudonymous network context when available, and case-level evidence summaries or exports where your plan supports them.',
  },
  {
    q: 'What is chargeback evidence assembly?',
    a: 'We assemble evidence and flag readiness for representment — transaction history, prior-order signal overlap, and missing-field detection. Full CE 3.0 qualification needs checkout-time data for some cases. Merchants use outputs at their discretion; outcomes are not guaranteed.',
  },
  {
    q: 'Does Unauth make fulfilment decisions automatically?',
    a: 'No. Unauth provides contextual information for merchant review and does not make refund, fulfilment, account, or customer eligibility decisions.',
  },
  {
    q: 'How does pricing work?',
    a: 'Every plan includes the widget, store context, and pseudonymous network context. Free includes 100 monthly context credits (baseline access aligned with network participation), Pro includes 1,000, Growth includes 5,000, and Scale uses dedicated monthly volume agreed at onboarding.',
  },
  {
    q: 'Who is Unauth for?',
    a: "Ecommerce merchants seeing refund abuse, INR claims, or chargebacks they can't explain with processor-only tools. Connect your store and see your patterns in minutes.",
  },
  {
    q: 'How do I get started?',
    a: 'Connect your store or upload a CSV. No credit card required.',
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
  { cap: 'CSV backfill available when integrations are not connected', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'historical import, optional' },
  { cap: 'You keep the decline decision - no black box blocks', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'advises, never auto-blocks' },
  { cap: 'Context unlocks are case-scoped, not reusable customer surveillance', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'credits unlock review context for a case' },
  { cap: 'PII stays encrypted - never exposed in transit', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'client-side HMAC-SHA256' },
] as const;

export const COMPARISON_COLUMNS = [
  { name: 'Blocklists', sub: 'Flags repeat emails, IPs, or devices you have already seen', highlight: false, logo: false },
  { name: 'Checkout scoring', sub: 'Scores orders at checkout to catch payment fraud before approval', highlight: false, logo: false },
  { name: 'Unauth', sub: 'Claim confidence, evidence strength, and privacy-preserving network signals after checkout', highlight: true, logo: true },
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
