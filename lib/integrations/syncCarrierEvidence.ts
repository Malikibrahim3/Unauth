import type { SupabaseClient } from '@supabase/supabase-js';
import { saveIntegrationCredential, getIntegrationCredential, upsertMerchantIntegration } from '@/lib/integrations/auth';
import { writeCanonicalEvidence } from '@/lib/integrations/canonicalEvidence';
import { mapCarrierProofToEvidence } from '@/lib/integrations/evidenceMapper';
import { exchangeFedExClientCredentials, fedexProvider, fetchFedExDeliveryProof } from '@/lib/integrations/providers/fedex';
import { exchangeUpsClientCredentials, fetchUpsDeliveryProof, upsProvider } from '@/lib/integrations/providers/ups';

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

async function resolveShipment(client: SupabaseClient, merchantId: string, sourceOrderId: string | null) {
  if (!sourceOrderId) return null;
  const { data } = await client
    .from('source_fulfillments')
    .select('tracking_number, tracking_company')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', sourceOrderId)
    .not('tracking_number', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const trackingNumber = data?.tracking_number?.trim() ?? null;
  return trackingNumber
    ? { trackingNumber, provider: resolveCarrier(data?.tracking_company ?? null, trackingNumber) }
    : null;
}

export async function syncCarrierEvidenceForCase(input: {
  client: SupabaseClient;
  merchantId: string;
  supportPayoutCaseId: string;
  sourceOrderId: string | null;
}): Promise<SyncCarrierEvidenceResult> {
  const shipment = await resolveShipment(input.client, input.merchantId, input.sourceOrderId);
  if (!shipment) {
    return { ok: false, reason: 'no_tracking_number', message: 'No tracking number on the order.' };
  }
  if (!shipment.provider) {
    return { ok: false, reason: 'carrier_unsupported', message: 'The order is not a UPS or FedEx shipment.' };
  }

  const provider = shipment.provider === 'ups' ? upsProvider : fedexProvider;
  const credentials = await getIntegrationCredential(input.client, input.merchantId, shipment.provider);
  if (!credentials?.clientId || !credentials?.clientSecret) {
    return { ok: false, reason: 'not_connected', message: `${provider.name} is not connected.` };
  }

  const now = new Date().toISOString();
  try {
    const token = shipment.provider === 'ups'
      ? await exchangeUpsClientCredentials({
          clientId: String(credentials.clientId),
          clientSecret: String(credentials.clientSecret),
          environment: credentials.environment === 'sandbox' ? 'sandbox' : 'production',
        })
      : await exchangeFedExClientCredentials({
          clientId: String(credentials.clientId),
          clientSecret: String(credentials.clientSecret),
          environment: credentials.environment === 'sandbox' ? 'sandbox' : 'production',
        });
    const refreshed = { ...credentials, accessToken: token.accessToken };
    await saveIntegrationCredential(input.client, input.merchantId, provider, refreshed, {
      scopes: ['tracking', 'proof_of_delivery'],
      expiresAt: token.expiresAt,
    });
    const payload = shipment.provider === 'ups'
      ? await fetchUpsDeliveryProof({ credentials: refreshed, trackingNumber: shipment.trackingNumber })
      : await fetchFedExDeliveryProof({ credentials: refreshed, trackingNumber: shipment.trackingNumber });
    const evidence = mapCarrierProofToEvidence(shipment.provider, payload, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      trackingNumber: shipment.trackingNumber,
      now,
    });
    await writeCanonicalEvidence(input.client, evidence);
    await upsertMerchantIntegration(input.client, input.merchantId, provider, 'connected', {
      lastSyncAt: now,
      lastError: null,
    });
    return { ok: true, provider: shipment.provider, evidenceItems: evidence.length, trackingNumber: shipment.trackingNumber };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${shipment.provider}_sync_failed`;
    await upsertMerchantIntegration(input.client, input.merchantId, provider, 'error', { lastError: message });
    return { ok: false, reason: 'sync_failed', message };
  }
}
