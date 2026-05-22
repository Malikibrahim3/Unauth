'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { autoMapHeaders, REQUIRED_FIELDS, type RequiredField } from '@/lib/csv/headerAliases';

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

async function hashCsv(file: File): Promise<{
  hashedFile: File;
  rowCount: number;
  columnMap: Partial<Record<RequiredField, string>>;
}> {
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
    throw new Error(`We could not match required columns: ${missingRequired.join(', ')}`);
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
          const raw = toCsvValue(row[header]).trim();
          if (field && HASHABLE_FIELDS.has(field as HashableField) && raw) {
            nextRow[header] = await sha256Hex(`${salt}:${field}:${raw.toLowerCase()}`);
          } else {
            nextRow[header] = raw;
          }
        })
      );
      return nextRow;
    })
  );

  const hashedCsv = Papa.unparse(rows, { columns: selectedHeaders });
  return {
    hashedFile: new File([hashedCsv], file.name, { type: 'text/csv' }),
    rowCount: rows.length,
    columnMap,
  };
}

export default function PublicAuditForm() {
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [columnMap, setColumnMap] = useState<Partial<Record<RequiredField, string>>>({});
  const [hashedFile, setHashedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onFileSelect(nextFile: File | null) {
    setError('');
    setFile(nextFile);
    setRowCount(null);
    setColumnMap({});
    setHashedFile(null);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    try {
      const hashed = await hashCsv(nextFile);
      setRowCount(hashed.rowCount);
      setColumnMap(hashed.columnMap);
      setHashedFile(hashed.hashedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare CSV.');
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!hashedFile) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('email', email.trim());
    formData.append('file', hashedFile);
    formData.append('columnMap', JSON.stringify(columnMap));

    const response = await fetch('/api/public-audit/submit', {
      method: 'POST',
      body: formData,
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(typeof body?.error === 'string' ? body.error : 'Could not submit audit.');
      return;
    }
    const auditId = typeof body?.auditId === 'string' ? body.auditId : null;
    if (!auditId) {
      setError('Audit submission failed.');
      return;
    }
    window.location.href = `/audit/${auditId}/submitted`;
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gap: '10px' }}>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@store.com"
          style={{
            width: '100%',
            background: '#F8F5EE',
            border: '1px solid #D8D0BD',
            color: '#1A1814',
            padding: '12px 14px',
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '14px',
          }}
        />

        <label
          style={{
            display: 'block',
            border: '1px dashed #5A5548',
            background: '#15140F',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
          />
          <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', margin: 0 }}>
            Drag and drop your CSV or click to choose
          </p>
          <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '12px', color: '#8A8472', marginTop: '6px', marginBottom: 0 }}>
            .csv only
          </p>
          {file ? (
            <p style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '11px', color: '#B8B2A0', marginTop: '10px', marginBottom: 0 }}>
              {file.name} · {rowCount !== null ? `${rowCount.toLocaleString()} rows` : 'preparing...'}
            </p>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={loading || !hashedFile}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#E8E4D8',
            color: '#15140F',
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '15px',
            fontWeight: 500,
            padding: '12px 16px',
            border: '1px solid #E8E4D8',
            opacity: loading || !hashedFile ? 0.7 : 1,
          }}
        >
          {loading ? 'Starting audit...' : 'Run free audit →'}
        </button>
      </div>

      {error ? (
        <p style={{ color: '#F3A89C', fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '13px', marginTop: '10px', marginBottom: 0 }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
