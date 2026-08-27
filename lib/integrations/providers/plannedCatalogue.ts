import type {
  EvidenceCapability,
  IntegrationAuthMode,
  IntegrationCategory,
  IntegrationProvider,
  LifecycleCapability,
  LifecycleCapabilityId,
} from '@/lib/integrations/types';

const LIFECYCLE_DIMENSIONS: LifecycleCapabilityId[] = [
  'connect',
  'account_verification',
  'initial_import',
  'incremental_pull',
  'webhook',
  'reconciliation',
  'reconnect',
  'disconnect',
  'freshness_health',
  'bounded_writeback',
];

function plannedLifecycle(detail: string): LifecycleCapability[] {
  return LIFECYCLE_DIMENSIONS.map((id) => ({
    id,
    applicability: id === 'bounded_writeback' ? 'not_applicable' : 'applicable',
    evidence: 'unavailable',
    detail,
  }));
}

function plannedProvider(input: {
  id: string;
  name: string;
  category: IntegrationCategory;
  authMode?: IntegrationAuthMode;
  description: string;
  evidenceCapabilities: EvidenceCapability[];
}): IntegrationProvider {
  return {
    ...input,
    authMode: input.authMode ?? 'oauth',
    codeMaturity: 'slot_only',
    lifecycle: plannedLifecycle('Not built; this is a catalogue-only provider slot.'),
  };
}

/**
 * Reserved catalogue entries are deliberately kept in the same provider
 * registry as executable providers. They have no adapter, setup route, or
 * connection state, so the catalogue can show intended evidence without
 * presenting a brand mark as a working integration.
 */
export const plannedCatalogueProviders: IntegrationProvider[] = [
  plannedProvider({
    id: 'adobe_commerce',
    name: 'Adobe Commerce',
    category: 'commerce',
    description: 'Orders, customer history, refunds, and fulfilment evidence from Adobe Commerce.',
    evidenceCapabilities: ['order_value', 'line_items', 'customer_history', 'refund_history', 'tracking_number'],
  }),
  plannedProvider({
    id: 'amazon_marketplace',
    name: 'Amazon',
    category: 'commerce',
    description: 'Marketplace orders, customer context, refunds, and delivery references from Amazon.',
    evidenceCapabilities: ['order_value', 'line_items', 'customer_history', 'refund_history', 'tracking_number'],
  }),
  plannedProvider({
    id: 'shipmonk',
    name: 'ShipMonk',
    category: 'warehouse_3pl',
    description: 'Pick, pack, warehouse exception, and fulfilment SLA evidence from ShipMonk.',
    evidenceCapabilities: ['warehouse_pick_pack', 'warehouse_exception', 'three_pl_sla_claim_status'],
  }),
  plannedProvider({
    id: 'dhl',
    name: 'DHL',
    category: 'carrier',
    description: 'DHL tracking events, delivery status, signature, and photo proof.',
    evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  }),
  plannedProvider({
    id: 'usps',
    name: 'USPS',
    category: 'carrier',
    description: 'USPS tracking, delivery status, and carrier proof for matched shipments.',
    evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  }),
  plannedProvider({
    id: 'royal_mail',
    name: 'Royal Mail',
    category: 'carrier',
    description: 'Royal Mail tracking events, delivery status, and available delivery proof.',
    evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  }),
  plannedProvider({
    id: 'aftership',
    name: 'AfterShip',
    category: 'tracking',
    description: 'Aggregated tracking events and delivery status across supported carriers.',
    evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status'],
  }),
  plannedProvider({
    id: 'loop_returns',
    name: 'Loop Returns',
    category: 'returns',
    description: 'Return request status and inspection outcomes from Loop Returns.',
    evidenceCapabilities: ['return_request_status', 'return_inspection_outcome'],
  }),
  plannedProvider({
    id: 'happy_returns',
    name: 'Happy Returns',
    category: 'returns',
    description: 'Return request status and handoff evidence from Happy Returns.',
    evidenceCapabilities: ['return_request_status', 'return_inspection_outcome'],
  }),
  plannedProvider({
    id: 'paypal',
    name: 'PayPal',
    category: 'payments_disputes',
    description: 'Payment status, disputes, chargeback evidence, and settlement context from PayPal.',
    evidenceCapabilities: ['dispute_status', 'chargeback_evidence', 'recovery_deadline'],
  }),
  plannedProvider({
    id: 'adyen',
    name: 'Adyen',
    category: 'payments_disputes',
    description: 'Payment status, disputes, chargebacks, and settlement context from Adyen.',
    evidenceCapabilities: ['dispute_status', 'chargeback_evidence', 'recovery_deadline'],
  }),
];
