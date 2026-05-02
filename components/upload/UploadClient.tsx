'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { autoMapHeaders, REQUIRED_FIELDS, OPTIONAL_FIELD_GROUPS, type RequiredField } from '@/lib/csv/headerAliases';
import { friendlyUploadError, type FriendlyError } from '@/lib/copy/uploadErrors';
import { assessDataQualityFromMapping, type DataQualityReport } from '@/lib/csv/dataQuality';

type UploadState = 'idle' | 'mapping' | 'uploading' | 'processing' | 'complete' | 'error';

const CSV_TEMPLATE_HEADERS =
  'order_id,order_date,customer_email,customer_name,shipping_address,order_total,order_status,currency,customer_phone,billing_address,refund_status,refund_reason,refund_date,refund_amount,payment_method,ip_address,device_id,card_last4,card_bin,card_fingerprint,browser_fingerprint,cookie_id,user_agent,asn,account_id';
const EXAMPLE_ROW =
  'ORD-001,2024-01-15,alice@example.com,Alice Smith,"123 Main St",99.99,paid,USD,+1-555-0100,"123 Main St",not_refunded,,,,Visa,203.0.113.42,device_abc,4242,411111,fp_abc,bf_xyz,ck_123,Mozilla/5.0,AS15169,acc_001';
const MAX_POLL_MS = 30 * 60 * 1000;

const FIELD_LABELS: Record<RequiredField, string> = {
  order_id: 'Order ID',
  order_date: 'Order date',
  customer_email: 'Customer email',
  customer_name: 'Customer name',
  shipping_address: 'Shipping address',
  order_total: 'Order total',
  currency: 'Currency',
  order_status: 'Order status',
  customer_phone: 'Customer phone',
  billing_address: 'Billing address',
  refund_status: 'Refund status',
  refund_reason: 'Refund reason',
  refund_date: 'Refund date',
  refund_amount: 'Refund amount',
  payment_method: 'Payment method',
  ip_address: 'IP address',
  device_id: 'Device ID',
  card_last4: 'Card last 4',
  card_bin: 'Card BIN',
  card_fingerprint: 'Card fingerprint',
  browser_fingerprint: 'Browser fingerprint',
  cookie_id: 'Cookie / visitor ID',
  user_agent: 'User agent',
  asn: 'ASN',
  account_id: 'Account ID',
  ground_truth_label: 'Ground truth label',
};

