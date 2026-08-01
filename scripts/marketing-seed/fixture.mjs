import { createHash, createHmac } from 'node:crypto';
import { CAPTURE_URLS, DEFAULT_AS_OF, MARKETING_IDENTITY_SALT, MARKETING_STORY } from './manifest.mjs';

const DAY = 86_400_000;
const NAMES = [
  ['Maya', 'Chen'], ['Jonas', 'Reed'], ['Leah', 'Patel'], ['Omar', 'Hughes'],
  ['Zara', 'Morgan'], ['Nina', 'Wallace'], ['Felix', 'Stone'], ['Imani', 'Cole'],
  ['Callum', 'Bennett'], ['Priya', 'Osei'], ['Ewan', 'Fraser'], ['Sofia', 'Novak'],
  ['Marcus', 'Whitfield'], ['Grace', 'Doyle'], ['Kian', 'Marsh'], ['Amelia', 'Okafor'],
  ['Reuben', 'Lindqvist'], ['Freya', 'Sharma'], ['Tariq', 'Kaur'], ['Isla', 'Byrne'],
  ['Declan', 'Fenwick'], ['Aisha', 'Adeyemi'], ['Louis', 'Carrick'], ['Elsie', 'Nakamura'],
];
const PRODUCTS = [
  ['Merino Weekender', 'Navy / Medium', 'AA-MW-NV-M', 12800],
  ['Wool Overshirt', 'Forest / Large', 'AA-WO-FR-L', 9400],
  ['Canvas Field Tote', 'Natural', 'AA-FT-NT', 5600],
  ['Ribbed Travel Scarf', 'Oatmeal', 'AA-TS-OT', 4200],
  ['Leather Card Case', 'Chestnut', 'AA-CC-CH', 3800],
  ['Everyday Oxford Shirt', 'White / Medium', 'AA-OS-WH-M', 6800],
  ['Quilted Liner', 'Olive / Small', 'AA-QL-OL-S', 11600],
  ['Cotton Lounge Trouser', 'Charcoal / Medium', 'AA-LT-CH-M', 7400],
];

