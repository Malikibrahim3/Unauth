'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { autoMapHeaders, REQUIRED_FIELDS, type AutoMapResult } from '@/lib/csv/headerAliases';

const SCHEMA_REQUIRED = [
  'order_id', 'customer_email', 'order_date', 'order_value',
  'is_refund', 'is_inr',
];

const SCHEMA_OPTIONAL = [
  'customer_name', 'shipping_address', 'billing_address', 'customer_phone',
  'ip_address', 'device_fingerprint', 'payment_fingerprint',
  'browser_fingerprint', 'delivery_photo_metadata', 'courier_gps_proof',
];

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

function detectCsv(file: File): Promise<{ rowCount: number; columnMap: AutoMapResult }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        preview: 5,
      });
      if (parsed.errors.length > 0) {
        reject(new Error(parsed.errors[0]?.message ?? 'We could not read that CSV.'));
        return;
      }
      const headers = parsed.meta.fields ?? [];
      const columnMap = autoMapHeaders(headers);
      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (full) => resolve({ rowCount: full.data.length, columnMap }),
        error: (err: Error) => reject(new Error(err.message)),
      });
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

export default function AuditUploadForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [columnMap, setColumnMap] = useState<AutoMapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (selected: File) => {
    setFileError('');
    setSubmitError('');
    setFile(null);
    setRowCount(null);
    setColumnMap(null);

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setFileError('CSV files only. Export your orders as .csv and try again.');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFileError('File too large. Maximum 50 MB. Split into smaller exports and try again.');
      return;
    }
    try {
      const { rowCount: rc, columnMap: cm } = await detectCsv(selected);
      setFile(selected);
      setRowCount(rc);
      setColumnMap(cm);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not read CSV.');
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, [processFile]);

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setSubmitError('');
    setFileError((c) => c === 'Please upload your order export to continue.' ? '' : c);

    let valid = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('We need your email to send you the results.');
      valid = false;
    }
    if (!file) {
      setFileError('Please upload your order export to continue.');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('email', email.trim());
    formData.append('file', file!);
    formData.append('columnMap', JSON.stringify(columnMap ?? {}));

    const response = await fetch('/api/public-audit/submit', { method: 'POST', body: formData });
    const body = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setSubmitError(body?.error ?? 'Something went wrong. Try again or email hello@unauth.app');
      return;
    }
    const auditId = typeof body?.auditId === 'string' ? body.auditId : null;
    if (!auditId) {
      setSubmitError('Something went wrong. Try again or email hello@unauth.app');
      return;
    }
    router.push(`/audit/submitted?audit=${encodeURIComponent(auditId)}`);
  }

  const mono: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };
  const sans: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
  const serif: React.CSSProperties = { fontFamily: 'var(--font-serif, serif)' };
  const muted = '#6B6455';
  const subtle = '#9A9080';

  return (
    <form onSubmit={onSubmit} noValidate style={{ width: '100%' }}>
      <div style={{ marginBottom: '26px' }}>
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
            ...serif,
            width: '100%',
            background: 'rgba(236, 229, 212, 0.48)',
            border: 'none',
            color: '#1A1814',
            padding: '14px 16px',
            fontSize: '18px',
            outline: 'none',
            boxSizing: 'border-box',
            borderRadius: 0,
          }}
        />
        {emailError && (
          <p style={{ ...mono, fontSize: '12px', color: '#9F1D1D', marginTop: '6px', marginBottom: 0 }}>
            {emailError}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{ ...mono, display: 'block', fontSize: '11px', letterSpacing: '0.08em', color: muted, marginBottom: '6px' }}
        >
          ORDER EXPORT
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            border: `1px dashed ${isDragging ? '#7B2D26' : '#C8B89A'}`,
            padding: '28px 20px',
            cursor: 'pointer',
            textAlign: 'center',
            background: isDragging ? 'rgba(123,45,38,0.04)' : 'transparent',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />
          {file && rowCount !== null ? (
            <p style={{ ...mono, fontSize: '13px', color: '#1A1814', margin: 0 }}>
              {file.name} · {rowCount.toLocaleString()} rows detected
            </p>
          ) : fileError && fileError !== 'Please upload your order export to continue.' ? (
            <p style={{ ...mono, fontSize: '13px', color: '#9F1D1D', margin: 0 }}>
              {fileError}
            </p>
          ) : (
            <>
              <p style={{ ...mono, fontSize: '13px', color: muted, margin: '0 0 6px' }}>
                Drop your CSV here, or click to browse
              </p>
              <p style={{ ...mono, fontSize: '11px', color: subtle, margin: 0 }}>
                Shopify · WooCommerce · custom OMS · Stripe exports accepted · max 50 MB
              </p>
            </>
          )}
        </div>
        {fileError === 'Please upload your order export to continue.' && (
          <p style={{ ...sans, fontSize: '13px', color: '#9F1D1D', marginTop: '6px', marginBottom: 0 }}>
            {fileError}
          </p>
        )}
      </div>

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
          padding: '15px 20px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#6A251F'; }}
        onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#7B2D26'; }}
      >
        {loading ? 'Uploading...' : 'Run free audit →'}
      </button>

      {submitError && (
        <p style={{ ...sans, fontSize: '13px', color: '#9F1D1D', marginTop: '10px', marginBottom: 0 }}>
          {submitError}
        </p>
      )}

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
          What fields do we need?
        </button>

        {schemaOpen && (
          <div style={{ marginTop: '16px' }}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', color: subtle, marginTop: 0, marginBottom: '10px' }}>
                  REQUIRED
                </p>
                <p style={{ ...mono, fontSize: '12px', color: muted, lineHeight: 1.8, margin: 0 }}>
                  {SCHEMA_REQUIRED.join(' · ')}
                </p>
              </div>
              <div>
                <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', color: subtle, marginTop: 0, marginBottom: '10px' }}>
                  OPTIONAL — ENRICHMENT
                </p>
                <p style={{ ...mono, fontSize: '12px', color: muted, lineHeight: 1.8, margin: 0 }}>
                  {SCHEMA_OPTIONAL.join(' · ')}
                </p>
              </div>
            </div>
            <p style={{ ...sans, fontSize: '12px', color: subtle, marginTop: '16px', marginBottom: 0 }}>
              Don&apos;t have every field? Upload what you have. The engine works with partial data.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
