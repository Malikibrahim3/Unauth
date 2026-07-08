/**
 * lib/claim-gate/buildRecommendation.ts
 *
 * The deterministic reasoning core. Given the rule-engine result, the evidence
 * state, and the evidence strength, it produces a structured, fully-explained
 * recommendation.
 *
 * Every field it outputs is derivable from its inputs — no judgement calls
 * beyond the logic defined here, no LLM, no probabilistic scoring. Given the
 * same inputs it always returns identical output.
 *
 * Hard rules (see the build brief):
 *   A. Reasoning is composed from conditions that actually fired, not invented.
 *   B. Recovery routes only appear when genuinely available given the evidence.
 *   C. The suggested next step is always framed as the merchant's policy — never
 *      a verdict ("deny"/"approve the claim") and never accusatory.
 *   D. Limitations are populated honestly for every `unavailable` dimension.
 *   E. Proceed recommendations also carry reasoning.
 */
import type { ClaimGateClaimType, ClaimGateDecision, ClaimGateEvidence } from '@/lib/claim-gate/types';
import { evaluateEvidenceState, type ClaimEvidenceState } from '@/lib/claim-gate/evidenceState';
import {
  classifyEvidenceStrength,
  type EvidenceStrength,
  type EvidenceStrengthResult,
} from '@/lib/claim-gate/evidenceStrength';
import { formatCurrency } from '@/lib/utils/format';

// Carrier claim windows (days) by carrier slug. Used for lost-in-transit deadline calculation.
const LOST_PARCEL_CLAIM_WINDOW_DAYS: Record<string, number> = {
  'royal-mail': 80,
  evri: 28,
  dpd: 28,
  dhl: 30,
  ups: 60,
  fedex: 60,
  usps: 60,
  default: 30,
};

function carrierWindowDays(carrier: string | null | undefined): number {
  const slug = (carrier ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return LOST_PARCEL_CLAIM_WINDOW_DAYS[slug] ?? LOST_PARCEL_CLAIM_WINDOW_DAYS.default;
}

function lostInTransitDeadline(evidence: ClaimGateEvidence): string | undefined {
  // Use the most recent checkpoint time across all tracking items (sorted
  // lexicographically — ISO 8601 dates sort correctly that way). This keeps
  // the result identical regardless of input-array ordering.
  const checkpointTimes = evidence.fulfillmentEvidence.map((item) => item.last_checkpoint_time).sort();
  const latestCheckpoint = checkpointTimes.length > 0 ? checkpointTimes[checkpointTimes.length - 1] : null;
  const windowStart = latestCheckpoint ?? (evidence.shipment?.occurred_at as string | undefined) ?? null;
  if (!windowStart) return undefined;
  const carrier = evidence.summary.carrier ?? evidence.fulfillmentEvidence[0]?.carrier;
  const deadlineMs = Date.parse(windowStart) + carrierWindowDays(carrier) * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(deadlineMs)) return undefined;
  return new Date(deadlineMs).toISOString().slice(0, 10);
}

export type RecoveryRouteKind =
  | 'carrier_claim'
  | 'chargeback_evidence_preservation'
  | 'three_pl_investigation'
  | 'none';

export type RecoveryRoute = {
  route: RecoveryRouteKind;
  available: boolean;
  detail: string;
  deadline?: string;
};

export type TriggeredRuleReasoning = {
  rule_name: string;
  conditions_met: string[];
};

export type GateRecommendation = {
  decision: 'hold' | 'proceed';
  reasoning: {
    triggered_rules: TriggeredRuleReasoning[];
    evidence_strength: EvidenceStrength;
    evidence_strength_explanation: string;
  };
  money_at_risk: number;
  currency: string;
  recovery_routes: RecoveryRoute[];
  suggested_next_step: string;
  limitations: string[];
};

const WAREHOUSE_CLAIM_TYPES = new Set<ClaimGateClaimType>(['WRONG_ITEM', 'MISSING_ITEM']);

/**
 * Rule A — render the rules that fired into human-readable reasoning. Each line
 * is a faithful rendering of a condition the merchant's own rule matched; the
 * rule engine already surfaces these as a `;`-joined string.
 */
function buildTriggeredRules(decision: ClaimGateDecision): TriggeredRuleReasoning[] {
  return decision.triggeredRules.map((rule) => ({
    rule_name: rule.rule_name,
    conditions_met: rule.reason
      ? rule.reason
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
      : [],
  }));
}

