import Link from 'next/link';
import type { CanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RECOVERY_OWNER_LABELS } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import type { RecoveryPageResult } from '@/lib/recoveries/store';
import { formatMoneyOrDash } from '@/lib/utils/format';
import { hashId, shortRef } from '@/lib/ui/displayRef';

type BoardColumn = {
  id: 'ready' | 'sent' | 'approved' | 'received' | 'reconciled' | 'closed';
  label: string;
  statuses: Set<string>;
  color: string;
};

const COLUMNS: BoardColumn[] = [
  { id: 'ready', label: 'READY', statuses: new Set(['draft', 'evidence_needed', 'ready_to_submit']), color: '#ff7a30' },
  { id: 'sent', label: 'SENT', statuses: new Set(['submitted', 'waiting_response', 'chase_due']), color: '#e4dfd8' },
  { id: 'approved', label: 'RESPONDED', statuses: new Set(['approved', 'partially_approved', 'rejected', 'appealed']), color: '#e0c08a' },
  { id: 'received', label: 'RECEIVED', statuses: new Set(['paid']), color: '#7fb598' },
  { id: 'reconciled', label: 'RECONCILED', statuses: new Set(), color: '#7fb598' },
  { id: 'closed', label: 'CLOSED', statuses: new Set(['closed_unrecoverable']), color: '#d8d4cf' },
];

const metricCard = {
  minWidth: 0,
  background: '#fff',
  padding: '11px 15px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
} as const;

function formatMoney(minor: number | null, currency: string | null) {
  return minor == null || !currency ? '— Unavailable' : formatMoneyOrDash(minor, currency);
}

function daysSince(value: string) {
  const days = Math.floor((Date.now() - Date.parse(value)) / 86_400_000);
  return Number.isFinite(days) ? Math.max(0, days) : null;
}

function windowProgress(recovery: RecoveryCase) {
  if (!recovery.deadline_at) return { width: 0, label: 'deadline unavailable' };
  const start = Date.parse(recovery.created_at);
  const end = Date.parse(recovery.deadline_at);
  const total = Math.max(1, Math.ceil((end - start) / 86_400_000));
  const elapsed = Math.max(0, Math.ceil((Date.now() - start) / 86_400_000));
  if (!Number.isFinite(total) || !Number.isFinite(elapsed)) return { width: 0, label: 'deadline unavailable' };
  return { width: Math.min(100, Math.round((elapsed / total) * 100)), label: `day ${Math.min(elapsed, total)} of ${total}` };
}

function columnFor(recovery: RecoveryCase) {
  if (recovery.status === 'closed_unrecoverable') return 'closed';
  if (recovery.claim_readiness === 'reconciled') return 'reconciled';
  if (recovery.amount_recovered_minor > 0) return 'received';
  return COLUMNS.find((column) => column.statuses.has(recovery.status))?.id ?? 'ready';
}

function badgeFor(recovery: RecoveryCase) {
  if (columnFor(recovery) === 'ready') {
    return recovery.evidence_complete && recovery.evidence_missing.length === 0
      ? { label: recovery.claim_readiness === 'ready_to_submit' ? 'READY TO PREPARE' : 'REVIEW CLAIM GATES', background: '#eef6f1', color: '#1a6b43' }
      : { label: recovery.evidence_missing.length ? `${recovery.evidence_missing.length} EVIDENCE ${recovery.evidence_missing.length === 1 ? 'GAP' : 'GAPS'}` : 'EVIDENCE UNVERIFIED', background: '#fff3e9', color: '#7a5310' };
  }
  if (recovery.status === 'chase_due') return { label: 'CHASE DUE', background: '#fdf0e6', color: '#b0431a' };
  if (columnFor(recovery) === 'sent') {
    const age = daysSince(recovery.updated_at);
    return { label: age == null ? 'SENT' : `SENT ${age}D AGO`, background: '#f4f3f1', color: '#40454a' };
  }
  if (recovery.status === 'approved' || recovery.status === 'partially_approved') {
    return { label: recovery.amount_recovered_minor > 0 ? 'PARTLY RECEIVED' : 'APPROVED · NOT RECEIVED', background: '#fff3e9', color: '#7a5310' };
  }
  if (recovery.status === 'rejected' || recovery.status === 'appealed') return { label: recovery.status.replaceAll('_', ' ').toUpperCase(), background: '#fdf0e6', color: '#b0431a' };
  if (recovery.status === 'paid') {
    const reconciled = recovery.claim_readiness === 'reconciled';
    return { label: reconciled ? 'RECONCILED' : 'RECEIVED · UNRECONCILED', background: reconciled ? '#eef6f1' : '#fff3e9', color: reconciled ? '#1a6b43' : '#7a5310' };
  }
  return { label: recovery.amount_written_off_minor > 0 ? 'WRITTEN OFF' : 'CLOSED', background: '#f4f3f1', color: '#64686d' };
}

