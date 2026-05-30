import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { processCsvJob } from '@/lib/processing/worker';
import type { ProcessCsvJobIngestion } from '@/lib/processing/types';
import {
  shopifyOrderToCsvRow,
  type ShopifyOrderIdentityRow,
  type ShopifyOrderSignalRow,
} from '@/lib/shopify/shopifyOrderToCsvRow';
import { shopifyAuditError, shopifyAuditLog } from '@/lib/shopify/auditLog';

const SHOPIFY_JOB_LABEL_PREFIX = 'shopify:';
const DEFAULT_BATCH_SIZE = 50;

export async function resolveMerchantIdForShop(
  supabase: SupabaseClient,
  shopDomain: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('merchant_shopify_connections' as never)
    .select('merchant_id')
    .eq('shop_domain', shopDomain)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`resolve_merchant_for_shop_failed: ${error.message}`);
  }

  return (data as { merchant_id?: string } | null)?.merchant_id ?? null;
}

/**
 * One stable processing_jobs row per merchant + shop for Shopify sync.
 */
export async function ensureShopifyProcessingJob(
  supabase: SupabaseClient,
  merchantId: string,
  shopDomain: string
): Promise<string> {
  const label = `${SHOPIFY_JOB_LABEL_PREFIX}${shopDomain}`;

  const { data: existing, error: readError } = await supabase
    .from(TABLES.PROCESSING_JOBS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('label', label)
    .maybeSingle();

  if (readError) {
    throw new Error(`shopify_job_lookup_failed: ${readError.message}`);
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
      filename: `shopify-${shopDomain}`,
      label,
      upload_type: 'shopify',
      created_at: now,
      updated_at: now,
    } as never)
    .select('id')
    .single();

  if (insertError || !created?.id) {
    throw new Error(`shopify_job_create_failed: ${insertError?.message ?? 'unknown'}`);
  }

  return created.id as string;
}

async function loadIdentitiesForOrders(
  supabase: SupabaseClient,
  shopDomain: string,
  shopifyOrderIds: string[]
): Promise<Map<string, ShopifyOrderIdentityRow>> {
  const map = new Map<string, ShopifyOrderIdentityRow>();
  if (shopifyOrderIds.length === 0) return map;

  const { data, error } = await supabase
    .from('merchant_identities' as never)
    .select('source_id, email, phone, shipping_address, billing_address, customer_id')
    .eq('shop_domain', shopDomain)
    .eq('source', 'order')
    .in('source_id', shopifyOrderIds);

  if (error) {
    throw new Error(`shopify_identity_load_failed: ${error.message}`);
  }

  for (const row of (data ?? []) as Array<{
    source_id: string;
    email: string | null;
    phone: string | null;
    shipping_address: string | null;
    billing_address: string | null;
    customer_id: string | null;
  }>) {
    map.set(row.source_id, row);
  }

  return map;
}

