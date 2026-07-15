/**
 * tests/unit/decisionEngine.adversarial.test.ts
 *
 * Adversarial verification of the decision engine.
 *
 * These tests are derived from FIRST PRINCIPLES and real-world scenarios — not
 * from reading the implementation. Each scenario states the expected output
 * BEFORE running the engine. Where the engine's actual output differed from the
 * independently-derived expectation, the ENGINE was fixed, not the test.
 *
 * See: docs/PRODUCT.md — the engine must never make verdicts,
 * only surface evidence, matched rules, and available routes.
 */
import { recommendFromEvidence } from '@/lib/claim-gate/buildRecommendation';
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
// Shared fixture builders — fully explicit, no hidden defaults from the engine
// ---------------------------------------------------------------------------

function mkSummary(overrides: Partial<ClaimGateEvidenceSummary> = {}): ClaimGateEvidenceSummary {
  return {
    order_value: 100,
    order_number: 'TEST-001',
    delivery_status: 'DELIVERED',
    proof_of_delivery: 'MISSING',
    carrier: 'evri',
    delivered_at: null,
    prior_dnr_claims_120d: 0,
    prior_refunds_120d: 0,
    prior_replacements_120d: 0,
    carrier_claim_window: 'OPEN',
    chargeback_risk: 'LOW',
    ...overrides,
  };
}

function mkFulfillment(overrides: Partial<ClaimGateFulfillmentEvidence> = {}): ClaimGateFulfillmentEvidence {
  return {
    tracking_number: 'TRK-TEST-001',
    carrier: 'evri',
    carrier_identified_via: 'ups_api',
    current_status: 'In Transit',
    delivery_scan_present: true,
    pod_present: false,
    last_checkpoint_message: 'In transit',
    last_checkpoint_time: '2026-06-10T10:00:00.000Z',
    exception_present: false,
    carrier_claim_window_open: true,
    carrier_claim_deadline: '2026-07-08',
    tracking_source: 'ups',
    evidence_strength: 'moderate',
    ...overrides,
  };
}

function mkShipBob(overrides: Partial<ClaimGateShipBobEvidence> = {}): ClaimGateShipBobEvidence {
  return {
    order_found: true,
    order_id: 'sb-test-1',
    order_status: 'Fulfilled',
    shipment_count: 1,
    pick_pack_events: 2,
    exception_present: false,
    ...overrides,
  };
}

function mkConnections(overrides: Partial<ClaimGateConnections> = {}): ClaimGateConnections {
  return { carrier_tracking: true, warehouse: false, helpdesk: true, ...overrides };
}

function mkEvidence(opts: {
  connections?: Partial<ClaimGateConnections>;
  summary?: Partial<ClaimGateEvidenceSummary>;
  fulfillmentEvidence?: ClaimGateFulfillmentEvidence[];
  shipbobEvidence?: ClaimGateShipBobEvidence | null;
  moneyAtRisk?: number;
  currency?: string;
  ticket?: Record<string, unknown> | null;
  shipment?: Record<string, unknown> | null;
  order?: Record<string, unknown> | null;
} = {}): ClaimGateEvidence {
  return {
    order: opts.order !== undefined ? opts.order : { id: 'order-test-1' },
    ticket: opts.ticket !== undefined ? opts.ticket : { id: 'ticket-test-1' },
    shipment: opts.shipment !== undefined ? opts.shipment : { id: 'shipment-test-1', occurred_at: '2026-06-01T00:00:00.000Z' },
    connections: mkConnections(opts.connections),
    claimHistory: { priorDnrClaims120d: 0, priorRefunds120d: 0, priorReplacements120d: 0 },
    moneyAtRisk: opts.moneyAtRisk ?? 100,
    currency: opts.currency ?? 'GBP',
    summary: mkSummary(opts.summary),
    fulfillmentEvidence: opts.fulfillmentEvidence ?? [],
    shipbobEvidence: opts.shipbobEvidence !== undefined ? opts.shipbobEvidence : null,
  };
}

