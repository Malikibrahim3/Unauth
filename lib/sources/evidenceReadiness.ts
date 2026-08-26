import type { EvidenceCapability } from '@/lib/integrations/types';

export type RequiredEvidenceLayerId = 'commerce' | 'support' | 'fulfilment' | 'delivery' | 'payments';

export type RequiredEvidenceLayer = {
  id: RequiredEvidenceLayerId;
  sequence: number;
  name: string;
  shortName: string;
  explanation: string;
  capabilities: readonly EvidenceCapability[];
};

export const REQUIRED_EVIDENCE_LAYERS: readonly RequiredEvidenceLayer[] = [
  {
    id: 'commerce',
    sequence: 1,
    name: 'Commerce and orders',
    shortName: 'Commerce',
    explanation: 'Orders, line items, customers, refunds, and original transaction value.',
    capabilities: ['order_value', 'line_items', 'customer_history', 'refund_history', 'reship_history'],
  },
  {
    id: 'support',
    sequence: 2,
    name: 'Customer support',
    shortName: 'Support',
    explanation: 'Claim reason, conversations, attachments, and requested outcomes.',
    capabilities: ['ticket_messages', 'ticket_attachments', 'customer_claim_reason', 'requested_action'],
  },
  {
    id: 'fulfilment',
    sequence: 3,
    name: 'Fulfilment / 3PL',
    shortName: 'Fulfilment',
    explanation: 'Pick, pack, warehouse events, exceptions, and fulfilment SLA evidence.',
    capabilities: ['warehouse_pick_pack', 'warehouse_exception', 'three_pl_sla_claim_status', 'self_reported_pack_confirmation', 'self_reported_pack_photo'],
  },
  {
    id: 'delivery',
    sequence: 4,
    name: 'Delivery and carrier evidence',
    shortName: 'Delivery',
    explanation: 'Tracking events, delivery status, signatures, photos, and carrier outcomes.',
    capabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature', 'carrier_claim_submission_status', 'carrier_claim_outcome'],
  },
  {
    id: 'payments',
    sequence: 5,
    name: 'Payments and disputes',
    shortName: 'Payments',
    explanation: 'Payment status, disputes, chargebacks, and settlement evidence.',
    capabilities: ['dispute_status', 'chargeback_evidence'],
  },
];

export type ReadinessEvidenceCapability = {
  id: string;
  support: string;
  availability: string;
  availabilityReason?: string;
  description?: string;
};

export type ReadinessSource = {
  id: string;
  name: string;
  category?: string;
  stage: string;
  status?: string;
  badge?: string;
  connectionId?: string | null;
  connectionCount?: number;
  connectEnabled?: boolean;
  capabilities?: Array<{
    id: string;
    support: string;
    availability: string;
    availabilityReason?: string;
    description?: string;
  }>;
  evidenceCapabilities?: ReadinessEvidenceCapability[];
  readModel?: {
    configuration?: 'configured' | 'not_configured';
    operational?: 'healthy' | 'attention' | 'unknown';
  };
};

export type ReadinessLayerState = 'ready' | 'attention' | 'missing' | 'unavailable';

export type LayerReadiness = RequiredEvidenceLayer & {
  state: ReadinessLayerState;
  ready: boolean;
  needsAttention: boolean;
  readyProviders: ReadinessSource[];
  configuredProviders: ReadinessSource[];
  availableProviders: ReadinessSource[];
};

export type SourceReadiness = {
  layers: LayerReadiness[];
  readyCount: number;
  missingLayers: LayerReadiness[];
  firstMissingLayer: LayerReadiness | null;
  ready: boolean;
};

const DISCONNECTED_STATUSES = new Set(['not_connected', 'revoked', 'disabled', 'disconnected']);
const ATTENTION_BADGES = new Set([
  'error',
  'not_syncing',
  'stale',
  'sync_pending',
  'no_data',
  'verification_unavailable',
]);

