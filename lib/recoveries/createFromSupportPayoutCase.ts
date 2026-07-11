import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EvidenceChecklistResult,
  LossAttributionLabel,
  SupportPayoutCase,
} from '@/lib/payouts/types';
import { derivePayoutWorkflow, withWorkflow } from '@/lib/payouts/workflow';
import { TABLES } from '@/lib/supabase/tables';
import { findBestPartnerRecoveryRule } from '@/lib/partners/store';
import type { PartnerRecoveryType, PartnerRuleClaimType } from '@/lib/partners/types';
import { calculateRecoveryEstimate } from '@/lib/recoveries/calculation';
import {
  createRecoveryCase,
  getRecoveryCaseForSupportPayoutCase,
} from '@/lib/recoveries/store';
import type { RecoveryCase, RecoveryOwnerType } from '@/lib/recoveries/types';

type SupportPayoutCaseRow = {
  id: string;
  merchant_id: string;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  total_estimated_loss: number | null;
  currency: string | null;
  requested_action: string | null;
  loss_attribution: LossAttributionLabel | null;
  attribution_confidence: string | null;
  recoverability: string | null;
  recovery_owner: string | null;
  recovery_required_evidence: string[] | null;
  recovery_next_action: string | null;
};

const EXTERNAL_RECOVERY_OWNERS = new Set(['carrier', 'three_pl', 'warehouse', 'supplier', 'returns_provider']);
const EXTERNAL_ATTRIBUTIONS = new Set<LossAttributionLabel>([
  'carrier_loss',
  'carrier_damage',
  'warehouse_mispick',
  'warehouse_missing_item',
  'three_pl_late_dispatch',
  'supplier_defect',
]);

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ruleClaimTypeForClaim(claimType: string, requestedAction: string | null): PartnerRuleClaimType {
  if (claimType === 'damaged') return 'damaged_item';
  if (claimType === 'wrong_item') return 'wrong_item';
  if (claimType === 'item_not_received') return 'item_not_received';
  if (claimType === 'chargeback') return 'chargeback_related';
  if (requestedAction === 'discount') return 'discount_request';
  if (requestedAction === 'store_credit') return 'store_credit_request';
  if (requestedAction === 'replacement' || requestedAction === 'reship') return 'replacement_request';
  return 'other';
}

function recoveryTypeForRow(row: SupportPayoutCaseRow): PartnerRecoveryType {
  switch (row.recovery_owner) {
    case 'carrier':
      return row.loss_attribution === 'carrier_damage' ? 'carrier_claim' : 'carrier_claim';
    case 'three_pl':
      return 'three_pl_claim';
    case 'warehouse':
      return 'warehouse_error';
    case 'supplier':
      return 'supplier_defect';
    default:
      if (row.claim_type === 'chargeback') return 'chargeback_evidence';
      return 'other';
  }
}

function ownerTypeForOwner(owner: string): RecoveryOwnerType {
  if (
    owner === 'carrier' ||
    owner === 'three_pl' ||
    owner === 'warehouse' ||
    owner === 'supplier' ||
    owner === 'returns_provider'
  ) {
    return owner;
  }
  return 'unknown';
}

function supportPayoutCaseFromRow(row: SupportPayoutCaseRow): SupportPayoutCase {
  const lossAmount = num(row.total_estimated_loss) ?? num(row.amount_at_risk) ?? 0;
  const requiredEvidence = row.recovery_required_evidence ?? [];
  const evidence: EvidenceChecklistResult = {
    claimType: row.claim_type as SupportPayoutCase['claimType'],
    items: requiredEvidence.map((key) => ({
      key,
      label: key.replaceAll('_', ' '),
      state: 'missing',
      contextField: null,
      weight: 1,
      reason: 'Required for recovery',
    })),
    presentCount: 0,
    expectedCount: requiredEvidence.length,
    strength: requiredEvidence.length > 0 ? 'weak' : 'missing',
    reasons: requiredEvidence.length > 0 ? [`${requiredEvidence.length} recovery evidence item(s) required`] : [],
  };

  const draft: Parameters<typeof withWorkflow>[0] = {
    caseId: row.id,
    merchantId: row.merchant_id,
    claimType: row.claim_type as SupportPayoutCase['claimType'],
    exposure: {
      total: { amount: lossAmount, currency: row.currency },
      components: lossAmount > 0
        ? [{ kind: 'refund', amount: lossAmount, source: row.total_estimated_loss != null ? 'provided' : 'amount_at_risk', reason: 'Persisted payout case loss estimate' }]
        : [],
      aboveReviewThreshold: false,
      reviewThreshold: null,
      reasons: ['Persisted support payout case values'],
    },
    requestedAction: {
      primary: (row.requested_action ?? 'unknown') as SupportPayoutCase['requestedAction']['primary'],
      requested: [(row.requested_action ?? 'unknown') as SupportPayoutCase['requestedAction']['primary']],
      returnRequired: null,
      reasons: ['Persisted requested action'],
    },
    evidence,
    deliveryEvidenceLine: '—',
    attribution: {
      label: row.loss_attribution ?? 'unknown',
      confidence: (row.attribution_confidence ?? 'needs_more_evidence') as SupportPayoutCase['attribution']['confidence'],
      reasons: [],
      networkBenchmark: null,
      isAdvisory: true,
    },
    recovery: {
      recoverability: (row.recoverability ?? 'unknown') as SupportPayoutCase['recovery']['recoverability'],
      likelyOwner: (row.recovery_owner ?? 'unknown') as SupportPayoutCase['recovery']['likelyOwner'],
      requiredEvidence,
      suggestedNextAction: row.recovery_next_action ?? 'Review recovery route.',
      reasons: [],
    },
    matchedRule: null,
    recommendation: null,
    agentDecision: null,
    outcome: null,
    configVersion: 'persisted',
  };
  const workflow = derivePayoutWorkflow({
    claimType: draft.claimType,
    currentStatus: row.status,
    evidence,
    recovery: draft.recovery,
    requestedAction: draft.requestedAction,
    exposureAboveReviewThreshold: false,
    agentDecision: null,
  });
  return withWorkflow(draft, workflow);
}

