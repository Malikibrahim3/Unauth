/**
 * lib/payouts/evidenceChecklist.ts
 *
 * Builds the documentary-evidence checklist for a case: which expected items are
 * present, missing, or simply not tracked by any data source we have. Produces an
 * overall `strength` from a transparent weighted ratio.
 *
 * IMPORTANT: this is the documentary-completeness axis ("can we defend this
 * payout decision?"). It is deliberately separate from the network behavioural
 * evidence score in lib/engine/evidence — the two are never combined.
 */
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { checklistTemplateFor } from '@/lib/payouts/config';
import type {
  EvidenceChecklistItem,
  EvidenceChecklistResult,
  EvidenceItemState,
  EvidenceStrength,
  PayoutClaimType,
} from '@/lib/payouts/types';

type ProbeSnapshot = Record<string, EvidenceItemState>;

/** Resolve documentary evidence probes from delivery + integration context. */
function buildProbeSnapshot(context: ClaimDecisionContext): ProbeSnapshot {
  const { delivery, evidence, order } = context;
  const evidenceTypes = new Set(evidence.evidenceTypes ?? []);
  const canonicalEvidenceProbes: ProbeSnapshot = evidence.evidenceTypes ? {
    pick_pack_record: evidenceTypes.has('pick_pack_record') ? 'present' : 'missing',
    packing_slip: evidenceTypes.has('packing_slip') ? 'present' : 'missing',
    packaging_condition: evidenceTypes.has('packaging_condition') ? 'present' : 'missing',
    carrier_damage_report: evidenceTypes.has('carrier_damage_report') ? 'present' : 'missing',
    received_item_photo: evidenceTypes.has('received_item_photo') ? 'present' : 'missing',
  } : {};
  const delivered =
    delivery?.status === 'delivered' || delivery?.hasProofOfDelivery === true;
  const carrierDirectActive = delivery?.carrierDirectConnected === true;
  const trackingProviderConnected = delivery?.trackingProviderConnected === true;

  const deliveryPhotoState: EvidenceItemState = delivery?.deliveryPhotoAvailable
    ? 'present'
    : carrierDirectActive
      ? 'unavailable'
      : 'not_tracked';
  const signatureState: EvidenceItemState = delivery?.signatureAvailable
    ? 'present'
    : carrierDirectActive
      ? 'unavailable'
      : 'not_tracked';
  const gpsState: EvidenceItemState = trackingProviderConnected && delivery?.gpsSupported === false
    ? 'unavailable'
    : 'not_tracked';

  return {
    tracking: delivery?.hasTracking === true ? 'present' : 'missing',
    proof_of_delivery: delivery?.hasProofOfDelivery === true ? 'present' : 'missing',
    carrier_identified: delivery?.carrier ? 'present' : 'missing',
    delivery_confirmed: delivered ? 'present' : 'missing',
    delivery_scan_timeline:
      delivery?.deliveredAt || (delivery?.scanCount ?? 0) > 0 || (delivery?.daysSinceDelivery ?? null) !== null
        ? 'present'
        : 'missing',
    customer_statement: evidence.hasCustomerEvidence === true ? 'present' : 'missing',
    customer_evidence: evidence.hasCustomerEvidence === true ? 'present' : 'missing',
    merchant_inspection: evidence.merchantEvidenceItems > 0 ? 'present' : 'missing',
    order_contents: order != null ? 'present' : 'missing',
    order_on_file: order != null ? 'present' : 'missing',
    delivery_status_known: delivery != null && (
      delivery.trackingGap === 'provider_not_connected'
        ? true
        : delivery.status != null ||
          delivery.trackingGap === 'no_tracking_number' ||
          delivery.trackingGap === 'tracking_not_found' ||
          (delivery.scanCount ?? 0) > 0
    ) ? 'present' : 'missing',
    delivery_photo: deliveryPhotoState,
    signature: signatureState,
    gps: gpsState,
    ...canonicalEvidenceProbes,
  };
}

function probeReason(key: string, state: EvidenceItemState, delivery: ClaimDecisionContext['delivery']): string {
  if (state === 'present') return 'On file';
  if (state === 'unavailable') {
    if (key === 'delivery_photo') return 'Not available from the carrier for this shipment';
    if (key === 'signature') return 'Not available from the carrier for this shipment';
    if (key === 'gps') return 'Unsupported by connected tracking providers';
    return 'Not collectible from this provider';
  }
  if (state === 'not_tracked') return 'Not currently captured by your connected sources';
  if (key === 'tracking' && delivery?.trackingGap === 'no_tracking_number') {
    return 'No tracking number on the source order';
  }
  if (key === 'delivery_status_known' && delivery?.trackingGap === 'provider_not_connected') {
    return 'Tracking provider not connected';
  }
  if (key === 'tracking' && delivery?.trackingGap === 'tracking_not_found') {
    return 'Tracking not found by the connected carrier';
  }
  return 'Not on file';
}

function scoreStrength(items: EvidenceChecklistItem[]): EvidenceStrength {
  const assessed = items.filter((i) => i.state === 'present' || i.state === 'missing');
  const present = assessed.filter((i) => i.state === 'present');
  if (present.length === 0 || assessed.length === 0) return 'missing';

  const expectedWeight = assessed.reduce((sum, i) => sum + i.weight, 0);
  const presentWeight = present.reduce((sum, i) => sum + i.weight, 0);
  const ratio = expectedWeight === 0 ? 0 : presentWeight / expectedWeight;

  const highWeightExpected = assessed.filter((i) => i.weight >= 2);
  const allHighWeightPresent = highWeightExpected.every((i) => i.state === 'present');

  if (ratio >= 0.75 && allHighWeightPresent) return 'strong';
  if (ratio >= 0.5) return 'moderate';
  return 'weak';
}

export function buildEvidenceChecklist(
  context: ClaimDecisionContext,
  claimType: PayoutClaimType | null,
): EvidenceChecklistResult {
  const template = checklistTemplateFor(claimType);
  const snapshot = buildProbeSnapshot(context);

  const items: EvidenceChecklistItem[] = template.map((t) => {
    const tracked = Object.prototype.hasOwnProperty.call(snapshot, t.key);
    if (!tracked) {
      return {
        key: t.key,
        label: t.label,
        state: 'not_tracked',
        contextField: null,
        weight: t.weight,
        reason: 'Not currently captured by your connected sources',
      };
    }
    const state = snapshot[t.key];
    return {
      key: t.key,
      label: t.label,
      state,
      contextField: t.key,
      weight: t.weight,
      reason: probeReason(t.key, state, context.delivery),
    };
  });

  const presentCount = items.filter((i) => i.state === 'present').length;
  const expectedCount = items.filter((i) => i.state === 'present' || i.state === 'missing').length;
  const strength = scoreStrength(items);

  const reasons: string[] = [];
  if (expectedCount === 0) {
    reasons.push('No assessable evidence items for this claim type');
  } else {
    reasons.push(`${presentCount} of ${expectedCount} expected evidence items on file`);
  }
  const notTracked = items.filter((i) => i.state === 'not_tracked').length;
  if (notTracked > 0) {
    reasons.push(`${notTracked} item(s) not tracked by current integrations`);
  }

  return {
    claimType,
    items,
    presentCount,
    expectedCount,
    strength,
    reasons,
  };
}
