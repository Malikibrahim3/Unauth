import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { processCsvJob } from '@/lib/processing/worker';
import type { ProcessCsvJobIngestion } from '@/lib/processing/types';
import {
  bigcommerceOrderToCsvRow,
  type BigCommerceOrderIdentity,
  type BigCommerceOrderPayload,
} from '@/lib/commerce/bigcommerce/bigcommerceOrderToCsvRow';
import { resolveMerchantIdForCommerceStore } from '@/lib/commerce/resolveMerchantForStore';

const BIGCOMMERCE_JOB_LABEL_PREFIX = 'bigcommerce:';

export async function resolveMerchantIdForBigCommerceStore(
  supabase: SupabaseClient,
  storeHash: string,
): Promise<string | null> {
  return resolveMerchantIdForCommerceStore(supabase, 'bigcommerce', storeHash);
}

async function ensureBigCommerceProcessingJob(
  supabase: SupabaseClient,
  merchantId: string,
  storeHash: string,
): Promise<string> {
  const label = `${BIGCOMMERCE_JOB_LABEL_PREFIX}${storeHash}`;

  const { data: existing, error: readError } = await supabase
    .from(TABLES.PROCESSING_JOBS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('label', label)
    .maybeSingle();

  if (readError) {
    throw new Error(`bigcommerce_job_lookup_failed: ${readError.message}`);
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await supabase
    .from(TABLES.PROCESSING_JOBS)
    .insert({
      merchant_id: merchantId,
      status: 'processing',
      total_rows: 0,
      processed_rows: 0,
      failed_rows: 0,
      filename: `bigcommerce-${storeHash}`,
      label,
      upload_type: 'bigcommerce',
      created_at: now,
      updated_at: now,
    } as never)
    .select('id')
    .single();

  if (insertError || !created?.id) {
    throw new Error(`bigcommerce_job_create_failed: ${insertError?.message ?? 'unknown'}`);
  }

  return created.id as string;
}

export async function scoreBigCommerceOrderIntoAudit(input: {
  supabase: SupabaseClient;
  storeHash: string;
  order: BigCommerceOrderPayload;
  identity: BigCommerceOrderIdentity | null;
  merchantId?: string;
}): Promise<{ scored: number; skipped: number; jobId: string }> {
  const { supabase, storeHash, order, identity } = input;
  const csvRow = bigcommerceOrderToCsvRow(order, identity);
  if (!csvRow) {
    return { scored: 0, skipped: 1, jobId: '' };
  }

  const merchantId =
    input.merchantId ?? (await resolveMerchantIdForBigCommerceStore(supabase, storeHash));
  if (!merchantId) {
    throw new Error('bigcommerce_merchant_not_connected');
  }

  const jobId = await ensureBigCommerceProcessingJob(supabase, merchantId, storeHash);
  const ingestion: ProcessCsvJobIngestion = { source: 'bigcommerce', shopDomain: storeHash };

  await processCsvJob([csvRow], jobId, supabase, 2, merchantId, {
    index: 0,
    totalChunks: 1,
    isFirst: false,
    isLast: true,
  }, ingestion);

  const now = new Date().toISOString();
  await supabase
    .from('commerce_store_connections' as never)
    .update({ last_sync_at: now, updated_at: now } as never)
    .eq('merchant_id', merchantId)
    .eq('platform', 'bigcommerce')
    .eq('store_key', storeHash);

  return { scored: 1, skipped: 0, jobId };
}

export function enqueueBigCommerceOrderAuditScore(input: {
  supabase: SupabaseClient;
  storeHash: string;
  order: BigCommerceOrderPayload;
  identity: BigCommerceOrderIdentity | null;
}): void {
  void scoreBigCommerceOrderIntoAudit(input).catch((err) => {
    console.error('BigCommerce audit score failed', {
      storeHash: input.storeHash,
      orderId: input.order.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
  });
}
