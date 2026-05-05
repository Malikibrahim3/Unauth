'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  autoMapHeaders,
  REQUIRED_FIELDS,
  OPTIONAL_FIELD_GROUPS,
  FIELD_IMPORTANCE,
  type RequiredField,
  type FieldImportance,
} from '@/lib/csv/headerAliases';
import { sniffFile } from '@/lib/csv/sniffer';
import { friendlyUploadError, type FriendlyError } from '@/lib/copy/uploadErrors';
import { assessDataQualityFromMapping, type DataQualityReport } from '@/lib/csv/dataQuality';
import { track } from '@/lib/analytics/amplitude';

type UploadState = 'idle' | 'mapping' | 'context' | 'uploading' | 'processing' | 'complete' | 'error';
type UploadType = 'standard' | 'historical' | 'investigation';

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
  // Dispute / claim signals — optional. Merchants without a disputes export
  // will leave these blank; the scorer handles `null` as "unknown" rather
  // than "no dispute", so omitting them never falsely exonerates an order.
  chargeback_dispute: 'Chargeback filed',
  refund_requested: 'Refund requested',
  return_requested: 'Return requested',
};

export default function UploadClient() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Partial<Record<RequiredField, string>>>({});
  const [fuzzyFields, setFuzzyFields] = useState<Set<RequiredField>>(new Set());
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [statusText, setStatusText] = useState('Uploading…');
  const [runId, setRunId] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [uploadType, setUploadType] = useState<UploadType>('standard');
  const [exportGuideOpen, setExportGuideOpen] = useState(false);
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('unauth.exportGuide.open') : null;
      if (stored !== null) setExportGuideOpen(stored !== '0');
    } catch {
      /* ignore */
    }
  }, []);
  const [exportFieldsOpen, setExportFieldsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredUnmapped = REQUIRED_FIELDS.filter((f) => !columnMap[f]);
  const canSubmit = requiredUnmapped.length === 0;

  const handleFile = useCallback((f: File) => {
    setFile(f);
    // Use sniffFile for robust BOM stripping, delimiter detection, and
    // quoted-field-aware header tokenisation (instead of a naive comma-split).
    sniffFile(f).then(({ headers, collisions }) => {
      if (collisions.length > 0) {
        console.warn(
          '[UploadClient] Header collisions detected:',
          collisions.map((c) => `${c.field}: [${c.headers.join(', ')}]`).join(' | '),
        );
      }
      setCsvHeaders(headers);
      const { exact, fuzzy } = autoMapHeaders(headers);
      // Merge exact + fuzzy so dropdowns are pre-filled; track fuzzy for "?" badges
      setColumnMap({ ...exact, ...fuzzy });
      setFuzzyFields(new Set(Object.keys(fuzzy) as RequiredField[]));
      setDataQuality(assessDataQualityFromMapping({ ...exact, ...fuzzy }));
      setState('mapping');
    });
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

  /** Remove a field from fuzzy set when user manually changes its mapping */
  const clearFuzzy = useCallback((field: RequiredField) => {
    setFuzzyFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  function proceedToContext() {
    setState('context');
  }

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
        .from('merchant-csv-uploads-2')
        .upload(filePath, file, { contentType: 'text/csv' });
      if (uploadError) throw uploadError;
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          columnMap,
          label: uploadLabel.trim() || undefined,
          dateRangeStart: dateRangeStart || undefined,
          dateRangeEnd: dateRangeEnd || undefined,
          uploadType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { runId: newRunId } = await res.json();
      setRunId(newRunId);
      setState('processing');
      setStatusText('Queued for processing…');
      track('CSV Uploaded', {
        uploadType,
        hasLabel: !!uploadLabel.trim(),
        hasDateRange: !!(dateRangeStart || dateRangeEnd),
        dataQualityGrade: dataQuality?.grade ?? null,
      });
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
        const res = await fetch(`/api/audit/${runId}/progress`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const job = await res.json();
        if (job.rowCount > 0) {
          setTotalRows(job.rowCount);
          setProgress(job.progressPercent ?? 0);
        }
        if (job.status === 'complete') {
          setState('complete');
          router.push(`/audit/${runId}`);
          return;
        }
        if (job.status === 'failed') {
          setState('error');
          setFriendlyError(friendlyUploadError(job.errorMessage ?? 'Processing failed.'));
          return;
        }
        const processed = job.rowCount > 0
          ? Math.round((job.progressPercent / 100) * job.rowCount)
          : 0;
        setStatusText(
          job.status === 'processing'
            ? `Processing ${processed.toLocaleString()} of ${job.rowCount.toLocaleString()} orders`
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

  function toggleExportGuide() {
    const next = !exportGuideOpen;
    setExportGuideOpen(next);
    localStorage.setItem('unauth.exportGuide.open', next ? '1' : '0');
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
          onClick={() => setExportFieldsOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          {exportFieldsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          How to add these fields
        </button>
        {exportFieldsOpen && (
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
      {/* Export guidance accordion */}
      <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={toggleExportGuide}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left transition-colors"
          style={{ color: 'var(--text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        >
          {exportGuideOpen ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          How do I export this from your platform?
        </button>
        {exportGuideOpen && (
          <div
            className="px-5 pb-5 pt-1 text-sm space-y-1.5"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                In your store admin (e.g., Shopify), go to <strong>Orders</strong>.
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
      {(state === 'mapping' || state === 'context') && csvHeaders.length > 0 && state === 'mapping' && (
        <div data-testid="column-mapping" className="rounded-lg p-5 space-y-4 border" style={{ borderColor: 'var(--border-subtle)' }}>
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
              const isFuzzy = fuzzyFields.has(field);
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
                    onChange={(e) => {
                      setColumnMap((m) => ({ ...m, [field]: e.target.value || undefined }));
                      clearFuzzy(field);
                    }}
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
                  {mapped && !isFuzzy && (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  )}
                  {mapped && isFuzzy && (
                    <span
                      className="text-[10px] px-1 py-0.5 rounded font-semibold flex-shrink-0"
                      style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                      title="Auto-detected — please confirm this match is correct"
                    >
                      ?
                    </span>
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

          {/* Match quality improvers */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Match quality improvers
              </p>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--risk-medium-bg)', color: 'var(--risk-medium)' }}
              >
                Optional — more fields = stronger matches
              </span>
            </div>
            {OPTIONAL_FIELD_GROUPS.filter((g) => g.importance === 'match_improver').map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-medium pl-1" style={{ color: 'var(--text-subtle)' }}>
                  {group.label}
                </p>
                {group.fields.map((field) => {
                  const mapped = columnMap[field];
                  const isUnmapped = !mapped;
                  const isFuzzy = fuzzyFields.has(field);
                  return (
                    <div
                      key={field}
                      className="flex items-center gap-3 rounded px-3 py-2"
                      style={{
                        background: isUnmapped ? 'var(--risk-medium-bg)' : 'var(--bg-subtle)',
                        border: `1px solid ${isUnmapped ? 'var(--risk-medium-bd)' : 'transparent'}`,
                      }}
                    >
                      <span className="text-xs w-44 flex-shrink-0" style={{ color: 'var(--text)' }}>
                        {FIELD_LABELS[field]}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                        ←
                      </span>
                      <select
                        value={mapped ?? ''}
                        onChange={(e) => {
                          setColumnMap((m) => ({ ...m, [field]: e.target.value || undefined }));
                          clearFuzzy(field);
                        }}
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
                      {mapped && !isFuzzy && (
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                      )}
                      {mapped && isFuzzy && (
                        <span
                          className="text-[10px] px-1 py-0.5 rounded font-semibold flex-shrink-0"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                          title="Auto-detected — please confirm this match is correct"
                        >
                          ?
                        </span>
                      )}
                      {isUnmapped && (
                        <span
                          className="text-[10px] px-1 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'var(--risk-medium-bg)', color: 'var(--risk-medium)' }}
                          title="Adding this field improves match accuracy"
                        >
                          +
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Nice-to-have optional fields */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Optional fields
            </p>
            {OPTIONAL_FIELD_GROUPS.filter((g) => g.importance === 'nice_to_have').map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-medium pl-1" style={{ color: 'var(--text-subtle)' }}>
                  {group.label}
                </p>
                {group.fields.map((field) => {
                  const mapped = columnMap[field];
                  const isFuzzy = fuzzyFields.has(field);
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
                        onChange={(e) => {
                          setColumnMap((m) => ({ ...m, [field]: e.target.value || undefined }));
                          clearFuzzy(field);
                        }}
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
                      {mapped && !isFuzzy && (
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                      )}
                      {mapped && isFuzzy && (
                        <span
                          className="text-[10px] px-1 py-0.5 rounded font-semibold flex-shrink-0"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                          title="Auto-detected — please confirm this match is correct"
                        >
                          ?
                        </span>
                      )}
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
                  setUploadLabel('');
                  setDateRangeStart('');
                  setDateRangeEnd('');
                  setUploadType('standard');
                }}
                className="px-4 py-2 text-sm font-semibold rounded-md transition-colors border"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                Cancel
              </button>
              <button
                onClick={proceedToContext}
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
                  ? 'Continue →'
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

      {/* Upload context step */}
      {state === 'context' && (
        <div data-testid="upload-context" className="rounded-lg p-5 space-y-5 border" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Calendar className="h-4 w-4" style={{ color: 'var(--icon-muted)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Upload context
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              Tell us a bit about this upload. All fields are optional — skip anything you don&apos;t need.
            </p>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Label
            </label>
            <input
              data-testid="upload-label"
              type="text"
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder="e.g. January 2026, Black Friday week, Q1 2026"
              maxLength={120}
              className="w-full text-sm rounded-md px-3 py-2 focus:outline-none"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              Appears in your audit history. Leave blank to use the upload date.
            </p>
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Date range this upload covers
            </label>
            <div className="flex items-center gap-2">
              <input
                data-testid="date-range-start"
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="flex-1 text-sm rounded-md px-3 py-2 focus:outline-none"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                data-testid="date-range-end"
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="flex-1 text-sm rounded-md px-3 py-2 focus:outline-none"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              The order date range your export covers — not the upload date.
            </p>
          </div>

          {/* Upload type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Upload type
            </label>
            {(
              [
                {
                  value: 'standard',
                  title: 'Regular upload',
                  description: 'Periodic export — a week, a month, a quarter.',
                },
                {
                  value: 'historical',
                  title: 'Historical import',
                  description: 'One-time bulk import of past data. Builds your baseline without triggering new alerts.',
                },
                {
                  value: 'investigation',
                  title: 'Customer investigation',
                  description: 'Targeted analysis for a specific customer or incident. Doesn\'t affect population statistics.',
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-3 rounded-md px-3 py-2.5 cursor-pointer border transition-colors"
                style={{
                  borderColor: uploadType === opt.value ? 'var(--accent)' : 'var(--border)',
                  background: uploadType === opt.value ? 'var(--accent-subtle, var(--bg-subtle))' : 'var(--bg-subtle)',
                }}
              >
                <input
                  type="radio"
                  name="uploadType"
                  value={opt.value}
                  checked={uploadType === opt.value}
                  onChange={() => setUploadType(opt.value)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{opt.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setState('mapping')}
              className="px-4 py-2 text-sm font-semibold rounded-md transition-colors border"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              ← Back
            </button>
            <button
              data-testid="submit-upload"
              onClick={runAudit}
              className="px-5 py-2 text-sm font-semibold rounded-md transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {dataQuality?.grade === 'minimal' ? 'Run limited analysis' : 'Upload and run audit'}
            </button>
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
