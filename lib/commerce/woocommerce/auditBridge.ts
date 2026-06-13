import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { processCsvJob } from '@/lib/processing/worker';
import type { ProcessCsvJobIngestion } from '@/lib/processing/types';
import {
  woocommerceOrderToCsvRow,
  type WooCommerceOrderIdentity,
  type WooCommerceOrderPayload,
} from '@/lib/commerce/woocommerce/woocommerceOrderToCsvRow';
import { resolveMerchantIdForCommerceStore } from '@/lib/commerce/resolveMerchantForStore';

const WOOCOMMERCE_JOB_LABEL_PREFIX = 'woocommerce:';

export async function resolveMerchantIdForWooCommerceStore(
  supabase: SupabaseClient,
  storeKey: string,
): Promise<string | null> {
  return resolveMerchantIdForCommerceStore(supabase, 'woocommerce', storeKey);
}

async function ensureWooCommerceProcessingJob(
  supabase: SupabaseClient,
  merchantId: string,
  storeKey: string,
): Promise<string> {
  const label = `${WOOCOMMERCE_JOB_LABEL_PREFIX}${storeKey}`;

  const { data: existing, error: readError } = await supabase
    .from(TABLES.PROCESSING_JOBS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('label', label)
    .maybeSingle();

  if (readError) {
    throw new Error(`woocommerce_job_lookup_failed: ${readError.message}`);
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await supabase
    .from(TABLES.PROCESSING_JOBS)
    .insert({
      merchant_id: merchantId,
      job_kind: 'platform_backfill',
      source: 'woocommerce',
      status: 'running',
      total_rows: 0,
      processed_rows: 0,
      failed_rows: 0,
      label,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (insertError || !created?.id) {
    throw new Error(`woocommerce_job_create_failed: ${insertError?.message ?? 'unknown'}`);
  }

  return created.id as string;
}

/**
 * Score a WooCommerce order into audit_transactions via the standard pipeline.
 */
export async function scoreWooCommerceOrderIntoAudit(input: {
  supabase: SupabaseClient;
  storeKey: string;
  order: WooCommerceOrderPayload;
  identity: WooCommerceOrderIdentity | null;
  merchantId?: string;
}): Promise<{ scored: number; skipped: number; jobId: string }> {
  const { supabase, storeKey, order, identity } = input;
  const csvRow = woocommerceOrderToCsvRow(order, identity);
  if (!csvRow) {
    return { scored: 0, skipped: 1, jobId: '' };
  }

  const merchantId =
    input.merchantId ?? (await resolveMerchantIdForWooCommerceStore(supabase, storeKey));
  if (!merchantId) {
    throw new Error('woocommerce_merchant_not_connected');
  }

  const jobId = await ensureWooCommerceProcessingJob(supabase, merchantId, storeKey);
  const ingestion: ProcessCsvJobIngestion = { source: 'woocommerce', shopDomain: storeKey };

  await processCsvJob([csvRow], jobId, supabase, 2, merchantId, {
    index: 0,
    totalChunks: 1,
    isFirst: false,
    isLast: true,
  }, ingestion);

  const now = new Date().toISOString();
  await supabase
    .from('store_connections')
    .update({ last_sync_at: now, updated_at: now })
    .eq('merchant_id', merchantId)
    .eq('platform', 'woocommerce')
    .eq('store_key', storeKey);

  return { scored: 1, skipped: 0, jobId };
}

export function enqueueWooCommerceOrderAuditScore(input: {
  supabase: SupabaseClient;
  storeKey: string;
  order: WooCommerceOrderPayload;
  identity: WooCommerceOrderIdentity | null;
}): void {
  void scoreWooCommerceOrderIntoAudit(input).catch((err) => {
    console.error('WooCommerce audit score failed', {
      storeKey: input.storeKey,
      orderId: input.order.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
  });
}
