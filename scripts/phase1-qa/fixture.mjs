/**
 * Phase 1 QA fixture definition (deliverable 9).
 *
 * This is enabling test infrastructure for Phase 1 runtime proof, NOT the
 * Phase 2 marketing merchant. It is deliberately unglamorous: it exists to
 * exercise production loaders, APIs and routes across the awkward states the
 * RUN requirements name, including states a marketing fixture must never show.
 *
 * Everything here is derived from `asOf`, so two runs with the same clock
 * produce the same logical fingerprint. IDs are stable and semantic: the
 * `f1……` namespace belongs to this fixture and to nothing else, which is what
 * lets cleanup be exact rather than heuristic.
 */

export const FIXTURE_NAMESPACE = 'f1';
export const FIXTURE_VERSION = 3;
export const DEFAULT_AS_OF = '2026-07-26T12:00:00.000Z';

/** Deterministic, readable UUIDs inside a namespace this fixture owns alone. */
export function id(group, index) {
  const groups = {
    merchant: '0000',
    user: '0001',
    partner: '0002',
    customer: '0003',
    order: '0004',
    orderLine: '0005',
    case: '0006',
    claimedItem: '0007',
    clarification: '0008',
    workTask: '0009',
    savedView: '000a',
    evidencePackage: '000b',
    connection: '000c',
    ticket: '000d',
    domainEvent: '000e',
    membership: '000f',
  };
  const prefix = groups[group];
  if (!prefix) throw new Error(`Unknown fixture id group ${group}`);
  return `f1${prefix}00-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

export const MERCHANT_ID = id('merchant', 1);
/** The fixture's single operator. `work_saved_views.owner_user_id` is NOT NULL. */
export const OPERATOR_USER_ID = id('user', 1);
/** A second merchant, seeded only so isolation assertions have something to fail against. */
export const OTHER_MERCHANT_ID = id('merchant', 2);

const DAY = 86_400_000;

export function clock(asOf) {
  const base = Date.parse(asOf);
  if (Number.isNaN(base)) throw new Error(`Invalid --as-of value ${asOf}`);
  return {
    asOf,
    base,
    /** Offsets are whole days from `asOf`, so relative-time labels stay stable. */
    daysBefore: (days) => new Date(base - days * DAY).toISOString(),
    daysAfter: (days) => new Date(base + days * DAY).toISOString(),
    hoursAfter: (hours) => new Date(base + hours * 3_600_000).toISOString(),
  };
}

/**
 * The state matrix Phase 1 must exercise. Each entry names the RUN requirement
 * that depends on it so a future change cannot quietly drop one.
 */
export const STATE_MATRIX = [
  { key: 'completeCase', requiredBy: ['RUN-03', 'RUN-04', 'RUN-05', 'RUN-08', 'RUN-16'] },
  { key: 'unambiguousMatch', requiredBy: ['RUN-03'] },
  { key: 'resolvedMatch', requiredBy: ['RUN-03'] },
  { key: 'savedWorkView', requiredBy: ['RUN-06'] },
  { key: 'trueEmptyWorkView', requiredBy: ['RUN-06'] },
  // Not a database row: proven by forcing /api/work/views to fail at runtime,
  // so it is evidenced by phase-01-completeness-injection.json rather than here.
  { key: 'forcedUnavailableWorkView', requiredBy: ['RUN-06'], runtimeInjected: true },
  { key: 'investigationResolvedPartner', requiredBy: ['RUN-02'] },
  { key: 'investigationMissingPartner', requiredBy: ['RUN-02', 'RUN-20'] },
  { key: 'knownZero', requiredBy: ['RUN-09', 'RUN-16', 'RUN-21'] },
  { key: 'unavailable', requiredBy: ['RUN-09', 'RUN-17'] },
  { key: 'missingCurrency', requiredBy: ['RUN-09'] },
  { key: 'mixedCurrency', requiredBy: ['RUN-09', 'RUN-16', 'RUN-21'] },
  { key: 'missingSource', requiredBy: ['RUN-20'] },
  { key: 'timezoneBoundary', requiredBy: ['RUN-15', 'RUN-19'] },
  { key: 'dueToday', requiredBy: ['RUN-19'] },
  { key: 'overdue', requiredBy: ['RUN-19'] },
  { key: 'impossibleState', requiredBy: ['RUN-18', 'RUN-20'] },
];

/** Semantic capture keys, so probes never select "the first row". */
export const CAPTURE_KEYS = {
  completeCase: id('case', 1),
  unambiguousMatchCase: id('case', 2),
  knownZeroCase: id('case', 3),
  missingCurrencyCase: id('case', 4),
  mixedCurrencyCase: id('case', 5),
  missingSourceCase: id('case', 6),
  timezoneBoundaryCase: id('case', 7),
  dueTodayCase: id('case', 8),
  overdueCase: id('case', 9),
  impossibleStateCase: id('case', 10),
  otherMerchantCase: id('case', 99),
  heroCustomer: id('customer', 1),
  heroOrder: id('order', 1),
  savedView: id('savedView', 1),
  resolvedPartner: id('partner', 1),
};

/**
 * The complete fixture, as plain data. Building it as data rather than as a
 * sequence of writes is what makes the fingerprint checkable and the seeder
 * idempotent.
 */
export function buildFixture(asOf = DEFAULT_AS_OF) {
  const t = clock(asOf);

  const merchants = [
    {
      id: MERCHANT_ID,
      name: 'Phase 1 QA Workspace',
      is_demo: true,
      is_internal: true,
      // Without a completed profile the authenticated layout redirects to
      // /onboarding, so no capture route would ever render.
      settings: {
        platform: 'shopify',
        monthly_order_volume: '1k_5k',
        primary_fraud_concern: 'item_not_received',
        onboarding_profile_complete: true,
        setup_complete: true,
      },
    },
    {
      id: OTHER_MERCHANT_ID,
      name: 'Phase 1 QA Isolation Control',
      is_demo: true,
      is_internal: true,
      settings: { onboarding_profile_complete: true, setup_complete: true },
    },
  ];

  /*
   * The fixture operator owns the workspace so the local-only e2e auth route can
   * mint a real session against it. Same table and same role semantics the
   * product uses; no test-only bypass.
   */
  const memberships = [
    {
      id: id('membership', 1),
      merchant_id: MERCHANT_ID,
      user_id: OPERATOR_USER_ID,
      invited_email: 'qa.operator@qa.invalid',
      role: 'owner',
      invite_status: 'active',
      accepted_at: t.daysBefore(90),
    },
  ];

  const partners = [
    {
      id: CAPTURE_KEYS.resolvedPartner,
      merchant_id: MERCHANT_ID,
      partner_type: 'carrier',
      name: 'Northgate Freight',
      status: 'active',
      contact_email: 'claims@northgate.invalid',
      response_sla_hours: 72,
    },
  ];

  const customers = [
    {
      id: CAPTURE_KEYS.heroCustomer,
      merchant_id: MERCHANT_ID,
      source: 'shopify',
      external_id: 'qa-cust-0001',
      email: 'hero.customer@qa.invalid',
      first_name: 'Rowan',
      last_name: 'Fielding',
      orders_count: 3,
      total_spent: '184.50',
    },
    {
      // RUN-17: a customer with no linked orders at all. Its aggregates must
      // read as unavailable, never as zero.
      id: id('customer', 2),
      merchant_id: MERCHANT_ID,
      source: 'shopify',
      external_id: 'qa-cust-0002',
      email: 'no.orders@qa.invalid',
      first_name: 'Devi',
      last_name: 'Ashworth',
      orders_count: null,
      total_spent: null,
    },
  ];

  const orders = [
    {
      id: CAPTURE_KEYS.heroOrder,
      merchant_id: MERCHANT_ID,
      source: 'shopify',
      external_id: 'QA-1001',
      order_number: 'QA-1001',
      source_customer_id: CAPTURE_KEYS.heroCustomer,
      email: 'hero.customer@qa.invalid',
      customer_email: 'hero.customer@qa.invalid',
      customer_name: 'Rowan Fielding',
      financial_status: 'paid',
      fulfillment_state: 'delivered',
      total_price: '84.50',
      subtotal_price: '79.00',
      currency: 'GBP',
      line_items_count: 2,
      placed_at: t.daysBefore(45),
      processed_at: t.daysBefore(45),
    },
    {
      id: id('order', 2),
      merchant_id: MERCHANT_ID,
      source: 'shopify',
      external_id: 'QA-1002',
      order_number: 'QA-1002',
      source_customer_id: CAPTURE_KEYS.heroCustomer,
      email: 'hero.customer@qa.invalid',
      customer_email: 'hero.customer@qa.invalid',
      customer_name: 'Rowan Fielding',
      financial_status: 'paid',
      fulfillment_state: 'delivered',
      total_price: '100.00',
      subtotal_price: '100.00',
      currency: 'GBP',
      line_items_count: 1,
      placed_at: t.daysBefore(20),
      processed_at: t.daysBefore(20),
    },
    {
      // RUN-09: a real order whose currency was never observed. It must render
      // as unavailable, never silently as USD or the merchant default.
      id: id('order', 3),
      merchant_id: MERCHANT_ID,
      source: 'csv',
      external_id: 'QA-1003',
      order_number: 'QA-1003',
      source_customer_id: CAPTURE_KEYS.heroCustomer,
      financial_status: 'paid',
      fulfillment_state: 'delivered',
      total_price: '42.00',
      currency: null,
      line_items_count: 1,
      placed_at: t.daysBefore(12),
      processed_at: t.daysBefore(12),
    },
    {
      // RUN-09/RUN-16/RUN-21: a second currency, so single-currency sums must
      // exclude rather than silently add.
      id: id('order', 4),
      merchant_id: MERCHANT_ID,
      source: 'shopify',
      external_id: 'QA-1004',
      order_number: 'QA-1004',
      source_customer_id: CAPTURE_KEYS.heroCustomer,
      financial_status: 'paid',
      fulfillment_state: 'delivered',
      total_price: '61.00',
      currency: 'EUR',
      line_items_count: 1,
      placed_at: t.daysBefore(8),
      processed_at: t.daysBefore(8),
    },
  ];

  const orderLines = [
    {
      id: id('orderLine', 1),
      merchant_id: MERCHANT_ID,
      source_order_id: CAPTURE_KEYS.heroOrder,
      external_id: 'QA-1001-L1',
      sku: 'QA-JKT-001',
      title: 'Fell Runner Jacket — Slate, M',
      variant_ref: 'slate-m',
      quantity: 1,
      unit_price_minor: 5500,
      total_minor: 5500,
      currency: 'GBP',
    },
    {
      id: id('orderLine', 2),
      merchant_id: MERCHANT_ID,
      source_order_id: CAPTURE_KEYS.heroOrder,
      external_id: 'QA-1001-L2',
      sku: 'QA-SCK-002',
      title: 'Merino Trail Socks — Two pack',
      variant_ref: 'twopack',
      quantity: 2,
      unit_price_minor: 1200,
      total_minor: 2400,
      currency: 'GBP',
    },
    {
      id: id('orderLine', 3),
      merchant_id: MERCHANT_ID,
      source_order_id: id('order', 2),
      external_id: 'QA-1002-L1',
      sku: 'QA-BAG-003',
      title: 'Drybag 20L — Moss',
      quantity: 1,
      unit_price_minor: 10000,
      total_minor: 10000,
      currency: 'GBP',
    },
  ];

  const cases = [
    {
      key: 'completeCase',
      id: CAPTURE_KEYS.completeCase,
      merchant_id: MERCHANT_ID,
      source_order_id: CAPTURE_KEYS.heroOrder,
      claim_type: 'item_not_received',
      status: 'ready_for_decision',
      detection_method: 'keyword',
      amount_at_risk: '55.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      total_estimated_loss: '55.00',
      requested_action: 'refund',
      loss_attribution: 'carrier_loss',
      attribution_confidence: 'high',
      recoverability: 'recoverable',
      recovery_owner: 'carrier',
      responsibility_confirmation_state: 'confirmed',
      responsibility_confirmed_at: t.daysBefore(3),
      // The production check constraint requires a real event behind a
      // confirmed responsibility, so the fixture seeds one rather than
      // relaxing the constraint.
      responsibility_event_id: id('domainEvent', 1),
      created_at: t.daysBefore(45),
      updated_at: t.daysBefore(2),
      submitted_at: t.daysBefore(44),
    },
    {
      key: 'unambiguousMatch',
      id: CAPTURE_KEYS.unambiguousMatchCase,
      merchant_id: MERCHANT_ID,
      source_order_id: id('order', 2),
      claim_type: 'damaged',
      status: 'evidence_needed',
      detection_method: 'keyword',
      amount_at_risk: '100.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      created_at: t.daysBefore(20),
      updated_at: t.daysBefore(5),
    },
    {
      key: 'knownZero',
      id: CAPTURE_KEYS.knownZeroCase,
      merchant_id: MERCHANT_ID,
      // `claims_anchor_required`: a case must be anchored to a ticket, an order
      // or an explicit manual reference. These rows are manually raised.
      manual_reference: 'QA-MANUAL-0003',
      case_origin: 'manual',
      claim_type: 'other',
      status: 'resolved_won',
      detection_method: 'manual',
      // A genuine, observed zero: the merchant lost nothing. Distinct from
      // "unavailable", which is what the missing-currency case represents.
      amount_at_risk: '0.00',
      total_estimated_loss: '0.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      created_at: t.daysBefore(30),
      updated_at: t.daysBefore(29),
    },
    {
      key: 'missingCurrency',
      id: CAPTURE_KEYS.missingCurrencyCase,
      merchant_id: MERCHANT_ID,
      source_order_id: id('order', 3),
      claim_type: 'refund_request',
      status: 'open',
      detection_method: 'manual',
      amount_at_risk: '42.00',
      currency: null,
      primary_currency: null,
      created_at: t.daysBefore(12),
      updated_at: t.daysBefore(4),
    },
    {
      key: 'mixedCurrency',
      id: CAPTURE_KEYS.mixedCurrencyCase,
      merchant_id: MERCHANT_ID,
      source_order_id: id('order', 4),
      claim_type: 'not_as_described',
      status: 'open',
      detection_method: 'keyword',
      amount_at_risk: '61.00',
      currency: 'EUR',
      primary_currency: 'EUR',
      created_at: t.daysBefore(8),
      updated_at: t.daysBefore(1),
    },
    {
      key: 'missingSource',
      id: CAPTURE_KEYS.missingSourceCase,
      merchant_id: MERCHANT_ID,
      manual_reference: 'QA-MANUAL-0006',
      case_origin: 'manual',
      claim_type: 'chargeback',
      status: 'open',
      detection_method: 'manual',
      // No source_order_id and no ticket: provenance is genuinely unknown, so
      // RUN-20 requires this can never present as healthy.
      amount_at_risk: '75.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      created_at: t.daysBefore(18),
      updated_at: t.daysBefore(18),
    },
    {
      key: 'timezoneBoundary',
      id: CAPTURE_KEYS.timezoneBoundaryCase,
      merchant_id: MERCHANT_ID,
      manual_reference: 'QA-MANUAL-0007',
      case_origin: 'manual',
      claim_type: 'item_not_received',
      status: 'open',
      detection_method: 'keyword',
      amount_at_risk: '30.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      // 23:30 UTC is the previous day in Europe/London BST only at the margin;
      // this row is what makes a timezone-naive age calculation visibly wrong.
      created_at: `${asOf.slice(0, 10)}T23:30:00.000Z`,
      updated_at: `${asOf.slice(0, 10)}T23:30:00.000Z`,
    },
    {
      key: 'dueToday',
      id: CAPTURE_KEYS.dueTodayCase,
      merchant_id: MERCHANT_ID,
      manual_reference: 'QA-MANUAL-0008',
      case_origin: 'manual',
      claim_type: 'damaged',
      status: 'awaiting_carrier_response',
      detection_method: 'keyword',
      amount_at_risk: '48.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      created_at: t.daysBefore(10),
      updated_at: t.daysBefore(10),
    },
    {
      key: 'overdue',
      id: CAPTURE_KEYS.overdueCase,
      merchant_id: MERCHANT_ID,
      manual_reference: 'QA-MANUAL-0009',
      case_origin: 'manual',
      claim_type: 'wrong_item',
      status: 'awaiting_3pl_response',
      detection_method: 'keyword',
      amount_at_risk: '90.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      created_at: t.daysBefore(60),
      updated_at: t.daysBefore(40),
    },
    {
      key: 'impossibleState',
      id: CAPTURE_KEYS.impossibleStateCase,
      merchant_id: MERCHANT_ID,
      manual_reference: 'QA-MANUAL-0010',
      case_origin: 'manual',
      claim_type: 'other',
      status: 'open',
      detection_method: 'manual',
      // Deliberately contradictory: not recoverable, yet owned by a carrier for
      // recovery. RUN-18/RUN-20 assertions must reject this combination rather
      // than render it as an ordinary healthy row.
      amount_at_risk: '25.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      recoverability: 'not_recoverable',
      recovery_owner: 'carrier',
      created_at: t.daysBefore(25),
      updated_at: t.daysBefore(25),
    },
    {
      key: 'isolationControl',
      id: CAPTURE_KEYS.otherMerchantCase,
      merchant_id: OTHER_MERCHANT_ID,
      manual_reference: 'QA-MANUAL-0099',
      case_origin: 'manual',
      claim_type: 'other',
      status: 'open',
      detection_method: 'manual',
      amount_at_risk: '999.00',
      currency: 'GBP',
      primary_currency: 'GBP',
      created_at: t.daysBefore(5),
      updated_at: t.daysBefore(5),
    },
  ];

  const claimedItems = [
    {
      // RUN-03 resolved match: confirmed against a real source order line.
      id: id('claimedItem', 1),
      merchant_id: MERCHANT_ID,
      support_payout_case_id: CAPTURE_KEYS.completeCase,
      source_order_line_id: id('orderLine', 1),
      claimed_sku: 'QA-JKT-001',
      claimed_title: 'Fell Runner Jacket — Slate, M',
      claimed_quantity: 1,
      extraction_method: 'agent_selected',
      match_status: 'confirmed',
      match_method: 'order_line_exact',
      match_confidence: 1,
      confirmed_at: t.daysBefore(3),
    },
    {
      // RUN-03 unambiguous but not yet confirmed: exactly one candidate line
      // exists on the order, so the operator has one obvious action.
      id: id('claimedItem', 2),
      merchant_id: MERCHANT_ID,
      support_payout_case_id: CAPTURE_KEYS.unambiguousMatchCase,
      source_order_line_id: null,
      claimed_sku: 'QA-BAG-003',
      claimed_title: 'Drybag 20L — Moss',
      claimed_quantity: 1,
      extraction_method: 'ai_suggestion',
      match_status: 'unmatched',
      match_confidence: null,
    },
  ];

  const clarifications = [
    {
      // RUN-02 resolved partner, with a full request/response history.
      id: id('clarification', 1),
      merchant_id: MERCHANT_ID,
      support_payout_case_id: CAPTURE_KEYS.completeCase,
      partner_id: CAPTURE_KEYS.resolvedPartner,
      target_type: 'carrier',
      target_name: 'Northgate Freight',
      status: 'response_received',
      request_summary: 'Asked Northgate Freight to confirm the delivery scan for QA-1001.',
      response_summary: 'Northgate Freight confirmed no delivery scan was recorded.',
      requested_evidence: ['proof_of_delivery'],
      evidence_gap: 'No delivery scan recorded for QA-1001.',
      subject: 'Delivery scan request — QA-1001',
      request_body: 'Please confirm whether a delivery scan exists for order QA-1001.',
      is_primary: true,
      created_at: t.daysBefore(20),
      sent_at: t.daysBefore(20),
      response_received_at: t.daysBefore(6),
      updated_at: t.daysBefore(6),
    },
    {
      // RUN-02 missing partner: partner_id points at a row that is not seeded,
      // proving history survives a removed partner instead of 500ing or
      // silently disappearing.
      id: id('clarification', 2),
      merchant_id: MERCHANT_ID,
      support_payout_case_id: CAPTURE_KEYS.completeCase,
      partner_id: null,
      target_type: '3pl',
      target_name: 'Former 3PL (record removed)',
      status: 'closed',
      request_summary: 'Asked the previous 3PL to confirm the pick record.',
      response_summary: null,
      requested_evidence: ['pick_record'],
      evidence_gap: 'Pick record for QA-1001 was never supplied.',
      subject: 'Pick record request — QA-1001',
      request_body: 'Please supply the pick record for order QA-1001.',
      is_primary: false,
      created_at: t.daysBefore(35),
      sent_at: t.daysBefore(35),
      updated_at: t.daysBefore(30),
    },
  ];

  const savedViews = [
    {
      id: CAPTURE_KEYS.savedView,
      merchant_id: MERCHANT_ID,
      owner_user_id: OPERATOR_USER_ID,
      name: 'Ageing carrier waits',
      definition: { view: 'overdue' },
      is_shared: true,
      created_at: t.daysBefore(14),
      updated_at: t.daysBefore(14),
    },
  ];

  const domainEvents = [
    {
      id: id('domainEvent', 1),
      merchant_id: MERCHANT_ID,
      event_type: 'case.responsibility.confirmed',
      aggregate_type: 'support_payout_case',
      aggregate_id: CAPTURE_KEYS.completeCase,
      actor_type: 'merchant_user',
      idempotency_key: 'qa-responsibility-confirmed-0001',
      occurred_at: t.daysBefore(3),
      recorded_at: t.daysBefore(3),
      payload: { attribution: 'carrier_loss', confidence: 'high' },
    },
  ];

  const evidencePackages = [
    {
      id: id('evidencePackage', 1),
      merchant_id: MERCHANT_ID,
      generated_for_order_id: CAPTURE_KEYS.heroOrder,
      customer_profile_id: null,
      reference_number: 'QA-EP-0001',
      generated_at: t.daysBefore(3),
      narrative_summary: 'Delivery scan absent; carrier confirmed no scan recorded.',
    },
  ];

  return {
    version: FIXTURE_VERSION,
    asOf,
    merchantId: MERCHANT_ID,
    otherMerchantId: OTHER_MERCHANT_ID,
    captureKeys: CAPTURE_KEYS,
    merchants,
    memberships,
    partners,
    customers,
    orders,
    orderLines,
    cases,
    claimedItems,
    clarifications,
    savedViews,
    domainEvents,
    evidencePackages,
  };
}

/**
 * A stable logical fingerprint. Deliberately excludes database-assigned values
 * so a second run of the same fixture must reproduce it exactly.
 */
export function fingerprint(fixture) {
  const shape = {
    version: fixture.version,
    asOf: fixture.asOf,
    counts: {
      merchants: fixture.merchants.length,
      memberships: fixture.memberships.length,
      partners: fixture.partners.length,
      customers: fixture.customers.length,
      orders: fixture.orders.length,
      orderLines: fixture.orderLines.length,
      cases: fixture.cases.length,
      claimedItems: fixture.claimedItems.length,
      clarifications: fixture.clarifications.length,
      savedViews: fixture.savedViews.length,
      domainEvents: fixture.domainEvents.length,
      evidencePackages: fixture.evidencePackages.length,
    },
    caseKeys: fixture.cases.map((row) => `${row.key}:${row.id}:${row.status}:${row.currency ?? 'none'}`).sort(),
    matchStates: fixture.claimedItems.map((row) => `${row.id}:${row.match_status}`).sort(),
  };
  return JSON.stringify(shape);
}
