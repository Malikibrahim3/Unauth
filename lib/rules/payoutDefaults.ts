/**
 * Default merchant *payout-policy* rules.
 *
 * These replace the legacy risk-score band defaults (DEFAULT_RISK_CONTROLS) as
 * the merchant-facing starting point. They are expressed purely in payout-case
 * facts — claim type, requested action, payout exposure, evidence presence,
 * delivery proof, and recoverability — never identity/network/risk-score bands.
 *
 * Rules still evaluate to the internal approve | manual_review | deny action;
 * lib/payouts/recommendation.ts maps that, plus case context, into the
 * operational next-action vocabulary (approve_payout, request_customer_evidence,
 * ask_carrier_for_clarification, open_recovery, deny_under_policy, …).
 *
 * Ordered most-specific first: the engine evaluates by ascending priority and
 * the first matching rule wins, so deny/evidence policies precede the broader
 * exposure-band catch-alls.
 */
import type { RuleAction, RuleCondition } from '@/lib/rules-engine';

export interface DefaultPayoutRule {
  name: string;
  description: string;
  conditions: RuleCondition[];
  action: RuleAction;
}

export const DEFAULT_PAYOUT_RULES: DefaultPayoutRule[] = [
  {
    name: 'Delivered with proof of delivery',
    description:
      'Item-not-received case where the carrier shows delivered with proof of delivery. Recommend deny under policy.',
    conditions: [
      { id: 'pod-claim-type', field: 'claim_type', operator: 'eq', value: 'item_not_received' },
      { id: 'pod-delivered', field: 'delivery_status', operator: 'eq', value: 'delivered' },
      { id: 'pod-present', field: 'has_proof_of_delivery', operator: 'eq', value: true },
    ],
    action: 'deny',
  },
  {
    name: 'Missing delivery evidence',
    description:
      'Item-not-received case with no proof of delivery on file. Recommend manual review and ask for more evidence before payout.',
    conditions: [
      { id: 'inr-claim-type', field: 'claim_type', operator: 'eq', value: 'item_not_received' },
      { id: 'inr-no-pod', field: 'has_proof_of_delivery', operator: 'eq', value: false },
    ],
    action: 'manual_review',
  },
  {
    name: 'Damaged item missing customer evidence',
    description:
      'Damaged-item case with no customer evidence attached. Recommend manual review and ask for a damage/packaging photo before replacement.',
    conditions: [
      { id: 'dmg-claim-type', field: 'claim_type', operator: 'eq', value: 'damaged' },
      { id: 'dmg-no-evidence', field: 'has_customer_evidence', operator: 'eq', value: false },
    ],
    action: 'manual_review',
  },
  {
    name: 'Chargeback-related case',
    description: 'Chargeback-related payout case. Recommend manual review and escalate for dispute handling.',
    conditions: [{ id: 'cb-claim-type', field: 'claim_type', operator: 'eq', value: 'chargeback' }],
    action: 'manual_review',
  },
  {
    name: 'Recoverable partner loss',
    description:
      'Case classified as recoverable. Recommend approving the payout and opening a recovery case against the responsible partner.',
    conditions: [{ id: 'rec-recoverable', field: 'recoverability', operator: 'eq', value: 'recoverable' }],
    action: 'approve',
  },
  {
    name: 'High-value payout requires manual review',
    description: 'Payout exposure at or above £100. Recommend manual review before money leaves the business.',
    conditions: [{ id: 'high-exposure', field: 'amount_at_risk', operator: 'gte', value: 100 }],
    action: 'manual_review',
  },
  {
    name: 'Low-value request',
    description: 'Low payout exposure at or below £25. Recommend approving the payout to keep support fast.',
    conditions: [{ id: 'low-exposure', field: 'amount_at_risk', operator: 'lte', value: 25 }],
    action: 'approve',
  },
];
