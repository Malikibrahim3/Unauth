import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedRecord } from '@/lib/connectors/types';
import type { SyncJobState } from '@/lib/connectors/syncEngine';

type JobContext = { merchantId: string; connectionId: string | null; sourceAccountId: string | null };

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function findOrderId(client: SupabaseClient, job: JobContext, externalId: string | null) {
  if (!externalId) return null;
  const { data } = await client.from('source_orders').select('id').eq('merchant_id', job.merchantId).eq('source', 'shipbob').eq('external_id', externalId).maybeSingle();
  return data?.id ?? null;
}

export async function persistShipBobCanonicalRecord(
  client: SupabaseClient,
  job: JobContext,
  record: NormalizedRecord,
  sourceRecordId: string | null,
) {
  const raw = record.data as Record<string, unknown>;
  if (record.sourceEntityType === 'location') {
    await client.from('source_locations').upsert({
      merchant_id: job.merchantId,
      source_account_id: job.sourceAccountId,
      source_record_id: sourceRecordId,
      external_id: record.externalId,
      name: text(raw.name),
      status: text(raw.status) ?? (raw.is_active === false ? 'inactive' : 'active'),
      address: raw.address && typeof raw.address === 'object' ? raw.address : {},
      raw_metadata: raw,
      source_updated_at: text(raw.updated_at),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,source_account_id,external_id' });
    return;
  }

  if (record.sourceEntityType === 'order') {
    const { error } = await client.from('source_orders').upsert({
      merchant_id: job.merchantId,
      source: 'shipbob',
      connection_id: job.connectionId,
      external_id: record.externalId,
      order_number: text(raw.reference_id) ?? text(raw.order_number),
      financial_status: text(raw.status) ?? 'unknown',
      fulfillment_state: text(raw.fulfillment_status) ?? text(raw.status) ?? 'unknown',
      total_price: number(raw.total_price ?? raw.order_value),
      subtotal_price: number(raw.subtotal_price),
      currency: text(raw.currency),
      line_items_count: Array.isArray(raw.products) ? raw.products.length : null,
      placed_at: text(raw.created_at ?? raw.placed_at),
      cancelled_at: text(raw.cancelled_at),
      cancel_reason: text(raw.cancel_reason),
      raw_payload_hash: sourceRecordId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,source,external_id' });
    if (error) throw new Error(`shipbob_source_order_persist_failed:${error.message}`);
    return;
  }

  const order = raw.order && typeof raw.order === 'object' ? raw.order as Record<string, unknown> : null;
  const orderExternalId = text(raw.orderExternalId) ?? text(order?.id ?? order?.order_id);
  const sourceOrderId = await findOrderId(client, job, orderExternalId);

  if (record.sourceEntityType === 'fulfilment') {
    if (!sourceOrderId) return;
    const { error } = await client.from('source_fulfillments').upsert({
      merchant_id: job.merchantId,
      source_order_id: sourceOrderId,
      external_id: record.externalId,
      status: text(raw.status),
      shipment_status: text(raw.sourceStatus),
      tracking_company: text(raw.carrier),
      tracking_number: text(raw.trackingNumber),
      occurred_at: text(raw.shippedAt),
      updated_at_source: text(raw.updated_at_source),
    }, { onConflict: 'merchant_id,source_order_id,external_id' });
    if (error) throw new Error(`shipbob_source_fulfillment_persist_failed:${error.message}`);
    return;
  }

  if (record.sourceEntityType === 'shipment') {
    const { error } = await client.from('source_shipments').upsert({
      merchant_id: job.merchantId,
      source_account_id: job.sourceAccountId,
      source_order_id: sourceOrderId,
      source_record_id: sourceRecordId,
      external_id: record.externalId,
      tracking_number: text(raw.trackingNumber),
      carrier: text(raw.carrier),
      service: text(raw.service),
      status: text(raw.status),
      source_status: text(raw.sourceStatus),
      shipped_at: text(raw.shippedAt),
      delivered_at: text(raw.deliveredAt),
      raw_metadata: raw,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,source_account_id,external_id' });
    if (error) throw new Error(`shipbob_source_shipment_persist_failed:${error.message}`);
    return;
  }

  if (record.sourceEntityType === 'return') {
    const returnOrderId = await findOrderId(client, job, text(raw.order_id ?? raw.orderExternalId));
    const { error } = await client.from('source_returns').upsert({
      merchant_id: job.merchantId,
      source_account_id: job.sourceAccountId,
      source_order_id: returnOrderId,
      source_record_id: sourceRecordId,
      external_id: record.externalId,
      status: text(raw.status),
      source_status: text(raw.sourceStatus),
      disposition: text(raw.disposition),
      requested_at: text(raw.requested_at ?? raw.created_at),
      received_at: text(raw.received_at),
      inspected_at: text(raw.inspected_at),
      raw_metadata: raw,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,source_account_id,external_id' });
    if (error) throw new Error(`shipbob_source_return_persist_failed:${error.message}`);
  }
}

/**
 * Reflect a finished (or failed) sync-job run onto the merchant's ShipBob
 * connection row. Without this the Integration Centre reads null
 * last_sync_at/imported_record_count forever and renders "initial import
 * pending" even after a successful import. An import that completes with zero
 * business records is still a successful sync.
 */
export async function updateShipBobConnectionAfterSync(
  client: SupabaseClient,
  job: { merchant_id: string; connection_id: string | null },
  state: SyncJobState,
): Promise<void> {
  if (!job.connection_id) return;
  const now = new Date().toISOString();

  if (state.status === 'completed') {
    const { count } = await client
      .from('source_records')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', job.merchant_id)
      .eq('connection_id', job.connection_id);
    const { error } = await client
      .from('merchant_integrations')
      .update({
        status: 'connected',
        last_sync_at: now,
        last_sync_completed_at: now,
        last_successful_sync_at: now,
        data_fresh_through: now,
        imported_record_count: count ?? 0,
        last_error: null,
        last_error_code: null,
        last_error_message: null,
        last_error_at: null,
        updated_at: now,
      })
      .eq('id', job.connection_id)
      .eq('merchant_id', job.merchant_id);
    if (error) throw new Error(`shipbob_connection_sync_update_failed:${error.message}`);
    return;
  }

  if (state.status === 'running') {
    // Page budget hit mid-import; the job continues on the next worker tick.
    const { error } = await client
      .from('merchant_integrations')
      .update({ last_sync_started_at: now, updated_at: now })
      .eq('id', job.connection_id)
      .eq('merchant_id', job.merchant_id);
    if (error) throw new Error(`shipbob_connection_sync_update_failed:${error.message}`);
    return;
  }

  // failed | dead_letter | unsupported — keep the connection but record why the
  // sync failed so the UI can show a merchant-readable failure state.
  const code = state.status === 'unsupported' ? 'unsupported'
    : state.status === 'dead_letter' ? `dead_letter:${state.lastErrorCode ?? 'unknown'}`
    : state.lastErrorCode ?? 'sync_failed';
  const { error } = await client
    .from('merchant_integrations')
    .update({
      last_error_code: code,
      last_error_message: `ShipBob sync failed (${code}).`,
      last_error_at: now,
      updated_at: now,
    })
    .eq('id', job.connection_id)
    .eq('merchant_id', job.merchant_id);
  if (error) throw new Error(`shipbob_connection_sync_update_failed:${error.message}`);
}