export function shouldCreateRecoveryCaseFromRow(row: SupportPayoutCaseRow): boolean {
  if (row.recoverability === 'not_recoverable') return false;
  if (row.recovery_owner === 'merchant') return false;
  if (row.loss_attribution === 'merchant_policy' || row.loss_attribution === 'delivery_confirmed_evidence') return false;
  if (row.recoverability === 'recoverable' || row.recoverability === 'possibly_recoverable') return true;
  if (row.recovery_owner && EXTERNAL_RECOVERY_OWNERS.has(row.recovery_owner)) return true;
  if (row.loss_attribution && EXTERNAL_ATTRIBUTIONS.has(row.loss_attribution)) return true;
  return false;
}

export async function maybeCreateRecoveryCaseFromSupportPayoutCase(input: {
  client: SupabaseClient;
  merchantId: string;
  supportPayoutCaseId: string;
}): Promise<RecoveryCase | null> {
  const existing = await getRecoveryCaseForSupportPayoutCase(
    input.client,
    input.merchantId,
    input.supportPayoutCaseId,
  );
  if (existing) return existing;

  const { data: row, error } = await input.client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, merchant_id, claim_type, status, amount_at_risk, total_estimated_loss, currency, requested_action, loss_attribution, attribution_confidence, recoverability, recovery_owner, recovery_required_evidence, recovery_next_action')
    .eq('id', input.supportPayoutCaseId)
    .eq('merchant_id', input.merchantId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load support payout case for recovery: ${error.message}`);
  if (!row) return null;

  const payoutRow = row as SupportPayoutCaseRow;
  if (!shouldCreateRecoveryCaseFromRow(payoutRow)) return null;

  // A financial recovery must attach to a canonical loss record. Without one
  // there is nothing to recover against, so we do not create an orphan case.
  const { data: lossCase } = await input.client
    .from(TABLES.LOSS_CASES)
    .select('id')
    .eq('merchant_id', input.merchantId)
    .eq('support_payout_case_id', input.supportPayoutCaseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lossCase?.id) return null;

  const evidenceRes = await input.client
    .from('claim_evidence')
    .select('evidence_type')
    .eq('claim_id', input.supportPayoutCaseId)
    .eq('merchant_id', input.merchantId);
  const evidencePresent = Array.from(new Set((evidenceRes.data ?? []).map((item) => String(item.evidence_type))));
  const supportPayoutCase = supportPayoutCaseFromRow(payoutRow);
  const recoveryType = recoveryTypeForRow(payoutRow);
  const claimType = ruleClaimTypeForClaim(payoutRow.claim_type, payoutRow.requested_action);
  const partnerRule = await findBestPartnerRecoveryRule(input.client, {
    merchantId: input.merchantId,
    recoveryType,
    claimType,
  });
  const required = partnerRule?.required_evidence.length
    ? partnerRule.required_evidence
    : supportPayoutCase.recovery.requiredEvidence;
  const missing = required.filter((key) => !evidencePresent.includes(key));
  const estimate = calculateRecoveryEstimate({
    supportPayoutCase,
    partnerRecoveryRule: partnerRule,
    evidencePresent,
    evidenceMissing: missing,
  });
  if (estimate.estimatedRecoverableMax <= 0 && estimate.recoveryType === 'internal_policy_fix') {
    return null;
  }

  const deadlineAt = partnerRule?.deadline_days != null
    ? new Date(Date.now() + partnerRule.deadline_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return createRecoveryCase(input.client, {
    merchant_id: input.merchantId,
    support_payout_case_id: input.supportPayoutCaseId,
    loss_case_id: lossCase.id,
    partner_id: partnerRule?.partner_id ?? null,
    recovery_type: estimate.recoveryType,
    owner_type: ownerTypeForOwner(estimate.recoveryOwner),
    status: estimate.missingEvidence.length > 0 ? 'evidence_needed' : 'ready_to_submit',
    merchant_loss_amount: estimate.merchantLossAmount,
    eligible_loss_amount: estimate.eligibleLossAmount,
    estimated_recoverable_min: estimate.estimatedRecoverableMin,
    estimated_recoverable_max: estimate.estimatedRecoverableMax,
    currency: estimate.currency,
    deadline_at: deadlineAt,
    evidence_required: estimate.requiredEvidence,
    evidence_missing: estimate.missingEvidence,
    evidence_complete: estimate.missingEvidence.length === 0,
    calculation_reason: estimate.calculationReason,
    excluded_costs: estimate.excludedCosts,
  });
}