async function loadExistingScoredOrderIds(
  supabase: SupabaseClient,
  shopDomain: string,
  shopifyOrderIds: string[]
): Promise<Set<string>> {
  const scored = new Set<string>();
  if (shopifyOrderIds.length === 0) return scored;

  const CHUNK = 200;
  for (let i = 0; i < shopifyOrderIds.length; i += CHUNK) {
    const chunk = shopifyOrderIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('order_id')
      .eq('shop_domain', shopDomain)
      .eq('source', 'shopify')
      .in('order_id', chunk);

    if (error) {
      throw new Error(`shopify_audit_lookup_failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      scored.add((row as { order_id: string }).order_id);
    }
  }

  return scored;
}

/**
 * Score one or more Shopify orders into audit_transactions via the standard pipeline.
 */
export async function scoreShopifyOrdersIntoAudit(input: {
  supabase: SupabaseClient;
  shopDomain: string;
  shopifyOrderIds: string[];
  merchantId?: string;
}): Promise<{ scored: number; skipped: number; jobId: string }> {
  const { supabase, shopDomain, shopifyOrderIds } = input;
  const uniqueIds = [...new Set(shopifyOrderIds.map(String).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { scored: 0, skipped: 0, jobId: '' };
  }

  shopifyAuditLog('score.started', { shopDomain, orderCount: uniqueIds.length });

  const merchantId = input.merchantId ?? (await resolveMerchantIdForShop(supabase, shopDomain));
  if (!merchantId) {
    throw new Error('shopify_merchant_not_connected');
  }

  const jobId = await ensureShopifyProcessingJob(supabase, merchantId, shopDomain);
  shopifyAuditLog('score.job_ready', { shopDomain, jobId });

  const { data: signals, error: signalError } = await supabase
    .from('shopify_order_signals' as never)
    .select(
      'shop_domain, shopify_order_id, order_number, created_at_shopify, total_price, currency, financial_status, fulfillment_status, cancelled_at, refunds_count, payment_gateway_names, shipping_country, risk_level'
    )
    .eq('shop_domain', shopDomain)
    .in('shopify_order_id', uniqueIds);

  if (signalError) {
    throw new Error(`shopify_signal_load_failed: ${signalError.message}`);
  }

  const signalRows = (signals ?? []) as ShopifyOrderSignalRow[];
  if (signalRows.length === 0) {
    shopifyAuditLog('score.no_signals', { shopDomain, requested: uniqueIds.length });
    return { scored: 0, skipped: uniqueIds.length, jobId };
  }

  const identities = await loadIdentitiesForOrders(
    supabase,
    shopDomain,
    signalRows.map((s) => s.shopify_order_id)
  );

  const csvRows: Record<string, string | undefined>[] = [];
  let skipped = 0;

  for (const signal of signalRows) {
    const csvRow = shopifyOrderToCsvRow(signal, identities.get(signal.shopify_order_id) ?? null);
    if (!csvRow) {
      skipped += 1;
      continue;
    }
    csvRows.push(csvRow);
  }

  if (csvRows.length === 0) {
    shopifyAuditLog('score.all_skipped_no_email', { shopDomain, skipped, signalCount: signalRows.length });
    return { scored: 0, skipped, jobId };
  }

  const ingestion: ProcessCsvJobIngestion = { source: 'shopify', shopDomain };

  shopifyAuditLog('score.pipeline_start', { shopDomain, jobId, rowCount: csvRows.length, skipped });
  await processCsvJob(csvRows, jobId, supabase, 2, merchantId, {
    index: 0,
    totalChunks: 1,
    isFirst: false,
    isLast: true,
  }, ingestion);

  shopifyAuditLog('score.pipeline_done', { shopDomain, jobId, scored: csvRows.length, skipped });
  return { scored: csvRows.length, skipped, jobId };
}

/**
 * Score all shopify_order_signals for a shop that are not yet in audit_transactions.
 */
export async function backfillShopifyAuditTransactions(input: {
  supabase: SupabaseClient;
  shopDomain: string;
  batchSize?: number;
  merchantId?: string;
}): Promise<{ batches: number; scored: number; skipped: number }> {
  const { supabase, shopDomain } = input;
  const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
  const merchantIdFromConnection = await resolveMerchantIdForShop(supabase, shopDomain);
  const merchantId = input.merchantId ?? merchantIdFromConnection;

  if (!merchantId) {
    shopifyAuditLog('backfill.no_merchant', {
      shopDomain,
      sessionMerchantId: input.merchantId ?? null,
      connectionMerchantId: merchantIdFromConnection,
    });
    return { batches: 0, scored: 0, skipped: 0 };
  }

  if (
    input.merchantId &&
    merchantIdFromConnection &&
    input.merchantId !== merchantIdFromConnection
  ) {
    shopifyAuditLog('backfill.merchant_id_mismatch', {
      shopDomain,
      sessionMerchantId: input.merchantId,
      connectionMerchantId: merchantIdFromConnection,
    });
  }

  const { count: totalSignalCount, error: countError } = await supabase
    .from('shopify_order_signals' as never)
    .select('*', { count: 'exact', head: true })
    .eq('shop_domain', shopDomain);

  if (countError) {
    shopifyAuditError('backfill.signal_count_failed', countError, { shopDomain, merchantId });
    throw new Error(`shopify_signal_count_failed: ${countError.message}`);
  }

  const signalRowsForShop = totalSignalCount ?? 0;
  shopifyAuditLog('backfill.started', {
    shopDomain,
    merchantId,
    sessionMerchantId: input.merchantId ?? null,
    connectionMerchantId: merchantIdFromConnection,
    batchSize,
    signalRowsForShop,
  });

  if (signalRowsForShop === 0) {
    shopifyAuditLog('backfill.no_signals_for_shop', { shopDomain, merchantId });
    return { batches: 0, scored: 0, skipped: 0 };
  }

  let offset = 0;
  let batches = 0;
  let scored = 0;
  let skipped = 0;
  let pagesRead = 0;
  let ordersSeen = 0;
  let ordersAlreadyInAudit = 0;
  let ordersPendingTotal = 0;

  for (;;) {
    const { data: signals, error } = await supabase
      .from('shopify_order_signals' as never)
      .select('shopify_order_id')
      .eq('shop_domain', shopDomain)
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      shopifyAuditError('backfill.signal_page_failed', error, {
        shopDomain,
        merchantId,
        offset,
        batchSize,
      });
      throw new Error(`shopify_signal_page_failed: ${error.message}`);
    }

    const page = (signals ?? []) as Array<{ shopify_order_id: string }>;
    pagesRead += 1;

    shopifyAuditLog('backfill.page_loaded', {
      shopDomain,
      merchantId,
      offset,
      pageSize: page.length,
      pagesRead,
    });

    if (page.length === 0) {
      shopifyAuditLog('backfill.pagination_complete', {
        shopDomain,
        merchantId,
        offset,
        pagesRead,
      });
      break;
    }

    const orderIds = page.map((s) => s.shopify_order_id);
    ordersSeen += orderIds.length;

    let alreadyScored: Set<string>;
    try {
      alreadyScored = await loadExistingScoredOrderIds(supabase, shopDomain, orderIds);
    } catch (err) {
      shopifyAuditError('backfill.audit_lookup_failed', err, {
        shopDomain,
        merchantId,
        offset,
        orderIdsInPage: orderIds.length,
      });
      throw err;
    }

    const alreadyScoredCount = orderIds.filter((id) => alreadyScored.has(id)).length;
    ordersAlreadyInAudit += alreadyScoredCount;
    const pending = orderIds.filter((id) => !alreadyScored.has(id));
    ordersPendingTotal += pending.length;

    shopifyAuditLog('backfill.page_split', {
      shopDomain,
      merchantId,
      offset,
      ordersInPage: orderIds.length,
      alreadyScored: alreadyScoredCount,
      pending: pending.length,
    });

    if (pending.length === 0) {
      shopifyAuditLog('backfill.page_all_already_scored', {
        shopDomain,
        merchantId,
        offset,
        ordersInPage: orderIds.length,
      });
    } else {
      try {
        const result = await scoreShopifyOrdersIntoAudit({
          supabase,
          shopDomain,
          shopifyOrderIds: pending,
          merchantId,
        });
        scored += result.scored;
        skipped += result.skipped;
        batches += 1;
        shopifyAuditLog('backfill.batch_done', {
          shopDomain,
          merchantId,
          offset,
          pending: pending.length,
          scored: result.scored,
          skipped: result.skipped,
          jobId: result.jobId,
        });
      } catch (err) {
        shopifyAuditError('backfill.batch_failed', err, {
          shopDomain,
          merchantId,
          offset,
          pending: pending.length,
          scoredSoFar: scored,
          skippedSoFar: skipped,
        });
        throw err;
      }
    }

    offset += page.length;
    if (page.length < batchSize) break;
  }

  shopifyAuditLog('backfill.finished', {
    shopDomain,
    merchantId,
    signalRowsForShop,
    pagesRead,
    ordersSeen,
    ordersAlreadyInAudit,
    ordersPendingTotal,
    batches,
    scored,
    skipped,
  });
  return { batches, scored, skipped };
}

/**
 * Fire-and-forget helper for webhook handlers (logs errors, never throws).
 */
export function enqueueShopifyOrderAuditScore(input: {
  supabase: SupabaseClient;
  shopDomain: string;
  shopifyOrderId: string;
}): void {
  void scoreShopifyOrdersIntoAudit({
    supabase: input.supabase,
    shopDomain: input.shopDomain,
    shopifyOrderIds: [input.shopifyOrderId],
  }).catch((err) => {
    shopifyAuditError('enqueue.failed', err, {
      shopDomain: input.shopDomain,
      shopifyOrderId: input.shopifyOrderId,
    });
  });
}