/** Rule B — only routes that are genuinely actionable given the evidence. */
function buildRecoveryRoutes(input: {
  evidence: ClaimGateEvidence;
  state: ClaimEvidenceState;
  claimType: ClaimGateClaimType;
  held: boolean;
  gateStatus: ClaimGateDecision['gateStatus'];
}): RecoveryRoute[] {
  const { evidence, state, claimType, held, gateStatus } = input;
  const routes: RecoveryRoute[] = [];

  // Case 1 — Delivered but disputed: scan confirmed, window still open.
  // Gate on `held`: there is no recovery to pursue when the gate proceeds.
  if (held && state.delivery_scan === 'present' && evidence.summary.carrier_claim_window === 'OPEN') {
    const deadline =
      evidence.fulfillmentEvidence.find((item) => item.carrier_claim_window_open)?.carrier_claim_deadline ?? undefined;
    routes.push({
      route: 'carrier_claim',
      available: true,
      detail: deadline
        ? `Carrier claim may apply — delivered scan present but customer disputes receipt. Window open until ${deadline}.`
        : 'Carrier claim may apply — delivered scan present but customer disputes receipt. Window open.',
      ...(deadline ? { deadline } : {}),
    });
  }

  // Case 2 — Lost in transit: carrier tracking present, no delivered scan, status
  // shows in-transit / exception / stalled. This is often the strongest carrier
  // claim and must not be suppressed just because no delivered scan exists.
  const isLostInTransit =
    held &&
    state.delivery_status === 'present' &&
    state.delivery_scan !== 'present' &&
    evidence.summary.delivery_status !== 'DELIVERED';

  if (isLostInTransit) {
    const status = evidence.summary.delivery_status;
    const deadline = lostInTransitDeadline(evidence);
    routes.push({
      route: 'carrier_claim',
      available: true,
      detail: deadline
        ? `Carrier claim may apply — tracking shows ${status}, no delivery confirmation. Window open until ${deadline}.`
        : `Carrier claim may apply — tracking shows ${status}, no delivery confirmation. Check with carrier for claim window.`,
      ...(deadline ? { deadline } : {}),
    });
  }

  // Chargeback evidence preservation — on a chargeback-risk signal or ESCALATE.
  if (
    evidence.summary.chargeback_risk === 'HIGH' ||
    evidence.summary.chargeback_risk === 'MEDIUM' ||
    gateStatus === 'ESCALATE'
  ) {
    routes.push({
      route: 'chargeback_evidence_preservation',
      available: true,
      detail: 'Preserve delivery and order evidence in case of a payment dispute.',
    });
  }

  // 3PL investigation — only when the warehouse returned a record AND flagged an
  // exception. Clean fulfilment (no exception) is evidence the pick was correct;
  // surfacing an investigation route in that case would contradict the evidence.
  if (WAREHOUSE_CLAIM_TYPES.has(claimType) && state.warehouse_fulfillment === 'present') {
    const hasException = evidence.shipbobEvidence?.exception_present === true;
    if (hasException) {
      const exceptionDetail = evidence.shipbobEvidence?.exception_reason
        ? ` — ${evidence.shipbobEvidence.exception_reason}`
        : '';
      routes.push({
        route: 'three_pl_investigation',
        available: true,
        detail: `Warehouse records show a fulfilment exception${exceptionDetail}. Open a 3PL investigation to verify the picked SKU against the order.`,
      });
    }
  }

  return routes;
}

/**
 * Rule C — the next step is always framed as the merchant's policy, never a
 * verdict. Templated as: "[action] before [refund/replacement], per your policy
 * rule '[rule name]'."
 */
function buildSuggestedNextStep(input: {
  held: boolean;
  decision: ClaimGateDecision;
  strength: EvidenceStrength;
}): string {
  const { held, decision, strength } = input;
  if (!held) {
    return `No review rules triggered. Delivery evidence: ${strength}. Proceed under standard policy.`;
  }
  const ruleName = decision.triggeredRules[0]?.rule_name;
  const policyClause = ruleName ? `per your policy rule '${ruleName}'` : 'per your policy';
  return `Escalate to a manager and request delivery confirmation before issuing a refund or replacement, ${policyClause}.`;
}

/**
 * Rule D — populate honest limitations for every `unavailable` dimension, plus
 * the "carrier returned nothing" case and any cross-source conflicts. Grouped
 * by source so the merchant gets one clear sentence per gap rather than
 * a list of near-duplicates.
 */
function buildLimitations(
  state: ClaimEvidenceState,
  claimType: ClaimGateClaimType,
  evidence: ClaimGateEvidence,
): string[] {
  const limitations: string[] = [];
  const isWarehouseClaim = WAREHOUSE_CLAIM_TYPES.has(claimType);

  // Carrier gaps are relevant to delivery-family claims (and to any claim that
  // turned out to rest on delivery evidence). They are not meaningful context
  // for a wrong/missing-item claim, where fulfilment — not delivery — is at issue.
  if (!isWarehouseClaim) {
    const carrierUnavailable =
      state.delivery_status === 'unavailable' ||
      state.delivery_scan === 'unavailable' ||
      state.proof_of_delivery === 'unavailable' ||
      state.carrier_claim_window === 'unavailable';
    if (carrierUnavailable) {
      limitations.push(
        'Carrier tracking unavailable — delivery scans, proof of delivery, and the carrier claim window cannot be confirmed, as no carrier tracking integration is connected.',
      );
    } else if (state.delivery_status === 'missing' && state.delivery_scan === 'missing') {
      // Carrier connected but returned nothing — honest about the gap.
      limitations.push('The carrier returned no tracking data, so delivery could not be independently confirmed.');
    }
  }

  // Warehouse gaps only matter for wrong/missing-item claims, where the engine
  // would otherwise be asked to speak to whether the correct item was picked.
  if (isWarehouseClaim && state.warehouse_fulfillment === 'unavailable') {
    limitations.push(
      'Warehouse fulfilment data unavailable — cannot confirm whether the correct item was picked, as no fulfilment integration is connected.',
    );
  }

  if (state.support_ticket === 'unavailable') {
    limitations.push('No linked support ticket — the customer\'s original message is not available to this case.');
  }

  // Conflict detection: carrier reports delivered but warehouse shows an exception
  // (e.g. the shipment was never dispatched). Do not resolve the conflict — surface
  // both facts so a human can investigate rather than the engine silently picking one.
  if (
    evidence.connections.warehouse &&
    evidence.shipbobEvidence?.order_found &&
    evidence.shipbobEvidence?.exception_present &&
    evidence.summary.delivery_status === 'DELIVERED'
  ) {
    const exception = evidence.shipbobEvidence.exception_reason ?? 'a fulfilment exception';
    limitations.push(
      `Conflicting evidence: carrier tracking reports delivered, but warehouse records show ${exception}. This conflict requires human review — do not resolve automatically.`,
    );
  }

  return limitations;
}

