import type { ProviderConnectionView } from '@/lib/integrations/types';
import type { CounterpartyType, LossCaseCategory } from '@/lib/losses/types';

export type EvidenceRequirementSet = {
  required: string[];
  recommended: string[];
};

export const evidenceRequirements: Record<LossCaseCategory, EvidenceRequirementSet> = {
  delivery_loss: {
    required: [
      'order_details',
      'proof_of_value',
      'tracking_timeline',
      'customer_claim_message',
    ],
    recommended: [
      'proof_of_delivery_photo',
      'signature',
      'carrier_exception_reason',
      'carrier_lost_confirmation',
    ],
  },
  chargeback_or_payment_dispute: {
    required: [
      'order_details',
      'payment_record',
      'dispute_reason',
      'customer_correspondence',
      'refund_record',
    ],
    recommended: [
      'tracking_timeline',
      'delivery_confirmation',
      'return_status',
      'terms_or_policy_snapshot',
      'processor_case_update',
    ],
  },
  refund_dispute: {
    required: [
      'order_details',
      'refund_record',
      'payment_transaction',
      'customer_correspondence',
    ],
    recommended: [
      'processor_settlement_status',
      'bank_trace_reference',
      'refund_failure_reason',
    ],
  },
  returns_abuse_or_exception: {
    required: [
      'order_details',
      'return_authorisation',
      'return_tracking',
      'refund_record',
    ],
    recommended: [
      'warehouse_receiving_scan',
      'returned_item_condition',
      'returned_sku',
      'package_weight',
      'returns_provider_case_update',
    ],
  },
  damaged_goods: {
    required: [
      'order_details',
      'customer_claim_message',
      'fulfilment_record',
      'proof_of_value',
    ],
    recommended: [
      'damage_photo',
      'package_weight',
      'carrier_damage_report',
      'warehouse_confirmation',
      'supplier_correspondence',
    ],
  },
  wrong_item_or_missing_item: {
    required: [
      'order_details',
      'customer_claim_message',
      'fulfilment_record',
    ],
    recommended: [
      'pick_pack_log',
      'packed_sku',
      'expected_sku',
      'package_weight',
      'warehouse_confirmation',
      '3pl_confirmation',
    ],
  },
  fulfilment_or_warehouse_error: {
    required: [
      'order_details',
      'fulfilment_record',
      'customer_claim_message',
    ],
    recommended: [
      'pick_pack_log',
      'warehouse_exception',
      'package_weight',
      'warehouse_confirmation',
      '3pl_confirmation',
    ],
  },
  '3pl_accountability': {
    required: [
      'order_details',
      'fulfilment_record',
      'proof_of_value',
    ],
    recommended: [
      'pick_pack_log',
      'handover_scan',
      '3pl_confirmation',
      'warehouse_exception',
    ],
  },
  shipping_protection_claim: {
    required: [
      'order_details',
      'proof_of_value',
      'tracking_timeline',
      'customer_claim_message',
    ],
    recommended: [
      'protection_claim_status',
      'delivery_confirmation',
      'carrier_exception_reason',
    ],
  },
  marketplace_dispute: {
    required: [
      'order_details',
      'marketplace_case_status',
      'customer_correspondence',
    ],
    recommended: [
      'tracking_timeline',
      'delivery_confirmation',
      'refund_record',
      'marketplace_correspondence',
    ],
  },
  supplier_or_vendor_issue: {
    required: [
      'purchase_order',
      'supplier_invoice',
      'receiving_record',
    ],
    recommended: [
      'supplier_correspondence',
      'vendor_credit_note',
      'warehouse_discrepancy_report',
    ],
  },
  tax_duty_or_customs_issue: {
    required: [
      'order_details',
      'customs_charge_record',
      'customer_correspondence',
    ],
    recommended: [
      'customs_broker_correspondence',
      'duty_tax_invoice',
      'shipment_manifest',
    ],
  },
  subscription_or_digital_fulfilment_issue: {
    required: [
      'order_details',
      'payment_record',
      'customer_correspondence',
    ],
    recommended: [
      'subscription_status',
      'digital_fulfilment_log',
      'processor_case_update',
    ],
  },
  unknown_post_purchase_loss: {
    required: [
      'order_details',
      'customer_correspondence',
      'proof_of_value',
    ],
    recommended: [
      'refund_record',
      'tracking_timeline',
      'fulfilment_record',
    ],
  },
};

