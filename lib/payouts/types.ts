/**
 * lib/payouts/types.ts
 *
 * Types for the SupportPayoutCase product concept — a layer over the existing
 * claim/decision model (lib/claims/decision/types.ts). Everything here is pure
 * and advisory: it explains payout exposure, documentary evidence, likely loss
 * attribution, and a lightweight recovery path so a support agent can decide.
 *
 * POSITIONING: never a fraud verdict. Labels are neutral (customer_claim,
 * carrier_loss, merchant_policy, …). Every derived result carries human-readable
 * `reasons` and degrades to an explicit unknown / needs-more-evidence state when
 * the underlying data is absent.
 *
 * The DB `claim_type` enum and the evidence-score severity table stay frozen;
 * `missing_item` exists only as a product-level distinction here.
 */
import type { ClaimTypeValue } from '@/lib/claims/claimTypes';

export const PAYOUT_CONFIG_VERSION = 'v1.0';

export type Money = { amount: number; currency: string | null };

/**
 * Product-level claim type = canonical DB claim types plus `missing_item`
 * (a partial-order shortfall, distinct from whole-order item_not_received).
 * `missing_item` is never stored in `claim_type`; the compatibility column
 * remains `item_not_received`. It is resolved from the authoritative
 * `reason_normalized` case issue (or an explicit caller override).
 */
export type PayoutClaimType = ClaimTypeValue | 'missing_item';

// ---------------------------------------------------------------------------
// Requested action (what the customer wants done — separate axis from claim_type)
// ---------------------------------------------------------------------------

export const REQUESTED_ACTIONS = [
  'refund',
  'reship',
  'replacement',
  'discount',
  'store_credit',
  'return_label',
  'investigation',
  'escalation',
  'unknown',
] as const;
export type RequestedAction = (typeof REQUESTED_ACTIONS)[number];

export const REQUESTED_ACTION_LABELS: Record<RequestedAction, string> = {
  refund: 'Refund',
  reship: 'Reship',
  replacement: 'Replacement',
  discount: 'Discount',
  store_credit: 'Store credit',
  return_label: 'Return label',
  investigation: 'Investigation',
  escalation: 'Escalation',
  unknown: 'Unknown',
};

export type RequestedActionResult = {
  primary: RequestedAction;
  requested: RequestedAction[];
  /** null = not tracked / unknown */
  returnRequired: boolean | null;
  reasons: string[];
};

// ---------------------------------------------------------------------------
// Payout workflow state (customer decision axis, separate from recovery)
// ---------------------------------------------------------------------------

export const PAYOUT_CASE_STATUSES = [
  'new',
  'evidence_needed',
  'awaiting_customer_evidence',
  'awaiting_carrier_response',
  'awaiting_3pl_response',
  'awaiting_supplier_response',
  'ready_for_decision',
  'manual_review',
  'decision_recorded',
  'recovery_opened',
  'closed',
] as const;
export type PayoutCaseStatus = (typeof PAYOUT_CASE_STATUSES)[number];

export const PAYOUT_CASE_STATUS_LABELS: Record<PayoutCaseStatus, string> = {
  new: 'New',
  evidence_needed: 'Needs evidence',
  awaiting_customer_evidence: 'Awaiting customer evidence',
  awaiting_carrier_response: 'Awaiting carrier response',
  awaiting_3pl_response: 'Awaiting 3PL response',
  awaiting_supplier_response: 'Awaiting supplier response',
  ready_for_decision: 'Ready for decision',
  manual_review: 'Manual review',
  decision_recorded: 'Decision recorded',
  recovery_opened: 'Recovery opened',
  closed: 'Closed',
};

export const PAYOUT_CASE_NEXT_ACTIONS = [
  'approve_payout',
  'deny_under_policy',
  'request_customer_evidence',
  'ask_carrier_for_clarification',
  'ask_3pl_for_clarification',
  'ask_supplier_for_clarification',
  'escalate_internal_review',
  'open_recovery',
  'wait_for_response',
  'close_case',
] as const;
export type PayoutCaseNextAction = (typeof PAYOUT_CASE_NEXT_ACTIONS)[number];

