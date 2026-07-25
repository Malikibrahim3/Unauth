/**
 * lib/payouts/attribution.ts
 *
 * ADVISORY loss attribution. Given the evidence we hold, where did the loss most
 * likely occur — and how confident can we be? This is a NEW, transparent,
 * rules-based derivation; it does not touch any scorer in lib/engine and is never
 * a fraud verdict. Confidence degrades to needs_more_evidence when key signals
 * are absent. Labels needing data we do not yet capture (carrier exception feeds,
 * 3PL dispatch SLAs) are capped at `low` and say so in their reasons.
 */
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import type {
  AttributionConfidence,
  LossAttributionLabel,
  LossAttributionReason,
  LossAttributionResult,
  PayoutClaimType,
} from '@/lib/payouts/types';

type Draft = {
  label: LossAttributionLabel;
  confidence: AttributionConfidence;
  reasons: LossAttributionReason[];
};

function reason(code: string, text: string, signal: string | null = null): LossAttributionReason {
  return { code, text, signal };
}

function unclear(reasons: LossAttributionReason[]): Draft {
  return { label: 'unknown', confidence: 'needs_more_evidence', reasons };
}

type DeliveryFacts = {
  hasDelivery: boolean;
  delivered: boolean;
  hasPod: boolean;
  hasTracking: boolean;
  inTransit: boolean;
  hasCustomerEvidence: boolean;
  hasInspection: boolean;
  deliveryPhotoFinding: 'consistent' | 'inconsistent' | 'unclear' | null;
};

function deliveryFacts(context: ClaimDecisionContext): DeliveryFacts {
  const d = context.delivery;
  return {
    hasDelivery: d != null,
    delivered: d?.status === 'delivered' || d?.hasProofOfDelivery === true,
    hasPod: d?.hasProofOfDelivery === true,
    hasTracking: d?.hasTracking === true,
    inTransit: d?.status === 'in_transit' || d?.status === 'pending',
    hasCustomerEvidence: context.evidence.hasCustomerEvidence === true,
    hasInspection: context.evidence.merchantEvidenceItems > 0,
    deliveryPhotoFinding: d?.deliveryPhotoFinding ?? null,
  };
}

function attributeItemNotReceived(f: DeliveryFacts): Draft {
  if (f.deliveryPhotoFinding === 'inconsistent') {
    return {
      label: 'carrier_loss',
      confidence: 'medium',
      reasons: [
        reason('delivery_photo_inconsistent', 'Merchant review found the delivery photo inconsistent with the intended address', 'delivery.deliveryPhotoFinding'),
        reason('carrier_location_needed', 'Carrier location or driver evidence is still required before confirmation', null),
      ],
    };
  }
  if (f.deliveryPhotoFinding === 'unclear') {
    return unclear([
      reason('delivery_photo_unclear', 'The delivery photo was reviewed but remains unclear', 'delivery.deliveryPhotoFinding'),
    ]);
  }
  if (f.hasPod && f.deliveryPhotoFinding === 'consistent') {
    return unclear([
      reason(
        'delivery_artifact_not_dispositive',
        'A delivery artefact is on file and was marked consistent, but it does not by itself establish the contents of the parcel or customer receipt',
        'delivery.deliveryPhotoFinding',
      ),
    ]);
  }
  if (f.hasPod) {
    return unclear([
      reason('pod_not_interpreted', 'A delivery artefact is on file, but it has not established delivery to the intended address', 'delivery.hasProofOfDelivery'),
    ]);
  }
  if (f.delivered) {
    return unclear([
      reason('delivered_no_pod', 'Carrier marked the parcel delivered, but no supporting delivery artefact is on file', 'delivery.status'),
    ]);
  }
  if (f.inTransit && f.hasTracking) {
    return {
      label: 'carrier_loss',
      confidence: 'low',
      reasons: [
        reason('in_transit_tracking', 'In transit with tracking but not delivered', 'delivery.status'),
        reason('needs_carrier_confirmation', 'Carrier non-delivery not yet confirmed (no carrier exception feed)', null),
      ],
    };
  }
  if (!f.hasDelivery || !f.hasTracking) {
    return unclear([reason('no_delivery_signal', 'No tracking or delivery status available', 'delivery')]);
  }
  return {
    label: 'customer_claim',
    confidence: 'low',
    reasons: [reason('uncertain_inr', 'Delivery is inconclusive; resting on the customer statement', 'delivery.status')],
  };
}

function attributeMissingItem(f: DeliveryFacts): Draft {
  if (f.delivered && f.hasCustomerEvidence) {
    return unclear([
      reason('delivered_missing_item_claim', 'Parcel delivered but customer reports a missing item', 'delivery.status'),
      reason('physical_pack_evidence_missing', 'The available records do not include a pick/pack scan, parcel weight, or physical pack artifact', null),
    ]);
  }
  if (f.delivered) {
    return unclear([
      reason('delivered_no_statement', 'Delivered with no customer statement on file', 'delivery.status'),
      reason('physical_pack_evidence_missing', 'A delivery scan does not establish what was inside the parcel', null),
    ]);
  }
  return unclear([reason('no_delivery_signal', 'No delivery confirmation available', 'delivery')]);
}

