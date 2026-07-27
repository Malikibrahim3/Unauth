import type { RuleEvaluationResult } from '@/lib/rules-engine';
import type {
  EvidenceChecklistItem,
  EvidenceChecklistResult,
  PayoutCaseNextAction,
  PayoutCaseStatus,
  PayoutClaimType,
  PayoutDecisionState,
  RecoveryPath,
  RecoveryState,
  RequestedActionResult,
  SupportPayoutCase,
} from '@/lib/payouts/types';

type WorkflowDraft = {
  status: PayoutCaseStatus;
  payoutDecisionState: PayoutDecisionState;
  nextAction: PayoutCaseNextAction;
  nextActionReason: string;
  requestedEvidence: string[];
  recoveryState: RecoveryState;
  openRecovery: boolean;
};

const LEGACY_CLOSED_STATUSES = new Set([
  'resolved_refunded',
  'resolved_won',
  'resolved_lost',
  'resolved_denied',
  'resolved_exchanged',
  'voided',
  'stale',
  'resolved',
  'closed',
]);

const PASSTHROUGH_STATUSES = new Set<PayoutCaseStatus>([
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
]);

function itemGap(item: EvidenceChecklistItem): boolean {
  return item.state === 'missing' || item.state === 'not_tracked';
}

function hasGap(evidence: EvidenceChecklistResult, key: string): boolean {
  return evidence.items.some((item) => item.key === key && itemGap(item));
}

function gapLabels(evidence: EvidenceChecklistResult, keys: string[]): string[] {
  const keySet = new Set(keys);
  return uniqueLabels(evidence.items
    .filter((item) => keySet.has(item.key) && itemGap(item))
    .map((item) => item.label));
}

function missingEvidenceLabels(evidence: EvidenceChecklistResult): string[] {
  return uniqueLabels(evidence.items
    .filter((item) => itemGap(item))
    .map((item) => item.label));
}

/** Merge evidence emitted by multiple rules without duplicating merchant-facing rows. */
function uniqueLabels(labels: string[]): string[] {
  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean))).slice(0, 5);
}

function isEvidenceIncomplete(evidence: EvidenceChecklistResult): boolean {
  return evidence.strength === 'missing' || evidence.strength === 'weak';
}

function requestedPayoutState(requestedAction: RequestedActionResult): PayoutDecisionState {
  if (requestedAction.primary === 'refund') return 'approve_refund';
  if (requestedAction.primary === 'reship' || requestedAction.primary === 'replacement') {
    return 'approve_reship';
  }
  return 'undecided';
}

function recoveryStateFor(recovery: RecoveryPath): RecoveryState {
  if (recovery.recoverability === 'recoverable' || recovery.recoverability === 'possibly_recoverable') {
    return 'recovery_possible';
  }
  if (recovery.recoverability === 'not_recoverable') return 'no_recovery_needed';
  return 'no_recovery_needed';
}

function statusForNextAction(
  nextAction: PayoutCaseNextAction,
  currentStatus: string | null | undefined,
): PayoutCaseStatus {
  if (currentStatus && PASSTHROUGH_STATUSES.has(currentStatus as PayoutCaseStatus)) {
    return currentStatus as PayoutCaseStatus;
  }
  if (currentStatus && LEGACY_CLOSED_STATUSES.has(currentStatus)) return 'closed';

  switch (nextAction) {
    case 'request_customer_evidence':
      return 'awaiting_customer_evidence';
    case 'ask_carrier_for_clarification':
      return 'awaiting_carrier_response';
    case 'ask_3pl_for_clarification':
      return 'awaiting_3pl_response';
    case 'ask_supplier_for_clarification':
      return 'awaiting_supplier_response';
    case 'approve_payout':
    case 'deny_under_policy':
      return 'ready_for_decision';
    case 'escalate_internal_review':
      return 'manual_review';
    case 'open_recovery':
      return 'decision_recorded';
    case 'wait_for_response':
      return 'evidence_needed';
    case 'close_case':
      return 'closed';
    default:
      return 'new';
  }
}

