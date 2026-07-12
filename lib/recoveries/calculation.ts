import type { SupportPayoutCase } from '@/lib/payouts/types';
import type { PartnerRecoveryRule, PartnerRecoveryType } from '@/lib/partners/types';
import type { RecoveryEstimate, RecoveryExcludedCost, RecoveryOwnerType } from '@/lib/recoveries/types';

function clampMoney(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100) / 100);
}

function recoveryTypeForOwner(owner: string | null | undefined): PartnerRecoveryType {
  switch (owner) {
    case 'carrier':
      return 'carrier_claim';
    case 'three_pl':
      return 'three_pl_claim';
    case 'warehouse':
      return 'warehouse_error';
    case 'supplier':
      return 'supplier_defect';
    default:
      return 'other';
  }
}

function recoveryOwnerForCase(payoutCase: SupportPayoutCase, rule?: PartnerRecoveryRule | null): RecoveryOwnerType | 'merchant' {
  if (rule?.recovery_type === 'returns_provider_claim') return 'returns_provider';
  if (rule?.recovery_type === 'chargeback_evidence') return 'payment_dispute_provider';
  if (rule?.recovery_type === 'internal_policy_fix') return 'merchant';
  const owner = payoutCase.recovery.likelyOwner;
  if (owner === 'merchant') return 'merchant';
  if (owner === 'carrier' || owner === 'three_pl' || owner === 'warehouse' || owner === 'supplier' || owner === 'unknown') {
    return owner;
  }
  return 'unknown';
}

function applyLiabilityCap(amount: number, rule: PartnerRecoveryRule | null | undefined): {
  eligible: number;
  capped: boolean;
} {
  if (!rule?.liability_cap_amount || rule.liability_cap_amount <= 0) {
    return { eligible: amount, capped: false };
  }
  return { eligible: Math.min(amount, rule.liability_cap_amount), capped: rule.liability_cap_amount < amount };
}

export function calculateRecoveryEstimate(input: {
  supportPayoutCase: SupportPayoutCase;
  partnerRecoveryRule?: PartnerRecoveryRule | null;
  evidencePresent: string[];
  evidenceMissing: string[];
}): RecoveryEstimate {
  const { supportPayoutCase, partnerRecoveryRule } = input;
  const merchantLossAmount = clampMoney(supportPayoutCase.exposure.total.amount);
  const currency = supportPayoutCase.exposure.total.currency ?? 'USD';
  const recoveryOwner = recoveryOwnerForCase(supportPayoutCase, partnerRecoveryRule);
  const recoveryType = partnerRecoveryRule?.recovery_type ?? recoveryTypeForOwner(recoveryOwner);
  const requiredEvidence = partnerRecoveryRule?.required_evidence.length
    ? partnerRecoveryRule.required_evidence
    : supportPayoutCase.recovery.requiredEvidence;
  const present = new Set(input.evidencePresent);
  const missingFromRule = requiredEvidence.filter((key) => !present.has(key));
  const missingEvidence = Array.from(new Set([...missingFromRule, ...input.evidenceMissing]));
  const evidenceComplete = missingEvidence.length === 0;
  const reasons: string[] = [];
  const excludedCosts: RecoveryExcludedCost[] = [];

  reasons.push(`Merchant loss estimated at ${merchantLossAmount.toFixed(2)} ${currency}`);

  if (recoveryOwner === 'merchant' || supportPayoutCase.recovery.recoverability === 'not_recoverable') {
    reasons.push('No external recovery route identified; keep this as prevention or policy intelligence');
    return {
      merchantLossAmount,
      eligibleLossAmount: 0,
      estimatedRecoverableMin: 0,
      estimatedRecoverableMax: 0,
      currency,
      recoveryOwner,
      recoveryType: recoveryType === 'other' ? 'internal_policy_fix' : recoveryType,
      calculationReason: reasons,
      excludedCosts: [
        {
          label: 'Support payout',
          amount: merchantLossAmount,
          reason: 'Loss is currently attributed to merchant policy or non-recoverable handling',
        },
      ],
      requiredEvidence,
      missingEvidence,
      confidence: partnerRecoveryRule?.confidence ?? 'low',
    };
  }

  const { eligible, capped } = applyLiabilityCap(merchantLossAmount, partnerRecoveryRule);
  const eligibleLossAmount = clampMoney(eligible);
  if (partnerRecoveryRule) {
    reasons.push(`Matched partner rule: ${partnerRecoveryRule.rule_name}`);
    if (capped) {
      reasons.push(`Eligible amount capped by rule at ${eligibleLossAmount.toFixed(2)} ${currency}`);
    }
  } else {
    reasons.push('No partner rulebook match yet; estimate uses conservative default recoverability');
  }
  if (!evidenceComplete) {
    reasons.push(`${missingEvidence.length} required evidence item(s) still missing`);
  }

  const confidence = partnerRecoveryRule?.confidence
    ?? (supportPayoutCase.recovery.recoverability === 'recoverable' && evidenceComplete ? 'medium' : 'low');
  const maxMultiplier = partnerRecoveryRule ? 1 : supportPayoutCase.recovery.recoverability === 'recoverable' ? 0.75 : 0.4;
  const minMultiplier = evidenceComplete ? (partnerRecoveryRule ? 0.5 : 0.25) : 0;

  return {
    merchantLossAmount,
    eligibleLossAmount,
    estimatedRecoverableMin: clampMoney(eligibleLossAmount * minMultiplier),
    estimatedRecoverableMax: clampMoney(eligibleLossAmount * maxMultiplier),
    currency,
    recoveryOwner,
    recoveryType,
    calculationReason: reasons,
    excludedCosts,
    requiredEvidence,
    missingEvidence,
    confidence,
  };
}
