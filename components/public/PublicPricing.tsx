'use client';

import { useState } from 'react';
import {
  annualDiscountPercent,
  annualFreeMonths,
  annualMonthlyEquivalentMinor,
  annualSavingGbp,
  PLANS,
  PUBLIC_PLAN_IDS,
  type BillingInterval,
  type PlanDefinition,
} from '@/lib/billing/plans';
import { formatMoney, formatNumber } from '@/lib/utils/format';
import { PublicFAQ } from './PublicInteractions';
import { PublicFooter, PublicLink, PublicNav, PublicNotice } from './PublicUI';
import styles from './public.module.css';

const money = (pounds: number) => {
  const formatted = formatMoney(pounds * 100, 'GBP');
  return Number.isInteger(pounds) ? formatted.replace(/\.00$/, '') : formatted;
};
const customOrMoney = (value: number | 'custom') => value === 'custom' ? 'Custom' : money(value);
const annualMonthlyEquivalent = (plan: PlanDefinition) => {
  const equivalent = annualMonthlyEquivalentMinor(plan);
  return equivalent != null
    ? formatMoney(equivalent, plan.currency)
    : 'Custom';
};

function planHref(planId: string, interval: BillingInterval) {
  return `/signup?plan=${encodeURIComponent(planId)}&billingInterval=${interval}`;
}

function selectedPrice(plan: PlanDefinition, interval: BillingInterval) {
  if (plan.priceGbp === 'custom') return { amount: 'Custom', cadence: 'agreed annual and monthly terms' };
  if (interval === 'annual' && typeof plan.annualPriceGbp === 'number') {
    return { amount: annualMonthlyEquivalent(plan), cadence: 'per month, billed annually' };
  }
  return { amount: money(plan.priceGbp), cadence: 'per month, billed monthly' };
}

function intervalOffer(plan: PlanDefinition, interval: BillingInterval) {
  const saving = annualSavingGbp(plan);
  if (saving == null || typeof plan.priceGbp !== 'number' || typeof plan.annualPriceGbp !== 'number') {
    return interval === 'annual' ? 'Annual payment and volume agreed with your team.' : 'Monthly payment and volume agreed with your team.';
  }
  if (interval === 'annual') {
    const discount = annualDiscountPercent(plan);
    return `${money(plan.annualPriceGbp)} paid upfront each year · save ${money(saving)}${discount == null ? '' : ` (${discount}% off)`}.`;
  }
  return `Annual option: ${annualMonthlyEquivalent(plan)}/month, paid as ${money(plan.annualPriceGbp)}/year · save ${money(saving)}.`;
}

function annualTermsSentence(plan: PlanDefinition) {
  const discount = annualDiscountPercent(plan);
  const freeMonths = annualFreeMonths(plan);
  if (discount == null || freeMonths == null) return `${plan.name} annual terms are agreed.`;
  return `${plan.name} annual price includes a ${discount}% discount, equivalent to ${freeMonths} months free.`;
}

function capacityValue(value: number | 'custom' | null | undefined) {
  if (typeof value === 'number') return formatNumber(value);
  return value === 'custom' ? 'Agreed volume' : 'Agreed';
}

const comparisonRows: { label: string; value: (plan: PlanDefinition) => string; emphasized?: boolean }[] = [
  { label: 'Pay monthly', value: (plan) => plan.priceGbp === 'custom' ? 'Custom' : `${money(plan.priceGbp)}/month` },
  { label: 'Pay annually: effective monthly price', value: (plan) => {
    const equivalent = annualMonthlyEquivalent(plan);
    return equivalent === 'Custom' ? equivalent : `${equivalent}/month`;
  }, emphasized: true },
  { label: 'Annual payment upfront', value: (plan) => customOrMoney(plan.annualPriceGbp ?? 'custom') },
  { label: 'Cost of 12 monthly payments', value: (plan) => typeof plan.priceGbp === 'number' ? money(plan.priceGbp * 12) : 'Custom' },
  { label: 'Annual saving', value: (plan) => { const saving = annualSavingGbp(plan); return saving == null ? 'Agreed' : money(saving); }, emphasized: true },
  { label: 'New incidents/month', value: (plan) => capacityValue(plan.limits.incidentsPerMonth) },
  { label: 'Connected stores', value: (plan) => typeof plan.limits.connectedStores === 'number' ? formatNumber(plan.limits.connectedStores) : 'Agreed' },
  { label: 'Complete core workflow', value: () => 'Included' },
];

