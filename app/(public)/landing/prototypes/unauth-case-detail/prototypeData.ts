export type SourceKey = 'commerce' | 'helpdesk' | 'warehouse' | 'carrier';
export type DecisionId = 'request-evidence' | 'approve' | 'deny';

export const CASE_STORY = {
  merchant: 'Alder & Ash',
  workspaceNote: 'Fictional workspace',
  caseReference: 'Case #814150',
  customer: 'Maya Chen',
  title: 'Missing item after delivery scan',
  requestedAction: 'Refund requested',
  orderReference: 'Order #814150',
  value: '£128.00',
  item: 'Canvas jacket · 1 of 2 items reported missing',
  status: 'Evidence needed',
  owner: 'Unassigned',
  opened: '22 Jul 2026',
  updated: 'Today, 11:00',
  evidenceWindow: '14-day partner evidence window',
  sources: [
    {
      key: 'commerce',
      short: 'CO',
      label: 'Commerce',
      provider: 'Shopify',
      time: '09:12',
      fact: 'Order value £128.00; two items fulfilled.',
      state: 'Matched',
    },
    {
      key: 'helpdesk',
      short: 'HD',
      label: 'Helpdesk',
      provider: 'Gorgias',
      time: '09:18',
      fact: 'Customer reports one item missing from the parcel.',
      state: 'Received',
    },
    {
      key: 'warehouse',
      short: 'WH',
      label: 'Warehouse',
      provider: 'ShipBob',
      time: '09:20',
      fact: 'Pack scan confirms a two-item pick; parcel weight is unavailable.',
      state: 'Gap found',
    },
    {
      key: 'carrier',
      short: 'CR',
      label: 'Carrier',
      provider: 'Carrier feed',
      time: '09:20',
      fact: 'Delivery scan recorded; item-level contents are not confirmed.',
      state: 'Confirmed',
    },
  ] satisfies Array<{
    key: SourceKey;
    short: string;
    label: string;
    provider: string;
    time: string;
    fact: string;
    state: string;
  }>,
  gap: 'Parcel weight or a packing image would close the evidence gap.',
  rule: 'Missing-item claims require item-level fulfilment evidence before a payout decision.',
  recommendation: {
    action: {
      label: 'Customer action',
      value: 'Hold for evidence',
      detail: 'Ask for the missing fulfilment proof before authorising a payout.',
      state: 'Recommended',
    },
    responsibility: {
      label: 'Responsibility',
      value: 'Warehouse or carrier',
      detail: 'Potential responsibility is visible but not yet merchant-confirmed.',
      state: 'Unresolved',
    },
    recovery: {
      label: 'Recovery',
      value: 'Prepare partner handoff',
      detail: 'Open the route when the missing evidence confirms responsibility.',
      state: 'Conditional',
    },
  },
  decisions: [
    {
      id: 'request-evidence',
      label: 'Request more evidence',
      detail: 'Keep the case open and ask for the missing fulfilment evidence.',
    },
    {
      id: 'approve',
      label: 'Approve customer payout',
      detail: 'Record the merchant decision to pay the customer.',
    },
    {
      id: 'deny',
      label: 'Deny customer payout',
      detail: 'Record the merchant decision not to pay the customer.',
    },
  ] satisfies Array<{ id: DecisionId; label: string; detail: string }>,
  privacy: 'Deterministic fictional data. No production account, provider identifier, or personal data is shown.',
} as const;

export const CASE_STAGES = [
  { id: 'incoming', label: 'Incoming case' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'decision', label: 'Merchant decision' },
  { id: 'recovery', label: 'Loss and recovery' },
] as const;

export type CaseStage = (typeof CASE_STAGES)[number]['id'];

