import { reportDataQuality } from '@/lib/observability/dataQuality';
import {
  DATA_STATE_COPY,
  ENTITY_LABELS,
  FINANCIAL_STAGE_DEFINITIONS,
  PROVIDER_LABELS,
  TIME_RANGE_LABELS,
  countLabel,
  entityLabel,
  financialStageDefinition,
  financialStageLabel,
  formatCount,
  formatMajorUnitInput,
  majorToMinor,
  parseMajorUnitInput,
  pluralize,
  providerLabel,
  sentenceCaseEventTitle,
  sourceLabel,
} from '@/lib/ui/merchantCopy';
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
export {
  DATA_STATE_COPY,
  ENTITY_LABELS,
  FINANCIAL_STAGE_DEFINITIONS,
  PROVIDER_LABELS,
  TIME_RANGE_LABELS,
  countLabel,
  entityLabel,
  financialStageDefinition,
  financialStageLabel,
  formatCount,
  formatMajorUnitInput,
  majorToMinor,
  parseMajorUnitInput,
  pluralize,
  providerLabel,
  sentenceCaseEventTitle,
  sourceLabel,
};


/**
 * Last-resort humaniser: "awaiting_carrier_response" → "Awaiting carrier
 * response".
 *
 * RUN-12: reaching this function is a contract failure, not a normal path — a
 * persisted enum value with no merchant-facing label. It still returns a safe,
 * explicit label rather than raw snake_case, but the failure is reported to
 * monitoring instead of a development-only console warning, because unmapped
 * values are precisely the thing that only shows up in production data.
 */
export function humanise(value: string, family?: string): string {
  if (!value) return '';
  const spaced = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  const humanised = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  reportDataQuality({
    kind: 'label.enum_unmapped',
    subject: family ? `${family}.${value}` : value,
    detail: 'A persisted enum value has no merchant-facing label; add it to the appropriate map in lib/ui/labels.ts.',
  });
  return humanised;
}

const caseStatus: Record<string, string> = {
  new: 'New',
  open: 'Open',
  pending: 'Pending review',
  evidence_needed: 'Evidence needed',
  awaiting_customer_evidence: 'Waiting on customer',
  awaiting_carrier_response: 'Waiting on carrier',
  awaiting_3pl_response: 'Waiting on 3PL',
  awaiting_supplier_response: 'Waiting on supplier',
  ready_for_decision: 'Ready for decision',
  manual_review: 'Manual review',
  decision_recorded: 'Decision recorded',
  escalated: 'Escalated',
  blocked: 'Blocked',
  recovery_opened: 'Recovery opened',
  closed: 'Closed',
  resolved: 'Resolved',
  resolved_refunded: 'Refunded',
  resolved_won: 'Resolved — recovered',
  resolved_lost: 'Resolved — loss recorded',
  resolved_exchanged: 'Exchanged',
  resolved_denied: 'Denied',
  voided: 'Voided',
  stale: 'Needs review',
};

const requestedAction: Record<string, string> = {
  replacement: 'Replacement',
  reship: 'Reship',
  store_credit: 'Store credit',
  discount: 'Discount',
  refund: 'Refund',
  investigation: 'Investigation',
  escalation: 'Escalation',
  return_label: 'Return label',
  unknown: 'Not yet known',
};

const recoverability: Record<string, string> = {
  recoverable: 'Recoverable',
  possibly_recoverable: 'Possibly recoverable',
  needs_more_evidence: 'Needs more evidence',
  not_recoverable: 'Not recoverable',
  unknown: 'Not yet assessed',
};

const recoveryStatus: Record<string, string> = {
  open: 'Open',
  no_recovery_needed: 'No recovery needed',
  recovery_possible: 'Recovery possible',
  recovery_opened: 'Recovery opened',
  recovery_submitted: 'Recovery submitted',
  recovery_paid: 'Recovery paid',
  draft: 'Draft',
  evidence_needed: 'Evidence needed',
  ready_to_submit: 'Ready to submit',
  submitted: 'Submitted',
  waiting_response: 'Waiting on response',
  chase_due: 'Chase due',
  approved: 'Approved',
  partially_approved: 'Partially approved',
  rejected: 'Rejected',
  appealed: 'Appealed',
  paid: 'Paid',
  closed_unrecoverable: 'Closed unrecoverable',
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
  returns_provider: 'Returns provider',
  merchant_support: 'Support',
  merchant_ops: 'Operations',
  merchant_finance: 'Finance',
  shipping_protection_provider: 'Shipping protection provider',
  bank: 'Bank',
  card_network: 'Card network',
  marketplace: 'Marketplace',
  customs_broker: 'Customs broker',
  customer: 'Customer',
  internal_team: 'Internal team',
  merchant: 'Merchant',
  unknown: 'Not yet known',
  other: 'Other',
};