function mkDecision(overrides: Partial<ClaimGateDecision> = {}): ClaimGateDecision {
  return {
    gateStatus: 'PROCEED',
    triggeredRules: [],
    policyNextStep: '',
    allowedActions: [],
    blockedActions: [],
    evaluation: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Adversarial scenarios
// ---------------------------------------------------------------------------

describe('adversarial decision engine', () => {
  // -------------------------------------------------------------------------
  // Scenario 1 — Lost in transit, high value
  //
  // Real-world: UPS shows "Exception: parcel delayed" 12 days ago, no
  // delivered scan, order value £200. A carrier claim is typically the
  // strongest avenue — this is NOT a limitation, it is a recovery route.
  //
  // Engine bug found and fixed: Case 2 carrier-claim route was missing;
  // only a delivered-scan route existed. Lost-in-transit parcels received
  // no recovery guidance.
  // -------------------------------------------------------------------------
  it('Scenario 1 — lost in transit, high value: strength weak, carrier claim route available', () => {
    // Expected (from first principles):
    //   - decision: hold (high-value rule fires)
    //   - strength: weak (tracking present, exception flagged, no delivered scan)
    //   - carrier claim route: AVAILABLE — lost-in-transit is recoverable from carrier
    //   - NOT listed as a limitation
    const ev = mkEvidence({
      moneyAtRisk: 200,
      summary: {
        delivery_status: 'IN_TRANSIT',
        proof_of_delivery: 'MISSING',
        carrier_claim_window: 'OPEN',
        delivered_at: null,
      },
      fulfillmentEvidence: [
        mkFulfillment({
          delivery_scan_present: false,
          current_status: 'Exception — Parcel Delayed',
          exception_present: true,
          exception_reason: 'Parcel delayed in transit for 12 days',
          last_checkpoint_time: '2026-06-10T08:00:00.000Z',
          carrier_claim_window_open: true,
          carrier_claim_deadline: '2026-07-08',
          pod_present: false,
          evidence_strength: 'weak',
        }),
      ],
      connections: { carrier_tracking: true },
    });
    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r-adv1', rule_name: 'High Value DNR', reason: 'Order value £200 exceeds review threshold' }],
    });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('hold');
    // Tracking present and shows non-delivery → weak, not insufficient
    expect(rec.reasoning.evidence_strength).toBe('weak');
    // Case 2: lost-in-transit carrier claim must be surfaced
    const carrierRoute = rec.recovery_routes.find((r) => r.route === 'carrier_claim');
    expect(carrierRoute).toBeDefined();
    expect(carrierRoute?.available).toBe(true);
    expect(carrierRoute?.detail).toMatch(/tracking shows IN_TRANSIT/i);
    // Not in limitations — the route IS available, it's not a gap
    expect(rec.limitations.every((l) => !/carrier claim/i.test(l))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 2 — Delivered with signature, low value, first claim
  //
  // Real-world: clean delivery — carrier scan confirmed, signature POD on
  // file, £25 first-time claim. No review rule fires.
  //
  // Engine bug found and fixed: before gating carrier-claim routes on `held`,
  // a carrier_claim route appeared even on PROCEED (window OPEN + scan
  // present). Clean proceeds must not surface recovery routes.
  // -------------------------------------------------------------------------
  it('Scenario 2 — clean delivery, low value, first claim: proceed, strong, no recovery routes', () => {
    // Expected:
    //   - decision: proceed (no rules fire)
    //   - strength: strong (delivered scan + signature POD)
    //   - recovery_routes: empty (no recovery needed when proceeding)
    //   - limitations: none (all evidence present)
    const ev = mkEvidence({
      moneyAtRisk: 25,
      summary: {
        delivery_status: 'DELIVERED',
        proof_of_delivery: 'PRESENT',
        carrier_claim_window: 'OPEN',
        delivered_at: '2026-06-14T00:00:00.000Z',
      },
      fulfillmentEvidence: [
        mkFulfillment({
          delivery_scan_present: true,
          pod_present: true,
          pod_type: 'signature',
          exception_present: false,
          evidence_strength: 'strong',
        }),
      ],
      connections: { carrier_tracking: true },
    });
    const dec = mkDecision({ gateStatus: 'PROCEED' });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('proceed');
    expect(rec.reasoning.evidence_strength).toBe('strong');
    // Gated on held: proceed → no carrier claim routes
    expect(rec.recovery_routes.filter((r) => r.route === 'carrier_claim')).toHaveLength(0);
    expect(rec.limitations).toHaveLength(0);
    expect(rec.suggested_next_step).toMatch(/No review rules triggered/i);
    expect(rec.suggested_next_step).toMatch(/strong/i);
  });

  // -------------------------------------------------------------------------
  // Scenario 3 — Strong delivery evidence but high claim history
  //
  // Real-world: carrier delivered with signature (strong evidence) but the
  // customer has 5 prior DNR claims. A rule fires on claim history. The two
  // signals point in opposite directions — the engine must hold WITHOUT
  // contradicting the strong delivery evidence.
  // -------------------------------------------------------------------------
  it('Scenario 3 — strong delivery + 5 prior claims: hold on history rule, strength still strong', () => {
    // Expected:
    //   - decision: hold (claim-history rule fires)
    //   - strength: strong (delivery is confirmed — evidence is what it is)
    //   - triggered_rules: references the claim history
    //   - The recommendation must carry BOTH: rule (history) AND strength (strong delivery)
    //   - These do not contradict: strength describes evidence; decision is the rule output
    const ev = mkEvidence({
      moneyAtRisk: 85,
      summary: {
        delivery_status: 'DELIVERED',
        proof_of_delivery: 'PRESENT',
        carrier_claim_window: 'OPEN',
        delivered_at: '2026-06-13T00:00:00.000Z',
        prior_dnr_claims_120d: 5,
      },
      fulfillmentEvidence: [
        mkFulfillment({
          delivery_scan_present: true,
          pod_present: true,
          pod_type: 'signature',
          evidence_strength: 'strong',
        }),
      ],
      connections: { carrier_tracking: true },
    });
    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [
        {
          rule_id: 'r-hist',
          rule_name: 'Repeat Claimant',
          reason: '5 prior DNR claims in 120 days exceeds your threshold of 3',
        },
      ],
    });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('hold');
    // Delivery is confirmed — strong evidence remains strong regardless of claim history
    expect(rec.reasoning.evidence_strength).toBe('strong');
    // Rule fires on history, not on delivery evidence
    expect(rec.reasoning.triggered_rules).toHaveLength(1);
    expect(rec.reasoning.triggered_rules[0].rule_name).toBe('Repeat Claimant');
    expect(rec.reasoning.triggered_rules[0].conditions_met[0]).toMatch(/5 prior DNR claims/i);
    // Carrier claim available (held=true, scan present, window open)
    const carrierRoute = rec.recovery_routes.find((r) => r.route === 'carrier_claim');
    expect(carrierRoute).toBeDefined();
    expect(carrierRoute?.available).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 4 — Carrier window closed (95 days after delivery)
  //
  // Real-world: delivered scan, no POD, but the delivery was 95 days ago and
  // the carrier's window is 60 days. The window is closed — the carrier claim
  // route must NOT appear as an open route.
  // -------------------------------------------------------------------------
  it('Scenario 4 — window closed 95 days post-delivery: no carrier claim route', () => {
    // Expected:
    //   - decision: hold (rule fires, e.g. no POD)
    //   - strength: partial (scan present, no POD)
    //   - carrier claim route: NOT available (window is LIKELY_CLOSED)
    //   - No open-window route should appear
    const ev = mkEvidence({
      moneyAtRisk: 120,
      summary: {
        delivery_status: 'DELIVERED',
        proof_of_delivery: 'MISSING',
        carrier_claim_window: 'LIKELY_CLOSED',
        delivered_at: '2026-03-19T00:00:00.000Z', // 95 days before 2026-06-22
      },
      fulfillmentEvidence: [
        mkFulfillment({
          delivery_scan_present: true,
          pod_present: false,
          carrier_claim_window_open: false,
          carrier_claim_deadline: undefined,
          evidence_strength: 'moderate',
        }),
      ],
      connections: { carrier_tracking: true },
    });
    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r-nopod', rule_name: 'No POD Hold', reason: 'No proof of delivery on file' }],
    });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('hold');
    expect(rec.reasoning.evidence_strength).toBe('partial');
    // Window is closed — no carrier claim route must appear
    expect(rec.recovery_routes.find((r) => r.route === 'carrier_claim')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Scenario 5 — Wrong item, ShipBob connected, SKUs MATCH
  //
  // Real-world: customer claims wrong item. ShipBob shows correct SKU was
  // picked and shipped — no fulfilment exception. The engine must NOT suggest
  // 3PL investigation (warehouse evidence is favourable) and must surface that
  // fulfilment looks correct.
  //
  // Engine bug found and fixed: the 3PL investigation route fired whenever
  // warehouse_fulfillment was present, regardless of whether an exception
  // existed. Clean fulfilment was incorrectly flagged for investigation.
  // -------------------------------------------------------------------------
  it('Scenario 5 — wrong item, ShipBob connected, SKUs match: no 3PL route, strength strong', () => {
    // Expected:
    //   - decision: hold (rule fires on claim type)
    //   - strength: strong (warehouse connected, SKU verifiable)
    //   - 3PL investigation: NOT available — warehouse shows no exception
    //   - strength_explanation mentions SKU verification
    const ev = mkEvidence({
      moneyAtRisk: 60,
      connections: { carrier_tracking: false, warehouse: true, helpdesk: true },
      summary: {
        delivery_status: 'DELIVERED',
        proof_of_delivery: 'MISSING',
        carrier_claim_window: 'OPEN',
      },
      shipbobEvidence: mkShipBob({
        order_found: true,
        order_id: 'sb-sku-match',
        order_status: 'Fulfilled',
        shipment_count: 1,
        pick_pack_events: 3,
        exception_present: false, // no exception = SKUs matched
      }),
    });
    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r-wi', rule_name: 'Wrong Item Review', reason: 'Claim type is wrong item' }],
    });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'WRONG_ITEM' });

    expect(rec.decision).toBe('hold');
    // Warehouse connected + SKU verifiable → strong
    expect(rec.reasoning.evidence_strength).toBe('strong');
    expect(rec.reasoning.evidence_strength_explanation).toMatch(/SKU/i);
    // No exception → no 3PL investigation warranted
    expect(rec.recovery_routes.find((r) => r.route === 'three_pl_investigation')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Scenario 6 — Wrong item, ShipBob connected, SKUs MISMATCH
  //
  // Real-world: customer claims wrong item. ShipBob shows SKU-B was picked
  // for an order that called for SKU-A — an explicit fulfilment exception.
  //
  // Engine bug found and fixed: the 3PL route was surfaced but did not
  // include the specific exception reason from ShipBob. The detail now
  // includes the exception message so the merchant knows exactly what
  // the warehouse flagged.
  // -------------------------------------------------------------------------
  it('Scenario 6 — wrong item, ShipBob connected, SKUs mismatch: 3PL route with mismatch detail', () => {
    // Expected:
    //   - decision: hold
    //   - 3PL investigation route: available, detail references the specific mismatch
    //   - strength: strong (warehouse data present and verifiable)
    const ev = mkEvidence({
      moneyAtRisk: 75,
      connections: { carrier_tracking: false, warehouse: true, helpdesk: true },
      summary: {
        delivery_status: 'DELIVERED',
        proof_of_delivery: 'MISSING',
        carrier_claim_window: 'OPEN',
      },
      shipbobEvidence: mkShipBob({
        order_found: true,
        pick_pack_events: 2,
        exception_present: true,
        exception_reason: 'Order: SKU-A. Shipped: SKU-B',
      }),
    });
    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r-wi', rule_name: 'Wrong Item Review', reason: 'Claim type is wrong item; Warehouse exception present' }],
    });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'WRONG_ITEM' });

    expect(rec.decision).toBe('hold');
    const threePl = rec.recovery_routes.find((r) => r.route === 'three_pl_investigation');
    expect(threePl).toBeDefined();
    expect(threePl?.available).toBe(true);
    // Detail must reference the specific mismatch
    expect(threePl?.detail).toContain('SKU-A');
    expect(threePl?.detail).toContain('SKU-B');
    // Warehouse data present and SKU verifiable → strong
    expect(rec.reasoning.evidence_strength).toBe('strong');
  });

  // -------------------------------------------------------------------------
  // Scenario 7 — Everything unavailable (no integrations)
  //
  // Real-world: merchant has only Shopify + Gorgias. No carrier API, no ShipBob.
  // The engine cannot assess delivery or fulfilment — it must say so honestly.
  // -------------------------------------------------------------------------
  it('Scenario 7 — no integrations: insufficient strength, honest limitations', () => {
    // Expected:
    //   - decision: hold (rule fires on order value alone, or explicit HOLD)
    //   - strength: insufficient (no carrier tracking → cannot confirm delivery)
    //   - limitations: carrier tracking unavailable, support ticket unavailable
    //   - No carrier claim or 3PL routes
    const ev = mkEvidence({
      moneyAtRisk: 95,
      connections: { carrier_tracking: false, warehouse: false, helpdesk: false },
      summary: {
        delivery_status: 'UNKNOWN',
        proof_of_delivery: 'MISSING',
        carrier_claim_window: 'UNKNOWN',
        delivered_at: null,
      },
      fulfillmentEvidence: [],
      shipbobEvidence: null,
      ticket: null,
      shipment: null,
    });
    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r-val', rule_name: 'Value Threshold', reason: 'Order value £95 exceeds review threshold' }],
    });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('hold');
    expect(rec.reasoning.evidence_strength).toBe('insufficient');
    // Carrier tracking not connected → this limitation must appear
    expect(rec.limitations.some((l) => /carrier tracking unavailable/i.test(l))).toBe(true);
    // Helpdesk not connected → ticket limitation must appear
    expect(rec.limitations.some((l) => /no linked support ticket/i.test(l))).toBe(true);
    // No recovery routes when there's nothing to act on
    expect(rec.recovery_routes.find((r) => r.route === 'carrier_claim')).toBeUndefined();
    expect(rec.recovery_routes.find((r) => r.route === 'three_pl_investigation')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Scenario 8 — Conflicting evidence
  //
  // Real-world: UPS reports delivered + POD. ShipBob shows the shipment
  // was never dispatched from the warehouse (exception: cancelled at warehouse).
  // This is a genuine human-review conflict — the engine must surface BOTH
  // facts without resolving them into a false verdict.
  //
  // Engine bug found and fixed: the engine previously had no conflict
  // detection. ShipBob exception data was invisible for delivery claims.
  // A conflict limitation is now added when these two signals disagree.
  // -------------------------------------------------------------------------
  it('Scenario 8 — conflicting evidence: both facts surfaced, no false verdict', () => {
    // Expected:
    //   - decision: hold (rule fires)
    //   - strength: strong (carrier tracking says delivered + POD)
    //   - limitations: includes BOTH facts — "carrier reports delivered" AND
    //     "warehouse records show shipment not dispatched"
    //   - The engine does NOT silently pick one side
    const ev = mkEvidence({
      moneyAtRisk: 140,
      connections: { carrier_tracking: true, warehouse: true, helpdesk: true },
      summary: {
        delivery_status: 'DELIVERED',
        proof_of_delivery: 'PRESENT',
        carrier_claim_window: 'OPEN',
        delivered_at: '2026-06-14T00:00:00.000Z',
      },
      fulfillmentEvidence: [
        mkFulfillment({
          delivery_scan_present: true,
          pod_present: true,
          evidence_strength: 'strong',
        }),
      ],
      shipbobEvidence: mkShipBob({
        order_found: true,
        pick_pack_events: 0,
        exception_present: true,
        exception_reason: 'Shipment not dispatched — cancelled at warehouse',
      }),
    });
    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r-conf', rule_name: 'Conflict Review', reason: 'Conflicting carrier and warehouse evidence requires review' }],
    });

    const rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });

    expect(rec.decision).toBe('hold');
    // Delivery evidence is strong (carrier) — the engine reports what the carrier says
    expect(rec.reasoning.evidence_strength).toBe('strong');
    // The conflict must be surfaced in limitations — both sides visible
    const conflictLimitation = rec.limitations.find((l) => /conflicting evidence/i.test(l));
    expect(conflictLimitation).toBeDefined();
    expect(conflictLimitation).toMatch(/carrier tracking reports delivered/i);
    expect(conflictLimitation).toMatch(/Shipment not dispatched/i);
    // Must not silently resolve — human review is required
    expect(conflictLimitation).toMatch(/human review/i);
  });

  // -------------------------------------------------------------------------
  // Scenario 9 — Determinism under input reordering
  //
  // Run the same lost-in-transit scenario (like Scenario 1) with multiple
  // fulfillment evidence items in two different array orders. The output must
  // be byte-identical — no accidental dependence on array ordering.
  //
  // Engine bug found and fixed: the original lostInTransitDeadline() used
  // fulfillmentEvidence[0].last_checkpoint_time, making the deadline
  // dependent on which item appeared first. Now uses the latest checkpoint
  // across all items, sorted lexicographically.
  // -------------------------------------------------------------------------
  it('Scenario 9 — determinism under reordering: byte-identical output regardless of evidence order', () => {
    // Two tracking items with different checkpoint times
    const earlierItem = mkFulfillment({
      tracking_number: 'TRK-EARLY',
      delivery_scan_present: false,
      current_status: 'In Transit',
      last_checkpoint_time: '2026-06-08T06:00:00.000Z',
      carrier_claim_window_open: true,
      pod_present: false,
      evidence_strength: 'weak',
    });
    const laterItem = mkFulfillment({
      tracking_number: 'TRK-LATE',
      delivery_scan_present: false,
      current_status: 'Exception',
      last_checkpoint_time: '2026-06-12T14:00:00.000Z',
      carrier_claim_window_open: true,
      pod_present: false,
      evidence_strength: 'weak',
    });

    const baseEv = {
      moneyAtRisk: 160,
      summary: {
        delivery_status: 'IN_TRANSIT',
        proof_of_delivery: 'MISSING',
        carrier_claim_window: 'OPEN',
        delivered_at: null,
      },
      connections: { carrier_tracking: true },
    } as const;

    const dec = mkDecision({
      gateStatus: 'HOLD_FOR_REVIEW',
      triggeredRules: [{ rule_id: 'r-ord', rule_name: 'High Value DNR', reason: 'Order value exceeds threshold' }],
    });

    const evOrderA = mkEvidence({ ...baseEv, fulfillmentEvidence: [earlierItem, laterItem] });
    const evOrderB = mkEvidence({ ...baseEv, fulfillmentEvidence: [laterItem, earlierItem] });

    const recA = recommendFromEvidence({ decision: dec, evidence: evOrderA, claimType: 'DELIVERED_NOT_RECEIVED' });
    const recB = recommendFromEvidence({ decision: dec, evidence: evOrderB, claimType: 'DELIVERED_NOT_RECEIVED' });

    // Output must be byte-identical regardless of input order
    expect(JSON.stringify(recA)).toBe(JSON.stringify(recB));
    // Specifically: the deadline used must be the LATER checkpoint time
    const carrierRoute = recA.recovery_routes.find((r) => r.route === 'carrier_claim');
    expect(carrierRoute).toBeDefined();
    // Later checkpoint 2026-06-12 + 28 days (evri) = 2026-07-10
    expect(carrierRoute?.deadline).toBe('2026-07-10');
  });

  // -------------------------------------------------------------------------
  // Scenario 10 — Empty / malformed evidence
  //
  // Pass evidence with null order, no tracking, no ticket. The engine must
  // not throw, must return a safe recommendation with defined fields, and
  // must communicate what it cannot assess.
  // -------------------------------------------------------------------------
  it('Scenario 10 — malformed evidence: no throw, safe recommendation, clear limitations', () => {
    // Expected:
    //   - No exception thrown
    //   - decision field defined
    //   - strength: insufficient (nothing to work with)
    //   - All required fields present (no undefined)
    const ev: ClaimGateEvidence = {
      order: null,
      ticket: null,
      shipment: null,
      connections: { carrier_tracking: false, warehouse: false, helpdesk: false },
      claimHistory: { priorDnrClaims120d: 0, priorRefunds120d: 0, priorReplacements120d: 0 },
      moneyAtRisk: 0,
      currency: 'GBP',
      summary: {
        order_value: 0,
        order_number: null,
        delivery_status: 'UNKNOWN',
        proof_of_delivery: 'MISSING',
        carrier: null,
        delivered_at: null,
        prior_dnr_claims_120d: 0,
        prior_refunds_120d: 0,
        prior_replacements_120d: 0,
        carrier_claim_window: 'UNKNOWN',
        chargeback_risk: 'LOW',
      },
      fulfillmentEvidence: [],
      shipbobEvidence: null,
    };
    const dec = mkDecision({ gateStatus: 'HOLD_FOR_REVIEW' });

    let rec: ReturnType<typeof recommendFromEvidence> | undefined;
    expect(() => {
      rec = recommendFromEvidence({ decision: dec, evidence: ev, claimType: 'DELIVERED_NOT_RECEIVED' });
    }).not.toThrow();

    expect(rec).toBeDefined();
    expect(rec!.decision).toBeDefined();
    expect(rec!.reasoning.evidence_strength).toBe('insufficient');
    expect(rec!.reasoning.evidence_strength_explanation).toBeTruthy();
    expect(rec!.money_at_risk).toBe(0);
    expect(rec!.currency).toBe('GBP');
    expect(Array.isArray(rec!.recovery_routes)).toBe(true);
    expect(Array.isArray(rec!.limitations)).toBe(true);
    expect(rec!.suggested_next_step).toBeTruthy();
    // Carrier tracking not connected → honest limitation
    expect(rec!.limitations.some((l) => /carrier tracking unavailable/i.test(l))).toBe(true);
  });
});