export const PAYOUT_CASE_NEXT_ACTION_LABELS: Record<PayoutCaseNextAction, string> = {
  approve_payout: 'Approve payout',
  deny_under_policy: 'Deny under policy',
  request_customer_evidence: 'Request customer evidence',
  ask_carrier_for_clarification: 'Ask carrier for clarification',
  ask_3pl_for_clarification: 'Ask 3PL for clarification',
  ask_supplier_for_clarification: 'Ask supplier for clarification',
  escalate_internal_review: 'Escalate internal review',
  open_recovery: 'Open recovery',
  wait_for_response: 'Wait for response',
  close_case: 'Close case',
};

export const PAYOUT_DECISION_STATES = [
  'undecided',
  'approve_refund',
  'approve_reship',
  'deny_under_policy',
  'manual_review',
  'request_customer_evidence',
  'awaiting_external_clarification',
  'escalate',
  'decision_recorded',
] as const;
export type PayoutDecisionState = (typeof PAYOUT_DECISION_STATES)[number];

export const PAYOUT_DECISION_STATE_LABELS: Record<PayoutDecisionState, string> = {
  undecided: 'Undecided',
  approve_refund: 'Approve refund',
  approve_reship: 'Approve reship',
  deny_under_policy: 'Deny under policy',
  manual_review: 'Manual review',
  request_customer_evidence: 'Request customer evidence',
  awaiting_external_clarification: 'Awaiting external clarification',
  escalate: 'Escalate',
  decision_recorded: 'Decision recorded',
};

export const RECOVERY_STATES = [
  'no_recovery_needed',
  'recovery_possible',
  'recovery_opened',
  'recovery_submitted',
  'recovery_paid',
  'closed_unrecoverable',
] as const;
export type RecoveryState = (typeof RECOVERY_STATES)[number];

export const RECOVERY_STATE_LABELS: Record<RecoveryState, string> = {
  no_recovery_needed: 'No recovery needed',
  recovery_possible: 'Recovery possible',
  recovery_opened: 'Recovery opened',
  recovery_submitted: 'Recovery submitted',
  recovery_paid: 'Recovery paid',
  closed_unrecoverable: 'Closed unrecoverable',
};

export const CLARIFICATION_TARGET_TYPES = [
  'carrier',
  '3pl',
  'supplier',
  'customer',
  'internal',
] as const;
export type ClarificationTargetType = (typeof CLARIFICATION_TARGET_TYPES)[number];

export const CASE_CLARIFICATION_REQUEST_STATUSES = [
  'draft',
  'sent',
  'waiting_response',
  'response_received',
  'closed',
] as const;
export type CaseClarificationRequestStatus =
  (typeof CASE_CLARIFICATION_REQUEST_STATUSES)[number];

export const CASE_CLARIFICATION_SOURCE_CHANNELS = [
  'email',
  'api',
  'manual',
  'gorgias',
] as const;
export type CaseClarificationSourceChannel =
  (typeof CASE_CLARIFICATION_SOURCE_CHANNELS)[number];

export type CaseClarificationRequest = {
  id: string;
  merchant_id: string;
  support_payout_case_id: string;
  target_type: ClarificationTargetType;
  target_name?: string | null;
  status: CaseClarificationRequestStatus;
  requested_evidence: string[];
  request_summary: string;
  response_summary?: string | null;
  source_channel?: CaseClarificationSourceChannel | null;
  due_at?: string | null;
  sent_at?: string | null;
  response_received_at?: string | null;
  created_at: string;
  updated_at: string;
  partner_id?: string | null;
  /**
   * Resolved from `partners` by a second merchant-scoped read (RUN-02). `null`
   * means the request was never addressed to a partner; `unresolved` means the
   * partner row is gone but the investigation history remains.
   */
  partner?: CaseClarificationPartner | null;
};

export type CaseClarificationPartner =
  | { id: string; name: string; partner_type: string | null; status: string | null }
  | { id: string; unresolved: true };

// ---------------------------------------------------------------------------
// Payout exposure
// ---------------------------------------------------------------------------

export type PayoutExposureComponentKind =
  | 'refund'
  | 'reship_replacement'
  | 'discount'
  | 'store_credit'
  | 'support_cost';

export type PayoutExposureSource =
  | 'provided'
  | 'amount_at_risk'
  | 'order_total'
  | 'estimated'
  | 'none';

