import type { ConnectorCatalogueItem } from '@/lib/connectors/catalogue';
import type { ConnectionReadModel } from '@/lib/connections/readModel';
import {
  deriveProviderDisplayStage,
  getIntegrationProvider,
} from '@/lib/integrations/registry';
import type { EvidenceCapability, ProviderDisplayStage } from '@/lib/integrations/types';

export type MerchantConnectionConfiguration =
  | 'not_configured'
  | 'authorising'
  | 'configured_unverified'
  | 'connected_read'
  | 'connected_read_bounded_write'
  | 'reauthorisation_required'
  | 'merchant_disabled'
  | 'disconnected_history_retained';

export type ImportState =
  | 'not_started'
  | 'queued'
  | 'running'
  | 'partial'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type ObjectFamilyId =
  | 'orders'
  | 'refunds'
  | 'payments_disputes'
  | 'tickets_messages'
  | 'fulfilments_returns'
  | 'tracking_proof'
  | 'provider_responses'
  | 'credits_fees'
  | 'settlements';

export type ObjectFamilyFreshness =
  | 'not_applicable'
  | 'unavailable'
  | 'partial'
  | 'current'
  | 'stale'
  | 'on_demand';

export type ActionCapabilityState =
  | 'unsupported_by_mvp'
  | 'provider_supported_but_not_implemented'
  | 'implemented_gated_off'
  | 'enabled_for_merchant'
  | 'permission_missing'
  | 'degraded';

export type ProviderCapabilityStatus = {
  providerId: string;
  providerName: string;
  buildMaturity: ProviderDisplayStage;
  merchantConnection: MerchantConnectionConfiguration;
  importState: ImportState;
  objectFamilyFreshness: Record<ObjectFamilyId, ObjectFamilyFreshness>;
  actionCapabilities: {
    read: ActionCapabilityState;
    boundedWrite: ActionCapabilityState;
    refundIssue: 'unsupported_by_mvp';
    requestDeny: 'unsupported_by_mvp';
    claimSubmit: 'unsupported_by_mvp';
  };
  evidenceNote: string | null;
};

const OBJECT_FAMILY_CAPABILITIES: Record<ObjectFamilyId, readonly EvidenceCapability[]> = {
  orders: ['order_value', 'line_items', 'customer_history', 'reship_history'],
  refunds: ['refund_history'],
  payments_disputes: ['dispute_status', 'chargeback_evidence'],
  tickets_messages: ['ticket_messages', 'ticket_attachments', 'customer_claim_reason', 'requested_action'],
  fulfilments_returns: ['warehouse_pick_pack', 'warehouse_exception', 'return_request_status', 'return_inspection_outcome'],
  tracking_proof: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  provider_responses: ['carrier_claim_submission_status', 'carrier_claim_outcome', 'three_pl_sla_claim_status'],
  credits_fees: ['recovery_amount_approved', 'recovery_amount_paid'],
  settlements: [],
};

function merchantConnectionState(
  item: ConnectorCatalogueItem,
  readModel: ConnectionReadModel,
): MerchantConnectionConfiguration {
  if (item.status === 'pending' || item.status === 'authorising') return 'authorising';
  if (item.status === 'revoked') return 'reauthorisation_required';
  if (item.status === 'disabled') return 'merchant_disabled';
  if (readModel.configuration === 'not_configured') {
    return item.importedRecordsKnown && item.importedRecords > 0
      ? 'disconnected_history_retained'
      : 'not_configured';
  }
  if (readModel.operational !== 'healthy') return 'configured_unverified';
  const boundedWriteEnabled = item.capabilities.some(
    (capability) => capability.level === 'write' && capability.availability === 'enabled',
  );
  return boundedWriteEnabled ? 'connected_read_bounded_write' : 'connected_read';
}

function importState(item: ConnectorCatalogueItem): ImportState {
  switch (item.syncState) {
    case 'import_queued': return 'queued';
    case 'importing': return 'running';
    case 'import_complete':
    case 'no_records_found': return 'complete';
    case 'sync_failed': return 'failed';
    case 'attention_required':
    case 'stale': return 'partial';
    default: return 'not_started';
  }
}

function familyFreshness(
  family: ObjectFamilyId,
  item: ConnectorCatalogueItem,
  readModel: ConnectionReadModel,
): ObjectFamilyFreshness {
  const applicable = new Set(item.evidenceCapabilities?.map((capability) => capability.id) ?? []);
  const familyCapabilities = OBJECT_FAMILY_CAPABILITIES[family];
  if (!familyCapabilities.length || !familyCapabilities.some((capability) => applicable.has(capability))) {
    return 'not_applicable';
  }
  if (readModel.configuration === 'not_configured') return 'unavailable';
  if (readModel.deliveryModel === 'on_demand') return 'on_demand';
  if (item.syncState === 'stale') return 'stale';
  const relevant = (item.evidenceCapabilities ?? []).filter((capability) =>
    familyCapabilities.includes(capability.id),
  );
  if (!relevant.length || relevant.every((capability) => capability.availability !== 'enabled')) {
    return 'unavailable';
  }
  if (
    readModel.operational !== 'healthy'
    || relevant.some((capability) => capability.availability !== 'enabled')
  ) {
    return 'partial';
  }
  return readModel.lastDataReceivedAt ? 'current' : 'partial';
}

/**
 * Canonical multi-axis status projection. Callers must obtain `readModel`
 * through `loadProviderConnectionReadModel`; this function never reinterprets
 * credentials or connection rows on its own.
 */
export function projectProviderCapabilityStatus(input: {
  item: ConnectorCatalogueItem;
  readModel: ConnectionReadModel;
  displayNote?: string | null;
}): ProviderCapabilityStatus {
  const provider = getIntegrationProvider(input.item.id);
  if (!provider) throw new Error(`unknown_integration_provider:${input.item.id}`);
  const objectFamilyFreshness = Object.fromEntries(
    (Object.keys(OBJECT_FAMILY_CAPABILITIES) as ObjectFamilyId[]).map((family) => [
      family,
      familyFreshness(family, input.item, input.readModel),
    ]),
  ) as Record<ObjectFamilyId, ObjectFamilyFreshness>;
  const hasEnabledRead = input.item.capabilities.some(
    (capability) => capability.level === 'read' && capability.availability === 'enabled',
  );
  const hasSupportedWrite = input.item.capabilities.some(
    (capability) => capability.level === 'write' && capability.support !== 'unsupported',
  );
  const hasEnabledWrite = input.item.capabilities.some(
    (capability) => capability.level === 'write' && capability.availability === 'enabled',
  );
  return {
    providerId: provider.id,
    providerName: provider.name,
    buildMaturity: deriveProviderDisplayStage(provider),
    merchantConnection: merchantConnectionState(input.item, input.readModel),
    importState: importState(input.item),
    objectFamilyFreshness,
    actionCapabilities: {
      read: hasEnabledRead
        ? input.readModel.operational === 'healthy' ? 'enabled_for_merchant' : 'degraded'
        : 'provider_supported_but_not_implemented',
      boundedWrite: hasEnabledWrite
        ? input.readModel.operational === 'healthy' ? 'enabled_for_merchant' : 'degraded'
        : hasSupportedWrite ? 'implemented_gated_off' : 'unsupported_by_mvp',
      refundIssue: 'unsupported_by_mvp',
      requestDeny: 'unsupported_by_mvp',
      claimSubmit: 'unsupported_by_mvp',
    },
    evidenceNote: input.displayNote ?? input.readModel.note,
  };
}
