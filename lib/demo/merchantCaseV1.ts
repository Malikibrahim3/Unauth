export type DemoCaseStep = 'incoming' | 'evidence' | 'recommendation' | 'decision' | 'recovery';

export const MERCHANT_CASE_V1 = {
  version: 'merchant-case-v1',
  merchant: 'Northstar Outfitters',
  caseReference: 'CASE-DEMO-1048',
  title: 'Missing item reported after delivery scan',
  summary: 'A customer says one item was missing from a delivered order. The case has enough context to review, but the evidence is not complete enough to decide automatically.',
  order: {
    reference: 'Order 1048',
    value: '£128.00',
    item: 'Canvas jacket · 1 of 2 items reported missing',
  },
  customer: {
    reference: 'Synthetic customer 07',
    history: '2 prior support cases in 120 days',
  },
  sources: [
    { label: 'Commerce', fact: 'Order value £128.00; two items fulfilled', time: '09:12 UTC' },
    { label: 'Helpdesk', fact: 'Customer reports one item missing from the parcel', time: '09:18 UTC' },
    { label: 'Warehouse', fact: 'Pack scan confirms a two-item pick; parcel weight is unavailable', time: '09:20 UTC' },
    { label: 'Carrier', fact: 'Delivery scan recorded; item-level contents are not confirmed', time: '09:20 UTC' },
  ],
  recommendation: {
    rule: 'Missing-item claims require item-level fulfilment evidence before a payout decision',
    action: 'Hold for evidence',
    confidence: 'Medium confidence',
    rationale: 'Delivery is confirmed, but the carrier scan does not prove parcel contents and the warehouse weight is missing.',
    gap: 'Parcel weight or a packing image would close the evidence gap.',
  },
  decisions: [
    { id: 'request-evidence', label: 'Request more evidence', detail: 'Keep the case open and ask for the missing fulfilment evidence.' },
    { id: 'approve', label: 'Approve customer payout', detail: 'Record the merchant decision to pay the customer.' },
    { id: 'deny', label: 'Deny customer payout', detail: 'Record the merchant decision not to pay the customer.' },
  ],
  recovery: {
    responsibility: 'Potential warehouse or carrier responsibility — not yet confirmed',
    handoff: 'Prepare a recovery handoff when the missing evidence confirms responsibility',
    deadline: '14-day partner evidence window (simulated)',
  },
  privacy:
    'Deterministic fictional merchant and customer. No production account, provider identifier, or personal data is used.',
} as const;

export const DEMO_CASE_STEPS: Array<{ id: DemoCaseStep; label: string; title: string }> = [
  { id: 'incoming', label: 'Incoming case', title: 'Start with the case, not a chart' },
  { id: 'evidence', label: 'Evidence', title: 'See where every fact came from' },
  { id: 'recommendation', label: 'Recommendation', title: 'Understand the rule and the gap' },
  { id: 'decision', label: 'Merchant decision', title: 'Choose the action your team owns' },
  { id: 'recovery', label: 'Loss and recovery', title: 'Keep the next handoff in the same timeline' },
];

export function isDemoCaseStep(value: string | undefined): value is DemoCaseStep {
  return DEMO_CASE_STEPS.some((step) => step.id === value);
}