export type EvidenceSourcePlan = {
  whyItMatters: string;
  likelySourceProvider: string;
  connectorRequired: string;
  counterpartyType: CounterpartyType;
  clarificationShouldBeRequested: boolean;
  blockedWithoutIt: boolean;
};

const SOURCE_PLAN: Record<string, EvidenceSourcePlan> = {
  order_details: {
    whyItMatters: 'Identifies the transaction, customer, items, and merchant value at issue.',
    likelySourceProvider: 'shopify',
    connectorRequired: 'commerce',
    counterpartyType: 'internal_team',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  proof_of_value: {
    whyItMatters: 'Supports the amount requested in a claim or dispute pack.',
    likelySourceProvider: 'shopify',
    connectorRequired: 'commerce',
    counterpartyType: 'internal_team',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  tracking_timeline: {
    whyItMatters: 'Shows carrier scan history, delivery exceptions, and timeline gaps.',
    likelySourceProvider: 'aftership',
    connectorRequired: 'tracking',
    counterpartyType: 'carrier',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  customer_claim_message: {
    whyItMatters: 'Shows what the customer requested and when the issue was raised.',
    likelySourceProvider: 'gorgias',
    connectorRequired: 'helpdesk',
    counterpartyType: 'customer',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  customer_correspondence: {
    whyItMatters: 'Shows customer statements and replies from connected helpdesk or email threads.',
    likelySourceProvider: 'gorgias',
    connectorRequired: 'helpdesk',
    counterpartyType: 'customer',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  proof_of_delivery_photo: {
    whyItMatters: 'Can clarify delivered-but-not-received disputes without relying on screenshots.',
    likelySourceProvider: 'carrier_api',
    connectorRequired: 'carrier',
    counterpartyType: 'carrier',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  signature: {
    whyItMatters: 'Can verify a handoff where signature capture exists.',
    likelySourceProvider: 'carrier_api',
    connectorRequired: 'carrier',
    counterpartyType: 'carrier',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  carrier_exception_reason: {
    whyItMatters: 'Explains delay, failed delivery, damage, loss, or return-to-sender events.',
    likelySourceProvider: 'carrier_api',
    connectorRequired: 'carrier',
    counterpartyType: 'carrier',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  carrier_lost_confirmation: {
    whyItMatters: 'Supports a carrier claim only when the carrier source confirms loss.',
    likelySourceProvider: 'carrier_api',
    connectorRequired: 'carrier',
    counterpartyType: 'carrier',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  payment_record: {
    whyItMatters: 'Confirms captured payment, amount, currency, and processor transaction.',
    likelySourceProvider: 'shopify_payments',
    connectorRequired: 'payments',
    counterpartyType: 'payment_processor',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  payment_transaction: {
    whyItMatters: 'Links the refund or dispute to the processor transaction.',
    likelySourceProvider: 'shopify_payments',
    connectorRequired: 'payments',
    counterpartyType: 'payment_processor',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  dispute_reason: {
    whyItMatters: 'Determines the evidence required by the processor or card network.',
    likelySourceProvider: 'shopify_payments',
    connectorRequired: 'chargebacks',
    counterpartyType: 'payment_processor',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  refund_record: {
    whyItMatters: 'Shows refund amount, method, timestamp, and current settlement state.',
    likelySourceProvider: 'shopify',
    connectorRequired: 'commerce',
    counterpartyType: 'payment_processor',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  processor_case_update: {
    whyItMatters: 'Shows current payment dispute status and evidence due dates.',
    likelySourceProvider: 'stripe',
    connectorRequired: 'chargebacks',
    counterpartyType: 'payment_processor',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  processor_settlement_status: {
    whyItMatters: 'Clarifies whether funds settled, failed, or require trace information.',
    likelySourceProvider: 'stripe',
    connectorRequired: 'payments',
    counterpartyType: 'payment_processor',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  bank_trace_reference: {
    whyItMatters: 'Helps resolve refund-not-received cases without inventing settlement facts.',
    likelySourceProvider: 'payment_processor_api',
    connectorRequired: 'payments',
    counterpartyType: 'bank',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  refund_failure_reason: {
    whyItMatters: 'Explains failed or reversed refund attempts from processor records.',
    likelySourceProvider: 'payment_processor_api',
    connectorRequired: 'payments',
    counterpartyType: 'payment_processor',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  return_authorisation: {
    whyItMatters: 'Shows the RMA or return record that anchors a return exception.',
    likelySourceProvider: 'returns_provider',
    connectorRequired: 'returns',
    counterpartyType: 'returns_provider',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  return_tracking: {
    whyItMatters: 'Shows return shipment movement and delivery to the warehouse.',
    likelySourceProvider: 'aftership',
    connectorRequired: 'tracking',
    counterpartyType: 'carrier',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  return_status: {
    whyItMatters: 'Shows whether a return is authorized, in transit, delivered, or inspected.',
    likelySourceProvider: 'returns_provider',
    connectorRequired: 'returns',
    counterpartyType: 'returns_provider',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  fulfilment_record: {
    whyItMatters: 'Shows what was requested, packed, shipped, and handed over.',
    likelySourceProvider: 'shopify',
    connectorRequired: 'commerce',
    counterpartyType: 'warehouse',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  pick_pack_log: {
    whyItMatters: 'Clarifies SKU, quantity, and packing activity from warehouse systems.',
    likelySourceProvider: 'wms',
    connectorRequired: 'wms',
    counterpartyType: 'warehouse',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  packed_sku: {
    whyItMatters: 'Compares what the warehouse packed with what the customer ordered.',
    likelySourceProvider: 'wms',
    connectorRequired: 'wms',
    counterpartyType: 'warehouse',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  expected_sku: {
    whyItMatters: 'Shows the SKU expected from the source order.',
    likelySourceProvider: 'shopify',
    connectorRequired: 'commerce',
    counterpartyType: 'internal_team',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: false,
  },
  package_weight: {
    whyItMatters: 'Can support missing-item, empty-box, or return-content mismatch analysis.',
    likelySourceProvider: 'wms',
    connectorRequired: 'wms',
    counterpartyType: 'warehouse',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  warehouse_confirmation: {
    whyItMatters: 'Confirms or rejects a warehouse exception from a connected source.',
    likelySourceProvider: 'wms',
    connectorRequired: 'wms',
    counterpartyType: 'warehouse',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  '3pl_confirmation': {
    whyItMatters: 'Confirms or rejects a 3PL accountability event from connected records.',
    likelySourceProvider: '3pl',
    connectorRequired: '3pl',
    counterpartyType: '3pl',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  purchase_order: {
    whyItMatters: 'Anchors supplier/vendor claims to the ordered goods.',
    likelySourceProvider: 'erp',
    connectorRequired: 'erp',
    counterpartyType: 'supplier',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  supplier_invoice: {
    whyItMatters: 'Shows billed items, quantities, and supplier reference.',
    likelySourceProvider: 'erp',
    connectorRequired: 'erp',
    counterpartyType: 'supplier',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  receiving_record: {
    whyItMatters: 'Shows what arrived at the warehouse or receiving location.',
    likelySourceProvider: 'wms',
    connectorRequired: 'wms',
    counterpartyType: 'warehouse',
    clarificationShouldBeRequested: false,
    blockedWithoutIt: true,
  },
  supplier_correspondence: {
    whyItMatters: 'Records supplier replies and credit confirmations from connected sources.',
    likelySourceProvider: 'gmail',
    connectorRequired: 'email',
    counterpartyType: 'supplier',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  vendor_credit_note: {
    whyItMatters: 'Shows whether the vendor approved credit or replacement.',
    likelySourceProvider: 'erp',
    connectorRequired: 'erp',
    counterpartyType: 'supplier',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
  warehouse_discrepancy_report: {
    whyItMatters: 'Supports inbound or returns discrepancies with warehouse source data.',
    likelySourceProvider: 'wms',
    connectorRequired: 'wms',
    counterpartyType: 'warehouse',
    clarificationShouldBeRequested: true,
    blockedWithoutIt: false,
  },
};

const DEFAULT_SOURCE_PLAN: EvidenceSourcePlan = {
  whyItMatters: 'Required to complete a source-backed loss case.',
  likelySourceProvider: 'unknown',
  connectorRequired: 'unknown',
  counterpartyType: 'unknown',
  clarificationShouldBeRequested: true,
  blockedWithoutIt: false,
};

export type MissingEvidenceAvailabilityReason =
  | 'connector_not_connected'
  | 'provider_api_does_not_expose_field'
  | 'source_record_not_found'
  | 'correspondence_not_matched_confidently'
  | 'automation_setting_disabled'
  | 'unsupported_provider_capability';

export type MissingLossCaseEvidence = {
  evidenceType: string;
  requirementLevel: 'required' | 'recommended';
  whyItMatters: string;
  likelySourceProvider: string;
  connectorRequired: string;
  currentlyCollectibleAutomatically: boolean;
  clarificationShouldBeRequested: boolean;
  blockedWithoutIt: boolean;
  unavailableBecause: MissingEvidenceAvailabilityReason | null;
};

function providerMatchesPlan(provider: ProviderConnectionView, plan: EvidenceSourcePlan, evidenceType: string): boolean {
  return (
    provider.id === plan.likelySourceProvider ||
    provider.category === plan.connectorRequired ||
    provider.evidenceCapabilities.includes(evidenceType as never)
  );
}

function connectedProviderForPlan(providers: ProviderConnectionView[], plan: EvidenceSourcePlan, evidenceType: string): ProviderConnectionView | null {
  return providers.find((provider) => provider.status === 'connected' && providerMatchesPlan(provider, plan, evidenceType)) ?? null;
}

function slotProviderForPlan(providers: ProviderConnectionView[], plan: EvidenceSourcePlan, evidenceType: string): ProviderConnectionView | null {
  return providers.find((provider) => provider.buildStatus === 'slot_only' && providerMatchesPlan(provider, plan, evidenceType)) ?? null;
}

export function evaluateMissingLossCaseEvidence(input: {
  caseCategory: LossCaseCategory;
  presentEvidenceTypes: string[];
  providerViews?: ProviderConnectionView[];
  sourceRecordsNotFound?: string[];
  lowConfidenceCorrespondence?: string[];
  automationDisabledEvidenceTypes?: string[];
}): MissingLossCaseEvidence[] {
  const requirements = evidenceRequirements[input.caseCategory];
  const present = new Set(input.presentEvidenceTypes);
  const sourceRecordsNotFound = new Set(input.sourceRecordsNotFound ?? []);
  const lowConfidenceCorrespondence = new Set(input.lowConfidenceCorrespondence ?? []);
  const automationDisabled = new Set(input.automationDisabledEvidenceTypes ?? []);
  const providers = input.providerViews ?? [];
  const rows: MissingLossCaseEvidence[] = [];

  for (const [requirementLevel, evidenceTypes] of [
    ['required', requirements.required],
    ['recommended', requirements.recommended],
  ] as const) {
    for (const evidenceType of evidenceTypes) {
      if (present.has(evidenceType)) continue;
      const plan = SOURCE_PLAN[evidenceType] ?? DEFAULT_SOURCE_PLAN;
      const connected = connectedProviderForPlan(providers, plan, evidenceType);
      const slotOnly = slotProviderForPlan(providers, plan, evidenceType);
      const currentlyCollectibleAutomatically = !!connected && !automationDisabled.has(evidenceType);
      let unavailableBecause: MissingEvidenceAvailabilityReason | null = null;

      if (automationDisabled.has(evidenceType)) unavailableBecause = 'automation_setting_disabled';
      else if (sourceRecordsNotFound.has(evidenceType)) unavailableBecause = 'source_record_not_found';
      else if (lowConfidenceCorrespondence.has(evidenceType)) unavailableBecause = 'correspondence_not_matched_confidently';
      else if (!connected && slotOnly) unavailableBecause = 'unsupported_provider_capability';
      else if (!connected) unavailableBecause = 'connector_not_connected';

      rows.push({
        evidenceType,
        requirementLevel,
        whyItMatters: plan.whyItMatters,
        likelySourceProvider: plan.likelySourceProvider,
        connectorRequired: plan.connectorRequired,
        currentlyCollectibleAutomatically,
        clarificationShouldBeRequested:
          plan.clarificationShouldBeRequested && currentlyCollectibleAutomatically,
        blockedWithoutIt: requirementLevel === 'required' && plan.blockedWithoutIt,
        unavailableBecause,
      });
    }
  }

  return rows;
}
