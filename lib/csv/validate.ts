import { csvRowSchema, REQUIRED_COLUMNS } from './schema';
import type { ZodError } from 'zod';

export interface ValidationResult {
  valid: boolean;
  rowCount: number;
  errorCount: number;
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: string[];
  hasGroundTruth: boolean;
}

const KNOWN_COLUMNS = new Set([
  'order_id', 'order_date', 'customer_email', 'customer_name',
  'shipping_address', 'order_total', 'currency', 'order_status',
  'customer_phone', 'billing_address', 'refund_status', 'refund_reason',
  'refund_date', 'refund_amount', 'payment_method', 'ip_address',
  'device_id', 'card_last4', 'card_bin', 'card_fingerprint',
  'browser_fingerprint', 'cookie_id', 'user_agent', 'asn',
  'account_id', 'ground_truth_label',
  'chargeback_dispute', 'refund_requested', 'return_requested',
]);

export function validateHeaders(headers: string[]): {
  missingRequired: string[];
  unknownColumns: string[];
} {
  const missingRequired = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  const unknownColumns = headers.filter((h) => !KNOWN_COLUMNS.has(h));

  return { missingRequired, unknownColumns };
}

export function validateRows(
  rows: Record<string, string>[],
  headers: string[]
): ValidationResult {
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const warnings: string[] = [];
  let hasGroundTruth = false;

  if (headers.includes('ground_truth_label')) {
    hasGroundTruth = true;
  }

  const { unknownColumns } = validateHeaders(headers);
  if (unknownColumns.length > 0) {
    warnings.push(`Unknown columns will be ignored: ${unknownColumns.join(', ')}`);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = csvRowSchema.safeParse(row);
    if (!result.success) {
      const zodError = result.error as ZodError;
      for (const issue of zodError.issues) {
        errors.push({
          row: i + 2,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    rowCount: rows.length,
    errorCount: errors.length,
    errors: errors.slice(0, 100),
    warnings,
    hasGroundTruth,
  };
}
