import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveActiveIntegrationConnectionId, upsertMerchantIntegration } from '@/lib/integrations/auth';
import { writeCanonicalEvidence } from '@/lib/integrations/canonicalEvidence';
import { mapCarrierProofToEvidence } from '@/lib/integrations/evidenceMapper';
import { fedexProvider, fetchFedExDeliveryProof } from '@/lib/integrations/providers/fedex';
import { fetchUpsDeliveryProof, upsProvider } from '@/lib/integrations/providers/ups';
import { refreshCarrierCredentials } from '@/lib/integrations/providers/carrierCredentials';
import { resolveLinkedCarrierTracking } from '@/lib/integrations/orderLinking';

type CarrierId = 'ups' | 'fedex';

export type SyncCarrierEvidenceResult =
  | { ok: true; provider: CarrierId; evidenceItems: number; trackingNumber: string }
  | { ok: false; reason: 'not_connected' | 'no_tracking_number' | 'carrier_unsupported' | 'sync_failed'; message: string };

function resolveCarrier(company: string | null, trackingNumber: string): CarrierId | null {
  const value = company?.trim().toLowerCase() ?? '';
  if (value.includes('ups')) return 'ups';
  if (value.includes('fedex') || value.includes('federal express')) return 'fedex';
  if (/^1Z[A-Z0-9]{16}$/i.test(trackingNumber)) return 'ups';
  if (/^\d{12,22}$/.test(trackingNumber)) return 'fedex';
  return null;
}

export async function syncCarrierEvidenceForCase(input: {
  client: SupabaseClient;
  merchantId: string;
  supportPayoutCaseId: string;
  sourceOrderId: string | null;
}): Promise<SyncCarrierEvidenceResult> {
  const tracking = await resolveLinkedCarrierTracking(
    input.client,
    input.merchantId,
    input.sourceOrderId ?? undefined,
  );
  if (!tracking) {
    return { ok: false, reason: 'no_tracking_number', message: 'No tracking number on the order.' };
  }
  const shipment = {
    trackingNumber: tracking.trackingNumber,
    provider: resolveCarrier(tracking.carrier, tracking.trackingNumber),
  };
  if (!shipment.provider) {
    return { ok: false, reason: 'carrier_unsupported', message: 'The order is not a UPS or FedEx shipment.' };
  }

  const provider = shipment.provider === 'ups' ? upsProvider : fedexProvider;
  const connectionId = await resolveActiveIntegrationConnectionId(input.client, input.merchantId, shipment.provider);
  const credentials = connectionId
    ? await refreshCarrierCredentials(input.client, { merchantId: input.merchantId, connectionId, providerId: shipment.provider })
    : null;
  if (!credentials?.clientId || !credentials?.clientSecret) {
    return { ok: false, reason: 'not_connected', message: `${provider.name} is not connected.` };
  }

  const now = new Date().toISOString();
  try {
    const payload = shipment.provider === 'ups'
      ? await fetchUpsDeliveryProof({ credentials, trackingNumber: shipment.trackingNumber })
      : await fetchFedExDeliveryProof({ credentials, trackingNumber: shipment.trackingNumber });
    const evidence = mapCarrierProofToEvidence(shipment.provider, payload, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      trackingNumber: shipment.trackingNumber,
      now,
    });
    await writeCanonicalEvidence(input.client, evidence);
    await upsertMerchantIntegration(input.client, input.merchantId, provider, 'connected', {
      connectionId: connectionId!,
      lastSyncAt: now,
      lastError: null,
    });
    return { ok: true, provider: shipment.provider, evidenceItems: evidence.length, trackingNumber: shipment.trackingNumber };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${shipment.provider}_sync_failed`;
    if (connectionId) await upsertMerchantIntegration(input.client, input.merchantId, provider, 'error', { connectionId, lastError: message });
    return { ok: false, reason: 'sync_failed', message };
  }
}
