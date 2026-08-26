import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConnectorCatalogueItem } from '@/lib/connectors/catalogue';
import { getCachedConnectionState } from '@/lib/connections/getConnectionState';
import { verifyMerchantLiveConnections } from '@/lib/connections/liveVerification';
import { isLiveCredentialCheckSupported } from '@/lib/connections/effectiveStatus';
import { connectionReadModel, type ConnectionReadModel } from '@/lib/connections/readModel';

export type LoadedProviderConnectionReadModel = {
  readModel: ConnectionReadModel;
  badge: ConnectionReadModel['badge'];
  displayNote: string | null;
};

export async function loadProviderConnectionReadModel(input: {
  service: SupabaseClient;
  merchantId: string;
  item: Pick<
    ConnectorCatalogueItem,
    'id' | 'status' | 'syncState' | 'freshness' | 'lastVerifiedAt' | 'importedRecords'
  >;
}): Promise<LoadedProviderConnectionReadModel> {
  const connectionState = await getCachedConnectionState(input.merchantId);
  const isOrderSource = input.item.id === connectionState.orderSourcePlatform;
  const isHelpdesk = input.item.id === connectionState.helpdeskProvider;
  const providerHasLiveCheck = isLiveCredentialCheckSupported(input.item.id);
  const isActiveSelection = input.item.id === 'shopify'
    ? isOrderSource
    : input.item.id === 'gorgias'
      ? isHelpdesk
      : true;
  const isActiveProbedProvider = providerHasLiveCheck && isActiveSelection;
  const liveHealth = isActiveProbedProvider
    ? await verifyMerchantLiveConnections(input.service, input.merchantId)
    : null;
  const liveResult = input.item.id === 'shopify' && isOrderSource
    ? liveHealth?.shopify
    : input.item.id === 'gorgias' && isHelpdesk
      ? liveHealth?.gorgias
      : input.item.id === 'shipbob' || input.item.id === 'ups' || input.item.id === 'fedex'
        ? liveHealth?.[input.item.id]
        : null;
  const probeExpectedButMissing = input.item.status === 'connected';
  const missingExpectedProbe = isActiveProbedProvider && !liveResult && probeExpectedButMissing;

  const readModel = connectionReadModel({
    providerId: input.item.id,
    syncState: missingExpectedProbe ? 'attention_required' : input.item.syncState,
    freshness: input.item.freshness,
    liveVerification: liveResult ?? null,
    lastVerifiedAt: input.item.lastVerifiedAt,
    importedRecords: input.item.importedRecords,
  });

  return {
    readModel,
    badge: readModel.badge,
    displayNote: missingExpectedProbe
      ? 'Live verification is unavailable. We will retry automatically.'
      : readModel.note,
  };
}
