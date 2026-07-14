import {
  buildRecommendation,
  formatRecommendationNote,
  recommendFromEvidence,
} from '@/lib/claim-gate/buildRecommendation';
import { evaluateEvidenceState } from '@/lib/claim-gate/evidenceState';
import { classifyEvidenceStrength } from '@/lib/claim-gate/evidenceStrength';
import type {
  ClaimGateClaimType,
  ClaimGateConnections,
  ClaimGateDecision,
  ClaimGateEvidence,
  ClaimGateEvidenceSummary,
  ClaimGateFulfillmentEvidence,
  ClaimGateShipBobEvidence,
} from '@/lib/claim-gate/types';

// ---------------------------------------------------------------------------
// Deterministic fixtures — no IO, no clock. Each builder is fully explicit so a
// reader can trace every recommendation field back to an input value.
// ---------------------------------------------------------------------------

function summary(overrides: Partial<ClaimGateEvidenceSummary> = {}): ClaimGateEvidenceSummary {
  return {
    order_value: 118,
    order_number: '1008',
    delivery_status: 'DELIVERED',
    proof_of_delivery: 'PRESENT',
    carrier: 'royal-mail',
    delivered_at: '2026-06-10T00:00:00.000Z',
    prior_dnr_claims_120d: 0,
    prior_refunds_120d: 0,
    prior_replacements_120d: 0,
    carrier_claim_window: 'OPEN',
    chargeback_risk: 'LOW',
    ...overrides,
  };
}

function fulfillment(overrides: Partial<ClaimGateFulfillmentEvidence> = {}): ClaimGateFulfillmentEvidence {
  return {
    tracking_number: 'TRK-1',
    carrier: 'royal-mail',
    carrier_identified_via: 'ups_api',
    current_status: 'Delivered',
    delivery_scan_present: true,
    pod_present: true,
    last_checkpoint_message: 'Delivered to front door',
    last_checkpoint_time: '2026-06-10T00:00:00.000Z',
    exception_present: false,
    carrier_claim_window_open: true,
    carrier_claim_deadline: '2026-07-14',
    tracking_source: 'ups',
    evidence_strength: 'strong',
    ...overrides,
  };
}

function shipbob(overrides: Partial<ClaimGateShipBobEvidence> = {}): ClaimGateShipBobEvidence {
  return {
    order_found: true,
    order_id: 'sb-1',
    order_status: 'Fulfilled',
    shipment_count: 1,
    pick_pack_events: 2,
    exception_present: false,
    ...overrides,
  };
}

function evidence(opts: {
  connections?: Partial<ClaimGateConnections>;
  summary?: Partial<ClaimGateEvidenceSummary>;
  fulfillmentEvidence?: ClaimGateFulfillmentEvidence[];
  shipbobEvidence?: ClaimGateShipBobEvidence | null;
  moneyAtRisk?: number;
  currency?: string;
  ticket?: Record<string, unknown> | null;
  shipment?: Record<string, unknown> | null;
} = {}): ClaimGateEvidence {
  return {
    order: { id: 'order-1' },
    ticket: opts.ticket ?? { id: 'ticket-1' },
    shipment: opts.shipment ?? { id: 'shipment-1' },
    connections: { carrier_tracking: true, warehouse: false, helpdesk: true, ...opts.connections },
    claimHistory: { priorDnrClaims120d: 0, priorRefunds120d: 0, priorReplacements120d: 0 },
    moneyAtRisk: opts.moneyAtRisk ?? 118,
    currency: opts.currency ?? 'GBP',
    summary: summary(opts.summary),
    fulfillmentEvidence: opts.fulfillmentEvidence ?? [fulfillment()],
    shipbobEvidence: opts.shipbobEvidence ?? null,
  };
}

function decision(overrides: Partial<ClaimGateDecision> = {}): ClaimGateDecision {
  return {
    gateStatus: 'PROCEED',
    triggeredRules: [],
    policyNextStep: 'Proceed under normal merchant policy.',
    allowedActions: [],
    blockedActions: [],
    evaluation: null,
    ...overrides,
  };
}

