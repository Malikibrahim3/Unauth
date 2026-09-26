'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type CSSProperties } from 'react';
import { DEMO_LAUNCH_STORY } from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import type { BreakdownDetail as Detail } from './LandingBreakdowns';
import { LandingDetailModal } from './LandingDetailModal';
// Imported here (not only inside the lazy module) so the breakdown styles ship with the page:
// markup and styles can never arrive out of step, and there is no unstyled flash on first open.
import breakdownStyles from './landingBreakdown.module.css';

// The breakdown artefacts stay out of the first load: they are fetched once the page is idle,
// or sooner when a visitor reaches for an arrow (hover, focus or tap).
const loadBreakdowns = () => import('./LandingBreakdowns');
let idlePrefetchScheduled = false;
function scheduleIdlePrefetch() {
  if (idlePrefetchScheduled || typeof window === 'undefined') return;
  idlePrefetchScheduled = true;
  const run = () => { void loadBreakdowns(); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 5000 });
  else setTimeout(run, 2500);
}
const LandingBreakdown = dynamic(() => loadBreakdowns().then((module) => module.LandingBreakdown), {
  ssr: false,
  loading: () => <div className={breakdownStyles.breakdown} aria-busy="true"><div className={breakdownStyles.stage} style={{ minHeight: 260 }} /><div className={breakdownStyles.stage} style={{ minHeight: 180, marginTop: 16 }} /></div>,
});

/** Card titles as printed on the page, so each dialog repeats its card's heading exactly. */
const HEADINGS: Record<string, string> = {
  'The claim': 'The claim.',
  'The records': 'The records.',
  'The decision': 'The decision.',
  'Your rules': 'Your rules.',
  'Your evidence': 'Your evidence.',
  'Your gates': 'Your gates.',
  'Customer refunded': 'Customer refunded.',
  'Later financial result': 'Later financial result.',
  'The next step': 'The next step.',
  'A better next decision': 'A better next decision.',
  'Familiar tools': 'Familiar tools.',
  'Already refunded': 'Already refunded?',
  'Every decision': 'Every decision.',
};

const arrowButton: CSSProperties = { flex: 'none', display: 'grid', placeItems: 'center', width: '44px', height: '44px', padding: '0', border: '1px solid #e4e3e0', borderRadius: '6px', background: '#ffffff', color: '#1c1f23', cursor: 'pointer' };

const launch = DEMO_LAUNCH_STORY;
const refund = formatMoney(launch.customerResolution.amount, launch.currency);
const threshold = formatMoney(launch.customerPolicy.proposedRefundReview.amount, launch.currency);
const recovery = formatMoney(launch.money.recovered, launch.currency);
const unrecovered = formatMoney(launch.money.unrecoveredRefundBalance, launch.currency);

