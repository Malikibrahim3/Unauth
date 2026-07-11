import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { buildDeliveryFromFulfillment } from '@/lib/claims/decision/deliveryEvidence';
import { insertClaimEvidence } from '@/lib/integrations/canonicalEvidence';

const AUTO_SOURCE = 'fulfillment_sync';

export type ClaimDecisionEvidenceSource = 'claim_created' | 'manual_refresh' | 'pre_evaluation';

const DELIVERY_CLAIM_TYPES = new Set([
  'item_not_received',
  'missing_parcel',
  'damaged',
  'wrong_item',
  'not_as_described',
]);

/**
 * Idempotently attaches delivery/tracking from source_fulfillments as claim evidence.
 * Call explicitly after claim creation or before evaluation — never during context build.
 */
export async function ensureClaimDecisionEvidence(input: {
  client: SupabaseClient;
  merchantId: string;
  claimId: string;
  claimType: string | null;
  sourceOrderId: string | null;
  source: ClaimDecisionEvidenceSource;
}): Promise<{ attached: boolean; skipped: boolean }> {
  if (!input.sourceOrderId || !DELIVERY_CLAIM_TYPES.has(input.claimType ?? '')) {
    return { attached: false, skipped: true };
  }

  const { data: fulfillment, error: fe } = await input.client
    .from('source_fulfillments')
    .select('status, shipment_status, tracking_company, tracking_number, occurred_at')
    .eq('source_order_id', input.sourceOrderId)
    .eq('merchant_id', input.merchantId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fe || !fulfillment) return { attached: false, skipped: true };

  const delivery = buildDeliveryFromFulfillment(fulfillment);
  if (!delivery.hasTracking && !delivery.hasProofOfDelivery) {
    return { attached: false, skipped: true };
  }

  const evidenceType = delivery.hasProofOfDelivery ? 'proof_of_delivery' : 'tracking';
  const { error } = await insertClaimEvidence(input.client, {
    merchantId: input.merchantId,
    claimId: input.claimId,
    evidenceType,
    storagePath: delivery.trackingUrl,
    contentHash: delivery.trackingNumber,
    sourceMetadata: {
      auto_source: AUTO_SOURCE,
      attach_source: input.source,
      source: 'shopify',
      carrier: delivery.carrier,
      tracking_number: delivery.trackingNumber,
      delivery_status: delivery.status,
      delivered_at: delivery.deliveredAt,
    },
  });

  if (error) {
    // Unique index evidence_items_fulfillment_sync_uniq — concurrent attach is safe.
    if (error.code === '23505') return { attached: false, skipped: true };
    console.error('[ensureClaimDecisionEvidence] insert failed', error.message);
    return { attached: false, skipped: false };
  }

  return { attached: true, skipped: false };
}