function attributeDamaged(f: DeliveryFacts): Draft {
  if (f.delivered && f.hasCustomerEvidence && f.hasInspection) {
    return {
      label: 'carrier_damage',
      confidence: 'medium',
      reasons: [
        reason('delivered_with_evidence_and_inspection', 'Delivered, customer evidence and a merchant inspection on file', 'evidence'),
        reason('no_packaging_signal', 'Packaging-condition signal not tracked, so transit vs packaging cannot be separated', null),
      ],
    };
  }
  if (f.delivered && f.hasCustomerEvidence) {
    return {
      label: 'customer_claim',
      confidence: 'low',
      reasons: [reason('delivered_evidence_no_inspection', 'Customer evidence on file but no merchant inspection', 'evidence.hasCustomerEvidence')],
    };
  }
  if (!f.delivered) {
    return unclear([reason('no_delivery_confirmation', 'No delivery confirmation for the damaged item', 'delivery')]);
  }
  return {
    label: 'customer_claim',
    confidence: 'low',
    reasons: [reason('damaged_minimal_evidence', 'Delivered but minimal supporting evidence on file', 'evidence')],
  };
}

function attributeWrongItem(f: DeliveryFacts): Draft {
  if (f.delivered && f.hasInspection) {
    return unclear([
      reason('delivered_with_inspection', 'Delivered and a return/inspection record is on file', 'evidence'),
      reason('physical_pick_evidence_missing', 'The inspection does not establish which item was picked or packed', null),
    ]);
  }
  if (f.delivered && f.hasCustomerEvidence) {
    return {
      label: 'customer_claim',
      confidence: 'low',
      reasons: [reason('delivered_statement_only', 'Delivered with a customer statement but no inspection', 'evidence.hasCustomerEvidence')],
    };
  }
  if (!f.delivered) {
    return unclear([reason('no_delivery_confirmation', 'No delivery confirmation for the wrong-item claim', 'delivery')]);
  }
  return {
    label: 'customer_claim',
    confidence: 'low',
    reasons: [reason('wrong_item_minimal_evidence', 'Delivered but minimal supporting evidence on file', 'evidence')],
  };
}

function attributeNotAsDescribed(context: ClaimDecisionContext, f: DeliveryFacts): Draft {
  if (f.delivered && context.order != null) {
    return {
      label: 'merchant_policy',
      confidence: 'low',
      reasons: [reason('description_dispute', 'Delivered item disputed against its listing — a merchant policy call', 'order')],
    };
  }
  if (f.delivered) {
    return {
      label: 'customer_claim',
      confidence: 'low',
      reasons: [reason('description_dispute_no_order', 'Description dispute with limited order context', 'order')],
    };
  }
  return unclear([reason('no_delivery_signal', 'No delivery confirmation available', 'delivery')]);
}

function attributePolicyOrCustomer(label: LossAttributionLabel, code: string, text: string, f: DeliveryFacts): Draft {
  if (!f.hasDelivery && !f.hasCustomerEvidence) {
    return unclear([reason('insufficient_context', 'No delivery or evidence context available', null)]);
  }
  return { label, confidence: 'low', reasons: [reason(code, text, null)] };
}

export function deriveLossAttribution(
  context: ClaimDecisionContext,
  claimType: PayoutClaimType | null,
): LossAttributionResult {
  const f = deliveryFacts(context);

  let draft: Draft;
  switch (claimType) {
    case 'item_not_received':
      draft = attributeItemNotReceived(f);
      break;
    case 'missing_item':
      draft = attributeMissingItem(f);
      break;
    case 'damaged':
      draft = attributeDamaged(f);
      break;
    case 'wrong_item':
      draft = attributeWrongItem(f);
      break;
    case 'not_as_described':
      draft = attributeNotAsDescribed(context, f);
      break;
    case 'refund_request':
      draft = attributePolicyOrCustomer('merchant_policy', 'discretionary_refund', 'Discretionary refund request — a merchant policy call', f);
      break;
    case 'chargeback':
      draft = attributePolicyOrCustomer('customer_claim', 'chargeback_dispute', 'Chargeback-related dispute resting on the customer claim', f);
      break;
    case 'return_abuse':
      draft = attributePolicyOrCustomer('merchant_policy', 'return_pattern', 'Return-pattern concern — a merchant policy call', f);
      break;
    default:
      draft = unclear([reason('unmapped_claim_type', 'Claim type does not map to a specific loss point', 'claim.type')]);
      break;
  }

  return {
    label: draft.label,
    confidence: draft.confidence,
    reasons: draft.reasons,
    networkBenchmark: null,
    isAdvisory: true,
  };
}

/**
 * Reclassify an already-derived attribution to `policy_override` when the
 * merchant's own rule recommendation was to deny under policy and the
 * recorded decision approved the payout anyway. Mirrors the "policy leakage"
 * condition in the dashboard aggregation — same signal, applied
 * at the point the decision is actually known (attribution runs before a
 * decision exists, so this is a separate reclassification step, not part of
 * deriveLossAttribution itself).
 */
export function applyPolicyOverrideAttribution(
  attribution: LossAttributionResult,
  outcome: {
    followedRecommendation: boolean | null;
    recommendedAction: string | null;
    decision: string | null;
  },
): LossAttributionResult {
  const isOverride =
    outcome.followedRecommendation === false &&
    outcome.recommendedAction === 'deny_under_policy' &&
    outcome.decision === 'approved';
  if (!isOverride) return attribution;

  return {
    label: 'policy_override',
    confidence: 'high',
    reasons: [
      reason(
        'policy_override',
        'Merchant rule recommended denying under policy; the recorded decision approved payout anyway',
        'claim_outcomes.followed_recommendation',
      ),
    ],
    networkBenchmark: null,
    isAdvisory: true,
  };
}