export type PayoutExposureComponent = {
  kind: PayoutExposureComponentKind;
  amount: number;
  source: PayoutExposureSource;
  reason: string;
};

export type PayoutExposure = {
  total: Money;
  components: PayoutExposureComponent[];
  aboveReviewThreshold: boolean;
  /** null when the merchant supplied no review threshold for this case. */
  reviewThreshold: number | null;
  reasons: string[];
};

export type PayoutExposureInput = {
  refundAmount?: number | null;
  reshipReplacementAmount?: number | null;
  discountAmount?: number | null;
  storeCreditAmount?: number | null;
  estimatedSupportCost?: number | null;
  /** "above this total = requires review" */
  reviewThreshold?: number | null;
};

// ---------------------------------------------------------------------------
// Evidence checklist (documentary completeness of THIS case — distinct from the
// network behavioural evidence_score in lib/engine/evidence)
// ---------------------------------------------------------------------------

export type EvidenceItemState = 'present' | 'missing' | 'not_tracked' | 'unavailable';
export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'missing';

export const EVIDENCE_STRENGTHS = ['strong', 'moderate', 'weak', 'missing'] as const;

export const EVIDENCE_STRENGTH_LABELS: Record<EvidenceStrength, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
  missing: 'Missing',
};

export type EvidenceChecklistItem = {
  key: string;
  label: string;
  state: EvidenceItemState;
  /** backing ClaimDecisionContext field, or null when not tracked by any source. */
  contextField: string | null;
  /** relative weight when scoring strength (high-signal items weigh more). */
  weight: number;
  reason: string;
};

export type EvidenceChecklistResult = {
  claimType: PayoutClaimType | null;
  items: EvidenceChecklistItem[];
  presentCount: number;
  /** present + missing (excludes not_tracked items). */
  expectedCount: number;
  strength: EvidenceStrength;
  reasons: string[];
};

// ---------------------------------------------------------------------------
// Loss attribution (advisory)
// ---------------------------------------------------------------------------

export const LOSS_ATTRIBUTION_LABELS = [
  'customer_claim',
  'carrier_loss',
  'carrier_damage',
  'delivery_confirmed_evidence',
  'warehouse_mispick',
  'warehouse_missing_item',
  'three_pl_late_dispatch',
  'supplier_defect',
  'packaging_failure',
  'merchant_policy',
  'unknown',
  'repeat_claimant',
  'policy_override',
] as const;
export type LossAttributionLabel = (typeof LOSS_ATTRIBUTION_LABELS)[number];

export const LOSS_ATTRIBUTION_DISPLAY: Record<LossAttributionLabel, string> = {
  customer_claim: 'Customer claim',
  carrier_loss: 'Carrier loss',
  carrier_damage: 'Carrier damage',
  delivery_confirmed_evidence: 'Delivery evidence on file',
  warehouse_mispick: 'Warehouse mispick',
  warehouse_missing_item: 'Warehouse short-pick',
  three_pl_late_dispatch: '3PL late dispatch',
  supplier_defect: 'Supplier defect',
  packaging_failure: 'Packaging failure',
  merchant_policy: 'Merchant policy',
  unknown: 'Unclear',
  repeat_claimant: 'Repeat claimant',
  policy_override: 'Policy override',
};

export const ATTRIBUTION_CONFIDENCES = [
  'high',
  'medium',
  'low',
  'needs_more_evidence',
] as const;
export type AttributionConfidence = (typeof ATTRIBUTION_CONFIDENCES)[number];

export const ATTRIBUTION_CONFIDENCE_LABELS: Record<AttributionConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  needs_more_evidence: 'Needs more evidence',
};

export type LossAttributionReason = {
  code: string;
  text: string;
  /** backing signal name, or null. */
  signal: string | null;
};

export type LossAttributionResult = {
  label: LossAttributionLabel;
  confidence: AttributionConfidence;
  reasons: LossAttributionReason[];
  /** Reserved for a future aggregated peer benchmark — NOT computed this milestone. */
  networkBenchmark: null;
  /** Literal — this is advisory context, never a verdict. */
  isAdvisory: true;
};

