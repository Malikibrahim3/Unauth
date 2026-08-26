import type { SupabaseClient } from '@supabase/supabase-js';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { loadProviderConnectionReadModel } from '@/lib/connections/loadProviderConnectionReadModel';
import { projectProviderCapabilityStatus } from '@/lib/integrations/capabilityStatus';
import { MVP_PLUS_SELECTED_PROVIDER_IDS } from '@/lib/product/pilotProfile';

export type MerchantCapabilitySummary = {
  providerId: string;
  label: string;
  tone: 'green' | 'amber' | 'red' | 'neutral';
};

const CONNECTION_LABELS = {
  not_configured: 'not configured',
  authorising: 'authorising',
  configured_unverified: 'configured · needs verification',
  connected_read: 'read connection healthy',
  connected_read_bounded_write: 'read and bounded write healthy',
  reauthorisation_required: 'reauthorisation required',
  merchant_disabled: 'disabled by merchant',
  disconnected_history_retained: 'disconnected · history retained',
} as const;

/**
 * One truthful shell signal, derived from the same registry, catalogue and
 * merchant read model used by provider detail. It intentionally does not roll
 * several object families into an invented "all current" status.
 */
export async function loadMerchantCapabilitySummary(
  service: SupabaseClient,
  merchantId: string,
): Promise<MerchantCapabilitySummary> {
  const catalogue = await loadConnectorCatalogue(service, merchantId);
  const selected = catalogue.filter((item) =>
    (MVP_PLUS_SELECTED_PROVIDER_IDS as readonly string[]).includes(item.id),
  );
  const item = selected.find((candidate) => candidate.status !== 'not_connected')
    ?? selected.find((candidate) => candidate.id === 'shopify')
    ?? selected[0];
  if (!item) return { providerId: 'none', label: 'Selected sources · unavailable', tone: 'neutral' };

  const loaded = await loadProviderConnectionReadModel({ service, merchantId, item });
  const status = projectProviderCapabilityStatus({
    item,
    readModel: loaded.readModel,
    displayNote: loaded.displayNote,
  });
  const tone = status.merchantConnection === 'connected_read'
    || status.merchantConnection === 'connected_read_bounded_write'
    ? 'green'
    : status.merchantConnection === 'not_configured'
      || status.merchantConnection === 'disconnected_history_retained'
      ? 'neutral'
      : status.merchantConnection === 'reauthorisation_required'
        || status.merchantConnection === 'merchant_disabled'
        ? 'red'
        : 'amber';
  return {
    providerId: status.providerId,
    label: `${status.providerName} · ${CONNECTION_LABELS[status.merchantConnection]}`,
    tone,
  };
}
