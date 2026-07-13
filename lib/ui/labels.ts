/**
 * One label layer for every enum the UI renders (WS0.2).
 *
 * Raw snake_case enum values must never reach the DOM. Every status, action,
 * recoverability, owner, loss and priority value is mapped here to merchant-
 * facing copy. Values not present in a map fall back to `humanise()` (which
 * warns in dev) so a regression degrades to Sentence-cased words, never
 * `awaiting_carrier_response`.
 *
 * Claim-type labels stay in their SSOT (`lib/claims/claimTypes.ts`) and are
 * re-exported here so callers have a single import for display copy.
 */
import { CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes';

export { CLAIM_TYPE_LABELS };

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Last-resort humaniser: "awaiting_carrier_response" → "Awaiting carrier
 * response". Warns in dev so an unmapped value is caught during development
 * rather than shipped raw.
 */
export function humanise(value: string): string {
  if (!value) return '';
  const spaced = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  const humanised = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  if (isDev) {
    console.warn(
      `[labels] humanise() fallback for "${value}" — add it to the appropriate map in lib/ui/labels.ts`,
    );
  }
  return humanised;
}

const caseStatus: Record<string, string> = {
  new: 'New',
  open: 'Open',
  pending: 'Pending review',
  evidence_needed: 'Evidence needed',
  awaiting_customer_evidence: 'Waiting on customer',
  awaiting_carrier_response: 'Waiting on carrier',
  ready_for_decision: 'Ready for decision',
  manual_review: 'Manual review',
  escalated: 'Escalated',
  recovery_opened: 'Recovery opened',
  resolved_refunded: 'Refunded',
  resolved_exchanged: 'Exchanged',
  resolved_denied: 'Denied',
};

const requestedAction: Record<string, string> = {
  replacement: 'Replacement',
  store_credit: 'Store credit',
  discount: 'Discount',
  refund: 'Refund',
  investigation: 'Investigation',
};

const recoverability: Record<string, string> = {
  recoverable: 'Recoverable',
  possibly_recoverable: 'Possibly recoverable',
  needs_more_evidence: 'Needs more evidence',
  not_recoverable: 'Not recoverable',
  unknown: 'Not yet assessed',
};

const recoveryStatus: Record<string, string> = {
  draft: 'Draft',
  evidence_needed: 'Evidence needed',
  ready_to_submit: 'Ready to submit',
  submitted: 'Submitted',
  waiting_response: 'Waiting on response',
  chase_due: 'Chase due',
  paid: 'Paid',
};

// ownerType and counterparty share one vocabulary. The three_pl/3pl → "3PL"
// mapping kills the "Three Pl" casing bug at the root.
const ownerType: Record<string, string> = {
  carrier: 'Carrier',
  warehouse: 'Warehouse',
  payment_dispute_provider: 'Payment provider',
  payment_processor: 'Payment provider',
  supplier: 'Supplier',
  three_pl: '3PL',
  '3pl': '3PL',
};

const lossStatus: Record<string, string> = {
  detected: 'Detected',
  collecting_evidence: 'Collecting evidence',
  submitted: 'Submitted',
  approved: 'Approved',
};

const lossCategory: Record<string, string> = {
  delivery_loss: 'Delivery loss',
  chargeback_or_payment_dispute: 'Chargeback / payment dispute',
  fulfilment_or_warehouse_error: 'Fulfilment error',
  supplier_or_vendor_issue: 'Supplier issue',
};

// attribution and recoveryRoute share one vocabulary.
const attribution: Record<string, string> = {
  carrier_claim: 'Carrier claim',
  chargeback_evidence: 'Chargeback evidence',
  chargeback_evidence_pack: 'Chargeback evidence pack',
  warehouse_error: 'Warehouse error',
  three_pl_claim: '3PL claim',
  '3pl_claim': '3PL claim',
  supplier_defect: 'Supplier defect',
  internal_fulfilment_issue: 'Internal fulfilment issue',
  supplier_vendor_claim: 'Supplier claim',
};

const workPriority: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// Shared operational vocabulary for surfaces whose lifecycle is not tied to a
// single database table. Keeping these values here prevents each integration,
// import and rules screen from inventing its own casing and wording.
const workflowStatus: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  enabled: 'Enabled',
  disabled: 'Disabled',
  connected: 'Connected',
  disconnected: 'Not connected',
  not_connected: 'Not connected',
  complete: 'Complete',
  completed: 'Complete',
  failed: 'Failed',
  error: 'Error',
  processing: 'Processing',
  queued: 'Queued',
  running: 'Running',
  blocked: 'Blocked',
  paused: 'Paused',
  published: 'Active',
  archived: 'Archived',
  review: 'Needs review',
  approaching: 'Approaching threshold',
  overdue: 'Ageing',
  resolved: 'Outcome recorded',
  normal: 'Within threshold',
  unknown: 'Not yet assessed',
  saving: 'Saving',
  view_only: 'View only',
  supported: 'Supported',
  unsupported: 'Unavailable',
  hold: 'Hold',
  proceed: 'Proceed',
};

const evidenceStrength: Record<string, string> = {
  strong: 'Strong',
  partial: 'Partial',
  weak: 'Weak',
  insufficient: 'Insufficient',
  needs_more_evidence: 'Needs more evidence',
};

const confidence: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  confirmed: 'Confirmed',
  probable: 'Probable',
  ambiguous: 'Needs review',
  unmatched: 'Unmatched',
};

const MAPS = {
  caseStatus,
  requestedAction,
  recoverability,
  recoveryStatus,
  ownerType,
  counterparty: ownerType,
  lossStatus,
  lossCategory,
  attribution,
  recoveryRoute: attribution,
  workPriority,
  workflowStatus,
  evidenceStrength,
  confidence,
  claimType: CLAIM_TYPE_LABELS as Record<string, string>,
} as const;

export type LabelFamily = keyof typeof MAPS;

/**
 * Map an enum value to merchant-facing copy for its family. Falls back to
 * `humanise()` for values not in the map (never renders raw snake_case).
 */
export function label(family: LabelFamily, value: string | null | undefined): string {
  if (value == null || value === '') return '';
  return MAPS[family][value] ?? humanise(value);
}