function recommend(input: {
  decision: ClaimGateDecision;
  evidence: ClaimGateEvidence;
  claimType: ClaimGateClaimType;
}) {
  return recommendFromEvidence(input);
}

// ---------------------------------------------------------------------------

describe('decision engine', () => {
  it('Scenario 1 — strong evidence, no rule fires → proceed, strength strong', () => {
    const ev = evidence({
      summary: { delivery_status: 'DELIVERED', proof_of_delivery: 'PRESENT' },
      fulfillmentEvidence: [fulfillment({ delivery_scan_present: true, pod_present: true })],
    });
    const rec = recommend({ decision: decision({ gateStatus: 'PROCEED' }), evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('proceed');
    expect(rec.reasoning.evidence_strength).toBe('strong');
    expect(rec.reasoning.triggered_rules).toHaveLength(0);
    // Proceed still records reasoning (rule E).
    expect(rec.suggested_next_step).toContain('No review rules triggered');
    expect(rec.suggested_next_step).toContain('strong');
    // Clean delivery: no honest gaps to flag.
    expect(rec.limitations).toHaveLength(0);
  });

  it('Scenario 2 — partial evidence (no POD), high-value rule fires → hold, partial, carrier claim route', () => {
    const ev = evidence({
      summary: { delivery_status: 'DELIVERED', proof_of_delivery: 'MISSING', carrier_claim_window: 'OPEN' },
      fulfillmentEvidence: [
        fulfillment({ delivery_scan_present: true, pod_present: false, carrier_claim_window_open: true, carrier_claim_deadline: '2026-07-14' }),
      ],
    });
    const dec = decision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [
        {
          rule_id: 'r1',
          rule_name: 'High Value DNR',
          reason:
            'Order value £118 exceeds your £75 review threshold; No proof of delivery on file; 3 prior claims from this customer in 90 days',
        },
      ],
    });
    const rec = recommend({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('hold');
    expect(rec.reasoning.evidence_strength).toBe('partial');
    // Reasoning lists exactly the three fired conditions — nothing invented (rule A).
    expect(rec.reasoning.triggered_rules).toHaveLength(1);
    expect(rec.reasoning.triggered_rules[0].rule_name).toBe('High Value DNR');
    expect(rec.reasoning.triggered_rules[0].conditions_met).toEqual([
      'Order value £118 exceeds your £75 review threshold',
      'No proof of delivery on file',
      '3 prior claims from this customer in 90 days',
    ]);
    // Carrier claim route is available with its deadline.
    const carrier = rec.recovery_routes.find((r) => r.route === 'carrier_claim');
    expect(carrier).toBeDefined();
    expect(carrier?.available).toBe(true);
    expect(carrier?.deadline).toBe('2026-07-14');
    // Next step is policy-framed, never a verdict (rule C).
    expect(rec.suggested_next_step).toContain("per your policy rule 'High Value DNR'");
    expect(rec.suggested_next_step).not.toMatch(/\bdeny\b|fraud/i);
  });

  it('Scenario 3 — insufficient evidence (carrier not connected) → hold, insufficient, tracking limitation', () => {
    const ev = evidence({
      connections: { carrier_tracking: false },
      summary: { delivery_status: 'UNKNOWN', proof_of_delivery: 'MISSING', carrier_claim_window: 'UNKNOWN' },
      fulfillmentEvidence: [],
      shipment: null,
    });
    const rec = recommend({ decision: decision({ gateStatus: 'HOLD_FOR_REVIEW' }), evidence: ev, claimType: 'ITEM_NOT_RECEIVED' });

    expect(rec.decision).toBe('hold');
    expect(rec.reasoning.evidence_strength).toBe('insufficient');
    expect(rec.recovery_routes.find((r) => r.route === 'carrier_claim')).toBeUndefined();
    expect(rec.limitations.some((l) => /carrier tracking unavailable/i.test(l))).toBe(true);
  });

  it('Scenario 4 — wrong item, ShipBob connected, SKU verifiable → hold, 3PL investigation route', () => {
    const ev = evidence({
      connections: { warehouse: true },
      shipbobEvidence: shipbob({ order_found: true, pick_pack_events: 2, exception_present: true, exception_reason: 'Picked SKU differs from order' }),
    });
    const dec = decision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r2', rule_name: 'Wrong item review', reason: 'Claim type is wrong item; Warehouse exception present' }],
    });
    const rec = recommend({ decision: dec, evidence: ev, claimType: 'WRONG_ITEM' });

    expect(rec.decision).toBe('hold');
    const threePl = rec.recovery_routes.find((r) => r.route === 'three_pl_investigation');
    expect(threePl).toBeDefined();
    expect(threePl?.available).toBe(true);
    // No warehouse-unavailable limitation, since ShipBob is connected.
    expect(rec.limitations.some((l) => /warehouse fulfilment data unavailable/i.test(l))).toBe(false);
  });

  it('Scenario 5 — wrong item, ShipBob NOT connected → hold, no 3PL route, warehouse limitation', () => {
    const ev = evidence({
      connections: { warehouse: false },
      shipbobEvidence: null,
    });
    const rec = recommend({ decision: decision({ gateStatus: 'HOLD_FOR_REVIEW' }), evidence: ev, claimType: 'WRONG_ITEM' });

    expect(rec.decision).toBe('hold');
    expect(rec.reasoning.evidence_strength).toBe('weak');
    expect(rec.recovery_routes.find((r) => r.route === 'three_pl_investigation')).toBeUndefined();
    expect(rec.limitations.some((l) => /warehouse fulfilment data unavailable/i.test(l))).toBe(true);
  });

  it('Scenario 6 — same inputs produce identical output (determinism)', () => {
    const build = () =>
      recommend({
        decision: decision({
          gateStatus: 'HOLD_FOR_REVIEW',
          triggeredRules: [{ rule_id: 'r1', rule_name: 'High Value DNR', reason: 'Order value £118 exceeds your £75 review threshold' }],
        }),
        evidence: evidence({
          summary: { proof_of_delivery: 'MISSING', carrier_claim_window: 'OPEN' },
          fulfillmentEvidence: [fulfillment({ pod_present: false })],
        }),
        claimType: 'DELIVERED_NOT_RECEIVED',
      });
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
    // And the rendered note is identical too.
    expect(formatRecommendationNote(build())).toBe(formatRecommendationNote(build()));
  });

  it('Scenario 7 — carrier claim route only appears while the window is open', () => {
    const openEv = evidence({
      summary: { delivery_status: 'DELIVERED', carrier_claim_window: 'OPEN' },
      fulfillmentEvidence: [fulfillment({ delivery_scan_present: true, carrier_claim_window_open: true, carrier_claim_deadline: '2026-07-14' })],
    });
    const closedEv = evidence({
      summary: { delivery_status: 'DELIVERED', carrier_claim_window: 'LIKELY_CLOSED' },
      fulfillmentEvidence: [fulfillment({ delivery_scan_present: true, carrier_claim_window_open: false, carrier_claim_deadline: undefined })],
    });
    const open = recommend({ decision: decision({ gateStatus: 'HOLD_FOR_REVIEW' }), evidence: openEv, claimType: 'DELIVERED_NOT_RECEIVED' });
    const closed = recommend({ decision: decision({ gateStatus: 'HOLD_FOR_REVIEW' }), evidence: closedEv, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(open.recovery_routes.some((r) => r.route === 'carrier_claim')).toBe(true);
    expect(closed.recovery_routes.some((r) => r.route === 'carrier_claim')).toBe(false);
  });

  it('every reasoning condition traces back to a fired rule condition', () => {
    const dec = decision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r1', rule_name: 'Rule A', reason: 'Condition one; Condition two' }],
    });
    const state = evaluateEvidenceState(evidence());
    const strength = classifyEvidenceStrength(state, 'DELIVERED_NOT_RECEIVED');
    const rec = buildRecommendation({ decision: dec, evidence: evidence(), state, strength, claimType: 'DELIVERED_NOT_RECEIVED' });
    for (const rule of rec.reasoning.triggered_rules) {
      const source = dec.triggeredRules.find((r) => r.rule_name === rule.rule_name);
      expect(source).toBeDefined();
      for (const condition of rule.conditions_met) {
        expect(source!.reason).toContain(condition);
      }
    }
  });
});
