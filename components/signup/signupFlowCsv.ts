import Papa from 'papaparse';
import { autoMapHeaders, REQUIRED_FIELDS, type RequiredField } from '@/lib/csv/headerAliases';

export type ParsedCsv = {
  rowCount: number;
  headers: string[];
  hashedFile: File;
};

type HashableField =
  | 'customer_email'
  | 'customer_name'
  | 'shipping_address'
  | 'billing_address'
  | 'customer_phone'
  | 'ip_address'
  | 'device_id'
  | 'browser_fingerprint'
  | 'cookie_id'
  | 'account_id'
  | 'card_fingerprint';

const HASHABLE_FIELDS = new Set<HashableField>([
  'customer_email',
  'customer_name',
  'shipping_address',
  'billing_address',
  'customer_phone',
  'ip_address',
  'device_id',
  'browser_fingerprint',
  'cookie_id',
  'account_id',
  'card_fingerprint',
]);

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

async function sha256Hex(value: string): Promise<string> {
  const buffer = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function parseAndHashCsv(file: File): Promise<ParsedCsv> {
  const csvText = await file.text();

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? 'We could not read that CSV.');
  }

  const headers = parsed.meta.fields ?? [];
  const { exact, fuzzy } = autoMapHeaders(headers);
  const columnMap = { ...exact, ...fuzzy } as Partial<Record<RequiredField, string>>;
  const missingRequired = REQUIRED_FIELDS.filter((field) => !columnMap[field]);

  if (missingRequired.length > 0) {
    throw new Error(`We could not automatically match: ${missingRequired.join(', ')}.`);
  }

  const headerToField = new Map<string, RequiredField>();
  for (const [field, header] of Object.entries(columnMap)) {
    if (header) headerToField.set(header, field as RequiredField);
  }
  const selectedHeaders = headers.filter((header) => headerToField.has(header));

  const salt = crypto.randomUUID();
  const rows = await Promise.all(
    parsed.data.map(async (row) => {
      const nextRow: Record<string, string> = {};
      await Promise.all(
        selectedHeaders.map(async (header) => {
          const field = headerToField.get(header);
          const rawValue = toCsvValue(row[header]).trim();

          if (field && HASHABLE_FIELDS.has(field as HashableField) && rawValue) {
            nextRow[header] = await sha256Hex(`${salt}:${field}:${rawValue.toLowerCase()}`);
            return;
          }

          nextRow[header] = rawValue;
        })
      );
      return nextRow;
    })
  );

  const hashedCsv = Papa.unparse(rows, { columns: selectedHeaders });
  const hashedFile = new File([hashedCsv], file.name, { type: 'text/csv' });

  return {
    rowCount: rows.length,
    headers: selectedHeaders,
    hashedFile,
  };
}
