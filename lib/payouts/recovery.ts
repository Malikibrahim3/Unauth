/**
 * lib/payouts/recovery.ts
 *
 * Lightweight recovery path (NOT a full RecoveryCase model). Given the advisory
 * attribution and the evidence checklist, who would the merchant chase, is the
 * loss recoverable, what is still needed, and what is the plain next step. Pure
 * and non-accusatory.
 */
import type {
  EvidenceChecklistResult,
  LikelyOwner,
  LossAttributionResult,
  Recoverability,
  RecoveryPath,
} from '@/lib/payouts/types';

const EXTERNAL_OWNER: Partial<Record<LossAttributionResult['label'], LikelyOwner>> = {
  carrier_loss: 'carrier',
  carrier_damage: 'carrier',
  three_pl_late_dispatch: 'three_pl',
  warehouse_mispick: 'warehouse',
  warehouse_missing_item: 'warehouse',
  supplier_defect: 'supplier',
};

function nextActionForOwner(owner: LikelyOwner): string {
  switch (owner) {
    case 'carrier':
      return 'File a carrier claim with tracking and proof of value.';
    case 'three_pl':
    case 'warehouse':
      return 'Open a fulfilment recovery case with the pick/pack record.';
    case 'supplier':
      return 'Raise a supplier defect claim with the affected unit details.';
    default:
      return 'Review manually to determine the loss point.';
  }
}

export function deriveRecoveryPath(
  attribution: LossAttributionResult,
  evidence: EvidenceChecklistResult,
): RecoveryPath {
  const missingKeys = evidence.items
    .filter((i) => i.state === 'missing')
    .map((i) => i.key);

  // 1. Inconclusive attribution → gather evidence first.
  if (attribution.confidence === 'needs_more_evidence') {
    const suggestedNextAction =
      missingKeys.length > 0
        ? `Gather ${missingKeys.join(', ')} to assess recovery.`
        : 'Gather more evidence to assess recovery.';
    return {
      recoverability: 'needs_more_evidence',
      likelyOwner: 'unknown',
      requiredEvidence: missingKeys,
      suggestedNextAction,
      reasons: ['Attribution is inconclusive; more evidence is needed to open recovery'],
    };
  }

  // 2. Merchant holds delivery evidence → nothing to recover from a third party.
  if (attribution.label === 'failed_delivery_evidence') {
    return {
      recoverability: 'not_recoverable',
      likelyOwner: 'merchant',
      requiredEvidence: [],
      suggestedNextAction:
        'Delivery evidence is on file — share proof of delivery with the customer or decline the payout under policy.',
      reasons: ['Proof of delivery on file; no third-party recovery applies'],
    };
  }

  // 3. External owner → chase the responsible party.
  const externalOwner = EXTERNAL_OWNER[attribution.label];
  if (externalOwner) {
    const recoverability: Recoverability =
      attribution.confidence === 'high' || attribution.confidence === 'medium'
        ? 'recoverable'
        : 'possibly_recoverable';
    return {
      recoverability,
      likelyOwner: externalOwner,
      requiredEvidence: missingKeys,
      suggestedNextAction: nextActionForOwner(externalOwner),
      reasons: [
        `Loss attributed to ${externalOwner.replace('_', ' ')} at ${attribution.confidence} confidence`,
      ],
    };
  }

  // 4. Customer / merchant-policy / packaging → internal, not third-party recoverable.
  if (
    attribution.label === 'customer_claim' ||
    attribution.label === 'merchant_policy' ||
    attribution.label === 'packaging_failure'
  ) {
    return {
      recoverability: 'not_recoverable',
      likelyOwner: 'merchant',
      requiredEvidence: [],
      suggestedNextAction:
        attribution.label === 'customer_claim'
          ? 'Resolve directly with the customer; no third-party recovery applies.'
          : 'Apply your merchant policy; no third-party recovery applies.',
      reasons: ['Loss sits with the merchant or customer; no external party to chase'],
    };
  }

  // 5. Unknown.
  return {
    recoverability: 'unknown',
    likelyOwner: 'unknown',
    requiredEvidence: missingKeys,
    suggestedNextAction: 'Review manually to determine the loss point.',
    reasons: ['Loss point could not be determined from available evidence'],
  };
}