/** Reading copy for each landing card's corner button. Fictional sample facts only. */
const DETAILS: Record<string, Detail> = {
  // The evidence section's three cards share the former "whole picture" facts.
  'The claim': { subtitle: 'What was ordered and reported.', lead: 'One missing order: a customer to refund and a loss to recover.', facts: [
    ['Customer request', `One ${launch.item.toLowerCase()}, ${launch.sku}, quantity 1. The customer asks for ${refund} because the order never arrived. No earlier refund is recorded.`],
    ['What the customer reported', 'Nothing received · full refund requested.'],
  ] },
  'The records': { subtitle: 'Evidence and gaps together.', lead: '3PL and carrier records establish custody and loss.', facts: [
    ['What left the warehouse', `Packed ${launch.evidence.packedAt} and handed to the carrier ${launch.evidence.handedToCarrierAt}. Handover confirmed.`],
    ['What the carrier record shows', `Collected ${launch.evidence.collectedAt}, no delivery scan, loss confirmed ${launch.evidence.lossConfirmedAt}. Evidence supports a carrier claim.`],
    ['3PL and carrier', `The 3PL handed the parcel to the carrier on ${launch.evidence.collectedAt}. The carrier confirmed loss after collection on ${launch.evidence.lossConfirmedAt}. Those records establish custody and loss; the published agreement determines the recovery route.`],
  ] },
  'The decision': { subtitle: 'Two separate outcomes.', lead: 'Your policy combines evidence before it selects an outcome.', facts: [
    ['Your policy applied', `All required conditions match, so Unauth issues the ${refund} refund automatically and ${launch.customerResolution.provider} confirms it. Agreement ${launch.recoveryAgreement.name} supports a separate claim up to ${recovery}, blocked until ${launch.recovery.owner} confirms the claimant and channel.`],
    ['Matched conditions', `The 3PL handed the parcel over, the carrier confirms the loss, no earlier refund is recorded and ${refund} is not above your ${threshold} review threshold. Together they select a full refund and a separate carrier recovery assessment.`],
    ['Other routes', 'An earlier or reserved refund on the same item blocks a duplicate automatic payout. Missing or contradictory evidence and policy-defined exceptions go to a person. A confirmed 3PL packing error opens a 3PL recovery route only when the applicable agreement supports it.'],
  ] },
  // The policy section's first two cards: what Unauth may apply, and what it may use.
  'Your rules': { subtitle: 'Approved and published by you.', lead: 'Uploads produce reviewable candidates. Only the exact version you publish can decide a case.', facts: [
    ['Policies and agreements', 'Unauth extracts candidate rules with source clauses from uploaded documents. You review their scope and effects before publishing the exact version Unauth may apply.'],
    [launch.customerPolicy.name, `Published. Refunds run automatically when every required condition passes; refunds above ${threshold} go to review.`],
    [launch.recoveryAgreement.name, `Clauses reviewed and published. It supports a separate claim up to ${recovery}.`],
  ] },
  'Your evidence': { subtitle: 'What Unauth can use.', lead: 'Combine available evidence into the conditions that govern each outcome.', facts: [
    ['Your control', 'You choose the evidence requirements, thresholds and action mode. Missing evidence and exceptions go to your team.'],
  ] },
  'Your gates': { subtitle: 'Applied to the evidence.', lead: 'How the gate reaches a decision.', facts: [
    ['The rule', `When a carrier confirms loss after collection, the 3PL handover is present, the proposed refund is not above ${threshold}, no earlier refund exists and every other required check passes, Unauth issues the ${refund} refund automatically and assesses a separate claim up to ${recovery}. Otherwise ${launch.recovery.owner} receives the exact blocker.`],
    ['Evaluated together', `All required gates apply before an outcome is selected. Refunds above ${threshold} go to review; exactly ${threshold} can run automatically only when every other condition passes. You choose observe-only, approval or automatic for each action. Your AI support agent passes the same gates.`],
  ] },
  'Not received': { subtitle: launch.reference, lead: 'No parcel. A refund and a loss to recover.', facts: [
    ['Evidence', `3PL handover confirmed, carrier loss confirmed, no earlier refund, ${refund} not above the review threshold.`],
    ['Decision', `Refund ${refund} issued automatically. A separate claim up to ${recovery} waits on a confirmed claimant and channel, owned by ${launch.recovery.owner}.`],
  ] },
  'Wrong item': { subtitle: 'SAMPLE-248', lead: 'Refund due. Warehouse recovery capped.', facts: [
    ['Evidence', 'The packing photo shows the wrong item. The 3PL acknowledged the packing error. No earlier refund is recorded.'],
    ['Decision', `Refund ${formatMoney(24800, launch.currency)}. Recovery from the warehouse is limited to the ${formatMoney(15000, launch.currency)} agreement ceiling.`],
  ] },
  'Damaged item': { subtitle: 'SAMPLE-096', lead: 'Customer left with a broken item.', facts: [
    ['Evidence', 'The damage photo matches the order, no prior concession exists and stock is available.'],
    ['Decision', 'Send a replacement of the same item.'],
  ] },
  'Customer refunded': { subtitle: 'Recovery stays owned.', lead: 'The customer is refunded; the carrier claim runs separately.', facts: [
    ['Evidence pack', 'The order, handover scan, collection scan and loss confirmation are assembled into the claim. Submission is blocked until the claimant and channel are confirmed.'],
    ['Ownership', `${launch.recovery.owner} owns the blocker. If it remains unresolved, the next review is ${launch.recovery.reviewIfUnresolved}; once the route is confirmed, Unauth owns follow-up through rejection, short payment, reconciliation or an authorised end to pursuit.`],
  ] },
  'Later financial result': { subtitle: 'Received, matched and reconciled.', lead: 'Approval and payment remain separate stages.', facts: [
    ['Chronology', 'The route was confirmed and the claim submitted on 11 Sep. Approval was recorded on 18 Sep, payment was received on 23 Sep, then matched and reconciled on 24 Sep.'],
    ['Result', `${refund} was refunded, ${recovery} was recovered and ${unrecovered} of the refund remains unrecovered. This balance is not total economic loss or profit.`],
  ] },
  'The next step': { subtitle: 'With a name beside it.', lead: 'Keep open work in view.', facts: [
    ['What needs attention', 'Missing evidence, a claim to prepare, a response to review or a payment to check.'],
    ['Who owns it', 'A named teammate and the linked case keep the next action accountable.'],
  ] },
  'A better next decision': { subtitle: 'Preview before you publish.', lead: 'Check a rule change before you use it.', facts: [
    ['Preview', 'See which cases and amounts a proposed threshold would affect. A preview does not change your live rules.'],
  ] },
  'Familiar tools': { subtitle: 'One connected case.', lead: 'Keep the tools your team already knows.', facts: [
    ['Records', 'Store, helpdesk, 3PL and carrier records come together on one case. Documents and imports are merchant supplied.'],
    ['Policies and agreements', 'Unauth extracts candidate rules with source clauses from uploaded documents. You review their scope and effects before publishing the exact version Unauth may apply.'],
  ] },
  'Already refunded': { subtitle: 'There may still be a route.', lead: 'Older refunds can still hold recoverable money.', facts: [
    ['Review', 'Unauth checks past refunds for evidence and agreement terms that still allow a claim.'],
  ] },
  'Every decision': { subtitle: 'With its reasons.', lead: 'Each decision keeps its evidence and policy.', facts: [
    ['History', 'Evidence, the matched policy, the decision and each recovery step are recorded in order with who acted.'],
  ] },
};

export function CardExpand({ id, style }: { id: string; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  const detail = DETAILS[id];
  const prefetch = () => { void loadBreakdowns(); };
  useEffect(scheduleIdlePrefetch, []);
  return <>
    <button type="button" aria-label={`Details: ${id}`} aria-haspopup="dialog" data-arrow style={{ ...arrowButton, ...style }} onPointerEnter={prefetch} onFocus={prefetch} onTouchStart={prefetch} onClick={() => setOpen(true)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>
    </button>
    {detail && <LandingDetailModal open={open} onClose={() => setOpen(false)} title={HEADINGS[id] ?? id} subtitle={detail.subtitle}>
      <LandingBreakdown id={id} detail={detail} />
    </LandingDetailModal>}
  </>;
}
