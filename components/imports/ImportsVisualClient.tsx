'use client';
import { parseCsvText } from '@/lib/imports/csv/parse';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import Link from '@/components/navigation/AppNavLink';
import type { HoldRatePoint } from '@/lib/capabilities/derived';
import { formatDayMonthLongInTimeZone, formatNumber, formatTimeInTimeZone } from '@/lib/utils/format';

export type ImportHistoryItem = {
  id: string;
  label: string | null;
  status: string;
  total_rows: number | null;
  processed_rows: number | null;
  failed_rows: number | null;
  created_at: string;
  completed_at: string | null;
  cursor: unknown;
  error_log: unknown;
};

type Dataset = 'orders' | 'refunds' | 'customers';
type ImportCursor = { dataset?: string; file_name?: string | null; duplicates_skipped?: number; validation_valid_rows?: number };
type ImportIssue = { row?: number; field?: string; code?: string; message?: string };
type Validation = { total_rows: number; valid_count: number; error_count: number; duplicates_skipped: number; errors: ImportIssue[] };

const fields: Record<Dataset, Array<{ value: string; label: string; required?: boolean }>> = {
  orders: [
    { value: 'external_id', label: 'Order reference', required: true }, { value: 'order_number', label: 'Order number' },
    { value: 'currency', label: 'Currency', required: true }, { value: 'total_minor', label: 'Gross amount (minor units)' },
    { value: 'financial_status', label: 'Payment state' }, { value: 'fulfillment_status', label: 'Fulfilment state' },
    { value: 'customer_email', label: 'Customer' },
  ],
  refunds: [
    { value: 'external_id', label: 'Refund reference', required: true }, { value: 'order_external_id', label: 'Related order', required: true },
    { value: 'amount_minor', label: 'Amount (minor units)', required: true }, { value: 'currency', label: 'Currency', required: true }, { value: 'reason', label: 'Cause' },
  ],
  customers: [
    { value: 'external_id', label: 'Customer reference', required: true }, { value: 'email', label: 'Email' },
    { value: 'name', label: 'Customer name' }, { value: 'phone', label: 'Phone' },
  ],
};

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const line = '1px solid #eae8e5';
const shadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function cursorOf(job: ImportHistoryItem): ImportCursor {
  return job.cursor && typeof job.cursor === 'object' && !Array.isArray(job.cursor) ? job.cursor as ImportCursor : {};
}

function issuesOf(job: ImportHistoryItem): ImportIssue[] {
  return Array.isArray(job.error_log) ? job.error_log.filter((item): item is ImportIssue => Boolean(item && typeof item === 'object')) : [];
}


function dateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: 'DATE UNKNOWN', date: '—', time: '—' };
  return {
    day: formatDayMonthLongInTimeZone(date, 'Europe/London').toUpperCase(),
    date: formatDayMonthLongInTimeZone(date, 'Europe/London'),
    time: formatTimeInTimeZone(date, 'Europe/London'),
  };
}

function jobState(job: ImportHistoryItem) {
  const held = job.failed_rows ?? 0;
  if (['failed', 'dead_letter'].includes(job.status)) return { label: 'FAILED', color: '#b0431a', bg: '#fdf0e6', dot: '#b0431a' };
  if (held > 0 || !['completed', 'committed'].includes(job.status)) return { label: held > 0 ? `${formatNumber(held)} HELD` : 'NEEDS REVIEW', color: '#7a5310', bg: '#fff3e9', dot: '#c98a1a' };
  return { label: 'POSTED', color: '#1a6b43', bg: '#eef6f1', dot: '#a7abad' };
}

function jobName(job: ImportHistoryItem) {
  const cursor = cursorOf(job);
  return cursor.file_name ?? job.label ?? 'CSV import';
}

