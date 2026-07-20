/**
 * lib/payouts/config.ts
 *
 * Declarative tables for the payout domain layer: the documentary-evidence
 * checklist per claim type, requested-action inference, and shared thresholds.
 * Logic lives in the sibling modules; this file holds only data + labels so the
 * per-claim-type expectations are auditable in one place.
 */
import type { PayoutClaimType, RequestedAction } from '@/lib/payouts/types';

/**
 * One expected evidence item. `key` doubles as the probe name: when the checklist
 * builder produces a present/absent boolean for that key, the item is
 * present/missing; when no probe exists for the key, the item is `not_tracked`
 * (we do not yet capture it) — never reported as "missing".
 */
export type ChecklistTemplateItem = {
  key: string;
  label: string;
  /** High-signal items (tracking / POD / delivery confirmation) weigh 2. */
  weight: number;
};

const HIGH = 2;
const NORMAL = 1;

/** Probe keys that the checklist builder knows how to resolve from context. */
export const TRACKED_PROBE_KEYS = [
  'tracking',
  'proof_of_delivery',
  'carrier_identified',
  'delivery_confirmed',
  'delivery_scan_timeline',
  'customer_statement',
  'customer_evidence',
  'merchant_inspection',
  'order_contents',
  'order_on_file',
  'delivery_status_known',
  'delivery_photo',
  'signature',
  'gps',
] as const;
export type TrackedProbeKey = (typeof TRACKED_PROBE_KEYS)[number];

const DEFAULT_TEMPLATE: ChecklistTemplateItem[] = [
  { key: 'customer_statement', label: 'Customer statement on file', weight: NORMAL },
  { key: 'order_on_file', label: 'Order on file', weight: NORMAL },
  { key: 'delivery_status_known', label: 'Delivery status known', weight: NORMAL },
];

export const CHECKLIST_TEMPLATES: Record<PayoutClaimType, ChecklistTemplateItem[]> = {
  item_not_received: [
    { key: 'tracking', label: 'Carrier tracking on file', weight: HIGH },
    { key: 'proof_of_delivery', label: 'Proof of delivery (delivered scan)', weight: HIGH },
    { key: 'carrier_identified', label: 'Carrier identified', weight: NORMAL },
    { key: 'customer_statement', label: 'Customer statement on file', weight: NORMAL },
    { key: 'delivery_scan_timeline', label: 'Delivery scan timeline', weight: NORMAL },
    { key: 'delivery_photo', label: 'Delivery photo proof attempted', weight: NORMAL },
    { key: 'signature', label: 'Signature on delivery', weight: NORMAL },
    { key: 'gps', label: 'GPS coordinates', weight: NORMAL },
  ],
  missing_item: [
    { key: 'delivery_confirmed', label: 'Parcel delivered', weight: HIGH },
    { key: 'customer_statement', label: 'Customer statement on file', weight: NORMAL },
    { key: 'order_contents', label: 'Expected contents / line items on file', weight: NORMAL },
    { key: 'pick_pack_record', label: 'Warehouse pick/pack or weight record', weight: NORMAL },
    { key: 'packing_slip', label: 'Packing slip contents', weight: NORMAL },
  ],
  damaged: [
    { key: 'customer_evidence', label: 'Customer evidence on file', weight: HIGH },
    { key: 'delivery_confirmed', label: 'Item was delivered', weight: NORMAL },
    { key: 'merchant_inspection', label: 'Merchant / returns inspection', weight: NORMAL },
    { key: 'packaging_condition', label: 'Packaging condition noted', weight: NORMAL },
    { key: 'carrier_damage_report', label: 'Carrier damage report', weight: NORMAL },
  ],
  wrong_item: [
    { key: 'customer_statement', label: 'Customer statement on file', weight: HIGH },
    { key: 'delivery_confirmed', label: 'Item was delivered', weight: NORMAL },
    { key: 'order_contents', label: 'Ordered SKU / contents on file', weight: NORMAL },
    { key: 'merchant_inspection', label: 'Return inspection', weight: NORMAL },
    { key: 'received_item_photo', label: 'Photo of received item', weight: NORMAL },
    { key: 'pick_pack_record', label: 'Warehouse pick/pack record', weight: NORMAL },
  ],
  not_as_described: DEFAULT_TEMPLATE,
  refund_request: DEFAULT_TEMPLATE,
  chargeback: DEFAULT_TEMPLATE,
  return_abuse: DEFAULT_TEMPLATE,
  other: DEFAULT_TEMPLATE,
};

export function checklistTemplateFor(claimType: PayoutClaimType | null): ChecklistTemplateItem[] {
  if (claimType && claimType in CHECKLIST_TEMPLATES) {
    return CHECKLIST_TEMPLATES[claimType];
  }
  return DEFAULT_TEMPLATE;
}

/**
 * Short, sentence-safe noun phrases for each evidence key, for inline prose and
 * chips ("Gather customer statement, delivery confirmation …"). Distinct from
 * the checklist `label` above, which is a full row caption ("Customer statement
 * on file"). Raw snake_case keys must never reach the DOM — unknown keys fall
 * back to a spaced form via `evidenceKeyLabel`.
 */
export const EVIDENCE_KEY_LABELS: Record<string, string> = {
  tracking: 'carrier tracking',
  proof_of_delivery: 'proof of delivery',
  carrier_identified: 'carrier identification',
  delivery_confirmed: 'delivery confirmation',
  delivery_scan_timeline: 'delivery scan timeline',
  customer_statement: 'customer statement',
  customer_evidence: 'customer evidence',
  merchant_inspection: 'merchant inspection',
  order_contents: 'order contents',
  order_on_file: 'order details',
  delivery_status_known: 'delivery status',
  delivery_photo: 'delivery photo',
  signature: 'delivery signature',
  gps: 'GPS coordinates',
  pick_pack_record: 'warehouse pick/pack record',
  packing_slip: 'packing slip',
  packaging_condition: 'packaging condition',
  carrier_damage_report: 'carrier damage report',
  received_item_photo: 'photo of the received item',
};

/** Map an evidence key to a sentence-safe noun phrase (never raw snake_case). */
export function evidenceKeyLabel(key: string): string {
  return EVIDENCE_KEY_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** Join evidence-key labels into readable prose: "a", "a and b", "a, b and c". */
export function joinEvidenceLabels(keys: readonly string[]): string {
  const labels = keys.map(evidenceKeyLabel);
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Requested-action inference (used only when the caller supplies no actions)
// ---------------------------------------------------------------------------

export const REQUESTED_ACTION_BY_CLAIM_TYPE: Record<PayoutClaimType, RequestedAction> = {
  item_not_received: 'reship',
  missing_item: 'reship',
  damaged: 'replacement',
  wrong_item: 'replacement',
  not_as_described: 'refund',
  refund_request: 'refund',
  chargeback: 'refund',
  return_abuse: 'refund',
  other: 'unknown',
};

/** Whether a return/RMA is typically required. null = unknown / not tracked. */
export const RETURN_REQUIRED_BY_CLAIM_TYPE: Record<PayoutClaimType, boolean | null> = {
  item_not_received: false,
  missing_item: false,
  damaged: null,
  wrong_item: true,
  not_as_described: true,
  refund_request: null,
  chargeback: null,
  return_abuse: null,
  other: null,
};