/**
 * Build the full, deterministic recommendation. Pure: no IO, no clock, no
 * randomness — identical inputs produce identical output.
 */
export function buildRecommendation(input: {
  decision: ClaimGateDecision;
  evidence: ClaimGateEvidence;
  state: ClaimEvidenceState;
  strength: EvidenceStrengthResult;
  claimType: ClaimGateClaimType;
}): GateRecommendation {
  const { decision, evidence, state, strength, claimType } = input;
  const held = decision.gateStatus !== 'PROCEED';

  return {
    decision: held ? 'hold' : 'proceed',
    reasoning: {
      triggered_rules: buildTriggeredRules(decision),
      evidence_strength: strength.strength,
      evidence_strength_explanation: strength.explanation,
    },
    money_at_risk: evidence.moneyAtRisk,
    currency: evidence.currency,
    recovery_routes: buildRecoveryRoutes({
      evidence,
      state,
      claimType,
      held,
      gateStatus: decision.gateStatus,
    }),
    suggested_next_step: buildSuggestedNextStep({ held, decision, strength: strength.strength }),
    limitations: buildLimitations(state, claimType, evidence),
  };
}

/**
 * Convenience: run the full decision engine (evidence → state → strength →
 * recommendation) in one deterministic call. Shared by every gate path so the
 * reasoning is identical wherever the gate runs.
 */
export function recommendFromEvidence(input: {
  decision: ClaimGateDecision;
  evidence: ClaimGateEvidence;
  claimType: ClaimGateClaimType;
}): GateRecommendation {
  const state = evaluateEvidenceState(input.evidence);
  const strength = classifyEvidenceStrength(state, input.claimType);
  return buildRecommendation({
    decision: input.decision,
    evidence: input.evidence,
    state,
    strength,
    claimType: input.claimType,
  });
}

const STRENGTH_LABELS: Record<EvidenceStrength, string> = {
  strong: 'Strong',
  partial: 'Partial',
  weak: 'Weak',
  insufficient: 'Insufficient',
};

/**
 * Render a recommendation as a neutral, plain-English block for humans — used by
 * the Gorgias internal note and the in-app case view. No raw scores, no
 * accusatory language.
 */
export function formatRecommendationNote(recommendation: GateRecommendation, caseUrl?: string): string {
  const lines: string[] = [];
  const headline = recommendation.decision === 'hold' ? 'HOLD' : 'PROCEED';
  lines.push(`Unauth review gate — ${headline}`);
  lines.push('');

  const rules = recommendation.reasoning.triggered_rules;
  if (rules.length > 0) {
    lines.push(`Why: ${rules.map((rule) => `Rule "${rule.rule_name}" triggered.`).join(' ')}`);
    for (const rule of rules) {
      for (const condition of rule.conditions_met) {
        lines.push(`  • ${condition}`);
      }
    }
  } else {
    lines.push('Why: No review rules triggered.');
  }
  lines.push('');

  lines.push(
    `Evidence: ${STRENGTH_LABELS[recommendation.reasoning.evidence_strength]} — ${recommendation.reasoning.evidence_strength_explanation}`,
  );
  lines.push('');

  lines.push(`Money at risk: ${formatCurrency(recommendation.money_at_risk, recommendation.currency)}`);
  lines.push('');

  const availableRoutes = recommendation.recovery_routes.filter((route) => route.available);
  if (availableRoutes.length > 0) {
    lines.push('Recovery available:');
    for (const route of availableRoutes) {
      lines.push(`  • ${route.detail}`);
    }
  } else {
    lines.push('Recovery available: none identified yet.');
  }
  lines.push('');

  lines.push(`Suggested next step: ${recommendation.suggested_next_step}`);

  if (recommendation.limitations.length > 0) {
    lines.push('');
    for (const limitation of recommendation.limitations) {
      lines.push(`Note: ${limitation}`);
    }
  }

  if (caseUrl) {
    lines.push('');
    lines.push(`Full case: ${caseUrl}`);
  }

  return lines.join('\n');
}
