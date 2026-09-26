'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import Link from '@/components/navigation/AppNavLink';
import { formatCurrencyNullable, formatDateTime, formatNumber } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
type RowError = { row: number; field: string; code: string; message: string; value: string | null };

export type ImportJobRecord = {
  id: string;
  job_kind: string;
  source: string | null;
  status: string;
  label: string | null;
  storage_path: string | null;
  file_hash: string | null;
  column_map: Json | null;
  total_rows: number | null;
  processed_rows: number;
  failed_rows: number;
  error_log: Json;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_error_code: string | null;
  cursor: Json | null;
};

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const line = '1px solid #eae8e5';
const shadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function record(value: Json | null): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function rowErrors(value: Json): RowError[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, Json | undefined>;
    if (typeof row.row !== 'number' || typeof row.field !== 'string' || typeof row.code !== 'string' || typeof row.message !== 'string') return [];
    const rawValue = row.value ?? row.value_seen ?? row.raw_value;
    return [{ row: row.row, field: row.field, code: row.code, message: row.message, value: rawValue == null ? null : String(rawValue) }];
  });
}

function human(value: string) {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function fileSize(value: Json | undefined) {
  if (typeof value !== 'number') return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function duration(start: string | null, end: string | null) {
  if (!start || !end) return '—';
  const seconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  return seconds < 60 ? `${seconds} seconds` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statusPresentation(status: string, held: number) {
  if (status === 'completed' && held > 0) return { label: 'COMMITTED WITH HOLDS', color: '#7a5310', bg: '#fff3e9' };
  if (status === 'completed' || status === 'committed') return { label: 'COMMITTED', color: '#1a6b43', bg: '#eef6f1' };
  if (status === 'failed' || status === 'dead_letter') return { label: 'FAILED', color: '#b0431a', bg: '#fdf0e6' };
  return { label: human(status).toUpperCase(), color: '#7a5310', bg: '#fff3e9' };
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderTop: line }}><dt style={{ flex: 1, color: '#64686d', font: `400 11.5px/1.3 ${sans}` }}>{label}</dt><dd style={{ margin: 0, color: tone ?? '#1c1f23', font: `400 11px/1 ${mono}` }}>{value}</dd></div>;
}

export function ImportJobDetail({ job, mappingOpen = false }: { job: ImportJobRecord; mappingOpen?: boolean }) {
  const router = useRouter();
  const closeMapping = useCallback(() => router.replace(`/sources/imports/${job.id}`), [router, job.id]);
  const overlay = useOverlayPresence({ open: mappingOpen, onClose: closeMapping, trapFocus: true, restoreFocus: true, lockBodyScroll: true, exitDurationMs: 0 });
  const metadata = record(job.cursor);
  const mapping = record(job.column_map);
  const errors = rowErrors(job.error_log);
  const duplicates = typeof metadata.duplicates_skipped === 'number' ? metadata.duplicates_skipped : null;
  const total = job.total_rows;
  const posted = ['completed', 'committed', 'partial'].includes(job.status) ? job.processed_rows : job.processed_rows || null;
  const held = job.failed_rows;
  const fileName = typeof metadata.file_name === 'string' && metadata.file_name ? metadata.file_name : job.label ?? 'CSV import';
  const dataset = typeof metadata.dataset === 'string' ? human(metadata.dataset) : 'Dataset unavailable';
  const operator = typeof metadata.imported_by === 'string' ? metadata.imported_by : job.source ?? '—';
  const jobRef = `IMP-${hashId(job.id).slice(1)}`;
  const state = statusPresentation(job.status, held);
  const mappingEntries = Object.entries(mapping);
  const errorGroups = [...new Map(errors.map((error) => [`${error.code}|${error.field}|${error.message}`, { ...error, count: 0, rows: [] as number[] }])).values()];
  for (const group of errorGroups) {
    const matching = errors.filter((error) => error.code === group.code && error.field === group.field && error.message === group.message);
    group.count = matching.length;
    group.rows = matching.map((error) => error.row);
  }
  const totalKnown = total != null;
  const postedValue = posted == null ? '—' : formatNumber(posted);
  const valuePosted = typeof metadata.value_posted === 'number' ? metadata.value_posted : null;
  const valueHeld = typeof metadata.value_held === 'number' ? metadata.value_held : null;
  const currency = typeof metadata.currency === 'string' ? metadata.currency : null;
  const formatMoney = (value: number | null) => value == null || !currency ? '—' : formatCurrencyNullable(value, currency) ?? '—';

  return <>
    <SetBreadcrumbLabel label={jobRef} detail="immutable · this job cannot be re-run, only superseded" />
    <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: line }}>
      <span style={{ padding: '3px 7px', borderRadius: 5, background: state.bg, color: state.color, font: `500 10px/1.5 ${sans}` }}>{state.label}</span>
      <span style={{ paddingLeft: 0, color: '#1c1f23', font: `400 20px/1 ${mono}` }}>{totalKnown ? formatNumber(total) : '—'}</span><span style={{ color: '#64686d', font: `400 11px/1 ${sans}` }}>rows read</span>
      <span style={{ height: 26, width: 1, background: '#e4e3e0' }} /><span style={{ color: '#1a6b43', font: `400 20px/1 ${mono}` }}>{postedValue}</span><span style={{ color: '#64686d', font: `400 11px/1 ${sans}` }}>posted</span>
      <span style={{ height: 26, width: 1, background: '#e4e3e0' }} /><span style={{ color: held ? '#b0431a' : '#1c1f23', font: `400 20px/1 ${mono}` }}>{formatNumber(held)}</span><span style={{ color: '#64686d', font: `400 11px/1 ${sans}` }}>held</span>
      <span style={{ flex: 1 }} /><a href={`/api/imports/${job.id}/errors`} style={{ padding: '7px 11px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', textDecoration: 'none', font: `400 12px/1 ${sans}` }}>Download error report</a><Link href={`/sources/imports/${job.id}?step=mapping`} style={{ padding: '7px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', textDecoration: 'none', font: `500 12px/1 ${sans}` }}>Fix the mapping and re-import</Link>
    </div>

    <div data-screen-label="Import job detail" data-surface-id="import-job-route" data-archetype="P7-P8-import-job" data-operations-surface="import-job-detail" data-state-id={`import-job-${job.status}`} style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={{ flex: 'none', borderRadius: 12, padding: '13px 16px', background: '#f4f3f1', display: 'grid', gridTemplateColumns: '1.25fr 1.25fr 1.25fr 1.25fr 1.2fr', gap: 14 }}>{[
          ['FILE', fileName], ['DATASET', dataset], ['STARTED', job.started_at ? formatDateTime(job.started_at) : formatDateTime(job.created_at)], ['DURATION', duration(job.started_at ?? job.created_at, job.completed_at)], ['RUN BY', operator],
        ].map(([label, value]) => <div key={label} style={{ minWidth: 0 }}><span style={{ display: 'block', color: '#64686d', letterSpacing: '.08em', font: `500 9.5px/1 ${sans}` }}>{label}</span><strong title={value} style={{ display: 'block', marginTop: 7, overflow: 'hidden', textOverflow: 'ellipsis', color: '#1c1f23', font: `400 12.5px/1.3 ${sans}` }}>{value}</strong></div>)}</section>

        <section style={{ flex: '0 0 auto', borderRadius: 10, background: '#fff', boxShadow: shadow, overflow: 'hidden' }}><header style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '12px 16px 9px' }}><strong style={{ flex: 1, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>MAPPING SNAPSHOT</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>as it was at commit · later changes do not alter this job</span></header><div role="table" aria-label="Mapping snapshot"><div role="row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 1.25fr 82px', gap: 10, padding: '0 16px 7px', color: '#64686d', letterSpacing: '.05em', font: `400 9.5px/1 ${mono}` }}><span>FILE COLUMN</span><span>LEDGER FIELD</span><span>FIRST ROW</span><span>STATE</span></div>{mappingEntries.length ? mappingEntries.map(([source, target]) => <div role="row" key={source} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 1.25fr 82px', gap: 10, alignItems: 'center', padding: '10px 16px', borderTop: line }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: `400 11px/1 ${mono}` }}>{source}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: String(target) ? '#40454a' : '#b0431a', font: `400 11.5px/1.3 ${sans}` }}>{String(target || '—')}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 10.5px/1 ${mono}` }}>— not retained</span><span style={{ justifySelf: 'end', padding: '2px 7px', borderRadius: 5, background: String(target) ? '#eef6f1' : '#fdf0e6', color: String(target) ? '#1a6b43' : '#b0431a', font: `500 10px/1.5 ${sans}` }}>{String(target) ? 'MAPPED' : 'UNMAPPED'}</span></div>) : <div data-state-id="import-job-mapping-unavailable" style={{ padding: '18px 16px', borderTop: line, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>This job did not retain its source-to-ledger mapping snapshot.</div>}</div></section>

        <section style={{ flex: 1, minHeight: 0, borderRadius: 10, background: '#fff', boxShadow: shadow, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><header style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '12px 16px 9px' }}><strong style={{ flex: 1, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>WHY {formatNumber(held)} ROWS WERE HELD</strong><span style={{ color: '#b0431a', font: `400 10px/1 ${mono}` }}>{valueHeld == null ? 'held value unavailable' : `${formatMoney(valueHeld)} not counted anywhere in the product`}</span></header><div style={{ minHeight: 0, overflowY: 'auto' }}>{errorGroups.length ? errorGroups.map((group) => <div key={`${group.code}-${group.field}`} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 44px', gap: 12, padding: '12px 16px', borderTop: line }}><span style={{ color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>rows {group.rows.slice(0, 5).join(', ')}{group.rows.length > 5 ? ' …' : ''}</span><div><strong style={{ display: 'block', color: '#1c1f23', font: `500 12px/1.3 ${sans}` }}>{human(group.field)} · {human(group.code)}</strong><span style={{ display: 'block', marginTop: 5, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{group.message}{group.value ? ` Value seen: ${group.value}.` : ''}</span></div><span style={{ textAlign: 'right', color: '#b0431a', font: `400 12px/1 ${mono}` }}>{formatNumber(group.count)}</span></div>) : <div data-state-id="import-job-no-row-errors" style={{ padding: 18, borderTop: line, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{held === 0 ? 'No rows were held in the retained job outcome.' : 'Row-level hold reasons were not retained. Their absence is not presented as a clean validation.'}</div>}</div><span style={{ flex: 1 }} /><footer style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: line }}><span style={{ flex: 1, color: '#64686d', font: `400 11px/1.45 ${sans}` }}>Held rows are not partially posted or silently dropped. Correcting them creates a new immutable import job.</span><Link href={`/sources/imports/${job.id}?step=mapping`} style={{ color: '#9b470d', textDecoration: 'none', font: `400 11.5px/1 ${sans}` }}>Map the held columns</Link></footer></section>
      </div>

      <aside style={{ width: 326, flex: 'none', borderRadius: 13, padding: '12px 13px', background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 10 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>OUTCOME</strong><section style={{ borderRadius: 10, padding: '6px 13px 10px', background: '#fff', boxShadow: shadow }}><dl style={{ margin: 0 }}><Fact label="Rows read" value={totalKnown ? formatNumber(total) : '—'} /><Fact label="Imported source records" value={postedValue} tone="#1a6b43" /><Fact label="Held on validation" value={formatNumber(held)} tone={held ? '#b0431a' : undefined} /><Fact label="Duplicates skipped" value={duplicates == null ? '—' : formatNumber(duplicates)} /><Fact label="Value posted" value={formatMoney(valuePosted)} /><Fact label="Value held" value={formatMoney(valueHeld)} tone={valueHeld ? '#b0431a' : undefined} /></dl></section><strong style={{ marginTop: 2, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>WHERE THESE ROWS WENT</strong><section style={{ borderRadius: 10, padding: '5px 13px', background: '#fff', boxShadow: shadow }}>{[
        ['LOSS LEDGER', typeof metadata.loss_entries === 'number' ? `${formatNumber(metadata.loss_entries)} entries` : '— unavailable'],
        ['CASES OPENED', typeof metadata.cases_opened === 'number' ? `${formatNumber(metadata.cases_opened)} by rule` : '— unavailable'],
        ['RECONCILIATION', typeof metadata.reconciliation_exceptions === 'number' ? `${formatNumber(metadata.reconciliation_exceptions)} exceptions raised` : '— unavailable'],
        ['AUDIT', '1 import entry'],
      ].map(([label, value], index) => <div key={label} style={{ padding: '10px 0', borderTop: index ? line : undefined }}><span style={{ display: 'block', color: '#64686d', letterSpacing: '.05em', font: `400 9.5px/1 ${mono}` }}>{label}</span><strong style={{ display: 'block', marginTop: 5, font: `500 11.5px/1.3 ${sans}` }}>{value}</strong></div>)}</section><strong style={{ marginTop: 2, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>JOB RECORD</strong><section style={{ borderRadius: 10, padding: '6px 13px', background: '#fff', boxShadow: shadow }}><Fact label="Reference" value={jobRef} /><Fact label="Attempt" value={`${job.attempts} of ${job.max_attempts}`} /><Fact label="File size" value={fileSize(metadata.file_size)} /><Fact label="SHA-256" value={job.file_hash ? `${job.file_hash.slice(0, 4)}…${job.file_hash.slice(-4)}` : '—'} /></section><span style={{ flex: 1 }} /><span style={{ borderTop: '1px solid #e4e3e0', paddingTop: 10, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>An import job is a permanent record. Re-importing the same file creates a new job and leaves this one exactly as it is.</span></aside>
    </div>

    {mappingOpen ? <OverlayPortal><div data-overlay-id="mapping-repair" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeMapping(); }} style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'auto', display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(28,27,25,.3)' }}><section ref={overlay.containerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Mapping repair" style={{ maxHeight: '100%', width: 880, maxWidth: '100%', borderRadius: 12, background: '#fff', boxShadow: '0 18px 54px rgba(28,22,14,.25)', overflowY: 'auto' }}><header style={{ padding: '16px 18px', borderBottom: line }}><h2 style={{ margin: 0, font: `500 15px/1.3 ${sans}` }}>Map columns · {fileName}</h2><p style={{ margin: '5px 0 0', color: '#64686d', font: `400 11.5px/1.45 ${sans}` }}>{jobRef} is immutable. Use your retained original file to correct and re-upload into a new job; this record will not be changed.</p></header><div style={{ padding: 18, background: '#f4f3f1' }}><div style={{ borderRadius: 10, background: '#fff', overflow: 'hidden' }}>{mappingEntries.map(([source, target], index) => <div key={source} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr 84px', gap: 10, alignItems: 'center', padding: '10px 12px', borderTop: index ? line : undefined }}><span style={{ font: `400 11px/1 ${mono}` }}>{source}</span><span style={{ color: '#a7abad' }}>→</span><span style={{ color: '#40454a', font: `400 11.5px/1.3 ${sans}` }}>{String(target || 'Choose a field')}</span><span style={{ color: target ? '#1a6b43' : '#7a5310', font: `500 10px/1.5 ${sans}` }}>{target ? 'RETAINED' : 'REQUIRED'}</span></div>)}</div></div><footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: line }}><button type="button" onClick={closeMapping}>Close</button><Link href={`/api/imports/${job.id}/errors`} style={{ padding: '7px 11px', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', textDecoration: 'none', font: `400 12px/1 ${sans}` }}>Download error report</Link><Link href="/sources/imports?step=upload" style={{ padding: '7px 11px', borderRadius: 8, background: '#1c1f23', color: '#fff', textDecoration: 'none', font: `500 12px/1 ${sans}` }}>Upload corrected file</Link></footer></section></div></OverlayPortal> : null}
  </>;
}
