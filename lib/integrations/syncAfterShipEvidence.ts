import type { SupabaseClient } from '@supabase/supabase-js';
import {
  evidenceRowsFromNormalized,
  mapAfterShipTrackingToEvidence,
} from '@/lib/integrations/evidenceMapper';
import { getIntegrationCredential, upsertMerchantIntegration } from '@/lib/integrations/auth';
import { fetchAfterShipTracking } from '@/lib/integrations/providers/aftership';
import { aftershipProvider } from '@/lib/integrations/providers/aftership';

export type SyncAfterShipEvidenceResult =
  | { ok: true; evidenceItems: number; trackingNumber: string }
  | { ok: false; reason: 'not_connected' | 'no_tracking_number' | 'sync_failed'; message: string };

async function resolveTrackingNumber(
  client: SupabaseClient,
  merchantId: string,
  sourceOrderId: string | null,
): Promise<string | null> {
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
  return data?.tracking_number?.trim() ?? null;
}

export async function syncAfterShipEvidenceForCase(input: {
  client: SupabaseClient;
  merchantId: string;
  supportPayoutCaseId: string;
  sourceOrderId: string | null;
}): Promise<SyncAfterShipEvidenceResult> {
  const credentials = await getIntegrationCredential(input.client, input.merchantId, 'aftership');
  if (!credentials?.apiKey) {
    return { ok: false, reason: 'not_connected', message: 'AfterShip is not connected.' };
  }

  const trackingNumber = await resolveTrackingNumber(input.client, input.merchantId, input.sourceOrderId);
  if (!trackingNumber) {
    return { ok: false, reason: 'no_tracking_number', message: 'No tracking number on Shopify order.' };
  }

  const now = new Date().toISOString();
  try {
    const tracking = await fetchAfterShipTracking({
      apiKey: String(credentials.apiKey),
      trackingNumber,
    });
    const normalized = mapAfterShipTrackingToEvidence(tracking, {
      merchantId: input.merchantId,
      supportPayoutCaseId: input.supportPayoutCaseId,
      now,
    });
    const rows = evidenceRowsFromNormalized(normalized);
    if (rows.length > 0) {
      const { error } = await input.client
        .from('integration_evidence_items')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    await upsertMerchantIntegration(input.client, input.merchantId, aftershipProvider, 'connected', {
      lastSyncAt: now,
      lastError: null,
    });
    return { ok: true, evidenceItems: normalized.length, trackingNumber };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'aftership_sync_failed';
    await upsertMerchantIntegration(input.client, input.merchantId, aftershipProvider, 'error', {
      lastError: message,
    });
    return { ok: false, reason: 'sync_failed', message };
  }
}