const lossStatus: Record<string, string> = {
  detected: 'Detected',
  collecting_evidence: 'Collecting evidence',
  missing_source_data: 'Missing source data',
  needs_external_correspondence: 'External correspondence needed',
  external_correspondence_requested: 'External response requested',
  external_response_received: 'External response received',
  evidence_pack_ready: 'Evidence pack ready',
  submitted: 'Submitted',
  approved: 'Approved',
  partially_approved: 'Partially approved',
  denied: 'Denied',
  expired: 'Expired',
  closed_unrecoverable: 'Closed unrecoverable',
};

const lossCategory: Record<string, string> = {
  delivery_loss: 'Delivery loss',
  chargeback_or_payment_dispute: 'Chargeback / payment dispute',
  refund_dispute: 'Refund dispute',
  returns_abuse_or_exception: 'Returns abuse / exception',
  damaged_goods: 'Damaged goods',
  wrong_item_or_missing_item: 'Wrong or missing item',
  fulfilment_or_warehouse_error: 'Fulfilment error',
  '3pl_accountability': '3PL accountability',
  shipping_protection_claim: 'Shipping protection claim',
  marketplace_dispute: 'Marketplace dispute',
  supplier_or_vendor_issue: 'Supplier issue',
  tax_duty_or_customs_issue: 'Tax, duty or customs issue',
  subscription_or_digital_fulfilment_issue: 'Subscription / digital fulfilment issue',
  unknown_post_purchase_loss: 'Unclassified post-purchase loss',
};

// attribution and recoveryRoute share one vocabulary.
const attribution: Record<string, string> = {
  customer: 'Customer',
  carrier: 'Carrier',
  warehouse: 'Warehouse',
  payment_processor: 'Payment processor',
  customer_claim: 'Customer claim',
  carrier_loss: 'Carrier loss',
  carrier_damage: 'Carrier damage',
  delivery_confirmed_evidence: 'Delivery evidence on file',
  warehouse_mispick: 'Warehouse mispick',
  warehouse_missing_item: 'Warehouse short-pick',
  three_pl_late_dispatch: '3PL late dispatch',
  packaging_failure: 'Packaging failure',
  merchant_policy: 'Merchant policy',
  repeat_claimant: 'Repeat claimant',
  policy_override: 'Policy override',
  unknown: 'Unclear',
  carrier_claim: 'Carrier claim',
  carrier_service_refund: 'Carrier service refund',
  chargeback_evidence: 'Chargeback evidence',
  chargeback_evidence_pack: 'Chargeback evidence pack',
  warehouse_error: 'Warehouse error',
  three_pl_claim: '3PL claim',
  '3pl_claim': '3PL claim',
  shipping_protection_claim: 'Shipping protection claim',
  payment_processor_dispute: 'Payment processor dispute',
  bank_or_card_network_response: 'Bank / card network response',
  returns_platform_claim: 'Returns platform claim',
  marketplace_claim: 'Marketplace claim',
  supplier_defect: 'Supplier defect',
  packaging_issue: 'Packaging issue',
  returns_provider_claim: 'Returns provider claim',
  internal_fulfilment_issue: 'Internal fulfilment issue',
  internal_policy_fix: 'Internal policy fix',
  supplier_vendor_claim: 'Supplier claim',
  customer_evidence_review: 'Customer evidence review',
  not_recoverable: 'Not recoverable',
  needs_more_evidence: 'Needs more evidence',
  other: 'Other',
};

const workPriority: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const exceptionType: Record<string, string> = {
  unmatched_refund: 'Refund could not be matched',
  ambiguous_replacement: 'Replacement needs a match',
  conflicting_financials: 'Financial records conflict',
  match_uncertainty: 'Record match needs review',
  missing_recovery_result: 'Recovery result is missing',
  stale_source_data: 'Source data is stale',
  responsibility_judgement: 'Responsibility needs a decision',
  unsupported_external_outcome: 'External outcome needs recording',
  write_off_reason: 'Write-off reason is missing',
  policy_override: 'Policy override needs recording',
  other: 'Integration issue',
};

