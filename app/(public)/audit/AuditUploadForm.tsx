'use client';

import { useState, useRef, useCallback } from 'react';
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
    throw new Error(`Missing required columns: ${missingRequired.join(', ')}`);
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

const SCHEMA_REQUIRED = [
  'order_id', 'order_date', 'customer_id', 'email', 'phone',
  'shipping_name', 'shipping_address', 'shipping_postcode',
  'billing_name', 'billing_address', 'billing_postcode',
  'order_value', 'item_count', 'sku / category', 'payment_method',
  'card_bin', 'card_last4', 'refund_requested', 'refund_reason',
  'return_reason', 'chargeback_status', 'carrier', 'tracking_number',
  'delivery_status',
];

const SCHEMA_OPTIONAL = [
  'ip_address', 'device_fingerprint', 'payment_fingerprint',
  'browser_fingerprint', 'delivery_photo_metadata', 'courier_gps_proof',
];

export default function AuditUploadForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [columnMap, setColumnMap] = useState<Partial<Record<RequiredField, string>>>({});
  const [hashedFile, setHashedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(selected: File) {
    setFileError('');
    setFile(selected);
    setRowCount(null);
    setColumnMap({});
    setHashedFile(null);

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setFileError('CSV files only. Export your orders as .csv and try again.');
      setFile(null);
      return;
    }
    try {
      const hashed = await hashCsv(selected);
      setRowCount(hashed.rowCount);
      setColumnMap(hashed.columnMap);
      setHashedFile(hashed.hashedFile);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not prepare CSV.');
      setFile(null);
    }
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setSubmitError('');

    let valid = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('We need your email to send you the results.');
      valid = false;
    }
    if (!hashedFile) {
      setFileError('Please upload your order export to continue.');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('email', email.trim());
    formData.append('file', hashedFile!);
    formData.append('columnMap', JSON.stringify(columnMap));

    const response = await fetch('/api/public-audit/submit', {
      method: 'POST',
      body: formData,
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setSubmitError(typeof body?.error === 'string' ? body.error : 'Something went wrong. Try again or email malik@unauth.co');
      return;
    }
    const auditId = typeof body?.auditId === 'string' ? body.auditId : null;
    if (!auditId) {
      setSubmitError('Audit submission failed.');
      return;
    }
    window.location.href = `/audit/${auditId}/submitted`;
  }

  const mono: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };
  const sans: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
  const muted = '#6B6455';

  return (
    <form onSubmit={onSubmit} noValidate style={{ width: '100%' }}>
      {/* EMAIL */}
      <div style={{ marginBottom: '24px' }}>
        <label
          htmlFor="audit-email"
          style={{ ...mono, display: 'block', fontSize: '11px', letterSpacing: '0.08em', color: muted, marginBottom: '6px' }}
        >
          EMAIL
        </label>
        <input
          id="audit-email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
          placeholder="your@store.com"
          style={{
            ...sans,
            width: '100%',
            background: '#F8F5EE',
            border: `1px solid ${emailError ? '#9F1D1D' : '#C8C0AD'}`,
            color: '#1A1814',
            padding: '12px 14px',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {emailError && (
          <p style={{ ...sans, fontSize: '13px', color: '#9F1D1D', marginTop: '6px', marginBottom: 0 }}>
            {emailError}
          </p>
        )}
      </div>

      {/* CSV UPLOAD */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{ ...mono, display: 'block', fontSize: '11px', letterSpacing: '0.08em', color: muted, marginBottom: '6px' }}
        >
          ORDER EXPORT · CSV
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            border: `1px dashed ${fileError ? '#9F1D1D' : isDragging ? '#1A1814' : '#9A9080'}`,
            padding: '32px 24px',
            cursor: 'pointer',
            textAlign: 'center',
            background: isDragging ? '#F0EDE4' : 'transparent',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />
          {file && !fileError ? (
            <p style={{ ...mono, fontSize: '13px', color: '#1A1814', margin: 0 }}>
              {file.name} · {rowCount !== null ? `${rowCount.toLocaleString()} rows detected` : 'preparing…'}
            </p>
          ) : (
            <>
              <p style={{ ...mono, fontSize: '13px', color: muted, margin: '0 0 6px' }}>
                Drop your CSV here, or click to browse
              </p>
              <p style={{ ...mono, fontSize: '11px', color: '#9A9080', margin: 0 }}>
                Shopify · WooCommerce · custom OMS · Stripe exports accepted
              </p>
            </>
          )}
        </div>
        {fileError && (
          <p style={{ ...sans, fontSize: '13px', color: '#9F1D1D', marginTop: '6px', marginBottom: 0 }}>
            {fileError}
          </p>
        )}
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        style={{
          ...sans,
          display: 'block',
          width: '100%',
          background: loading ? '#5C2219' : '#7B2D26',
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: 500,
          padding: '14px 20px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#6A251F'; }}
        onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#7B2D26'; }}
      >
        {loading ? 'Uploading…' : 'Run free audit →'}
      </button>

      {submitError && (
        <p style={{ ...sans, fontSize: '13px', color: '#9F1D1D', marginTop: '10px', marginBottom: 0 }}>
          {submitError}{' '}
          {submitError.includes('try again') || submitError.includes('went wrong') ? null : (
            <>Try again or email{' '}
              <a href="mailto:malik@unauth.co" style={{ color: '#9F1D1D' }}>malik@unauth.co</a>
            </>
          )}
        </p>
      )}

      {/* SCHEMA HINT */}
      <div style={{ marginTop: '28px' }}>
        <button
          type="button"
          onClick={() => setSchemaOpen((v) => !v)}
          style={{
            ...mono,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '12px',
            color: muted,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ fontSize: '10px' }}>{schemaOpen ? '▲' : '▼'}</span>
          What fields do we need?
        </button>

        {schemaOpen && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', color: '#9A9080', marginTop: 0, marginBottom: '10px' }}>
                  REQUIRED
                </p>
                <p style={{ ...mono, fontSize: '12px', color: muted, lineHeight: 1.8, margin: 0 }}>
                  {SCHEMA_REQUIRED.join(' · ')}
                </p>
              </div>
              <div>
                <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', color: '#9A9080', marginTop: 0, marginBottom: '10px' }}>
                  OPTIONAL — ENRICHMENT
                </p>
                <p style={{ ...mono, fontSize: '12px', color: muted, lineHeight: 1.8, margin: 0 }}>
                  {SCHEMA_OPTIONAL.join(' · ')}
                </p>
              </div>
            </div>
            <p style={{ ...sans, fontSize: '12px', color: '#9A9080', marginTop: '16px', marginBottom: 0 }}>
              Don&apos;t have every field? Upload what you have. The engine works with partial data.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
