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
    copy: 'Start with day-one store context, helpdesk presence, and monthly context credits for occasional payout-case review.',
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
  'Store context, evidence checklists, and merchant rules help teams review genuine cases faster without turning customers into permanent risk records. Unauth provides context, not decisions.';

export const LANDING_UNAUTH_WEDGE_COPY = {
  title: 'Unauth replaces the messy evidence workflow',
  body: 'Stop rebuilding chargeback packets from spreadsheets, screenshots, tracking portals, and order timelines. The product is built on your store data from day one — no waiting for a network.',
};

export const LANDING_PRIVACY_NETWORK_COPY =
  'Privacy-preserving, merchant-scoped records for support payout cases. Raw customer data stays inside the merchant workspace; Unauth surfaces evidence, policy context, and recovery workflow without reusable customer denial lists.';

const FAQ_FEATURED = [
  LANDING_FAQ_ALWAYS_FREE,
  {
    q: 'What exactly is Unauth?',
    a: 'Unauth is a post-purchase payout-control workflow for support teams. It turns refunds, reships, replacements, and chargeback-related tickets into support payout cases with evidence, merchant rules, recommendations, recovery tracking, and outcome reporting.',
  },
  {
    q: "Can you see my customers' data?",
    a: 'Your raw store and helpdesk data is processed inside your merchant workspace. Other merchants never receive your customer records, and payout decisions stay with your team.',
  },
  {
    q: 'Is this GDPR compliant?',
    a: 'Unauth is designed around data minimisation, merchant-scoped processing, and case-level operational records. You should review the data processing documentation with your legal team before using live EU customer data.',
  },
  {
    q: 'Do I need to integrate anything?',
    a: 'Yes: connect one order source and one helpdesk. Unauth backfills available order, ticket, claim, and outcome context from those connected systems.',
  },
  {
    q: 'How long does setup take?',
    a: "Most teams can connect a store and helpdesk in about fifteen minutes. Historical context depends on what those systems expose through their APIs.",
  },
] as const;

const FAQ_MORE = [
  {
    q: 'How is this different from a reusable customer list?',
    a: 'Unauth is designed to answer payout-case questions, not help build customer denial lists. Context is case-scoped, and raw customer records are not exposed between merchants.',
  },
  {
    q: 'What does a confidence grade actually mean?',
    a: 'Evidence confidence reflects how complete the case record is. It does not mean a customer should be approved, rejected, refunded, denied, blocked, or punished.',
  },
  {
    q: 'What do I actually get at the end?',
    a: 'A reviewable support payout case with store context, evidence status, the matched merchant rule, a recommendation, recovery context, and outcome reporting where your plan supports it.',
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
    a: 'Every plan includes the widget, store context, evidence checklist, and payout workflow. Free includes 100 monthly context credits, Pro includes 1,000, Growth includes 5,000, and Scale uses dedicated monthly volume agreed at onboarding.',
  },
  {
    q: 'Who is Unauth for?',
    a: "Ecommerce merchants seeing refund abuse, INR claims, or chargebacks they can't explain with processor-only tools. Connect your store and see your patterns in minutes.",
  },
  {
    q: 'How do I get started?',
    a: 'Connect your store and helpdesk. No credit card required.',
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
  { label: 'delivery', rows: [['Courier proof requested x3', ''], ['Order tracking unavailable · 1 dispute']] },
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
  { cap: 'Creates support payout cases from tickets', a: 'no' as const, b: 'partial' as const, c: 'yes' as const, note: 'helpdesk-native workflow' },
  { cap: 'Tracks refunds, reships, and INR cycles', a: 'no' as const, b: 'partial' as const, c: 'yes' as const, note: 'post-purchase payout context' },
  { cap: 'Surfaces evidence gaps and recovery routes', a: 'partial' as const, b: 'no' as const, c: 'yes' as const, note: 'evidence checklist + partner rulebook' },
  { cap: 'Explainable signals (no black box)', a: 'partial' as const, b: 'no' as const, c: 'yes' as const, note: 'every flag documented' },
  { cap: 'Generates representment-ready case file', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'chargeback evidence packet' },
  { cap: 'Backfills available context from connected systems', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'store + helpdesk history' },
  { cap: 'You keep the decline decision - no black box blocks', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'advises, never auto-blocks' },
  { cap: 'Context unlocks are case-scoped, not reusable customer surveillance', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'credits unlock review context for a case' },
  { cap: 'PII stays encrypted - never exposed in transit', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'client-side HMAC-SHA256' },
] as const;

export const COMPARISON_COLUMNS = [
  { name: 'Blocklists', sub: 'Flags repeat emails, IPs, or devices you have already seen', highlight: false, logo: false },
  { name: 'Checkout scoring', sub: 'Assesses payment risk before the claim exists', highlight: false, logo: false },
  { name: 'Unauth', sub: 'Payout exposure, evidence strength, merchant rules, and recovery workflow after checkout', highlight: true, logo: true },
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