function RecoveryMetric({ label, value, currency, color, detail }: { label: string; value: number | null; currency: string | null; color: string; detail: string }) {
  return (
    <div style={metricCard}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}><span style={{ flex: 1, minWidth: 0, font: "400 10.5px/1.3 'Inter',sans-serif", color: '#64686d' }}>{label}</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>This page</span></div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ flex: 1, overflowWrap: 'anywhere', font: "400 20px/1 'IBM Plex Mono',monospace", color: value == null ? '#64686d' : color, letterSpacing: '-.012em' }}>{formatMoney(value, currency)}</span>
        <svg width="50" height="16" viewBox="0 0 50 16" style={{ display: 'block', overflow: 'visible', flex: 'none', marginBottom: 2 }} aria-label="Trend unavailable"><line x1="0" y1="8" x2="50" y2="8" stroke="#d8d4cf" strokeWidth="1.2" strokeDasharray="2 3"/></svg>
      </div>
      <span style={{ overflowWrap: 'anywhere', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{detail}</span>
    </div>
  );
}

function RecoveryCard({ recovery }: { recovery: RecoveryCase }) {
  const column = columnFor(recovery);
  const badge = badgeFor(recovery);
  const progress = windowProgress(recovery);
  const partner = recovery.partner?.name ?? RECOVERY_OWNER_LABELS[recovery.owner_type];
  const type = RECOVERY_TYPE_LABELS[recovery.recovery_type] ?? recovery.recovery_type.replaceAll('_', ' ');
  const caseReference = shortRef(
    recovery.support_payout_case?.order_number ?? recovery.support_payout_case?.ticket_external_id,
    recovery.support_payout_case_id,
  );
  const href = `/financials/recovery/${recovery.id}`;
  const amount = column === 'approved' && recovery.amount_approved_minor > 0
    ? recovery.amount_approved_minor
    : (column === 'received' || column === 'reconciled')
      ? recovery.amount_recovered_minor
      : column === 'closed' && recovery.amount_written_off_minor > 0
        ? recovery.amount_written_off_minor
        : recovery.amount_sought_minor;
  return (
    <Link href={href} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 11px', borderRadius: 9, background: '#fff', color: 'inherit', textDecoration: 'none', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ flex: 1, overflowWrap: 'anywhere', font: "500 11.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{partner} · {type.toLowerCase()}</span>
        <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#1c1f23' }}>{formatMoney(amount, recovery.currency)}</span>
      </div>
      <div style={{ overflowWrap: 'anywhere', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>REC-{hashId(recovery.id).slice(1)} · {caseReference}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ flex: 1, height: 3, overflow: 'hidden', display: 'block', borderRadius: 2, background: '#f2f0ed' }}><span style={{ width: `${progress.width}%`, height: '100%', display: 'block', background: column === 'ready' ? '#c98a1a' : recovery.status === 'chase_due' ? '#b0431a' : '#64686d' }}/></span>
        <span style={{ whiteSpace: 'nowrap', font: "400 9.5px/1 'IBM Plex Mono',monospace", color: recovery.status === 'chase_due' ? '#b0431a' : '#64686d' }}>{progress.label}</span>
      </div>
      <div><span style={{ padding: '2px 7px', borderRadius: 5, background: badge.background, font: "500 10px/1.5 'Inter',sans-serif", color: badge.color }}>{badge.label}</span></div>
    </Link>
  );
}