function decisionStateForNextAction(
  nextAction: PayoutCaseNextAction,
  requestedAction: RequestedActionResult,
): PayoutDecisionState {
  switch (nextAction) {
    case 'approve_payout':
      return requestedPayoutState(requestedAction);
    case 'deny_under_policy':
      return 'deny_under_policy';
    case 'request_customer_evidence':
      return 'request_customer_evidence';
    case 'ask_carrier_for_clarification':
    case 'ask_3pl_for_clarification':
    case 'ask_supplier_for_clarification':
    case 'wait_for_response':
      return 'awaiting_external_clarification';
    case 'escalate_internal_review':
      return 'escalate';
    case 'open_recovery':
    case 'close_case':
      return 'decision_recorded';
    default:
      return 'undecided';
  }
}

function explicitInvestigationAction(input: {
  claimType: PayoutClaimType | null;
  evidence: EvidenceChecklistResult;
  recovery: RecoveryPath;
  aboveReviewThreshold: boolean;
}): Pick<WorkflowDraft, 'nextAction' | 'nextActionReason' | 'requestedEvidence'> | null {
  const { claimType, evidence, recovery, aboveReviewThreshold } = input;

  if (
    claimType === 'item_not_received' &&
    hasGap(evidence, 'proof_of_delivery') &&
    !hasGap(evidence, 'tracking')
  ) {
    return {
      nextAction: 'ask_carrier_for_clarification',
      nextActionReason:
        'Tracking is present, but proof of delivery is not complete enough to make a payout decision.',
      requestedEvidence: gapLabels(evidence, ['proof_of_delivery', 'delivery_photo', 'signature']),
    };
  }

  if (claimType === 'wrong_item' && hasGap(evidence, 'pick_pack_record')) {
    return {
      nextAction: 'ask_3pl_for_clarification',
      nextActionReason:
        'The wrong-item claim needs warehouse pick/pack proof before approving a payout.',
      requestedEvidence: gapLabels(evidence, ['pick_pack_record', 'packing_slip', 'received_item_photo']),
    };
  }

  if (claimType === 'missing_item' && hasGap(evidence, 'pick_pack_record')) {
    return {
      nextAction: 'ask_3pl_for_clarification',
      nextActionReason:
        'The missing-item claim needs fulfilment proof before approving a payout.',
      requestedEvidence: gapLabels(evidence, ['pick_pack_record', 'packing_slip']),
    };
  }

  if (claimType === 'damaged' && hasGap(evidence, 'customer_evidence')) {
    return {
      nextAction: 'request_customer_evidence',
      nextActionReason:
        'The damaged-item claim needs customer photos or equivalent evidence before a payout decision.',
      requestedEvidence: gapLabels(evidence, ['customer_evidence', 'packaging_condition']),
    };
  }

  if (recovery.likelyOwner === 'supplier' && recovery.requiredEvidence.length > 0) {
    return {
      nextAction: 'ask_supplier_for_clarification',
      nextActionReason:
        'Supplier evidence is missing, so the payout decision should wait for clarification.',
      requestedEvidence: recovery.requiredEvidence,
    };
  }

  if (recovery.likelyOwner === 'carrier' && recovery.requiredEvidence.length > 0) {
    return {
      nextAction: 'ask_carrier_for_clarification',
      nextActionReason:
        'Carrier evidence is incomplete, so the payout decision should wait for clarification.',
      requestedEvidence: recovery.requiredEvidence,
    };
  }

  if (
    (recovery.likelyOwner === 'three_pl' || recovery.likelyOwner === 'warehouse') &&
    recovery.requiredEvidence.length > 0
  ) {
    return {
      nextAction: 'ask_3pl_for_clarification',
      nextActionReason:
        'Fulfilment evidence is incomplete, so the payout decision should wait for clarification.',
      requestedEvidence: recovery.requiredEvidence,
    };
  }

  if (aboveReviewThreshold && evidence.strength !== 'strong') {
    return {
      nextAction: 'escalate_internal_review',
      nextActionReason:
        'Payout exposure is above the review threshold and the evidence is not complete.',
      requestedEvidence: missingEvidenceLabels(evidence),
    };
  }

  if (isEvidenceIncomplete(evidence)) {
    return {
      nextAction: 'request_customer_evidence',
      nextActionReason:
        'Critical evidence is missing, so the agent should collect more information before payout.',
      requestedEvidence: missingEvidenceLabels(evidence),
    };
  }

  return null;
}