export function ImportsVisualClient({ history, holdRateTimeseries, initialStep }: { history: ImportHistoryItem[]; holdRateTimeseries: HoldRatePoint[]; initialStep?: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [mappingOpen, setMappingOpen] = useState(initialStep === 'upload' || initialStep === 'mapping');
  const [showUploadStep, setShowUploadStep] = useState(initialStep === 'upload');
  const [dataset, setDataset] = useState<Dataset>('orders');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<Validation | null>(null);
  const [busy, setBusy] = useState<'read' | 'validate' | 'commit' | null>(null);
  const [error, setError] = useState('');
  const [confirmCommit, setConfirmCommit] = useState(false);
  const [receipt, setReceipt] = useState<{ job_id: string; persisted: number; error_count: number } | null>(null);
  const importIdentity = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [jobHref, setJobHref] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileInputRevision, setFileInputRevision] = useState(0);
  useEffect(() => {
    setValidation(null);
    setConfirmCommit(false);
    setReceipt(null);
    importIdentity.current = null;
    setUncertain(false);
    setJobHref(null);
  }, [csv, dataset, mapping]);
  const parsed = useMemo(() => parseCsvText(csv), [csv]);
  const headers = parsed.headers;
  const sample = headers.map((header) => parsed.rows[0]?.[header] ?? '');
  const heldRows = history.some(job => job.failed_rows == null) ? null : history.reduce((sum, job) => sum + job.failed_rows!, 0);
  const postedRows = history.some(job => job.processed_rows == null) ? null : history.reduce((sum, job) => sum + job.processed_rows!, 0);
  const failedRuns = history.filter((job) => ['failed', 'dead_letter'].includes(job.status)).length;
  const latestIssues = history.flatMap((job) => issuesOf(job).map((issue) => ({ job, issue }))).slice(0, 3);
  const maxHoldRate = Math.max(1, ...holdRateTimeseries.map((point) => point.percentage ?? 0));

  const closeMapping = useCallback(() => {
    if (!inFlight.current && !confirmCommit && !pendingFile) setMappingOpen(false);
  }, [confirmCommit, pendingFile]);
  const closeCommit = useCallback(() => { if (!inFlight.current) setConfirmCommit(false); }, []);
  const closeReplacement = useCallback(() => {
    if (inFlight.current) return;
    setPendingFile(null);
    setFileInputRevision((revision) => revision + 1);
  }, []);
  const mappingOverlay = useOverlayPresence({ open: mappingOpen, onClose: closeMapping, trapFocus: !confirmCommit && !pendingFile, restoreFocus: true, lockBodyScroll: true, exitDurationMs: 0 });
  const commitOverlay = useOverlayPresence({ open: confirmCommit, onClose: closeCommit, trapFocus: true, restoreFocus: true, lockBodyScroll: true, exitDurationMs: 0 });
  const replaceOverlay = useOverlayPresence({ open: Boolean(pendingFile), onClose: closeReplacement, trapFocus: true, restoreFocus: true, lockBodyScroll: true, exitDurationMs: 0 });

  function closePendingFile() {
    setPendingFile(null);
    setFileInputRevision((revision) => revision + 1);
  }

  function chooseFile(file: File | null) {
    if (!file || inFlight.current) return;
    if (csv) {
      setPendingFile(file);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    void readFile(file);
  }

  async function readFile(file: File | null) {
    if (!file || inFlight.current) return;
    inFlight.current = true;
    setBusy('read');
    setError('');
    try {
      if (!file.name.toLowerCase().endsWith('.csv') || file.size > 20 * 1024 * 1024) throw new Error('Choose a CSV file up to 20 MB.');
      const nextCsv = await file.text();
      const parsedFile = parseCsvText(nextCsv);
      if (parsedFile.parseErrors.length || !parsedFile.rows.length) throw new Error('The CSV is empty or malformed. Check the header and quoted values.');
      const nextHeaders = parsedFile.headers;
      const nextMap = Object.fromEntries(nextHeaders.map((header) => {
        const exact = fields[dataset].find((field) => field.value === header);
        return [header, exact?.value ?? ''];
      }));
      setCsv(nextCsv);
      setFileName(file.name);
      setFileSize(file.size);
      setMapping(nextMap);
      setValidation(null);
      setReceipt(null);
      setMappingOpen(true);
      setShowUploadStep(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The file could not be read. Choose a UTF-8 CSV file.');
    } finally {
      inFlight.current = false;
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function validateMapping(review = false) {
    if (inFlight.current || uncertain || receipt) return;
    inFlight.current = true;
    setBusy('validate');
    setError('');
    try {
      const response = await fetch('/api/imports/csv/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset, mapping, csv }) });
      const payload = await response.json() as Validation & { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.message ?? payload.error ?? 'Validation failed');
      setValidation(payload);
      if (review && payload.valid_count > 0) setConfirmCommit(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Validation failed');
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  async function commitImport() {
    if (!validation || validation.valid_count < 1 || inFlight.current || receipt) return;
    inFlight.current = true;
    importIdentity.current ??= crypto.randomUUID();
    setBusy('commit');
    setError('');
    try {
      const response = await fetch('/api/imports/csv/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import_id: importIdentity.current, dataset, mapping, csv, import_name: fileName.replace(/\.csv$/i, ''), file_name: fileName, file_size: fileSize ?? undefined }),
      });
      const payload = await response.json() as { job_id?: string; status?: string; persisted?: number; error_count?: number; message?: string; detail?: string; error?: string };
      if (payload.job_id) setJobHref(`/sources/imports/${encodeURIComponent(payload.job_id)}`);
      if (response.status === 202) {
        setUncertain(true);
        setError(payload.message ?? 'This import is still being processed. Open the existing job.');
        return;
      }
      if (!response.ok || !payload.job_id) throw new Error(payload.message ?? payload.detail ?? payload.error ?? 'Import failed');
      setUncertain(false);
      setReceipt({ job_id: payload.job_id, persisted: payload.persisted ?? 0, error_count: payload.error_count ?? 0 });
      setConfirmCommit(false);
    } catch (reason) {
      setUncertain(true);
      setError(`${reason instanceof Error ? reason.message : 'Import response unavailable'}. Completion is unconfirmed. Check this same import before starting another.`);
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  return <section data-source-import data-operations-surface="imports" data-state-id={mappingOpen ? receipt ? 'import-committed' : error ? 'import-error' : busy ? `import-${busy}` : csv ? 'import-map' : 'import-validation-empty-states' : 'import-history'} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <SetBreadcrumbLabel label="Imports" detail={`${history.length} loaded import jobs · recorded history`} />
    <input key={fileInputRevision} ref={fileInput} type="file" accept=".csv,text/csv" onInput={(event) => chooseFile(event.currentTarget.files?.[0] ?? null)} style={{ display: 'none' }} />
    <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: line }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#1c1f23', font: `400 12.5px/1 ${sans}` }}>All sources<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4" /></svg></span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#1c1f23', font: `400 12.5px/1 ${sans}` }}>Loaded history<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4" /></svg></span>
      <span style={{ flex: 1 }} /><span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>{formatNumber(history.length)} jobs · {postedRows == null ? "Unavailable" : formatNumber(postedRows)} rows posted · {heldRows == null ? "Unavailable" : formatNumber(heldRows)} held</span>
      <button type="button" onClick={() => { setMappingOpen(true); setShowUploadStep(true); }} style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', font: `400 12.5px/1 ${sans}`, cursor: 'pointer' }}>Upload a file</button>
      <Link href="/sources/connected" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', textDecoration: 'none', font: `500 12.5px/1 ${sans}` }}>Run an import now</Link>
    </div>

    <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ minHeight: 0, overflowY: 'auto' }}>{history.length ? history.map((job, index) => {
          const now = dateParts(job.created_at);
          const previous = index ? dateParts(history[index - 1].created_at) : null;
          const showDay = !previous || previous.day !== now.day;
          const state = jobState(job);
          const cursor = cursorOf(job);
          const issue = issuesOf(job)[0];
          return <div key={job.id}>{showDay ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '6px 0 8px' }}><strong style={{ width: 74, color: '#64686d', letterSpacing: '.09em', font: `600 10px/1 ${sans}` }}>{now.day}</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>{now.date} · recorded jobs</span><span style={{ flex: 1, height: 1, background: '#e4e3e0' }} /></div> : null}<div style={{ display: 'flex', alignItems: 'stretch' }}><span style={{ width: 74, flex: 'none', paddingTop: 12, color: '#64686d', font: `400 11px/1 ${mono}` }}>{now.time}</span><div style={{ width: 22, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><i style={{ width: 7, height: 7, flex: 'none', marginTop: 14, borderRadius: '50%', background: state.dot }} /><i style={{ flex: 1, width: 1, marginTop: 5, background: '#e4e3e0' }} /></div><Link href={`/sources/imports/${job.id}`} style={{ flex: 1, minWidth: 0, marginBottom: 8, borderRadius: 10, padding: '11px 13px', background: '#fff', boxShadow: ['failed', 'dead_letter'].includes(job.status) ? '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(176,67,26,.26)' : shadow, display: 'flex', alignItems: 'center', gap: 13, color: '#1c1f23', textDecoration: 'none' }}><div style={{ width: 168, flex: 'none', minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: `500 12.5px/1.3 ${sans}` }}>{jobName(job)}</strong><span style={{ display: 'block', marginTop: 2, color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>{cursor.dataset ?? 'manual upload'} · immutable</span></div><span style={{ width: 96, flex: 'none', textAlign: 'right', color: state.color === '#b0431a' ? state.color : '#40454a', font: `400 11.5px/1.4 ${mono}` }}>{job.processed_rows == null ? '—' : formatNumber(job.processed_rows)}</span><span style={{ width: 118, flex: 'none' }}><i style={{ padding: '2px 7px', borderRadius: 5, background: state.bg, color: state.color, font: `500 10px/1.5 ${sans}`, fontStyle: 'normal' }}>{state.label}</i></span><span style={{ flex: 1, minWidth: 0, color: '#64686d', font: `400 11.5px/1.45 ${sans}` }}>{issue?.message ?? (state.label === 'POSTED' ? 'Clean run, no changes to review' : 'Open the immutable job record for retained detail')}</span></Link></div></div>;
        }) : <div style={{ display: 'grid', minHeight: 260, placeItems: 'center', borderRadius: 10, background: '#f4f3f1', color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>No import jobs are recorded.</div>}</div>
        <span style={{ flex: 1 }} /><div style={{ borderTop: line, paddingTop: 10, color: '#64686d', font: `400 10.5px/1.45 ${mono}` }}>{formatNumber(history.length)} jobs shown · loaded history</div>
      </div>

      <aside style={{ width: 326, flex: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={{ borderRadius: 13, padding: '12px 13px', background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 10 }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><strong style={{ flex: 1, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>HELD ROWS</strong><span style={{ color: '#b0431a', font: `400 10px/1 ${mono}` }}>{heldRows == null ? "Unavailable" : formatNumber(heldRows)}</span></div><div style={{ borderRadius: 10, padding: '12px 13px', background: '#fff', boxShadow: shadow, display: 'flex', flexDirection: 'column', gap: 9 }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#64686d', font: `400 10px/1.4 ${mono}` }}>HOLD RATE · 9 WEEKS</span><span style={{ color: '#b0431a', font: `400 11.5px/1 ${mono}` }}>{holdRateTimeseries.at(-1)?.percentage == null ? '—' : `${holdRateTimeseries.at(-1)!.percentage}%`}</span></div><div style={{ height: 34, display: 'flex', alignItems: 'flex-end', gap: 3 }}>{holdRateTimeseries.map((point) => <i key={point.weekStart} title={`${point.weekStart}: ${point.percentage == null ? 'unavailable' : `${point.percentage}% held`}`} style={{ flex: 1, height: point.percentage == null ? 2 : Math.max(2, (point.percentage / maxHoldRate) * 34), borderRadius: 2, background: point.percentage && point.percentage > 0 ? '#e8802a' : '#e0d9d0' }} />)}</div><div style={{ display: 'flex', justifyContent: 'space-between', color: '#a7abad', font: `400 9px/1 ${mono}` }}><span>{holdRateTimeseries[0]?.weekStart.slice(5) ?? '—'}</span><span>{holdRateTimeseries.at(-1)?.weekStart.slice(5) ?? '—'}</span></div><span style={{ borderTop: '1px solid #f4f2ef', paddingTop: 8, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Held rows remain excluded from every product figure until corrected and committed in a new import.</span></div>{latestIssues.map(({ job, issue }) => <Link key={`${job.id}-${issue.row}-${issue.code}`} href={`/sources/imports/${job.id}?step=mapping`} style={{ borderRadius: 10, padding: '12px 13px', background: '#fff', boxShadow: shadow, color: '#1c1f23', textDecoration: 'none' }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><strong style={{ flex: 1, font: `500 12.5px/1.3 ${sans}` }}>{issue.row ? `Row ${issue.row}` : 'Held rows'} · {issue.field ?? 'mapping issue'}</strong><span style={{ color: '#b0431a', font: `400 12px/1 ${mono}` }}>{job.failed_rows ?? '—'}</span></div><span style={{ display: 'block', marginTop: 7, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>{issue.message ?? issue.code ?? 'Open the retained job record.'}</span><span style={{ display: 'block', paddingTop: 6, color: '#9b470d', font: `400 11px/1 ${sans}` }}>Map the column →</span></Link>)}</section>
        <section style={{ flex: 1, minHeight: 0, borderRadius: 13, padding: '12px 13px', background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 10 }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><strong style={{ flex: 1, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>RUN HISTORY</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>Latest 14 jobs</span></div><div style={{ borderRadius: 10, padding: '12px 13px', background: '#fff', boxShadow: shadow }}><div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>{history.slice(0, 14).reverse().map((job) => <i key={job.id} style={{ flex: 1, height: 22, borderRadius: 2, background: jobState(job).dot }} />)}</div><div style={{ display: 'flex', marginTop: 8, color: '#64686d', font: `400 9.5px/1 ${mono}` }}><span style={{ flex: 1 }}>older</span><span style={{ color: '#b0431a' }}>{failedRuns} failed</span><span style={{ flex: 1, textAlign: 'right' }}>latest</span></div></div><span style={{ flex: 1 }} /><span style={{ borderTop: '1px solid #e4e3e0', paddingTop: 10, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>A failed import remains a permanent job record. Re-running creates a new job and does not rewrite history.</span></section>
      </aside>
    </div>

    {mappingOpen ? <OverlayPortal><div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'auto', display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(28,27,25,.3)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeMapping(); }}><section ref={mappingOverlay.containerRef} tabIndex={-1} inert={confirmCommit || Boolean(pendingFile) || undefined} role="dialog" aria-modal="true" aria-labelledby="mapping-title" data-overlay-id="mapping-repair" style={{ position: 'relative', width: 880, maxWidth: '100%', maxHeight: 'calc(100dvh - 48px)', borderRadius: 12, background: '#fff', boxShadow: '0 18px 54px rgba(28,22,14,.25),0 0 0 1px rgba(28,27,25,.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', borderBottom: line }}><div style={{ flex: 1 }}><h2 id="mapping-title" aria-label={csv && !showUploadStep ? 'Map source columns' : undefined} style={{ margin: 0, color: '#1c1f23', font: `500 15px/1.3 ${sans}` }}>{csv && !showUploadStep ? `Map columns · ${fileName}` : 'Upload a file'}</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: `400 11.5px/1.45 ${sans}` }}>{csv && !showUploadStep ? 'Validation checks the mapped records. Review and confirmation are separate from validation.' : 'Choose a CSV dataset. Choosing a file reads it locally. Validation sends it to Unauth without storing records; confirmation creates the import job.'}</p></div><button type="button" onClick={closeMapping} disabled={busy != null || confirmCommit || Boolean(pendingFile)} aria-label="Close" style={{ border: 0, background: 'transparent', color: '#64686d', font: `400 20px/1 ${sans}`, cursor: 'pointer' }}>×</button></header>
      {!csv || showUploadStep ? <div style={{ minHeight: 360, display: 'grid', placeItems: 'center', padding: 18, background: '#f4f3f1' }}><div style={{ width: 520, maxWidth: '100%', border: '1px dashed #cfcac4', borderRadius: 10, padding: 28, background: '#fff', textAlign: 'center' }}><strong style={{ display: 'block', font: `500 14px/1.3 ${sans}` }}>Choose a UTF-8 CSV file</strong><span style={{ display: 'block', marginTop: 7, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>Orders and customers can be committed after mapping and validation. Refund files are validated but not written by this importer. Maximum 20 MB. Orders need external_id and currency; customers need external_id. Example headers: external_id,currency,total_minor. Example row: order-001,GBP,1299 (GBP 12.99). Amounts use integer minor units; currency is never inferred. Map columns, validate, then review before importing. Duplicate handling and rejected rows are reported by validation. Keep your original file to correct and retry; the job retains mapping and errors, not the source file.</span><div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}><select aria-label="CSV dataset" disabled={busy != null} value={dataset} onChange={(event) => setDataset(event.target.value as Dataset)} style={{ height: 34, border: '1px solid #d8d4cf', borderRadius: 8, padding: '0 9px', background: '#fff', font: `400 12px/1 ${sans}` }}><option value="orders">Orders</option><option value="customers">Customers</option><option value="refunds">Refunds</option></select><button type="button" disabled={busy != null} onClick={() => fileInput.current?.click()} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#1c1f23', color: '#fff', font: `500 12px/1 ${sans}`, cursor: 'pointer' }}>{busy === 'read' ? 'Reading…' : 'Choose file'}</button></div>{error ? <p role="alert" style={{ color: '#b0431a', font: `400 11px/1.5 ${sans}` }}>{error}</p> : null}</div></div> : <div style={{ minHeight: 0, overflowY: 'auto', padding: 18, background: '#f4f3f1', display: 'grid', gridTemplateColumns: '1fr 342px', gap: 12 }}><section style={{ borderRadius: 10, padding: 12, background: '#fff' }}><div style={{ display: 'flex', color: '#64686d', letterSpacing: '.07em', font: `500 9.5px/1 ${sans}` }}><strong style={{ flex: 1 }}>FILE COLUMN → RECORD FIELD</strong><span>{headers.length} columns</span></div><div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>{headers.map((header, index) => { const selected = mapping[header] ?? ''; const field = fields[dataset].find((item) => item.value === selected); return <div key={header} style={{ display: 'grid', gridTemplateColumns: '1fr 18px 138px 70px', alignItems: 'center', gap: 8, borderRadius: 9, padding: '9px 10px', background: selected ? '#fff' : '#fff3e9', boxShadow: selected ? 'inset 0 0 0 1px #e4e3e0' : 'inset 0 0 0 1px rgba(201,138,26,.35)' }}><div style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: `400 12px/1.2 ${mono}` }}>{header}</strong><span style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 10px/1.2 ${sans}` }}>Sample: {sample[index] ?? '—'}</span></div><span style={{ color: '#a7abad' }}>→</span><select aria-label={`Map ${header}`} disabled={busy != null || uncertain || Boolean(receipt)} value={selected} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))} style={{ height: 30, minWidth: 0, border: '1px solid #d8d4cf', borderRadius: 7, padding: '0 8px', background: '#fff', color: '#1c1f23', font: `400 11px/1 ${sans}` }}><option value="">Choose a field</option><option value="__ignore">Not imported</option>{fields[dataset].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span style={{ justifySelf: 'start', padding: '2px 7px', borderRadius: 5, background: !selected ? '#fff3e9' : selected === '__ignore' ? '#f4f3f1' : '#eef6f1', color: !selected ? '#7a5310' : selected === '__ignore' ? '#40454a' : '#1a6b43', font: `500 10px/1.5 ${sans}` }}>{!selected ? 'REQUIRED' : selected === '__ignore' ? 'IGNORED' : field?.value === header ? 'EXACT' : 'MAPPED'}</span></div>; })}</div></section><aside style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><section style={{ borderRadius: 10, padding: 12, background: '#fff' }}><div style={{ display: 'flex', color: '#64686d', letterSpacing: '.07em', font: `500 9.5px/1 ${sans}` }}><strong style={{ flex: 1 }}>ROW PREVIEW</strong><span>live</span></div><div style={{ marginTop: 10, overflow: 'hidden', border: '1px solid #e4e3e0', borderRadius: 8 }}>{headers.slice(0, 4).map((header, index) => <div key={header} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 10px', borderTop: index ? line : undefined, font: `400 10px/1.3 ${mono}` }}><span style={{ color: '#64686d' }}>{header}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sample[index] ?? '—'}</span></div>)}</div></section><section style={{ borderRadius: 10, padding: 12, background: '#fff' }}><strong style={{ color: '#64686d', letterSpacing: '.07em', font: `500 9.5px/1 ${sans}` }}>VALIDATION</strong>{validation ? <div style={{ marginTop: 10, display: 'grid', gap: 7 }}>{[['Rows read', validation.total_rows], ['Valid', validation.valid_count], ['Held', validation.error_count], ['Duplicates', validation.duplicates_skipped]].map(([label, value]) => <div key={String(label)} style={{ display: 'flex', color: '#64686d', font: `400 11.5px/1.3 ${sans}` }}><span style={{ flex: 1 }}>{label}</span><strong style={{ color: label === 'Held' ? '#b0431a' : '#1c1f23', font: `400 11px/1 ${mono}` }}>{value}</strong></div>)}</div> : <p style={{ margin: '9px 0 0', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Validation has not run. No row count is inferred.</p>}{receipt ? <p style={{ margin: '10px 0 0', color: '#1a6b43', font: `500 11px/1.5 ${sans}` }}>{formatNumber(receipt.persisted)} rows posted in job {receipt.job_id.slice(0, 9).toUpperCase()}.</p> : null}{error ? <p role="alert" style={{ margin: '10px 0 0', color: '#b0431a', font: `400 11px/1.5 ${sans}` }}>{error}</p> : null}</section></aside></div>}
      <footer style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: line }}><span style={{ flex: 1, color: '#64686d', font: `400 10px/1 ${mono}` }}>{csv ? 'mapping and validation are retained only when the import job is created' : 'rejected rows are held, never silently dropped'}</span>{csv && !showUploadStep ? <><button type="button" disabled={busy != null} onClick={() => setShowUploadStep(true)} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', font: `400 12px/1 ${sans}`, cursor: 'pointer' }}>Back</button><button type="button" disabled={busy != null || uncertain || Boolean(receipt)} onClick={() => void validateMapping()} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', font: `400 12px/1 ${sans}`, cursor: 'pointer' }}>{busy === 'validate' ? 'Validating…' : 'Validate mapping'}</button><button type="button" disabled={busy != null || dataset === 'refunds' || uncertain || Boolean(receipt)} onClick={() => void validateMapping(true)} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: dataset === 'refunds' ? '#64686d' : '#1c1f23', color: '#fff', font: `500 12px/1 ${sans}`, cursor: dataset === 'refunds' ? 'not-allowed' : 'pointer' }}>Review import</button></> : null}</footer>
      {confirmCommit ? <OverlayPortal><div ref={commitOverlay.containerRef as React.RefObject<HTMLDivElement>} tabIndex={-1} data-overlay-id="import-commit" role="alertdialog" aria-modal="true" aria-labelledby="commit-title" style={{ position: 'fixed', pointerEvents: 'auto', zIndex: 105, inset: 0, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(28,27,25,.22)' }}><div style={{ width: 430, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', borderRadius: 10, padding: 16, background: '#fff', boxShadow: '0 18px 46px rgba(28,22,14,.22)' }}><h3 id="commit-title" style={{ margin: 0, font: `500 14px/1.3 ${sans}` }}>Post {formatNumber(validation?.valid_count ?? 0)} validated rows?</h3><p style={{ margin: '7px 0 0', color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>This imports the reviewed records; matching manual record identities may be updated. The job retains the mapping and error report. {formatNumber(validation?.error_count ?? 0)} rejected rows and {formatNumber(validation?.duplicates_skipped ?? 0)} duplicates will not be written.</p><p role="status">{busy === 'commit' ? 'Import in progress. Keep this review open.' : error}</p>{jobHref ? <Link href={jobHref}>Review existing import job</Link> : null}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}><button type="button" disabled={busy != null} onClick={closeCommit} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', font: `400 12px/1 ${sans}` }}>Cancel</button><button type="button" disabled={busy === 'commit'} onClick={() => void commitImport()} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#1c1f23', color: '#fff', font: `500 12px/1 ${sans}` }}>{busy === 'commit' ? 'Checking…' : uncertain ? 'Check same import' : 'Post validated rows'}</button></div></div></div></OverlayPortal> : null}
    </section></div></OverlayPortal> : null}
    {pendingFile ? <OverlayPortal><div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 110, pointerEvents: 'auto', display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(28,27,25,.3)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) closePendingFile(); }}><section ref={replaceOverlay.containerRef} tabIndex={-1} role="dialog" data-overlay-id="replace-import-file-confirmation" aria-modal="true" aria-labelledby="replace-import-title" style={{ width: 430, borderRadius: 10, background: '#fff', boxShadow: '0 18px 46px rgba(28,22,14,.22)', overflow: 'hidden' }}><div style={{ padding: 16 }}><h3 id="replace-import-title" style={{ margin: 0, font: `500 14px/1.3 ${sans}` }}>Replace the current CSV?</h3><p style={{ margin: '7px 0 0', color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>Replacing the file clears the current column map and validation output. Any earlier import job and its records remain unchanged.</p></div><footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: line }}><button type="button" onClick={closePendingFile} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', font: `400 12px/1 ${sans}` }}>Cancel</button><button type="button" onClick={() => { const file = pendingFile; setPendingFile(null); void readFile(file); }} style={{ padding: '7px 11px', border: 0, borderRadius: 8, background: '#b0431a', color: '#fff', font: `500 12px/1 ${sans}` }}>Replace file</button></footer></section></div></OverlayPortal> : null}
  </section>;
}
