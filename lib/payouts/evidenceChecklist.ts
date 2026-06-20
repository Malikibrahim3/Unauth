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
  EvidenceStrength,
  PayoutClaimType,
} from '@/lib/payouts/types';

/** Booleans for the probe keys we can actually resolve from context. */
function buildProbeSnapshot(context: ClaimDecisionContext): Record<string, boolean> {
  const { delivery, evidence, order } = context;
  const delivered =
    delivery?.status === 'delivered' || delivery?.hasProofOfDelivery === true;
  return {
    tracking: delivery?.hasTracking === true,
    proof_of_delivery: delivery?.hasProofOfDelivery === true,
    carrier_identified: !!delivery?.carrier,
    delivery_confirmed: delivered,
    delivery_scan_timeline:
      !!delivery?.deliveredAt || (delivery?.daysSinceDelivery ?? null) !== null,
    customer_statement: evidence.hasCustomerEvidence === true,
    customer_evidence: evidence.hasCustomerEvidence === true,
    merchant_inspection: evidence.merchantEvidenceItems > 0,
    order_contents: order != null,
    order_on_file: order != null,
    delivery_status_known: delivery != null,
  };
}

function scoreStrength(items: EvidenceChecklistItem[]): EvidenceStrength {
  const assessed = items.filter((i) => i.state !== 'not_tracked');
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
    const present = snapshot[t.key] === true;
    return {
      key: t.key,
      label: t.label,
      state: present ? 'present' : 'missing',
      contextField: t.key,
      weight: t.weight,
      reason: present ? 'On file' : 'Not on file',
    };
  });

  const presentCount = items.filter((i) => i.state === 'present').length;
  const expectedCount = items.filter((i) => i.state !== 'not_tracked').length;
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