export function evidenceStatesForSource(source: ReadinessSource): ReadinessEvidenceCapability[] {
  if (source.evidenceCapabilities?.length) return source.evidenceCapabilities;
  return (source.capabilities ?? [])
    .filter((capability) => capability.id.startsWith('evidence.'))
    .map((capability) => ({ ...capability, id: capability.id.slice('evidence.'.length) }));
}

export function isSourceConfigured(source: ReadinessSource): boolean {
  if (source.stage === 'planned') return false;
  if (source.readModel?.configuration) return source.readModel.configuration === 'configured';
  return Boolean(source.connectionCount && source.connectionCount > 0)
    || source.connectionId != null
    || !DISCONNECTED_STATUSES.has(source.status ?? 'not_connected');
}

function supportedEvidence(source: ReadinessSource, layer: RequiredEvidenceLayer): ReadinessEvidenceCapability[] {
  const required = new Set(layer.capabilities);
  return evidenceStatesForSource(source).filter(
    (capability) => required.has(capability.id as EvidenceCapability) && capability.support !== 'unsupported',
  );
}

function enabledEvidence(source: ReadinessSource, layer: RequiredEvidenceLayer): ReadinessEvidenceCapability[] {
  return supportedEvidence(source, layer).filter((capability) => capability.availability === 'enabled');
}

function isSourceAttention(source: ReadinessSource): boolean {
  if (!isSourceConfigured(source)) return false;
  if (source.badge && ATTENTION_BADGES.has(source.badge)) return true;
  return source.readModel?.operational === 'attention' || source.readModel?.operational === 'unknown';
}

function layerAppliesToSource(source: ReadinessSource, layer: RequiredEvidenceLayer): boolean {
  return supportedEvidence(source, layer).length > 0;
}

export function sourceEvidenceLayerIds(source: ReadinessSource): RequiredEvidenceLayerId[] {
  const ids = REQUIRED_EVIDENCE_LAYERS
    .filter((layer) => layerAppliesToSource(source, layer))
    .map((layer) => layer.id);
  if (ids.length) return ids;

  // Keep catalogue-only or legacy fixtures discoverable even when a provider
  // has not yet projected evidence capabilities onto its catalogue row.
  if (source.category === 'commerce') return ['commerce'];
  if (source.category === 'helpdesk') return ['support'];
  if (source.category === 'warehouse_3pl' || source.category === 'returns') return ['fulfilment'];
  if (source.category === 'carrier' || source.category === 'tracking') return ['delivery'];
  if (source.category === 'payments_disputes') return ['payments'];
  return [];
}

export function evaluateSourceReadiness(sources: ReadinessSource[]): SourceReadiness {
  const layers = REQUIRED_EVIDENCE_LAYERS.map((layer) => {
    const candidates = sources.filter((source) => layerAppliesToSource(source, layer));
    const configuredProviders = candidates.filter(isSourceConfigured);
    const readyProviders = configuredProviders.filter((source) => enabledEvidence(source, layer).length > 0);
    const availableProviders = candidates.filter(
      (source) => source.stage !== 'planned' && source.connectEnabled !== false,
    );
    const needsAttention = configuredProviders.some(isSourceAttention);
    const state: ReadinessLayerState = readyProviders.length
      ? needsAttention ? 'attention' : 'ready'
      : configuredProviders.length ? 'attention'
        : availableProviders.length ? 'missing'
          : 'unavailable';
    return {
      ...layer,
      state,
      ready: readyProviders.length > 0,
      needsAttention,
      readyProviders,
      configuredProviders,
      availableProviders,
    };
  });
  const readyCount = layers.filter((layer) => layer.ready).length;
  const missingLayers = layers.filter((layer) => !layer.ready);
  return {
    layers,
    readyCount,
    missingLayers,
    firstMissingLayer: missingLayers[0] ?? null,
    ready: readyCount === REQUIRED_EVIDENCE_LAYERS.length,
  };
}

export function sourceStatus(source: ReadinessSource): 'connected' | 'not_connected' | 'attention' | 'planned' {
  if (source.stage === 'planned') return 'planned';
  if (!isSourceConfigured(source)) return 'not_connected';
  return isSourceAttention(source) ? 'attention' : 'connected';
}