// ---------------------------------------------------------------------------
// Recovery path (lightweight — NOT a full RecoveryCase model)
// ---------------------------------------------------------------------------

export const RECOVERABILITIES = [
  'recoverable',
  'possibly_recoverable',
  'not_recoverable',
  'needs_more_evidence',
  'unknown',
] as const;
export type Recoverability = (typeof RECOVERABILITIES)[number];

export const RECOVERABILITY_LABELS: Record<Recoverability, string> = {
  recoverable: 'Recovery path available',
  possibly_recoverable: 'Potentially recoverable',
  not_recoverable: 'Not recoverable',
  needs_more_evidence: 'Needs more evidence',
  unknown: 'Unknown',
};

export const LIKELY_OWNERS = [
  'carrier',
  'three_pl',
  'warehouse',
  'supplier',
  'merchant',
  'unknown',
] as const;
export type LikelyOwner = (typeof LIKELY_OWNERS)[number];

export const LIKELY_OWNER_LABELS: Record<LikelyOwner, string> = {
  carrier: 'Carrier',
  three_pl: '3PL / fulfilment',
  warehouse: 'Warehouse',
  supplier: 'Supplier',
  merchant: 'Merchant',
  unknown: 'Unknown',
};

export type RecoveryPath = {
  recoverability: Recoverability;
  likelyOwner: LikelyOwner;
  /** checklist item keys still needed to pursue recovery. */
  requiredEvidence: string[];
  /** plain, non-accusatory next step for support. */
  suggestedNextAction: string;
  reasons: string[];
};

// ---------------------------------------------------------------------------
// Payout recommendation (steering vocabulary — docs/PRODUCT.md §16)
// ---------------------------------------------------------------------------

export const PAYOUT_RECOMMENDATION_VALUES = PAYOUT_CASE_NEXT_ACTIONS;
export type PayoutRecommendation = PayoutCaseNextAction;

export type PayoutRecommendationResult = {
  action: PayoutRecommendation;
  ruleName: string | null;
  ruleId: string | null;
  explanation: string;
  openRecovery: boolean;
  requestedEvidence: string[];
};

// ---------------------------------------------------------------------------
// Assembled view
// ---------------------------------------------------------------------------

export type SupportPayoutCase = {
  caseId: string;
  merchantId: string;
  status: PayoutCaseStatus;
  claimType: PayoutClaimType | null;
  exposure: PayoutExposure;
  requestedAction: RequestedActionResult;
  payoutDecisionState: PayoutDecisionState;
  nextAction: PayoutCaseNextAction;
  nextActionReason: string;
  evidence: EvidenceChecklistResult;
  /** Concise direct-carrier / commerce-source delivery evidence summary for INR widget and case UI. */
  deliveryEvidenceLine: string;
  attribution: LossAttributionResult;
  clarificationRequests: CaseClarificationRequest[];
  recoveryState: RecoveryState;
  recovery: RecoveryPath;
  /** Merchant policy/rule that explains the recommendation, when available. */
  matchedRule: {
    id: string | null;
    name: string | null;
    reason: string | null;
  } | null;
  /** Steering-aligned recommendation derived from merchant rules + case context. */
  recommendation: PayoutRecommendationResult | null;
  /** Agent's recorded decision; null until the merchant acts. */
  agentDecision: string | null;
  /** Final financial outcome; null while the support payout case is open. */
  outcome: {
    finalOutcome: string | null;
    finalLossAmount: Money | null;
    recoveredAmount: Money | null;
    closedAt: string | null;
  } | null;
  configVersion: string;
};

export type BuildSupportPayoutCaseInput = PayoutExposureInput & {
  /** Override the resolved claim type (e.g. demo/tests/future ticket classifier). */
  claimTypeOverride?: PayoutClaimType | null;
  /** Customer-requested actions, if known (else inferred from claim type). */
  requestedActions?: RequestedAction[] | null;
  /** Whether a return/RMA is required (e.g. returnless refund → false). */
  returnRequired?: boolean | null;
  matchedRule?: SupportPayoutCase['matchedRule'];
  recommendation?: PayoutRecommendationResult | null;
  agentDecision?: string | null;
  outcome?: SupportPayoutCase['outcome'];
  clarificationRequests?: CaseClarificationRequest[];
};