export default function UploadClient() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Partial<Record<RequiredField, string>>>({});
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [statusText, setStatusText] = useState('Uploading…');
  const [runId, setRunId] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);
  const [shopifyOpen, setShopifyOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('unauth.shopifyGuide.open') !== '0';
  });
  const [shopifyFieldsOpen, setShopifyFieldsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredUnmapped = REQUIRED_FIELDS.filter((f) => !columnMap[f]);
  const canSubmit = requiredUnmapped.length === 0;

  const handleFile = useCallback((f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const headers = text
        .split('\n')[0]
        .split(',')
        .map((h) => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);
      const mapped = autoMapHeaders(headers);
      setColumnMap(mapped);
      setDataQuality(assessDataQualityFromMapping(mapped));
      setState('mapping');
    };
    reader.readAsText(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  useEffect(() => {
    if (state === 'mapping') setDataQuality(assessDataQualityFromMapping(columnMap));
  }, [columnMap, state]);

  async function runAudit() {
    if (!file || !canSubmit) return;
    setState('uploading');
    setStatusText('Uploading…');
    setFriendlyError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('csv-uploads')
        .upload(filePath, file, { contentType: 'text/csv' });
      if (uploadError) throw uploadError;
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, columnMap }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { runId: newRunId } = await res.json();
      setRunId(newRunId);
      setState('processing');
      setStatusText('Queued for processing…');
    } catch (err) {
      setState('error');
      setFriendlyError(friendlyUploadError(err instanceof Error ? err.message : String(err)));
    }
  }

  useEffect(() => {
    if (state !== 'processing' || !runId) return;
    let cancelled = false;
    const startTime = Date.now();
    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/jobs/${runId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const job = await res.json();
        if (job.total_rows > 0) {
          setTotalRows(job.total_rows);
          setProgress(Math.round((job.processed_rows / job.total_rows) * 100));
        }
        if (job.status === 'completed') {
          setState('complete');
          router.push(`/audit/${runId}`);
          return;
        }
        if (job.status === 'failed') {
          setState('error');
          const log = job.error_log as Array<{ message?: string }> | null;
          setFriendlyError(friendlyUploadError(log?.[0]?.message ?? 'Processing failed.'));
          return;
        }
        setStatusText(
          job.status === 'processing'
            ? `Processing ${job.processed_rows.toLocaleString()} of ${job.total_rows.toLocaleString()} orders`
            : 'Queued for processing…',
        );
      } catch {
        /* swallow poll errors */
      }
      if (!cancelled && Date.now() - startTime <= MAX_POLL_MS) setTimeout(poll, 3000);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [runId, state, router]);

  function downloadTemplate() {
    const csv = `${CSV_TEMPLATE_HEADERS}\n${EXAMPLE_ROW}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unauth-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleShopify() {
    const next = !shopifyOpen;
    setShopifyOpen(next);
    localStorage.setItem('unauth.shopifyGuide.open', next ? '1' : '0');
  }

  const isProcessing = state === 'uploading' || state === 'processing';

  function renderDataQualityPanel() {
    if (!dataQuality || !canSubmit) return null;
    const { grade, missingHighValue, score } = dataQuality;

    if (grade === 'rich' || grade === 'adequate') {
      return (
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm border"
          style={{ background: 'var(--success-bg)', borderColor: 'var(--success-bd)' }}
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
          <span style={{ color: 'var(--text)' }}>
            <strong>Good data quality</strong> — identity matching will work well.{' '}
            Fields include {dataQuality.presentFields.slice(0, 3).join(', ')}
            {dataQuality.presentFields.length > 3 && ` +${dataQuality.presentFields.length - 3} more`}.
          </span>
        </div>
      );
    }

    if (grade === 'minimal') {
      return (
        <div
          className="rounded-md px-4 py-3 space-y-2 border"
          style={{ background: 'var(--risk-high-bg)', borderColor: 'var(--risk-high-bd)' }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--risk-high)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Minimal data — results will be limited
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Only required fields found (score: {score}/119). Results will be limited.
              </p>
            </div>
          </div>
          <Link
            href="/help/csv-export"
            target="_blank"
            className="inline-block px-3 py-1.5 text-xs font-semibold rounded"
            style={{ background: 'var(--risk-high-bd)', color: 'var(--text)' }}
          >
            Improve my export →
          </Link>
        </div>
      );
    }

    return (
      <div
        className="rounded-md px-4 py-3 space-y-2 border"
        style={{ background: 'var(--risk-high-bg)', borderColor: 'var(--risk-high-bd)' }}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--risk-high)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Limited identity data detected
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Your export includes {dataQuality.presentFields.length} of 17 identity fields (score: {score}/119).
            </p>
            {missingHighValue.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Missing:{' '}
                {missingHighValue
                  .slice(0, 3)
                  .map((f) => f.replace(/_/g, ' '))
                  .join(', ')}
                {missingHighValue.length > 3 && ` +${missingHighValue.length - 3} more`}.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShopifyFieldsOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          {shopifyFieldsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          How to add these fields
        </button>
        {shopifyFieldsOpen && (
          <div
            className="mt-2 pl-4 text-xs space-y-1"
            style={{ borderLeft: '2px solid var(--risk-high-bd)', color: 'var(--text-muted)' }}
          >
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Card last 4 / phone / billing address:</strong> included in the default Orders export.
              </li>
              <li>
                <strong>IP address:</strong> requires a third-party export app.
              </li>
              <li>
                <strong>Card fingerprint / device ID:</strong> requires PSP-level data.
              </li>
            </ul>
            <Link href="/help/csv-export" target="_blank" className="underline" style={{ color: 'var(--text-muted)' }}>
              Full field guide →
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shopify accordion */}
      <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={toggleShopify}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left transition-colors"
          style={{ color: 'var(--text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        >
          {shopifyOpen ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          How do I export this from Shopify?
        </button>
        {shopifyOpen && (
          <div
            className="px-5 pb-5 pt-1 text-sm space-y-1.5"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                In Shopify admin, go to <strong>Orders</strong>.
              </li>
              <li>
                Click <strong>Export</strong> in the top right.
              </li>
              <li>
                Choose <strong>Orders by date</strong> — last 6 months.
              </li>
              <li>
                Choose <strong>Plain CSV file</strong> and click <strong>Export orders</strong>.
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Dropzone — hidden once mapping */}
      {state !== 'mapping' && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-10 text-center transition-colors"
          style={{
            cursor: isProcessing ? 'default' : 'pointer',
            opacity: isProcessing ? 0.6 : 1,
            borderColor: dragOver ? 'var(--border-strong)' : 'var(--border)',
            background: dragOver ? 'var(--bg-subtle)' : 'transparent',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            disabled={isProcessing}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <UploadCloud className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--icon-muted)' }} />
          {file ? (
            <div>
              <div
                className="flex items-center justify-center gap-2 text-sm font-semibold"
                style={{ color: 'var(--text)' }}
              >
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Drop your CSV here or click to browse
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                Max 50 MB · up to 100,000 rows
              </p>
            </div>
          )}
        </div>
      )}

      {/* Column mapping panel */}
      {state === 'mapping' && csvHeaders.length > 0 && (
        <div className="rounded-lg p-5 space-y-4 border" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
              We found {csvHeaders.length} columns in your CSV. Match them:
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              Auto-matched where possible. Fix any mismatches before uploading.
            </p>
          </div>

          {/* Required fields */}
          <div className="space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Required columns
            </p>
            {REQUIRED_FIELDS.map((field) => {
              const mapped = columnMap[field];
              const isUnmapped = !mapped;
              return (
                <div
                  key={field}
                  className="flex items-center gap-3 rounded px-3 py-2"
                  style={{
                    background: isUnmapped ? 'var(--risk-critical-bg)' : 'var(--bg-subtle)',
                    border: `1px solid ${isUnmapped ? 'var(--risk-critical-bd)' : 'transparent'}`,
                  }}
                >
                  <span className="text-xs w-40 flex-shrink-0" style={{ color: 'var(--text)' }}>
                    {FIELD_LABELS[field]}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    ←
                  </span>
                  <select
                    value={mapped ?? ''}
                    onChange={(e) =>
                      setColumnMap((m) => ({ ...m, [field]: e.target.value || undefined }))
                    }
                    className="text-xs rounded px-2 py-1 flex-1 focus:outline-none"
                    style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    <option value="">— not mapped —</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {!isUnmapped && (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  )}
                  {isUnmapped && (
                    <AlertCircle
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: 'var(--risk-critical)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional field groups */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Optional columns — leave blank if not in your file
            </p>
            {OPTIONAL_FIELD_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-medium pl-1" style={{ color: 'var(--text-subtle)' }}>
                  {group.label}
                </p>
                {group.fields.map((field) => {
                  const mapped = columnMap[field];
                  return (
                    <div
                      key={field}
                      className="flex items-center gap-3 rounded px-3 py-2"
                      style={{ background: 'var(--bg-subtle)' }}
                    >
                      <span className="text-xs w-44 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {FIELD_LABELS[field]}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                        ←
                      </span>
                      <select
                        value={mapped ?? ''}
                        onChange={(e) =>
                          setColumnMap((m) => ({ ...m, [field]: e.target.value || undefined }))
                        }
                        className="text-xs rounded px-2 py-1 flex-1 focus:outline-none"
                        style={{
                          background: 'var(--bg-inset)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                        }}
                      >
                        <option value="">— not mapped —</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {renderDataQualityPanel()}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFile(null);
                  setCsvHeaders([]);
                  setColumnMap({});
                  setState('idle');
                  setDataQuality(null);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-md transition-colors border"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                Cancel
              </button>
              <button
                onClick={runAudit}
                disabled={!canSubmit}
                className="px-5 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                }}
              >
                {canSubmit
                  ? dataQuality?.grade === 'minimal'
                    ? 'Run limited analysis'
                    : 'Upload and run audit'
                  : `${requiredUnmapped.length} required field${requiredUnmapped.length !== 1 ? 's' : ''} unmapped`}
              </button>
            </div>
            {canSubmit && (
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                This mapping will be saved as your default for future uploads.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error banner */}
      {friendlyError && (
        <div
          className="flex items-start gap-3 rounded-lg px-4 py-3 border"
          style={{ background: 'var(--risk-critical-bg)', borderColor: 'var(--risk-critical-bd)' }}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--risk-critical)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {friendlyError.headline}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {friendlyError.body}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
              Code: {friendlyError.code}
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-2">
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{statusText}</span>
            {state === 'processing' && totalRows > 0 && <span>{progress}%</span>}
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-muted)' }}
          >
            {totalRows === 0 ? (
              <div
                className="h-full w-full animate-pulse"
                style={{ background: 'var(--accent)', opacity: 0.6 }}
              />
            ) : (
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, background: 'var(--accent)' }}
              />
            )}
          </div>
          {state === 'processing' && (
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              You can leave this page — we&apos;ll keep processing in the background.
            </p>
          )}
        </div>
      )}

      {/* Idle / error action buttons */}
      {(state === 'idle' || state === 'error') && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-5 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
            }}
          >
            Choose file
          </button>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 text-sm font-semibold rounded-md transition-colors border"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          >
            Download template
          </button>
        </div>
      )}

      {/* Platform note */}
      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
        Exporting from WooCommerce, BigCommerce or Magento? Any CSV with orders, customers and refund info will
        work — we&apos;ll help you match the columns.
      </p>
    </div>
  );
}
