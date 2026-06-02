import { t } from './_tokens';

const FAQ_FEATURED = [
  {
    q: 'What exactly is Unauth?',
    a: 'Unauth is a cross-merchant identity resolution platform. We take your order and transaction history, link identities across signals - email, address, card, phone - and tell you which customers have a documented pattern of refund abuse, INR claims, or chargebacks at other stores. We don\'t block orders. We give you the intelligence to make better decisions yourself.',
  },
  {
    q: 'How do you get data from other merchants?',
    a: "Every merchant who runs an audit contributes anonymised, hashed identity signals to the shared graph. Raw customer records remain scoped to the uploading merchant, and cross-merchant matching exposes aggregate k-safe signals rather than another merchant's customer list. You benefit from every other merchant's history, and they benefit from yours.",
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
    a: "Blocklists only flag signals you've already seen - an email or device that caused you a problem before. That catches repeat offenders at your store. Unauth links identities across merchants, so we can surface a customer who has never touched you but has hit five other stores in the last 90 days. You see the threat before it costs you anything.",
  },
  {
    q: 'What does a confidence grade actually mean?',
    a: 'Every identity cluster gets a grade - Definite, Probable, Possible, or Weak - based on how many signals match and how strong those matches are. Definite means high certainty: the same person, across multiple merchants, with a documented abuse pattern. Weak means a partial signal worth watching but not worth acting on yet. You decide what threshold you act on.',
  },
  {
    q: 'What do I actually get at the end?',
    a: 'A full audit report showing every identity cluster found, their confidence grade, the signals that linked them, their abuse history across the network, and a representment-ready case file for any cluster you want to dispute. Everything exportable.',
  },
  {
    q: 'What is a representment-ready case file?',
    a: 'To dispute a chargeback, you need documented evidence of order history and linked identity signals. Unauth generates an identity evidence export automatically - transaction history, cross-merchant match data, confidence grade, and prior-order signal overlap - for you to use in dispute review at your discretion.',
  },
  {
    q: 'Does Unauth block orders automatically?',
    a: 'No, and deliberately so. We believe merchants should keep the decline decision. We surface the intelligence, you decide what to do with it. This also means we never create false positives that cost you a legitimate sale - that is your call to make, not ours.',
  },
  {
    q: 'How does pricing work?',
    a: 'The first audit is free - no card required. Paid plans are based on order volume and cover ongoing monitoring, automatic flagging on new orders, and full API access. Get in touch for a quote based on your volume.',
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
  { cap: 'Surfaces network-known abusers', a: 'partial' as const, b: 'no' as const, c: 'yes' as const, note: 'only surfaces when confirmed across 3+ merchants' },
  { cap: 'Explainable signals (no black box)', a: 'partial' as const, b: 'no' as const, c: 'yes' as const, note: 'every flag documented' },
  { cap: 'Generates representment-ready case file', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'chargeback evidence packet' },
  { cap: 'Works from CSV upload - no code required', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'start with exports you already have' },
  { cap: 'You keep the decline decision - no black box blocks', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'advises, never auto-blocks' },
  { cap: 'PII stays encrypted - never exposed in transit', a: 'no' as const, b: 'no' as const, c: 'yes' as const, note: 'client-side HMAC-SHA256' },
] as const;

export const COMPARISON_COLUMNS = [
  { name: 'Blocklists', sub: 'Flags repeat emails, IPs, or devices you have already seen', highlight: false, logo: false },
  { name: 'Checkout scoring', sub: 'Scores orders at checkout to catch payment fraud before approval', highlight: false, logo: false },
  { name: 'Unauth', sub: 'Finds post-purchase abuse patterns across refunds, INR, and linked stores', highlight: true, logo: true },
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