export function derivePayoutWorkflow(input: {
  claimType: PayoutClaimType | null;
  currentStatus?: string | null;
  evidence: EvidenceChecklistResult;
  recovery: RecoveryPath;
  requestedAction: RequestedActionResult;
  exposureAboveReviewThreshold: boolean;
  evaluation?: RuleEvaluationResult | null;
  agentDecision?: string | null;
}): WorkflowDraft {
  if (input.currentStatus && LEGACY_CLOSED_STATUSES.has(input.currentStatus)) {
    const nextAction: PayoutCaseNextAction = 'close_case';
    return {
      status: 'closed',
      payoutDecisionState: 'decision_recorded',
      nextAction,
      nextActionReason: 'The case already has a recorded terminal status.',
      requestedEvidence: [],
      recoveryState:
        input.recovery.recoverability === 'not_recoverable'
          ? 'closed_unrecoverable'
          : recoveryStateFor(input.recovery),
      openRecovery: false,
    };
  }

  const investigation = explicitInvestigationAction({
    claimType: input.claimType,
    evidence: input.evidence,
    recovery: input.recovery,
    aboveReviewThreshold: input.exposureAboveReviewThreshold,
  });

  let nextAction: PayoutCaseNextAction;
  let nextActionReason: string;
  let requestedEvidence: string[];
  let openRecovery = false;

  if (investigation) {
    nextAction = investigation.nextAction;
    nextActionReason = investigation.nextActionReason;
    requestedEvidence = investigation.requestedEvidence;
  } else if (input.evaluation?.recommendation === 'deny') {
    nextAction = 'deny_under_policy';
    nextActionReason =
      input.evaluation.justification_lines[0] ??
      input.evaluation.justification ??
      'A merchant rule matched denial under policy.';
    requestedEvidence = [];
  } else if (input.evaluation?.recommendation === 'manual_review') {
    nextAction = 'escalate_internal_review';
    nextActionReason =
      input.evaluation.justification_lines[0] ??
      input.evaluation.justification ??
      'A merchant rule matched manual review.';
    requestedEvidence = missingEvidenceLabels(input.evidence);
  } else {
    const recoverable =
      input.recovery.recoverability === 'recoverable' ||
      input.recovery.recoverability === 'possibly_recoverable';
    if (recoverable && input.recovery.likelyOwner !== 'merchant') {
      nextAction = 'open_recovery';
      nextActionReason =
        'Evidence is sufficient for the customer decision and a partner recovery path may be available.';
      openRecovery = true;
    } else {
      nextAction = 'approve_payout';
      nextActionReason =
        input.evaluation?.justification_lines[0] ??
        input.evaluation?.justification ??
        'Evidence is sufficient for the agent to approve the payout under policy.';
    }
    requestedEvidence = [];
  }

  return {
    status: statusForNextAction(nextAction, input.currentStatus),
    payoutDecisionState: decisionStateForNextAction(nextAction, input.requestedAction),
    nextAction,
    nextActionReason,
    requestedEvidence,
    recoveryState: recoveryStateFor(input.recovery),
    openRecovery,
  };
}

export function withWorkflow(
  payoutCase: Omit<
    SupportPayoutCase,
    | 'status'
    | 'payoutDecisionState'
    | 'nextAction'
    | 'nextActionReason'
    | 'clarificationRequests'
    | 'recoveryState'
  >,
  workflow: WorkflowDraft,
  clarificationRequests: SupportPayoutCase['clarificationRequests'] = [],
): SupportPayoutCase {
  return {
    ...payoutCase,
    status: workflow.status,
    payoutDecisionState: workflow.payoutDecisionState,
    nextAction: workflow.nextAction,
    nextActionReason: workflow.nextActionReason,
    clarificationRequests,
    recoveryState: workflow.recoveryState,
  };
}