// Shared operational vocabulary for surfaces whose lifecycle is not tied to a
// single database table. Keeping these values here prevents each integration,
// import and rules screen from inventing its own casing and wording.
const workflowStatus: Record<string, string> = {
  open: 'Open',
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
  syncing: 'Syncing',
  importing: 'Importing',
  import_queued: 'Import queued',
  import_complete: 'Import complete',
  no_records_found: 'No records found',
  degraded: 'Degraded',
  connection_error: 'Connection error',
  revoked: 'Revoked',
  partial_setup: 'Setup in progress',
  partial: 'Partial',
  missing: 'Missing',
  applicable: 'Applicable',
  in_progress: 'In progress',
  cancelled: 'Cancelled',
  snoozed: 'Snoozed',
  draft: 'Draft',
  unconfirmed: 'Unconfirmed',
  confirmed: 'Confirmed',
  corrected: 'Corrected',
  sent: 'Sent',
  delivered: 'Delivered',
  waiting_response: 'Waiting on response',
  response_received: 'Response received',
  retired: 'Retired',
  discarded: 'Discarded',
  created: 'Created',
  status_changed: 'Status changed',
  evidence_added: 'Evidence added',
  submitted: 'Submitted',
  chased: 'Chased',
  approved: 'Approved',
  partially_approved: 'Partially approved',
  rejected: 'Rejected',
  appealed: 'Appealed',
  paid: 'Paid',
  closed: 'Closed',
  view_only: 'View only',
  supported: 'Supported',
  unsupported: 'Unavailable',
  hold: 'Hold',
  proceed: 'Proceed',
  // Connection health badges (lib/connections/effectiveStatus.ts).
  healthy: 'Healthy',
  connection_verified: 'Connection verified',
  not_syncing: 'Not syncing',
  stale: 'Stale',
  sync_pending: 'Sync pending',
  no_data: 'No data',
  verification_unavailable: 'Verification unavailable',
  attention_required: 'Attention required',
  sync_failed: 'Sync failed',
  source_verified: 'Source verified',
  evidence_due: 'Evidence due',
  inspected: 'Inspected',
  ready_for_decision: 'Ready for decision',
  // Provider lifecycle-capability evidence levels (lib/integrations/types.ts),
  // rendered on the integration detail page.
  implemented: 'Implementation located',
  automated_tested: 'Automated test passed',
  controlled_runtime_verified: 'Controlled runtime verified',
  unavailable: 'Unavailable / unverified',
  not_applicable: 'Not applicable',
};

/** Human labels for LifecycleCapabilityId (lib/integrations/types.ts). */
export const LIFECYCLE_CAPABILITY_LABELS: Record<string, string> = {
  connect: 'Connect',
  account_verification: 'Account verification',
  initial_import: 'Initial import',
  incremental_pull: 'Incremental pull',
  webhook: 'Webhook',
  reconciliation: 'Reconciliation',
  reconnect: 'Reconnect',
  disconnect: 'Disconnect',
  freshness_health: 'Freshness / health',
  bounded_writeback: 'Bounded write-back',
};

/*
 * RUN-12: must cover `EvidenceStrength` in lib/payouts/types.ts exactly. It
 * previously listed `partial` and `insufficient`, which the domain never
 * produces, while omitting `moderate` and `missing`, which it does — so a real
 * case rendered an unlabelled badge.
 */
const evidenceStrength: Record<string, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
  missing: 'Missing',
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

const sourceConfidence: Record<string, string> = {
  source_verified: 'Source verified',
  partial_source_verified: 'Partially source verified',
  insufficient_source_data: 'Insufficient source data',
};

const assessmentState: Record<string, string> = {
  known: 'Known',
  likely: 'Likely',
  blocked: 'Blocked',
  not_evaluated: 'Not evaluated',
  unknown: 'Not evaluated',
};

/** Workspace invitation lifecycle (spec §6.7 — one central mapping per domain). */
const inviteStatus: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  revoked: 'Revoked',
};

const MAPS = {
  caseStatus,
  inviteStatus,
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
  exceptionType,
  workflowStatus,
  evidenceStrength,
  confidence,
  sourceConfidence,
  assessmentState,
  claimType: CLAIM_TYPE_LABELS as Record<string, string>,
} as const;

export type LabelFamily = keyof typeof MAPS;

/**
 * Map an enum value to merchant-facing copy for its family. Falls back to
 * `humanise()` for values not in the map (never renders raw snake_case).
 */
export function label(family: LabelFamily, value: string | null | undefined): string {
  if (value == null || value === '') return '';
  return MAPS[family][value] ?? humanise(value, family);
}