export default function PublicPricing({ requestedPlanUnavailable }: { requestedPlanUnavailable: boolean }) {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const coreFreeMonths = annualFreeMonths(PLANS.core);
  const scaleFreeMonths = annualFreeMonths(PLANS.scale_2026);
  const annualFreeMonthsLabel = coreFreeMonths != null && coreFreeMonths === scaleFreeMonths
    ? `${coreFreeMonths} months free on Core & Scale`
    : 'Annual payment available';
  const annualTermsCopy = `${annualTermsSentence(PLANS.core)} ${annualTermsSentence(PLANS.scale_2026)} Enterprise terms are agreed.`;
  const annualSavingsAnswer = [PLANS.core, PLANS.scale_2026].map((plan) => {
    const saving = annualSavingGbp(plan);
    const discount = annualDiscountPercent(plan);
    const freeMonths = annualFreeMonths(plan);
    if (saving == null || typeof plan.priceGbp !== 'number' || typeof plan.annualPriceGbp !== 'number') return null;
    const terms = discount == null || freeMonths == null ? '' : ` (${discount}% off, equivalent to ${freeMonths} months free)`;
    return `${plan.name} is ${money(plan.annualPriceGbp)} instead of ${money(plan.priceGbp * 12)} across 12 monthly payments, saving ${money(saving)}${terms}.`;
  }).filter((sentence): sentence is string => sentence != null).join(' ');

  return <>
    <PublicNav />
    <main id="public-content" data-surface-id="pricing" className={`${styles.container} ${styles.pricingPage}`}>
      <header className={styles.pricingHero}>
        <h1 className={styles.display}>A complete workflow. Capacity that fits.</h1>
        <p className={styles.lead}>Evidence, merchant decisions and recovery follow-through are included on every plan. Choose monthly or annual payment for the capacity your operation needs.</p>
        <p className={styles.pricingTerms}>Prices are in GBP and exclude VAT. {annualTermsCopy}</p>
      </header>

      {requestedPlanUnavailable && <div className={styles.pricingNotice} data-state-id="pricing-plan-unavailable">
        <PublicNotice>The requested plan is not in the current catalogue. No selection, subscription change or saved intent occurred.</PublicNotice>
      </div>}

      <section aria-label="Available plans" className={styles.pricingPlans}>
        <div className={styles.intervalPicker} role="group" aria-label="Payment frequency">
          <button type="button" aria-pressed={interval === 'monthly'} onClick={() => setInterval('monthly')}>Pay monthly</button>
          <button type="button" aria-pressed={interval === 'annual'} onClick={() => setInterval('annual')}>Pay annually <span>{annualFreeMonthsLabel}</span></button>
        </div>
        <div className={styles.planGrid} data-source-construction="loop-pricing-cards">
          {PUBLIC_PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            const chosenPrice = selectedPrice(plan, interval);
            return <article key={id} className={`${styles.plan} ${plan.featured ? styles.planFeatured : ''}`} data-plan-id={id} aria-label={`${plan.name} plan`}>
              <div className={styles.planHead}>
                <h2>{plan.name}</h2>
                <p className={styles.planDescription}>{plan.description}</p>
                <div className={styles.planPrice}>
                  <strong>{chosenPrice.amount}</strong>
                  <span>{chosenPrice.cadence}</span>
                </div>
                <p className={styles.planAnnualDetails}>{intervalOffer(plan, interval)}</p>
                <PublicLink href={planHref(id, interval)} secondary={!plan.featured}>{plan.ctaLabel}</PublicLink>
              </div>
              <div className={styles.planIncluded}>
                <p>Included in this plan</p>
                <ul>{plan.publicFeatures.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              </div>
            </article>;
          })}
        </div>
        <p className={styles.pricingUnderCards}>Selecting a plan records a request; it does not activate a subscription or charge a payment method. Plan limits take effect only after terms and billing activation are confirmed.</p>
      </section>

      <section className={styles.pricingSection} aria-labelledby="pricing-compare-heading">
        <div className={styles.pricingSectionIntro}>
          <h2 id="pricing-compare-heading" className={styles.heading}>Compare the full annual cost.</h2>
          <p className={styles.lead}>Core and Scale annual plans are paid upfront. The annual saving is shown beside both payment options.</p>
        </div>
        <div className={styles.tableScroll} role="region" aria-label="Plan and annual price comparison, scroll horizontally if needed" tabIndex={0}>
          <table className={styles.comparison} data-source-construction="loop-pricing-comparison">
            <caption>Current prices and included capacity. Annual figures exclude VAT.</caption>
            <thead><tr><th scope="col">Plan</th>{PUBLIC_PLAN_IDS.map((id) => <th scope="col" key={id}>{PLANS[id].name}</th>)}</tr></thead>
            <tbody>{comparisonRows.map((row) => <tr key={row.label} className={row.emphasized ? styles.priceEmphasis : undefined}>
              <th scope="row">{row.label}</th>{PUBLIC_PLAN_IDS.map((id) => <td key={id}>{row.value(PLANS[id])}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <p className={styles.pricingUnderCards}>Enterprise pricing, annual terms, incident volume and store count are agreed for each operation.</p>
      </section>

      <section className={`${styles.pricingSection} ${styles.pricingFaq}`} aria-labelledby="pricing-faq-heading">
        <h2 id="pricing-faq-heading" className={styles.heading}>Pricing questions.</h2>
        <PublicFAQ items={[
          { question: 'How does the annual saving work?', answer: `Annual payment is made upfront. ${annualSavingsAnswer}` },
          { question: 'Can I pay monthly?', answer: `Yes. Core is ${customOrMoney(PLANS.core.priceGbp)} per month and Scale is ${customOrMoney(PLANS.scale_2026.priceGbp)} per month. Enterprise monthly terms are agreed with your team.` },
          { question: 'What does every plan include?', answer: 'The complete core workflow is included. Monthly incident capacity and connected-store coverage depend on the plan.' },
          { question: 'Does choosing a plan start billing?', answer: 'No. The selected plan and payment frequency are saved as a request. A subscription changes only after the terms are agreed and billing confirmation is recorded.' },
          { question: 'How is Enterprise priced?', answer: 'Enterprise pricing, annual terms, incident volume and connected stores are agreed for your operation.' },
        ]} />
      </section>
    </main>
    <PublicFooter />
  </>;
}
