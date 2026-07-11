/**
 * Canonical CSV import — supported datasets and their canonical field sets.
 * Rows map to the SAME canonical shapes as connectors/webhook/API, so a CSV
 * order is normalized identically to one ingested any other way.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §7.3.
 */
import { mapCanonicalOrder, mapCanonicalRefund } from '@/lib/canonical/entities';
import type { RecordError } from '@/lib/connectors/mapping/recordErrors';
import { recordError } from '@/lib/connectors/mapping/recordErrors';

export type CsvDatasetKey = 'orders' | 'refunds' | 'customers';

export type RowValue = string | number | null;

export type DatasetConfig = {
  key: CsvDatasetKey;
  allowedFields: string[];
  requiredFields: string[];
  numericFields: string[];
  toCanonical: (row: Record<string, RowValue>) => { externalId: string | null; entity: unknown | null; errors: RecordError[] };
};

function externalIdOf(row: Record<string, RowValue>): string | null {
  const v = row.external_id;
  return v == null || v === '' ? null : String(v);
}

export const CSV_DATASETS: Record<CsvDatasetKey, DatasetConfig> = {
  orders: {
    key: 'orders',
    allowedFields: ['external_id', 'order_number', 'currency', 'total_minor', 'subtotal_minor', 'financial_status', 'fulfillment_status', 'placed_at', 'customer_email', 'customer_name'],
    requiredFields: ['external_id', 'currency'],
    numericFields: ['total_minor', 'subtotal_minor'],
    toCanonical: (row) => {
      const { order, errors } = mapCanonicalOrder({
        ...row,
        customer: row.customer_email || row.customer_name ? { email: row.customer_email ?? null, name: row.customer_name ?? null } : null,
        lines: [],
      });
      return { externalId: externalIdOf(row), entity: order, errors };
    },
  },
  refunds: {
    key: 'refunds',
    allowedFields: ['external_id', 'order_external_id', 'amount_minor', 'currency', 'reason', 'refunded_at'],
    requiredFields: ['external_id', 'currency'],
    numericFields: ['amount_minor'],
    toCanonical: (row) => {
      const { refund, errors } = mapCanonicalRefund(row);
      return { externalId: externalIdOf(row), entity: refund, errors };
    },
  },
  customers: {
    key: 'customers',
    allowedFields: ['external_id', 'email', 'name', 'phone'],
    requiredFields: ['external_id'],
    numericFields: [],
    toCanonical: (row) => {
      const externalId = externalIdOf(row);
      const errors: RecordError[] = [];
      if (!externalId) errors.push(recordError('external_id', 'required_field_missing', 'external_id missing'));
      return {
        externalId,
        entity: externalId ? { external_id: externalId, email: row.email ?? null, name: row.name ?? null, phone: row.phone ?? null } : null,
        errors,
      };
    },
  },
};

export function isCsvDataset(key: string): key is CsvDatasetKey {
  return key === 'orders' || key === 'refunds' || key === 'customers';
}