export function RecoveryBoardOperations({
  result,
  search,
}: {
  result: RecoveryPageResult;
  search?: string | null;
  aggregate: CanonicalFinancialAggregate;
}) {
  const currencies = new Set(result.rows.map((row) => row.currency));
  const pageCurrency = currencies.size === 1 ? result.rows[0]?.currency ?? null : null;
  const pageTotal = (field: 'amount_sought_minor' | 'amount_approved_minor' | 'amount_recovered_minor', reconciledOnly = false) => {
    if (!pageCurrency || result.rows.some((row) => !Number.isSafeInteger(row[field]))) return null;
    return result.rows.reduce((sum, row) => sum + (reconciledOnly && row.claim_readiness !== 'reconciled' ? 0 : row[field]), 0);
  };
  const grouped = new Map(COLUMNS.map((column) => [column.id, result.rows.filter((row) => columnFor(row) === column.id)]));
  const pageHref = (page: number) => {
    const query = new URLSearchParams({ page: String(page) });
    if (result.stage !== 'all') query.set('stage', result.stage);
    if (result.currency) query.set('currency', result.currency);
    if (search) query.set('search', search);
    return `/financials/recovery?${query}`;
  };
  const stageFor = { ready: 'ready_to_file', sent: 'filed', approved: 'partner_responded', received: 'received', reconciled: 'reconciled', closed: 'closed' } as const;
  const stageHref = (column: BoardColumn) => {
    const query = new URLSearchParams({ stage: stageFor[column.id], page: '1' });
    if (result.currency) query.set('currency', result.currency);
    return `/financials/recovery?${query}`;
  };
  const columnTotal = (rows: RecoveryCase[]) => {
    if (!rows.length || new Set(rows.map((row) => row.currency)).size !== 1) return null;
    return { minor: rows.reduce((sum, row) => sum + row.amount_sought_minor, 0), currency: rows[0]?.currency ?? null };
  };

  return (
    <div data-operations-surface="recovery-board" data-paging-contract={result.source} style={{ height: '100%', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {result.limitation ? <div role="status" style={{ flex: 'none', padding: '9px 12px', borderRadius: 9, background: '#fff3e9', font: "400 11.5px/1.45 'Inter',sans-serif", color: '#7a5310' }}>{result.limitation} Missing totals remain unavailable, not zero.</div> : null}
      <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, overflow: 'hidden', borderRadius: 11, background: '#eae8e5', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
        <RecoveryMetric label="Sought" value={pageTotal('amount_sought_minor')} currency={pageCurrency} color="#1c1f23" detail={`${result.rows.length} shown routes · requested recovery value`} />
        <RecoveryMetric label="Approved" value={pageTotal('amount_approved_minor')} currency={pageCurrency} color="#7a5310" detail="a provider position, not money" />
        <RecoveryMetric label="Received" value={pageTotal('amount_recovered_minor')} currency={pageCurrency} color="#1a6b43" detail="credited to a payout or bank account" />
        <RecoveryMetric label="Reconciled" value={pageTotal('amount_recovered_minor', true)} currency={pageCurrency} color="#1a6b43" detail="matched to a canonical ledger entry" />
      </div>

      <p style={{ margin: 0, fontSize: 11, color: '#64686d' }}>Stage totals cover the workspace currency scope. {search ? 'Cards match your search; opening a stage clears search.' : 'Open a stage to see every matching route. Scroll horizontally for further stages.'}</p>
      {result.totalCount === 0 ? <p role="status">{result.stage === 'all' && !search && !result.currency ? 'No recovery routes in this workspace.' : 'No recovery routes match these filters.'}</p> : null}
      <div role="region" aria-label="Recovery stages" tabIndex={0} style={{ flex: 1, minHeight: 260, display: 'flex', gap: 10, overflowX: 'auto' }}>
        {COLUMNS.map((column) => {
          const rows = grouped.get(column.id) ?? [];
          const total = columnTotal(rows);
          const knownCount = result.stageCounts[stageFor[column.id]] ?? (result.source === 'canonical' ? 0 : null);
          const hiddenCount = knownCount == null ? 0 : Math.max(0, knownCount - rows.length);
          return (
            <section key={column.id} style={{ flex: '1 0 210px', minWidth: 210, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '0 2px' }}>
                <Link href={stageHref(column)} style={{ font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.07em', color: column.id === 'ready' ? '#1c1f23' : '#64686d' }}>{column.label} {knownCount ?? '—'}</Link>
                <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#40454a' }}>{total ? `This page sought: ${formatMoney(total.minor, total.currency)}` : 'This page: —'}</span>
              </div>
              <div style={{ height: 3, flex: 'none', borderRadius: 2, background: column.color }}/>
              <div role="region" aria-label={`${column.label} recovery cards`} tabIndex={0} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rows.map((row) => <RecoveryCard key={row.id} recovery={row}/>)}
                {!rows.length ? <div data-state-id="recovery-board-empty-state" style={{ minHeight: 86, padding: '12px 11px', borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.08)', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{knownCount === 0 ? 'No routes in this stage in the currency scope.' : 'No routes in this stage on this page. Open the stage to view its population.'}</div> : null}
                {hiddenCount > 0 ? <Link href={stageHref(column)} style={{ padding: 9, borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.08)', textAlign: 'center', font: "500 11px/1 'Inter',sans-serif", color: '#64686d' }}>+{hiddenCount} elsewhere · Open stage</Link> : null}
              </div>
            </section>
          );
        })}
      </div>
      {result.totalPages > 1 ? <nav aria-label="Recovery pages" style={{ flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>
        {result.page > 1 ? <Link href={pageHref(result.page - 1)}>Previous</Link> : null}
        <span>Page {result.page} of {result.totalPages}</span>
        {result.page < result.totalPages ? <Link href={pageHref(result.page + 1)}>Next</Link> : null}
      </nav> : null}
    </div>
  );
}