export function stableId(group, index) {
  const prefix = {
    customer: 'aa20', order: 'aa21', line: 'aa22', ticket: 'aa23', case: 'aa10',
    claimed: 'aa24', evidence: 'aa25', package: 'aa26', event: 'aa27', comment: 'aa28',
    loss: 'aa40', recovery: 'aa30', work: 'aa29', notification: 'aa2a', partner: 'aa2b',
    rule: 'aa50', ruleVersion: 'aa51', flow: 'aa60', flowRun: 'aa61', domainEvent: 'aa62',
    recommendation: 'aa63', financial: 'aa64', decision: 'aa65', outcome: 'aa66',
    connection: 'aa70', membership: 'aa71', shipment: 'aa72', identity: 'aa73', note: 'aa74',
    savedView: 'aa80',
    identitySignal: 'aa75', clarification: 'aa76', dispute: 'aa77',
    refund: 'aa78', return: 'aa79', pendingSelection: 'aa7a',
  }[group];
  if (!prefix) throw new Error(`Unknown marketing fixture group: ${group}`);
  return `${prefix}0000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clock(asOf) {
  const base = Date.parse(asOf);
  if (!Number.isFinite(base)) throw new Error(`Invalid --as-of value: ${asOf}`);
  const at = (days, hour = 10, minutes = 0) => {
    const value = new Date(base - days * DAY);
    value.setUTCHours(hour, minutes, 0, 0);
    return value.toISOString();
  };
  const after = (days, hour = 10) => {
    const value = new Date(base + days * DAY);
    value.setUTCHours(hour, 0, 0, 0);
    return value.toISOString();
  };
  return { asOf: new Date(base).toISOString(), at, after };
}

function hash(value) {
  return createHash('sha256').update(`${MARKETING_STORY.namespace}:${value}`).digest('hex');
}

export function buildMarketingFixture(asOf = DEFAULT_AS_OF) {
  const t = clock(asOf);
  const rand = mulberry32(MARKETING_STORY.randomSeed);
  const merchantId = MARKETING_STORY.merchant.id;
  const operatorId = MARKETING_STORY.operator.id;
  const currency = MARKETING_STORY.merchant.currency;
  const metadata = { dataset_version: MARKETING_STORY.version, capture_clock: t.asOf };

  const identities = NAMES.map((_, index) => ({
    id: stableId('identity', index + 1),
    confidence_grade: 'definite',
    confidence_score: 96,
    merchant_count: 1,
    signal_count: 4 + (index % 4),
    first_seen_at: t.at(540 - index * 7),
    last_seen_at: t.at(index % 8),
    created_at: t.at(540 - index * 7),
    updated_at: t.at(index % 8),
  }));
  const merchantCustomers = NAMES.map(([first, last], index) => ({
    id: index === 0 ? MARKETING_STORY.capture.customer : stableId('customer', index + 1),
    merchant_id: merchantId,
    identity_id: identities[index].id,
    display_name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@customers.alderandash.invalid`,
    resolution_status: 'active',
    matcher_version: 'identity-v2',
    last_resolved_at: t.at(1 + (index % 12), 7),
    raw_metadata: metadata,
    created_at: t.at(500 - index * 7),
    updated_at: t.at(index % 8),
  }));

  const orderCounts = NAMES.map((_, index) => index < 3 ? 6 : 4);
  let orderIndex = 0;
  const orders = [];
  const orderLines = [];
  for (let customerIndex = 0; customerIndex < merchantCustomers.length; customerIndex += 1) {
    const customer = merchantCustomers[customerIndex];
    for (let sequence = 0; sequence < orderCounts[customerIndex]; sequence += 1) {
      orderIndex += 1;
      const orderId = stableId('order', orderIndex);
      const productA = PRODUCTS[(customerIndex * 3 + sequence) % PRODUCTS.length];
      const productB = PRODUCTS[(customerIndex * 5 + sequence + 2) % PRODUCTS.length];
      const quantityA = sequence % 5 === 0 ? 2 : 1;
      const quantityB = sequence % 3 === 0 ? 1 : 0;
      const lineSubtotal = productA[3] * quantityA + productB[3] * quantityB;
      const discountMinor = sequence % 4 === 0 ? Math.round(lineSubtotal * 0.1) : 0;
      const shippingMinor = lineSubtotal - discountMinor >= 10000 ? 0 : 495;
      const taxMinor = Math.round((lineSubtotal - discountMinor) / 6);
      const totalMinor = lineSubtotal - discountMinor + shippingMinor + taxMinor;
      const placedDaysAgo = 3 + ((customerIndex * 17 + sequence * 23) % 170);
      const reference = 84000 + ((orderIndex * 37 + 113) % 7900);
      orders.push({
        id: orderId,
        merchant_id: merchantId,
        source: 'shopify',
        external_id: `gid://shopify/Order/${730000 + reference}`,
        order_number: `#${reference}`,
        source_customer_id: customer.id,
        merchant_customer_id: customer.id,
        email: customer.email,
        customer_email: customer.email,
        customer_name: customer.display_name,
        financial_status: 'paid',
        fulfillment_state: 'delivered',
        total_price: (totalMinor / 100).toFixed(2),
        order_value: (totalMinor / 100).toFixed(2),
        subtotal_price: (lineSubtotal / 100).toFixed(2),
        total_discounts: (discountMinor / 100).toFixed(2),
        currency,
        line_items_count: quantityB ? 2 : 1,
        browser_ip: `192.0.2.${20 + (orderIndex % 180)}`,
        payment_gateway: 'shopify_payments',
        card_last4: String(1200 + ((orderIndex * 43) % 8700)).padStart(4, '0'),
        tags: [],
        note: null,
        placed_at: t.at(placedDaysAgo, 9 + (orderIndex % 9), (orderIndex * 7) % 60),
        processed_at: t.at(placedDaysAgo, 9 + (orderIndex % 9), (orderIndex * 7) % 60),
        ingested_at: t.at(Math.max(0, placedDaysAgo - 1), 3),
        updated_at: t.at(orderIndex % 2, 5 + (orderIndex % 6)),
        raw_arithmetic: { line_subtotal_minor: lineSubtotal, discount_minor: discountMinor, shipping_minor: shippingMinor, tax_minor: taxMinor, total_minor: totalMinor },
      });
      orderLines.push({
        id: stableId('line', orderLines.length + 1),
        merchant_id: merchantId,
        source_order_id: orderId,
        external_id: `${730000 + reference}-${productA[2]}-1`,
        sku: productA[2],
        product_ref: `product-${productA[2]}`,
        variant_ref: productA[1],
        title: productA[0],
        quantity: quantityA,
        unit_price_minor: productA[3],
        total_minor: productA[3] * quantityA,
        cost_minor: Math.round(productA[3] * quantityA * 0.42),
        currency,
        raw_metadata: { ...metadata, product_title: productA[0], variant_title: productA[1] },
        created_at: t.at(placedDaysAgo),
        updated_at: t.at(orderIndex % 2, 6 + (orderIndex % 5)),
      });
      if (quantityB) {
        orderLines.push({
          id: stableId('line', orderLines.length + 1),
          merchant_id: merchantId,
          source_order_id: orderId,
          external_id: `${730000 + reference}-${productB[2]}-2`,
          sku: productB[2],
          product_ref: `product-${productB[2]}`,
          variant_ref: productB[1],
          title: productB[0],
          quantity: 1,
          unit_price_minor: productB[3],
          total_minor: productB[3],
          cost_minor: Math.round(productB[3] * 0.42),
          currency,
          raw_metadata: { ...metadata, product_title: productB[0], variant_title: productB[1] },
          created_at: t.at(placedDaysAgo),
          updated_at: t.at(orderIndex % 2, 6 + (orderIndex % 5)),
        });
      }
    }
  }

  const sourceCustomers = merchantCustomers.map((customer, index) => {
    const customerOrders = orders.filter((order) => order.merchant_customer_id === customer.id);
    return {
      id: customer.id,
      merchant_id: merchantId,
      source: 'shopify',
      external_id: `gid://shopify/Customer/${920000 + index * 47}`,
      email: customer.email,
      first_name: customer.display_name.split(' ')[0],
      last_name: customer.display_name.split(' ').slice(1).join(' '),
      verified_email: true,
      account_created_at: t.at(540 - index * 7),
      orders_count: customerOrders.length,
      total_spent: (customerOrders.reduce((sum, order) => sum + Number(order.total_price), 0)).toFixed(2),
      tags: index % 7 === 0 ? ['repeat customer'] : [],
      note: index === 0 ? 'Prefers email updates and collection-point delivery when available.' : null,
      raw_metadata: metadata,
      merchant_customer_id: customer.id,
      created_at: t.at(180),
      updated_at: t.at(index % 8),
    };
  });
  const identityMembers = sourceCustomers.map((customer, index) => ({
    identity_id: identities[index].id,
    identifier_type: 'email',
    identifier_hash: createHmac('sha256', MARKETING_IDENTITY_SALT).update(customer.email.toLowerCase()).digest('hex'),
    match_confidence: 100,
    matched_via: [{ source: 'shopify', field: 'email' }],
    added_at: customer.created_at,
  }));
  const identitySignals = sourceCustomers.map((customer, index) => ({
    id: stableId('identitySignal', index + 1),
    merchant_id: merchantId,
    identifier_type: 'email',
    identifier_hash: identityMembers[index].identifier_hash,
    source: 'shopify',
    source_customer_id: customer.id,
    source_order_id: null,
    source_ticket_id: null,
    observed_at: customer.updated_at,
    created_at: customer.created_at,
  }));

  const rules = [
    { name: 'Delivered parcel needs carrier evidence', description: 'Hold a refund decision until the latest carrier evidence is available.', active: true, priority: 90, action: 'manual_review', version: 3, status: 'published' },
    { name: 'Transit damage with clear photos', description: 'Recommend replacement when customer and carrier evidence agree.', active: true, priority: 70, action: 'approve', version: 2, status: 'published' },
    { name: 'Low-value goodwill request', description: 'Keep low-value service recovery proportionate.', active: false, priority: 20, action: 'manual_review', version: 1, status: 'draft' },
    { name: 'Warehouse pick error', description: 'Resolve the customer issue and preserve the fulfilment recovery route.', active: true, priority: 80, action: 'approve', version: 4, status: 'published' },
  ].map((rule, index) => ({
    id: index === 0 ? MARKETING_STORY.capture.rule : stableId('rule', index + 1),
    merchant_id: merchantId,
    name: rule.name,
    description: rule.description,
    is_active: rule.active,
    priority: rule.priority,
    conditions: [{ field: 'claim_type', operator: 'equals', value: ['item_not_received', 'damaged', 'refund_request', 'wrong_item'][index] }],
    action: rule.action,
    condition_operator: 'and',
    created_at: t.at(240 - index * 30),
    updated_at: t.at(8 + index),
    version: rule.version,
    version_status: rule.status,
  }));
  const ruleVersions = rules.map((rule) => ({
    id: stableId('ruleVersion', rules.indexOf(rule) + 1),
    merchant_id: merchantId,
    merchant_rule_id: rule.id,
    version: rule.version,
    status: rule.version_status,
    name: rule.name,
    description: rule.description,
    conditions: rule.conditions,
    action: rule.action,
    condition_operator: rule.condition_operator,
    priority: rule.priority,
    created_by: operatorId,
    published_by: rule.version_status === 'published' ? operatorId : null,
    created_at: rule.created_at,
    published_at: rule.version_status === 'published' ? rule.updated_at : null,
  }));

  const flows = [
    { name: 'Request missing delivery evidence', description: 'Creates a review task when a delivery case lacks carrier evidence.', trigger: 'case.evidence_missing', status: 'published', active: true, version: 3 },
    { name: 'Prepare carrier recovery', description: 'Opens recovery work when a confirmed carrier loss is eligible.', trigger: 'loss.confirmed', status: 'published', active: true, version: 2 },
    { name: 'High-value review routing', description: 'Routes higher-value cases to an owner for review.', trigger: 'case.created', status: 'draft', active: false, version: 1 },
  ].map((flow, index) => ({
    id: index === 0 ? MARKETING_STORY.capture.flow : stableId('flow', index + 1),
    merchant_id: merchantId,
    name: flow.name,
    description: flow.description,
    trigger_event_type: flow.trigger,
    conditions: [{
      field: index === 2 ? 'amount_at_risk' : 'claim_type',
      operator: 'eq',
      value: index === 0 ? 'item_not_received' : index === 1 ? 'damaged' : 150,
    }],
    outputs: [{
      type: 'create_task',
      title: index === 0
        ? 'Request missing delivery evidence'
        : index === 1
          ? 'Prepare carrier recovery'
          : 'Review high-value case',
      priority: index === 2 ? 'high' : 'medium',
      dueInHours: index === 0 ? 8 : index === 1 ? 24 : 4,
    }],
    active: flow.active,
    version: flow.version,
    status: flow.status,
    created_by: operatorId,
    updated_by: operatorId,
    published_by: flow.active ? operatorId : null,
    published_at: flow.active ? t.at(60 + index * 10) : null,
    created_at: t.at(120 + index * 10),
    updated_at: t.at(4 + index),
  }));

  const heroDefinitions = [
    { key: 'decision', id: MARKETING_STORY.capture.caseDecisionReady, customer: 0, orderOffset: 0, type: 'item_not_received', status: 'ready_for_decision', amount: 12800, age: 4, subject: 'Delivered parcel not received', reason: 'Tracking shows delivery, but the customer cannot locate the parcel.', action: 'refund', owner: 1, source: 'carrier', rule: 0, recovery: 'ready_to_submit' },
    { key: 'recovery', id: MARKETING_STORY.capture.caseActiveRecovery, customer: 1, orderOffset: 6, type: 'damaged', status: 'recovery_opened', amount: 9400, age: 12, subject: 'Overshirt damaged in transit', reason: 'Customer photos and the depot scan show transit damage.', action: 'replacement', owner: 2, source: 'carrier', rule: 1, recovery: 'waiting_response' },
    { key: 'resolved', id: MARKETING_STORY.capture.caseResolvedRecovered, customer: 2, orderOffset: 12, type: 'wrong_item', status: 'resolved_exchanged', amount: 5600, age: 26, subject: 'Wrong tote picked at fulfilment', reason: 'The packing record confirms the wrong colour was dispatched.', action: 'replacement', owner: 0, source: 'warehouse', rule: 3, recovery: 'paid' },
  ];
  const secondaryTypes = ['refund_request', 'item_not_received', 'wrong_item', 'damaged', 'chargeback', 'refund_request', 'item_not_received', 'wrong_item', 'damaged'];
  const caseDefinitions = [
    ...heroDefinitions,
    ...secondaryTypes.map((type, index) => ({
      key: `support-${index + 1}`,
      id: stableId('case', index + 4),
      customer: index + 3,
      orderOffset: 18 + index * 4,
      type,
      status: ['pending', 'evidence_needed', 'ready_for_decision', 'awaiting_customer_evidence', 'manual_review', 'resolved_refunded', 'awaiting_carrier_response', 'resolved_denied', 'recovery_opened'][index],
      amount: [4200, 6800, 7400, 3800, 11600, 5600, 9400, 4200, 6800][index],
      age: [1, 3, 7, 9, 15, 19, 23, 31, 38][index],
      subject: ['Goodwill credit requested', 'Parcel delayed after depot scan', 'Incorrect trouser size received', 'Card case arrived marked', 'Payment dispute requires review', 'Return accepted and refunded', 'Carrier tracing delayed parcel', 'Late return request reviewed', 'Shirt damaged during delivery'][index],
      reason: 'The support conversation and connected source records require a merchant decision.',
      action: type === 'wrong_item' || type === 'damaged' ? 'replacement' : 'refund',
      owner: index % 4 === 3 ? null : index % 3,
      source: ['customer', 'carrier', 'warehouse', 'carrier', 'payment_processor', 'customer', 'carrier', 'merchant_policy', 'carrier'][index],
      rule: index % rules.length,
      recovery: ['evidence_needed', 'chase_due', 'submitted', 'evidence_needed', 'ready_to_submit', null, 'waiting_response', null, 'submitted'][index],
    })),
  ];

  const partners = [
    { id: stableId('partner', 1), name: 'UPS', partner_type: 'carrier', external_reference: 'Alder & Ash UPS tracking', contact_url: 'https://www.ups.com/claims' },
    { id: stableId('partner', 2), name: 'Northline Fulfilment', partner_type: 'three_pl', external_reference: 'Alder & Ash UK fulfilment', contact_email: 'claims@northline.invalid' },
  ].map((partner) => ({ ...partner, merchant_id: merchantId, status: 'active', created_at: t.at(300), updated_at: t.at(2) }));

  const tickets = [];
  const cases = [];
  const claimedItems = [];
  const evidenceItems = [];
  const claimEvents = [];
  const comments = [];
  const recommendationSnapshots = [];
  const clarificationRequests = [];
  const losses = [];
  const recoveries = [];
  const workTasks = [];
  const financialEntries = [];
  const financialSummaries = [];
  const decisions = [];
  const outcomes = [];
  const shipments = [];
  const shipmentLines = [];

  caseDefinitions.forEach((definition, index) => {
    const customer = merchantCustomers[definition.customer];
    const order = orders[Math.min(definition.orderOffset, orders.length - 1)];
    const orderLine = orderLines.find((line) => line.source_order_id === order.id);
    const ticketId = stableId('ticket', index + 1);
    const delayedTracking = definition.status === 'awaiting_carrier_response';
    const submitted = t.at(definition.age, 8 + (index % 8), (index * 11) % 60);
    const caseRule = rules[definition.rule];
    const lossId = stableId('loss', index + 1);
    const recoveryId = stableId('recovery', index + 1);
    tickets.push({
      id: ticketId, merchant_id: merchantId, provider: 'gorgias', connection_id: stableId('connection', 2),
      external_id: `G-${4107 + index * 19}`, external_url: `https://alderandash.gorgias.invalid/app/ticket/${4107 + index * 19}`,
      source_customer_id: customer.id, merchant_customer_id: customer.id, subject: definition.subject,
      status: definition.status.startsWith('resolved_') ? 'closed' : 'open', channel: index % 3 === 0 ? 'chat' : 'email',
      tags: index % 2 === 0 ? ['delivery'] : ['customer care'], is_spam: false, message_count: 3 + (index % 6),
      customer_reply_count: 1 + (index % 3), was_reopened: index === 5, linked_order_external_ids: [order.external_id],
      opened_at_provider: submitted, created_at_provider: submitted, updated_at_provider: t.at(Math.max(0, definition.age - 1), 14),
      ingested_at: t.at(0, 11), updated_at: t.at(0, 11),
    });
    cases.push({
      id: definition.id, merchant_id: merchantId, source_ticket_id: ticketId, source_order_id: order.id,
      merchant_customer_id: customer.id, claim_type: definition.type, status: definition.status,
      detection_method: 'keyword',
      detection_detail: {
        source: 'Gorgias',
        issue: definition.type,
        capture_key: definition.key,
        gate_recommendation: {
          decision: definition.status.startsWith('resolved_') ? 'proceed' : 'hold',
          reasoning: {
            triggered_rules: [{
              rule_name: caseRule.name,
              conditions_met: [`Case type is ${definition.type.replaceAll('_', ' ')}`, `Value at issue is £${(definition.amount / 100).toFixed(2)}`],
            }],
            evidence_strength: 'strong',
            evidence_strength_explanation: 'Order, item, support and source records agree.',
          },
          money_at_risk: definition.amount / 100,
          currency,
          recovery_routes: definition.recovery ? [{
            route: definition.source === 'warehouse' ? 'three_pl_investigation' : definition.type === 'chargeback' ? 'chargeback_evidence_preservation' : 'carrier_claim',
            available: true,
            detail: definition.source === 'warehouse' ? 'Fulfilment records support a partner review.' : 'Connected source evidence supports a recovery route.',
          }] : [],
          suggested_next_step: definition.status.startsWith('resolved_') ? 'The customer outcome and recovery are complete.' : 'Review the connected evidence and record the merchant decision.',
          limitations: [],
        },
        ...metadata,
      },
      reason_raw: definition.reason, reason_normalized: definition.reason, amount_at_risk: (definition.amount / 100).toFixed(2),
      currency, primary_currency: currency, requires_review: !definition.status.startsWith('resolved_'),
      assigned_to: definition.owner === null ? null : MARKETING_STORY.team[definition.owner].id,
      assigned_at: definition.owner === null ? null : t.at(Math.max(0, definition.age - 1)),
      submitted_at: submitted, created_at: submitted,
      updated_at: t.at(0, 11),
      requested_action: definition.action, total_estimated_loss: (definition.amount / 100).toFixed(2),
      loss_attribution: definition.source === 'carrier' ? 'carrier_loss' : definition.source === 'warehouse' ? 'warehouse_mispick' : 'merchant_policy',
      attribution_confidence: index < 3 ? 'high' : 'medium',
      recoverability: definition.recovery ? 'recoverable' : 'not_recoverable',
      recovery_owner: definition.source === 'carrier' ? 'carrier' : definition.source === 'warehouse' ? 'warehouse' : 'merchant',
      recovery_required_evidence: ['order confirmation', 'source status', 'support conversation', 'item detail'],
      recovery_next_action: definition.recovery ? 'Review the source evidence and progress the recovery route.' : 'No recovery action is required.',
      recommended_payout_action: definition.action === 'replacement' ? 'Approve replacement' : 'Review refund',
      recommended_rule_name: caseRule.name, recommended_rule_id: caseRule.id,
      payout_decision_state: definition.status.startsWith('resolved_') ? 'decided' : 'undecided',
      recovery_state: definition.recovery ?? 'no_recovery_needed',
      next_action: definition.status.startsWith('resolved_') ? 'No further action' : 'Review the evidence and record a decision',
      next_action_reason: 'The case has enough connected context for a merchant review.',
      case_origin: 'connector', state_version: 1,
    });
    claimedItems.push({
      id: stableId('claimed', index + 1), merchant_id: merchantId, support_payout_case_id: definition.id,
      source_order_line_id: orderLine.id, claimed_sku: orderLine.sku, claimed_variant_ref: orderLine.variant_ref,
      claimed_title: orderLine.title, claimed_quantity: 1, extraction_method: 'deterministic',
      match_status: 'confirmed', match_method: 'source_order_line', match_confidence: 0.99,
      confirmed_by: operatorId, confirmed_at: t.at(Math.max(0, definition.age - 1)), metadata,
      created_at: submitted, updated_at: t.at(Math.max(0, definition.age - 1)),
    });
    const evidenceTypes = [
      ['shopify', 'order_confirmation', 'Order and payment confirmed'],
      ['shopify', 'line_item', `${orderLine.title} · ${orderLine.variant_ref}`],
      ['gorgias', 'support_thread', 'Customer conversation reviewed'],
      [definition.source === 'warehouse' ? 'shipbob' : 'ups', 'fulfilment_status', definition.source === 'warehouse' ? 'Pick record confirmed' : 'Latest parcel scan received'],
    ];
    evidenceTypes.forEach(([source, type, title], evidenceIndex) => {
      const id = stableId('evidence', index * 4 + evidenceIndex + 1);
      evidenceItems.push({
        id, claim_id: definition.id, merchant_id: merchantId, source_system: source,
        evidence_type: type, title, summary: `${title}. Source record is current and linked to ${order.order_number}.`,
        occurred_at: t.at(definition.age + 3 - evidenceIndex), proves: type,
        confidence: 0.93 + evidenceIndex * 0.01, source_record_id: `${source}-${index + 1}-${evidenceIndex + 1}`,
        connection_id: source === 'gorgias' ? stableId('connection', 2) : stableId('connection', 1),
        source_created_at: t.at(definition.age + 3 - evidenceIndex),
        source_updated_at: t.at(Math.max(0, definition.age + 2 - evidenceIndex)),
        ingested_at: t.at(Math.max(0, definition.age + 1 - evidenceIndex)),
        last_synced_at: t.at(Math.max(0, definition.age + 1 - evidenceIndex)),
        freshness_state: 'current', sync_state: 'current', structured_value: { order_reference: order.order_number },
        source_metadata: metadata, created_by: operatorId, created_at: submitted, updated_at: t.at(Math.max(0, definition.age - 1)),
      });
    });
    const eventSpecs = [
      ['case_created', null, definition.status, 'Case created from the Gorgias conversation.'],
      ['evidence_linked', definition.status, definition.status, 'Order, item and source records linked.'],
      ['rule_applied', definition.status, definition.status, `${caseRule.name} applied.`],
      [definition.status.startsWith('resolved_') ? 'case_resolved' : 'review_ready', definition.status, definition.status, definition.status.startsWith('resolved_') ? 'Customer outcome confirmed and recovery recorded.' : 'Case is ready for merchant review.'],
    ];
    eventSpecs.forEach(([eventType, fromStatus, toStatus, note], eventIndex) => {
      claimEvents.push({
        id: stableId('event', index * 4 + eventIndex + 1), claim_id: definition.id, merchant_id: merchantId,
        event_type: eventType, from_status: fromStatus, to_status: toStatus, note,
        actor_user_id: eventIndex === 0 ? null : MARKETING_STORY.team[eventIndex % MARKETING_STORY.team.length].id,
        metadata: { source: eventIndex === 0 ? 'Gorgias' : 'Unauth', ...metadata },
        created_at: t.at(Math.max(0, definition.age - eventIndex), 9 + eventIndex),
      });
    });
    comments.push({
      id: stableId('comment', index + 1), merchant_id: merchantId, support_payout_case_id: definition.id,
      author_user_id: MARKETING_STORY.team[(index + 1) % 3].id,
      body: index < 3 ? 'Checked the connected order, item and source history. The next step is recorded above.' : 'Reviewed the latest customer and source update.',
      created_at: t.at(Math.max(0, definition.age - 1), 11), updated_at: t.at(Math.max(0, definition.age - 1), 11),
    });
    ['customer_action', 'responsibility', 'recovery'].forEach((recommendationType, recommendationIndex) => {
      recommendationSnapshots.push({
        id: stableId('recommendation', index * 3 + recommendationIndex + 1),
        merchant_id: merchantId, support_payout_case_id: definition.id, recommendation_type: recommendationType,
        result_code: [definition.action, definition.source, definition.recovery ?? 'not_applicable'][recommendationIndex],
        assessment_state: recommendationIndex === 2 && !definition.recovery ? 'not_applicable' : 'known',
        headline: [
          definition.action === 'replacement' ? 'Approve a replacement' : 'Review the refund request',
          definition.source === 'carrier' ? 'Carrier responsibility is supported' : definition.source === 'warehouse' ? 'Fulfilment responsibility is supported' : 'Merchant policy applies',
          definition.recovery ? 'A recovery route is available' : 'No partner recovery applies',
        ][recommendationIndex],
        explanation: 'Connected source evidence and the applied rule support this recommendation. The merchant remains in control.',
        reason_codes: [definition.type, definition.source], supporting_evidence_ids: evidenceItems.slice(-4).map((item) => item.id),
        conflicting_evidence_ids: [], missing_evidence: [], merchant_rule_version_id: ruleVersions[definition.rule].id,
        policy_snapshot: { rule_name: caseRule.name, version: caseRule.version }, input_hash: hash(`recommendation:${index}:${recommendationIndex}`),
        engine_version: 'decision-v2', generated_at: t.at(Math.max(0, definition.age - 1), 11),
        generated_by: 'system', metadata,
      });
    });
    const shipmentId = stableId('shipment', index + 1);
    const sourceEventAt = t.at(Math.max(0, definition.age - 2), 7 + (index % 5));
    const shipmentUpdatedAt = delayedTracking ? t.at(3, 11) : t.at(0, 10 + (index % 3));
    const isWarehouseShipment = definition.source === 'warehouse';
    shipments.push({
      id: shipmentId, merchant_id: merchantId, source_order_id: order.id,
      external_id: `${isWarehouseShipment ? 'NL' : 'UPS'}-${hash(`shipment:${index}`).slice(0, 10).toUpperCase()}`,
      tracking_number: isWarehouseShipment
        ? `NL${hash(`tracking:${index}`).slice(0, 14).toUpperCase()}`
        : `1Z${hash(`tracking:${index}`).slice(0, 16).toUpperCase()}`,
      carrier: isWarehouseShipment ? 'Northline Fulfilment' : 'UPS',
      service: isWarehouseShipment ? 'Northline parcel' : index % 2 ? 'UPS Standard' : 'UPS Express Saver',
      status: 'delivered', source_status: 'delivered',
      shipped_at: t.at(definition.age + 8), delivered_at: t.at(definition.age + 5),
      raw_metadata: metadata, created_at: t.at(definition.age + 8), updated_at: shipmentUpdatedAt,
    });
    shipmentLines.push({
      id: stableId('line', 1000 + index + 1),
      merchant_id: merchantId,
      source_shipment_id: shipmentId,
      source_order_line_id: orderLine.id,
      external_id: `${shipmentId}-item`,
      external_product_ref: orderLine.product_ref,
      sku: orderLine.sku,
      variant_ref: orderLine.variant_ref,
      quantity_recorded: orderLine.quantity,
      record_kind: 'system_record',
      evidence_basis: 'provider_fulfilment_record',
      source_created_at: t.at(definition.age + 8),
      source_updated_at: shipmentUpdatedAt,
      raw_metadata: { status: 'delivered', ...metadata },
      created_at: t.at(definition.age + 8),
      updated_at: shipmentUpdatedAt,
    });
    if (definition.recovery) {
      const evidenceRequirements = ['order confirmation', 'source status', 'proof of value', 'support conversation', 'item detail', 'delivery timeline']
        .slice(0, 2 + (index % 5));
      const recoveredMinor = definition.recovery === 'paid' ? Math.round(definition.amount * 0.78) : 0;
      const recoverableMinor = Math.round(definition.amount * (0.62 + (index % 3) * 0.08));
      losses.push({
        id: lossId, merchant_id: merchantId, support_payout_case_id: definition.id,
        case_category: definition.type === 'damaged' ? 'damaged_goods' : definition.type === 'wrong_item' ? 'wrong_item_or_missing_item' : definition.type === 'chargeback' ? 'chargeback_or_payment_dispute' : 'delivery_loss',
        case_type: definition.type, recovery_route: definition.source === 'warehouse' ? 'internal_fulfilment_issue' : definition.type === 'chargeback' ? 'chargeback_evidence_pack' : 'carrier_claim',
        status: definition.recovery === 'paid' ? 'approved' : 'collecting_evidence',
        order_id: order.id, helpdesk_ticket_id: ticketId, shipment_id: shipmentId,
        counterparty_type: definition.source === 'warehouse' ? '3pl' : definition.type === 'chargeback' ? 'payment_processor' : 'carrier',
        counterparty_name: definition.source === 'warehouse' ? 'Northline Fulfilment' : definition.type === 'chargeback' ? 'Shopify Payments' : 'UPS',
        evidence_completion_score: 100, missing_evidence_count: 0,
        claim_deadline_at: t.after(3 + (index * 5) % 27),
        order_value_minor: definition.amount, refund_value_minor: definition.status.startsWith('resolved_') ? definition.amount : 0,
        estimated_recovery_minor: recoverableMinor, approved_recovery_minor: recoveredMinor,
        currency, source_confidence: 'source_verified', source_fingerprint: hash(`loss:${index}`),
        created_at: submitted, updated_at: t.at(Math.max(0, definition.age - 1)),
        financial_state: definition.status.startsWith('resolved_') ? 'confirmed' : 'estimated',
        attribution: definition.source, attribution_confidence: 0.95, recoverability: 'recoverable',
        owner_user_id: definition.owner === null ? null : MARKETING_STORY.team[definition.owner].id,
        confirmed_at: definition.status.startsWith('resolved_') ? t.at(Math.max(0, definition.age - 3)) : null,
        estimated_at: submitted, prevention_only: false, source_record_id: shipmentId,
        source_metadata: { source_label: definition.source === 'warehouse' ? 'Northline Fulfilment' : 'UPS', ...metadata },
      });
      recoveries.push({
        id: index === 1 ? MARKETING_STORY.capture.recovery : recoveryId,
        merchant_id: merchantId, support_payout_case_id: definition.id, loss_case_id: lossId,
        partner_id: definition.source === 'warehouse' ? partners[1].id : partners[0].id,
        recovery_type: definition.source === 'warehouse' ? 'three_pl_claim' : definition.type === 'chargeback' ? 'chargeback_evidence' : 'carrier_claim',
        owner_type: definition.source === 'warehouse' ? 'three_pl' : definition.type === 'chargeback' ? 'payment_dispute_provider' : 'carrier',
        status: definition.recovery, merchant_loss_amount: (definition.amount / 100).toFixed(2),
        eligible_loss_amount: (definition.amount / 100).toFixed(2),
        estimated_recoverable_min: (Math.round(recoverableMinor * 0.82) / 100).toFixed(2),
        estimated_recoverable_max: (recoverableMinor / 100).toFixed(2),
        amount_recovered: recoveredMinor ? (recoveredMinor / 100).toFixed(2) : null,
        amount_sought_minor: recoverableMinor,
        amount_approved_minor: definition.recovery === 'paid' ? recoverableMinor : 0,
        amount_recovered_minor: recoveredMinor,
        amount_written_off_minor: 0,
        provider_claim_stage: definition.recovery === 'paid' ? 'reconciled' : definition.recovery === 'waiting_response' ? 'acknowledged' : definition.recovery === 'submitted' || definition.recovery === 'chase_due' ? 'sent' : 'prepared',
        currency, deadline_at: t.after(3 + (index * 5) % 27),
        next_chase_at: definition.recovery === 'waiting_response' || definition.recovery === 'chase_due' ? t.after((index % 4) - 1) : null,
        last_chased_at: definition.recovery === 'waiting_response' ? t.at(3 + index) : null,
        evidence_required: evidenceRequirements,
        evidence_missing: definition.recovery === 'evidence_needed' ? [evidenceRequirements.at(-1)] : [],
        evidence_complete: definition.recovery !== 'evidence_needed',
        calculation_reason: ['Eligible item value based on the linked order line.', 'Expected recovery reflects the partner terms.'],
        excluded_costs: ['support time'], internal_owner_user_id: definition.owner === null ? null : MARKETING_STORY.team[definition.owner].id,
        created_at: t.at(Math.max(0, definition.age - 1)), updated_at: t.at(index % 3, 5 + (index % 3)),
        last_source_event_at: sourceEventAt,
      });
      const confirmedLossMinor = definition.status.startsWith('resolved_') ? definition.amount : 0;
      const resolved = definition.status.startsWith('resolved_');
      const eligibleFinancial = confirmedLossMinor > 0;
      const states = [
        ['requested', definition.amount],
        ...(!resolved ? [['exposed', definition.amount]] : []),
        ['approved', resolved ? definition.amount : 0],
        ['paid', resolved ? definition.amount : 0],
        ['estimated_loss', resolved ? 0 : definition.amount],
        ['prevented', 0],
        ['confirmed_loss', confirmedLossMinor],
        ...(eligibleFinancial ? [['recoverable', recoverableMinor], ['recovered', recoveredMinor]] : []),
        ['written_off', 0],
      ];
      states.forEach(([state, amount], entryIndex) => financialEntries.push({
        id: stableId('financial', index * 12 + entryIndex + 1), merchant_id: merchantId,
        support_payout_case_id: definition.id, loss_case_id: lossId, recovery_case_id: index === 1 ? MARKETING_STORY.capture.recovery : recoveryId,
        state, amount_minor: amount, currency, direction: state === 'recovered' ? 'credit' : 'memo',
        source_record_id: shipmentId, effective_at: sourceEventAt, recorded_at: t.at(Math.max(0, definition.age - 1)),
        metadata: { range: 'last_30_days', as_of: t.asOf, inclusion: 'effective_at within range', ...metadata },
        created_at: t.at(Math.max(0, definition.age - 1)),
      }));
      financialSummaries.push({
        merchant_id: merchantId, support_payout_case_id: definition.id, currency,
        requested_minor: definition.amount, exposed_minor: definition.status.startsWith('resolved_') ? 0 : definition.amount,
        approved_minor: definition.status.startsWith('resolved_') ? definition.amount : 0,
        paid_minor: definition.status.startsWith('resolved_') ? definition.amount : 0,
        estimated_loss_minor: definition.status.startsWith('resolved_') ? 0 : definition.amount,
        confirmed_loss_minor: confirmedLossMinor,
        recoverable_minor: eligibleFinancial ? recoverableMinor : 0,
        recovered_minor: eligibleFinancial ? recoveredMinor : 0,
        prevented_minor: 0, written_off_minor: 0,
        known_states: [
          'requested',
          ...(!resolved ? ['exposed'] : []),
          'approved', 'paid', 'estimated_loss', 'confirmed_loss',
          ...(eligibleFinancial ? ['recoverable', 'recovered'] : []),
          'prevented', 'written_off',
        ],
        updated_at: sourceEventAt,
      });
    }
    if (index < 3) {
      const isResolved = definition.status.startsWith('resolved_');
      const isWaiting = definition.status === 'recovery_opened';
      clarificationRequests.push({
        id: stableId('clarification', index + 1),
        merchant_id: merchantId,
        support_payout_case_id: definition.id,
        target_type: definition.source === 'warehouse' ? '3pl' : 'carrier',
        target_name: definition.source === 'warehouse' ? 'Northline Fulfilment' : 'UPS',
        status: isResolved ? 'closed' : isWaiting ? 'waiting_response' : 'response_received',
        requested_evidence: definition.source === 'warehouse'
          ? ['pick and pack record', 'dispatch confirmation']
          : ['delivery scan detail', 'depot review'],
        evidence_gap: definition.source === 'warehouse' ? 'Confirm the picked variant.' : 'Confirm the final delivery scan.',
        subject: `${definition.subject} — source clarification`,
        request_summary: definition.source === 'warehouse'
          ? 'Confirm the item recorded at pick and dispatch.'
          : 'Confirm the final parcel scan and delivery location.',
        request_body: 'Please review the linked reference and confirm the source record details.',
        recommended_reason: 'The response completes the evidence trail used for merchant review.',
        source_channel: 'email',
        recipient: definition.source === 'warehouse' ? 'claims@northline.invalid' : 'claims@ups.invalid',
        partner_id: definition.source === 'warehouse' ? partners[1].id : partners[0].id,
        is_primary: true,
        sent_at: t.at(definition.age + 2, 10),
        sent_by: operatorId,
        response_received_at: isWaiting ? null : t.at(Math.max(0, definition.age - 1), 9),
        responder_name: isWaiting ? null : definition.source === 'warehouse' ? 'Northline Claims' : 'UPS Claims',
        response_summary: isWaiting ? null : definition.source === 'warehouse'
          ? 'The dispatch record confirms the wrong variant was packed.'
          : 'The depot confirmed the final scan and delivery location.',
        response_body: isWaiting ? null : 'The linked source record has been checked and confirmed.',
        response_outcome: isWaiting ? null : 'issue_confirmed',
        response_recorded_by: isWaiting ? null : operatorId,
        due_at: isWaiting ? t.after(2) : t.at(Math.max(0, definition.age - 1), 16),
        closed_at: isResolved ? t.at(Math.max(0, definition.age - 2), 11) : null,
        closed_by: isResolved ? operatorId : null,
        closure_reason: isResolved ? 'Evidence received and customer outcome completed.' : null,
        external_reference: `AA-INV-${731 + index * 23}`,
        idempotency_key: `${MARKETING_STORY.namespace}:clarification:${definition.key}`,
        metadata,
        state_version: isWaiting ? 2 : isResolved ? 4 : 3,
        created_by: operatorId,
        created_at: t.at(definition.age + 2, 9),
        updated_at: t.at(Math.max(0, definition.age - 1), 10),
      });
    }
    if (!definition.status.startsWith('resolved_')) {
      workTasks.push({
        id: stableId('work', index + 1), merchant_id: merchantId, support_payout_case_id: definition.id,
        loss_case_id: definition.recovery ? lossId : null,
        recovery_case_id: definition.recovery ? (index === 1 ? MARKETING_STORY.capture.recovery : recoveryId) : null,
        title: definition.recovery === 'chase_due' ? `Chase ${definition.source} response` : `Review ${definition.subject.toLowerCase()}`,
        description: 'Review the latest connected evidence and record the next merchant action.',
        owner_user_id: definition.owner === null ? null : MARKETING_STORY.team[definition.owner].id,
        owner_role: definition.owner === null ? null : MARKETING_STORY.team[definition.owner].role,
        due_at: index % 4 === 0 ? t.at(1) : t.after((index % 5) + 1),
        priority: index % 4 === 0 ? 'high' : index % 3 === 0 ? 'low' : 'medium',
        status: 'open', source: 'flow', source_metadata: metadata,
        created_at: submitted, updated_at: t.at(Math.max(0, definition.age - 1)),
      });
    }
    if (definition.status.startsWith('resolved_')) {
      decisions.push({
        id: stableId('decision', index + 1), merchant_id: merchantId, support_payout_case_id: definition.id,
        decision: 'approved', action: definition.action, amount_minor: definition.amount, currency,
        rule_snapshot: { name: caseRule.name, version: caseRule.version },
        recommendation_snapshot: { customer_action: definition.action, responsibility: definition.source },
        followed_recommendation: true, reason: 'Connected evidence and the published rule supported the merchant decision.',
        actor_type: 'merchant_user', actor_user_id: operatorId,
        effective_at: t.at(Math.max(0, definition.age - 4)), recorded_at: t.at(Math.max(0, definition.age - 4)),
        idempotency_key: `${MARKETING_STORY.namespace}:decision:${definition.key}`,
      });
      outcomes.push({
        id: stableId('outcome', index + 1), merchant_id: merchantId, support_payout_case_id: definition.id,
        outcome_type: definition.action === 'replacement' ? 'replacement' : 'cash_refund',
        amount_minor: definition.amount, currency, reason: 'The customer outcome was confirmed from the connected source.',
        metadata, actor_type: 'source', effective_at: t.at(Math.max(0, definition.age - 3)),
        recorded_at: t.at(Math.max(0, definition.age - 3)),
        idempotency_key: `${MARKETING_STORY.namespace}:outcome:${definition.key}`,
      });
    }
  });

  const evidencePackages = heroDefinitions.map((hero, index) => ({
    id: stableId('package', index + 1), merchant_id: merchantId,
    customer_profile_id: merchantCustomers[hero.customer].id, generated_for_order_id: orders[hero.orderOffset].id,
    generated_at: t.at(Math.max(0, hero.age - 1)), reference_number: `AA-EV-${731 + index * 17}`,
    narrative_summary: 'Connected order, item, support and source evidence are assembled for merchant review.',
    signal_snapshot: evidenceItems.filter((item) => item.claim_id === hero.id).map((item) => ({ source: item.source_system, type: item.evidence_type, title: item.title })),
    cross_merchant_indicator: false, ce3_eligible: false, ce3_qualifying_signals: [], ce3_prior_transactions: [],
    merchant_notes: 'Reviewed by the customer operations team.', created_at: t.at(Math.max(0, hero.age - 1)),
  }));

  const connections = [
    { id: MARKETING_STORY.capture.connection, provider_id: 'shopify', category: 'commerce', display_name: 'Shopify', account: MARKETING_STORY.connections.commerce.accountName, status: 'connected', sync: t.at(0, 11, 42), records: orders.length },
    { id: stableId('connection', 2), provider_id: 'gorgias', category: 'helpdesk', display_name: 'Gorgias', account: MARKETING_STORY.connections.support.accountName, status: 'connected', sync: t.at(0, 11, 36), records: tickets.length },
    { id: stableId('connection', 3), provider_id: 'shipbob', category: 'warehouse_3pl', display_name: 'ShipBob', account: MARKETING_STORY.connections.fulfilment.accountName, status: 'connected', sync: t.at(0, 10, 58), records: shipments.length },
    { id: stableId('connection', 4), provider_id: 'ups', category: 'carrier', display_name: 'UPS', account: MARKETING_STORY.connections.carrier.accountName, status: 'degraded', sync: t.at(2, 16, 14), records: shipments.length },
  ].map((connection) => ({
    id: connection.id, merchant_id: merchantId, provider_id: connection.provider_id,
    category: connection.category, status: connection.status, auth_mode: 'oauth',
    last_sync_at: connection.sync, last_error: connection.status === 'degraded' ? 'The latest tracking export is delayed.' : null,
    last_error_code: connection.status === 'degraded' ? 'carrier_export_delayed' : null,
    last_error_message: connection.status === 'degraded' ? 'The latest tracking export is delayed.' : null,
    last_error_at: connection.status === 'degraded' ? t.at(0, 8, 17) : null,
    display_name: connection.display_name, provider_account_id: `aa-${connection.provider_id}-account`,
    provider_account_name: connection.account, capabilities_snapshot: { read: true, writeback: false },
    granted_scopes: ['read'], writeback_enabled: false, subscribed: true,
    last_sync_started_at: connection.sync, last_sync_completed_at: connection.sync,
    last_successful_sync_at: connection.sync, data_fresh_through: connection.sync,
    webhook_status: connection.status === 'degraded' ? 'delayed' : 'active',
    webhook_last_received_at: connection.sync, imported_record_count: connection.records,
    connector_version: '2026-07', environment: 'production',
    connection_created_at: t.at(300), last_verified_at: connection.sync,
    last_verification_status: connection.status === 'degraded' ? 'failed' : 'verified',
    created_at: t.at(300), updated_at: connection.sync,
  }));

  const domainEvents = flows.slice(0, 2).map((flow, index) => ({
    id: stableId('domainEvent', index + 1), merchant_id: merchantId,
    aggregate_type: 'workflow_definition', aggregate_id: flow.id,
    event_type: flow.trigger_event_type, payload: { source: index ? 'loss' : 'case', ...metadata },
    idempotency_key: `${MARKETING_STORY.namespace}:flow-event:${index + 1}`,
    occurred_at: t.at(2 + index * 3), recorded_at: t.at(2 + index * 3), created_at: t.at(2 + index * 3),
  }));
  const workflowRuns = domainEvents.map((event, index) => ({
    id: stableId('flowRun', index + 1), merchant_id: merchantId,
    workflow_definition_id: flows[index].id, domain_event_id: event.id,
    status: 'completed', started_at: event.occurred_at,
    completed_at: new Date(Date.parse(event.occurred_at) + 14_000 + index * 3_000).toISOString(),
  }));

  const notifications = [
    ['approaching_deadline', 'UPS response is due', 'The carrier recovery for a damaged overshirt needs a follow-up.', `/recoveries/${MARKETING_STORY.capture.recovery}`, 1, 8, 17],
    ['decision_request', 'Delivered parcel case is ready', 'Order, item and carrier evidence are ready for merchant review.', `/claims/${MARKETING_STORY.capture.caseDecisionReady}`, 0, 11, 43],
    ['evidence_update', 'Evidence flow completed', 'Missing delivery evidence was linked to the case.', `/flows/${MARKETING_STORY.capture.flow}`, 2, 15, 7],
    ['sync_failure', 'UPS sync needs attention', 'The latest tracking export is delayed; existing evidence remains available.', '/integrations/ups', 2, 7, 28],
    ['recovery_outcome', 'Fulfilment credit received', 'Northline Fulfilment credited the resolved wrong-item case.', `/claims/${MARKETING_STORY.capture.caseResolvedRecovered}`, 5, 13, 52],
    ['daily_work_summary', 'Two reviews are due soon', 'Open Work to review the next merchant actions.', '/work', 0, 9, 14],
  ].map(([kind, title, body, href, days, hour, minute], index) => ({
    id: stableId('notification', index + 1), merchant_id: merchantId, recipient_user_id: operatorId,
    kind, title, body, target_href: href, deduplication_key: `${MARKETING_STORY.namespace}:notification:${index + 1}`,
    read_at: index === 2 || index === 4 ? t.at(Number(days), Number(hour) + 1, Number(minute)) : null,
    created_at: t.at(Number(days), Number(hour), Number(minute)),
  }));

  const storeConnections = [{
    id: MARKETING_STORY.capture.connection, merchant_id: merchantId, platform: 'shopify',
    store_key: MARKETING_STORY.merchant.storeDomain, store_url: `https://${MARKETING_STORY.merchant.storeDomain}`,
    status: 'active', credentials_encrypted: 'local-marketing-fixture-placeholder',
    scopes: ['read_orders', 'read_customers', 'read_fulfillments'], installed_at: t.at(300),
    last_sync_at: t.at(0, 11, 42), collector_metadata: { account_name: MARKETING_STORY.connections.commerce.accountName },
    last_verified_at: t.at(0, 11, 42), last_verification_status: 'verified',
    created_at: t.at(300), updated_at: t.at(0, 11, 42),
  }];
  const helpdeskConnections = [{
    id: stableId('connection', 2), merchant_id: merchantId, provider: 'gorgias',
    provider_account_id: 'alder-ash-support', provider_account_name: MARKETING_STORY.connections.support.accountName,
    provider_base_url: 'https://alderandash.gorgias.invalid', status: 'active',
    access_token_encrypted: 'local-marketing-fixture-placeholder',
    scopes: [
      'read:tickets',
      'read:customers',
      { kind: 'gorgias_sidebar_widget', integration_id: 7314, widget_id: 9462, registered_at: t.at(120) },
    ],
    last_sync_at: t.at(0, 11, 36),
    created_at: t.at(300), updated_at: t.at(0, 11, 36),
    last_verified_at: t.at(0, 11, 36), last_verification_status: 'verified',
  }];
  const merchantUsers = MARKETING_STORY.team.map((member, index) => ({
    id: stableId('membership', index + 1), merchant_id: merchantId, user_id: member.id,
    invited_email: member.email, role: member.role, invite_status: 'active',
    created_at: t.at(360 - index * 30), accepted_at: t.at(359 - index * 30),
  })).concat({
    id: stableId('membership', 99),
    merchant_id: MARKETING_STORY.onboarding.merchant.id,
    user_id: MARKETING_STORY.onboarding.operator.id,
    invited_email: MARKETING_STORY.onboarding.operator.email,
    role: MARKETING_STORY.onboarding.operator.role,
    invite_status: 'active',
    created_at: t.at(3),
    accepted_at: t.at(3),
  });
  const identityNotes = [{
    id: stableId('note', 1),
    merchant_id: merchantId,
    identity_id: identities[0].id,
    body: 'Prefers email updates and collection-point delivery when available.',
    created_by: operatorId,
    created_at: t.at(18, 14),
  }];
  const merchantIdentityState = merchantCustomers.map((customer, index) => ({
    merchant_id: merchantId,
    identity_id: identities[index].id,
    on_watchlist: false,
    investigation_status: index === 0 ? 'resolved' : 'new',
    display_name: customer.display_name,
    display_email: customer.email,
    updated_by: operatorId,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  }));
  const savedViews = [{
    id: MARKETING_STORY.capture.workView,
    merchant_id: merchantId,
    owner_user_id: operatorId,
    name: 'Carrier follow-up',
    definition: { view: 'overdue' },
    is_shared: true,
    created_at: t.at(14),
    updated_at: t.at(3),
  }];
  const sourceDisputes = [{
    id: MARKETING_STORY.capture.dispute,
    merchant_id: merchantId,
    source_order_id: orders[0].id,
    external_id: 'dp_alder_ash_001',
    dispute_type: 'chargeback',
    reason: 'Item not received',
    amount: '128.00',
    currency,
    status: 'evidence_due',
    initiated_at: t.at(6),
    finalized_at: null,
    ingested_at: t.at(0, 11),
  }];
  const sourceRefunds = [{
    id: MARKETING_STORY.capture.refund,
    merchant_id: merchantId,
    source_order_id: orders[0].id,
    external_id: 'gid://shopify/Refund/880001',
    amount: '42.00',
    currency,
    reason: 'Goodwill adjustment',
    is_full_refund: false,
    refunded_at: t.at(4, 15),
    raw_payload_hash: hash('refund:880001'),
    ingested_at: t.at(4, 15),
  }];
  const sourceReturns = [{
    id: MARKETING_STORY.capture.return,
    merchant_id: merchantId,
    source_account_id: null,
    source_order_id: orders[0].id,
    support_payout_case_id: null,
    source_record_id: null,
    external_id: 'ret_alder_ash_001',
    status: 'inspected',
    source_status: 'closed',
    disposition: 'restock',
    requested_at: t.at(10, 9),
    received_at: t.at(6, 13),
    inspected_at: t.at(5, 10),
    refund_reference: 'gid://shopify/Refund/880001',
    replacement_reference: null,
    raw_metadata: { ...metadata, item: 'Ribbed Travel Scarf · Oatmeal' },
    created_at: t.at(10, 9),
    updated_at: t.at(5, 10),
  }];
  const pendingProviderAccountSelections = [{
    id: MARKETING_STORY.capture.shipbobSelection,
    merchant_id: merchantId,
    user_id: operatorId,
    provider_id: 'shipbob',
    environment: 'production',
    accounts: [
      { id: 'channel-london', name: 'London fulfilment' },
      { id: 'channel-birmingham', name: 'Birmingham overflow' },
    ],
    // GET selection proof never decrypts or consumes this local-only row.
    encrypted_payload: 'local-marketing-capture-not-consumable',
    expires_at: t.after(365),
    consumed_at: null,
    created_at: t.at(0, 8),
  }];

  const fixture = {
    version: MARKETING_STORY.version,
    asOf: t.asOf,
    manifest: MARKETING_STORY,
    captureUrls: CAPTURE_URLS,
    tables: {
      merchants: [
        {
          id: merchantId, name: MARKETING_STORY.merchant.name, is_demo: false, is_internal: true,
          settings: { platform: 'shopify', currency, timezone: MARKETING_STORY.merchant.timezone, store_domain: MARKETING_STORY.merchant.storeDomain, onboarding_profile_complete: true, setup_complete: true, dataset_version: MARKETING_STORY.version },
          created_at: t.at(400), updated_at: t.at(0),
        },
        {
          id: MARKETING_STORY.onboarding.merchant.id,
          name: MARKETING_STORY.onboarding.merchant.name,
          is_demo: false,
          is_internal: true,
          settings: {
            platform: 'shopify',
            currency: MARKETING_STORY.onboarding.merchant.currency,
            timezone: MARKETING_STORY.onboarding.merchant.timezone,
            store_domain: MARKETING_STORY.onboarding.merchant.storeDomain,
            onboarding_profile_complete: false,
            setup_complete: false,
            dataset_version: MARKETING_STORY.version,
          },
          created_at: t.at(3),
          updated_at: t.at(0),
        },
      ],
      identities,
      identity_members: identityMembers,
      merchant_users: merchantUsers,
      pending_provider_account_selections: pendingProviderAccountSelections,
      store_connections: storeConnections,
      helpdesk_connections: helpdeskConnections,
      merchant_integrations: connections,
      partners,
      merchant_customers: merchantCustomers,
      merchant_identity_state: merchantIdentityState,
      source_customers: sourceCustomers,
      identity_signals: identitySignals,
      identity_notes: identityNotes,
      source_orders: orders.map(({ raw_arithmetic, ...order }) => ({ ...order, raw_payload_hash: hash(JSON.stringify(raw_arithmetic)) })),
      source_order_lines: orderLines,
      source_disputes: sourceDisputes,
      source_refunds: sourceRefunds,
      source_returns: sourceReturns,
      merchant_rules: rules.map(({ version, version_status, ...rule }) => rule),
      merchant_rule_versions: ruleVersions,
      workflow_definitions: flows,
      domain_events: domainEvents,
      workflow_runs: workflowRuns,
      source_tickets: tickets,
      support_payout_cases: cases,
      case_clarification_requests: clarificationRequests,
      case_claimed_items: claimedItems,
      evidence_items: evidenceItems,
      evidence_packages: evidencePackages,
      claim_events: claimEvents,
      case_comments: comments,
      case_recommendation_snapshots: recommendationSnapshots,
      source_shipments: shipments,
      source_shipment_lines: shipmentLines,
      loss_cases: losses.map((loss, index) => ({ ...loss, id: index === 2 ? MARKETING_STORY.capture.loss : loss.id })),
      recovery_cases: recoveries,
      work_tasks: workTasks,
      work_saved_views: savedViews,
      case_decisions: decisions,
      case_outcomes: outcomes,
      case_financial_entries: financialEntries,
      case_financial_summaries: financialSummaries,
      notifications,
    },
    validation: {
      orderArithmetic: orders.map((order) => ({ id: order.id, ...order.raw_arithmetic })),
      caseDefinitions,
    },
  };
  return fixture;
}
