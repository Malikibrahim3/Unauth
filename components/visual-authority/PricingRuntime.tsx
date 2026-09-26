import { Children, cloneElement, createElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import PricingVisual from '@/components/visual-authority/generated/Pricing-Clean';
import { BILLABLE_EVENTS, PLANS, PUBLIC_PLAN_IDS, TOP_UP_CREDITS, TOP_UP_PRICE_GBP, type PlanDefinition } from '@/lib/billing/plans';
import { formatNumber, formatMoney } from '@/lib/utils/format';

type Element = ReactElement<{ children?: ReactNode; style?: CSSProperties; href?: string; [key: string]: unknown }>;
const parts = (node: Element): Element[] => Children.toArray(node.props.children).filter(isValidElement) as Element[];
const fill = (node: Element, children: ReactNode, props: Record<string, unknown> = {}) => cloneElement(node, props, children);
const price = (plan: PlanDefinition) => plan.priceGbp === 'custom' ? 'Custom' : formatMoney(plan.priceGbp * 100, plan.currency);
const limit = (value: number | 'custom' | 'unlimited' | 'agreed') => typeof value === 'number' ? formatNumber(value) : 'Agreed';

function planCard(template: Element, plan: PlanDefinition) {
  const [header, metrics, cta] = parts(template);
  const [name, amount, description] = parts(header);
  const [nameLabel] = parts(name);
  const [priceLabel, intervalLabel] = parts(amount);
  const rows = parts(metrics);
  const values = [
    ['Context credits', `${limit(plan.creditsMonthly)}${typeof plan.creditsMonthly === 'number' ? ' a month' : ''}`],
    ['Seats', limit(plan.limits.seats)],
    ['Stores', limit(plan.limits.connectedStores)],
    ['Retention', 'Requires pilot approval'],
    ['Machine API', plan.entitlements.lookup_api ? 'Scoped access' : 'Not included'],
    ['Evidence export', plan.entitlements.evidence_export_raw ? 'Enabled case packs' : 'Enabled case pack only'],
  ];
  return createElement('article', { ...template.props, key: plan.planId, 'data-reference-tag': 'div', 'data-plan-id': plan.planId, 'aria-label': `${plan.name} plan` },
    fill(header, [fill(name, fill(nameLabel, plan.name)), fill(amount, [fill(priceLabel, price(plan)), fill(intervalLabel, plan.priceGbp === 'custom' ? 'reviewed proposal' : 'a month')]), fill(description, plan.description)]),
    fill(metrics, values.map(([label, value], index) => {
      const [labelNode, valueNode] = parts(rows[index]);
      return fill(rows[index], [fill(labelNode, label), fill(valueNode, value, { style: { ...valueNode.props.style, textAlign: 'right' } })], { key: label });
    })),
    createElement('ul', { key: 'features', style: { ...description.props.style, margin: 0, paddingLeft: 16 }, 'aria-label': `${plan.name} features` }, plan.publicFeatures.map(feature => createElement('li', { key: feature }, feature))),
    fill(cta, plan.ctaLabel, { href: `/signup?plan=${plan.planId}` }),
  );
}

export default function PricingRuntime({ requestedPlanUnavailable }: { requestedPlanUnavailable: boolean }) {
  const supplied = PricingVisual() as Element;
  const [nav, hero, grid, example, included, faq, footer] = parts(supplied);
  const [heroCopy, interval] = parts(hero);
  const [headline, lead] = parts(heroCopy);
  const [monthly] = parts(interval);
  const [examplePanel] = parts(example);
  const [exampleIntro, exampleGrid] = parts(examplePanel);
  const intro = parts(exampleIntro);
  const checks = 20;
  const reports = 30;
  const exampleCost = checks * BILLABLE_EVENTS['context.basic'].credits + reports * BILLABLE_EVENTS['evidence.summary'].credits;
  const [includedIntro, includedGrid] = parts(included);
  const includedCopy = parts(includedIntro);
  const eventTemplate = parts(includedGrid)[0];
  const eventParts = parts(eventTemplate);
  const faqCopy = [
    ['When does a credit count?', 'Only successful billable work consumes credits. Retrying the same recorded logical operation is deduplicated; a new check or a newly generated report is a new operation. Opening a case is not a lifetime credit.'],
    ['What happens at the limit?', `Existing reads and decisions remain available. Store context checks can continue under the soft cap; reports require sufficient credits and network/API context may be paused or fall back to store context. Eligible paid plans can request ${formatNumber(TOP_UP_CREDITS)} credits for £${TOP_UP_PRICE_GBP}. No automatic overage invoice is promised.`],
    ['Do credits roll over?', 'Monthly credits reset with the billing cycle. Top-ups follow the account balance shown in Billing; no rollover or expiry promise is inferred here. Plan and balance changes require the applicable server and provider confirmation.'],
    ['What is included?', 'Features and operating limits are listed above. Exports depend on the plan and enabled control. Retention, security and service-level terms require approval; Enterprise is a reviewed proposal.'],
  ];
  return createElement('main', { ...supplied.props, 'data-reference-tag': 'div', 'data-surface-id': 'pricing' },
    nav,
    fill(hero, [fill(heroCopy, [createElement('h1', { ...headline.props, key: 'headline', 'data-reference-tag': 'div', style: { ...headline.props.style, margin: 0 } }, 'Plans for evidence-backed operations'), fill(lead, 'Monthly plans include context credits for successful checks and evidence reports. Reading records, comparing resolutions and previewing policy do not introduce a new charge. Prices are in GBP, excluding VAT.')]), fill(interval, fill(monthly, 'Monthly · GBP'))]),
    requestedPlanUnavailable ? <section key="unavailable" data-state-id="pricing-plan-unavailable" role="status" style={{ margin: '0 40px 18px', padding: '11px 14px', borderRadius: 10, background: '#fdf0e6', color: '#b0431a', font: "400 12px/1.5 'Inter',sans-serif" }}><strong>Plan unavailable. </strong>The requested plan is not in the current catalogue. No plan selection, subscription change, redirect, or saved intent occurred.</section> : null,
    fill(grid, PUBLIC_PLAN_IDS.map((id, index) => planCard(parts(grid)[index], PLANS[id]))),
    fill(example, fill(examplePanel, [fill(exampleIntro, [fill(intro[0], 'ILLUSTRATIVE CREDIT EXAMPLE'), fill(intro[1], `${checks} store checks + ${reports} evidence reports`), fill(intro[2], `${checks} × ${BILLABLE_EVENTS['context.basic'].credits} + ${reports} × ${BILLABLE_EVENTS['evidence.summary'].credits} = ${exampleCost} credits for distinct successful operations. This is an example, not typical merchant usage.`)]), fill(exampleGrid, PUBLIC_PLAN_IDS.map((id, index) => {
      const plan = PLANS[id]; const template = parts(exampleGrid)[index]; const cells = parts(template);
      return fill(template, [fill(cells[0], plan.name), fill(cells[1], `${limit(plan.creditsMonthly)} credits`), fill(cells[2], !plan.entitlements.evidence_export_raw ? 'Standalone reports not included' : typeof plan.creditsMonthly !== 'number' ? 'Confirm agreed allowance' : plan.creditsMonthly < exampleCost ? `${exampleCost - plan.creditsMonthly} credits beyond allowance` : `${formatNumber(plan.creditsMonthly - exampleCost)} credits remain`), fill(cells[3], price(plan))], { key: id });
    }))])),
    fill(included, [fill(includedIntro, [fill(includedCopy[0], 'What consumes credits'), fill(includedCopy[1], 'Charges follow the successful operation and its recorded identity. Availability and entitlement gates still apply.')]), fill(includedGrid, Object.values(BILLABLE_EVENTS).map(event => fill(eventTemplate, [fill(eventParts[0], `${event.label} · ${event.credits} credit${event.credits === 1 ? '' : 's'}`), fill(eventParts[1], event.chargingRule)], { key: event.id })))]),
    fill(faq, parts(faq).map((template, index) => { const cells = parts(template); return fill(template, [fill(cells[0], faqCopy[index][0]), fill(cells[1], faqCopy[index][1])], { key: index }); })),
    fill(footer, parts(footer).map((node, index, nodes) => index === nodes.length - 1 ? fill(node, 'Commercial terms above come from the current plan catalogue. The credit example is illustrative; product demonstrations use fictional records.') : node)),
  );
}
