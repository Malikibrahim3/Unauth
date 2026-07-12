/**
 * lib/claim-gate/evidenceStrength.ts
 *
 * Evidence strength classifier.
 *
 * Classifies how complete the delivery / fulfilment picture is into a NAMED
 * tier — never a number, percentage, or letter grade. The tier describes the
 * completeness of the evidence; it does NOT judge the customer and is separate
 * from whether a merchant rule fired.
 *
 * Pure function: deterministic for a given evidence state + claim type.
 */
import type { ClaimGateClaimType } from '@/lib/claim-gate/types';
import type { ClaimEvidenceState } from '@/lib/claim-gate/evidenceState';

export type EvidenceStrength = 'strong' | 'partial' | 'weak' | 'insufficient';

export type EvidenceStrengthResult = {
  strength: EvidenceStrength;
  /** Plain-English explanation of why this tier was assigned. */
  explanation: string;
};

/** Claim types whose strength is governed by warehouse / fulfilment evidence. */
const WAREHOUSE_CLAIM_TYPES = new Set<ClaimGateClaimType>(['WRONG_ITEM', 'MISSING_ITEM']);

function classifyDelivery(state: ClaimEvidenceState): EvidenceStrengthResult {
  // insufficient — the carrier returned nothing, or tracking was not found.
  if (state.delivery_status === 'unavailable') {
    return {
      strength: 'insufficient',
      explanation: 'No carrier tracking is connected, so delivery cannot be confirmed.',
    };
  }
  if (state.delivery_status === 'missing' || state.delivery_scan === 'unavailable') {
    return {
      strength: 'insufficient',
      explanation: 'The carrier returned no tracking data, so delivery could not be confirmed.',
    };
  }
  // weak — a status exists but there is no delivered scan (in transit / exception / failed).
  if (state.delivery_scan !== 'present') {
    return {
      strength: 'weak',
      explanation: 'A carrier status is present but there is no delivered scan (in transit, exception, or failed attempt).',
    };
  }
  // strong — delivered scan AND proof of delivery present.
  if (state.proof_of_delivery === 'present') {
    return {
      strength: 'strong',
      explanation: 'Delivery scan present and proof of delivery (photo or signature) on file.',
    };
  }
  // partial — delivered scan present, proof of delivery missing.
  if (state.proof_of_delivery === 'unavailable') {
    return {
      strength: 'partial',
      explanation: 'Delivery scan present, but no proof-of-delivery photo is available from this carrier.',
    };
  }
  return {
    strength: 'partial',
    explanation: 'Delivery scan present but no proof-of-delivery photo on file.',
  };
}

function classifyWarehouse(state: ClaimEvidenceState): EvidenceStrengthResult {
  // weak — no warehouse integration connected; we can only infer from the claim.
  if (state.warehouse_fulfillment === 'unavailable') {
    return {
      strength: 'weak',
      explanation: 'Warehouse fulfilment data is unavailable (no fulfilment integration connected) — limited to inference from the claim.',
    };
  }
  // missing — connected but the order was not found in the warehouse.
  if (state.warehouse_fulfillment === 'missing') {
    return {
      strength: 'insufficient',
      explanation: 'The fulfilment integration is connected but returned no record for this order.',
    };
  }
  // strong — warehouse fulfilment present AND we can verify the picked SKU.
  if (state.sku_verification === 'present') {
    return {
      strength: 'strong',
      explanation: 'Warehouse fulfilment record present and pick/pack detail allows the shipped SKU to be verified.',
    };
  }
  // partial — fulfilment present but SKU comparison is ambiguous.
  return {
    strength: 'partial',
    explanation: 'Warehouse fulfilment record present but pick/pack detail is insufficient to verify the shipped SKU.',
  };
}

/**
 * Classify overall evidence strength into a named tier.
 *
 * Wrong-item / missing-item claims are governed by warehouse evidence; all
 * other claim types are governed by delivery evidence.
 */
export function classifyEvidenceStrength(
  state: ClaimEvidenceState,
  claimType: ClaimGateClaimType,
): EvidenceStrengthResult {
  if (WAREHOUSE_CLAIM_TYPES.has(claimType)) {
    return classifyWarehouse(state);
  }
  return classifyDelivery(state);
}
