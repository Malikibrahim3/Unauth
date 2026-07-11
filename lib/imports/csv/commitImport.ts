/**
 * Canonical CSV import — commit. Persists the VALID rows through the same
 * canonical upsert path (source row + source_record provenance + domain event)
 * as the entity API, so a CSV order/customer is indistinguishable from one
 * ingested via API or connector. Invalid rows never reach here.
 *
 * Imported records carry CSV-import provenance (source_records) and freshness
 * `unknown` unless superseded by a later import.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §7.3.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertCanonicalEntity } from '@/lib/api/v1/ingest/upsertEntity';
import { fromMinorUnits } from '@/lib/canonical/money';
import type { CanonicalOrder } from '@/lib/canonical/records';
import type { CsvDatasetKey } from '@/lib/imports/csv/entitySchemas';
import type { ProcessedRow } from '@/lib/imports/csv/processor';

function canonicalOrderToRow(order: CanonicalOrder): Record<string, unknown> {
  return {
    order_number: order.orderNumber,
    financial_status: order.financialStatus,
    fulfillment_state: order.fulfillmentStatus,
    currency: order.currency,
    total_price: order.totalMinor != null ? fromMinorUnits(order.totalMinor, order.currency) : null,
    subtotal_price: order.subtotalMinor != null ? fromMinorUnits(order.subtotalMinor, order.currency) : null,
    customer_email: order.customer?.email ?? null,
    email: order.customer?.email ?? null,
    customer_name: order.customer?.name ?? null,
    line_items_count: order.lines.length,
    placed_at: order.placedAt,
  };
}

const PERSISTABLE: Partial<Record<CsvDatasetKey, { table: string; sourceEntityType: string; canonicalEntityType: string; eventType: 'order.created' | 'customer.created'; toRow: (entity: unknown) => Record<string, unknown> }>> = {
  orders: {
    table: 'source_orders', sourceEntityType: 'order', canonicalEntityType: 'order', eventType: 'order.created',
    toRow: (e) => canonicalOrderToRow(e as CanonicalOrder),
  },
  customers: {
    table: 'source_customers', sourceEntityType: 'customer', canonicalEntityType: 'customer', eventType: 'customer.created',
    toRow: (e) => ({ raw_metadata: e as Record<string, unknown> }),
  },
};

export type CommitResult = { persisted: number; skipped: number; datasetSupported: boolean };

export async function commitCsvImport(
  client: SupabaseClient,
  merchantId: string,
  dataset: CsvDatasetKey,
  valid: ProcessedRow[],
  jobId: string,
): Promise<CommitResult> {
  const cfg = PERSISTABLE[dataset];
  if (!cfg) return { persisted: 0, skipped: valid.length, datasetSupported: false };

  let persisted = 0;
  for (const row of valid) {
    await upsertCanonicalEntity(
      client,
      merchantId,
      { table: cfg.table, sourceEntityType: cfg.sourceEntityType, canonicalEntityType: cfg.canonicalEntityType, eventType: cfg.eventType, conflictTarget: 'merchant_id,source,external_id' },
      { externalId: row.externalId, row: cfg.toRow(row.entity), idempotencyKey: `csv:${jobId}:${row.externalId}` },
    );
    persisted += 1;
  }
  return { persisted, skipped: 0, datasetSupported: true };
}
