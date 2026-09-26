import Link from 'next/link';
import type { ExceptionListRow, ReconciliationPageResult } from '@/lib/exceptions/store';
import type { CanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';
import type { FinancialPeriodPreview } from '@/lib/reconciliation/periodReadModel';
import { formatDateMode, formatMoney, formatMonthYearInTimeZone, formatNumber } from '@/lib/utils/format';
import { providerLabel } from '@/lib/ui/merchantCopy';
import { PeriodCloseOverlay } from './PeriodCloseOverlay';

type Props = {
  pageResult: ReconciliationPageResult;
  aggregate: CanonicalFinancialAggregate;
  periodPreview: FinancialPeriodPreview;
  sourceConnected: boolean;
  canClose: boolean;
  query: {
    status: string;
    source: string | null;
    currency: string | null;
    search: string | null;
    period: string | null;
    action: 'close' | null;
  };
};

function nestedValue(context: Record<string, unknown> | null, side: 'source' | 'ledger', key: string): unknown {
  if (!context) return null;
  const camel = key.replace(/(^|_)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
  for (const direct of [`${side}_${key}`, `${side}Record${camel}`]) {
    if (context[direct] != null) return context[direct];
  }
  for (const nestedKey of [side, `${side}_record`]) {
    const nested = context[nestedKey];
    if (nested && typeof nested === 'object' && (nested as Record<string, unknown>)[key] != null) {
      return (nested as Record<string, unknown>)[key];
    }
  }
  return null;
}

function amount(row: ExceptionListRow, side: 'source' | 'ledger') {
  const value = nestedValue(row.context, side, 'amount_minor');
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function currency(row: ExceptionListRow, side: 'source' | 'ledger') {
  const value = nestedValue(row.context, side, 'currency');
  if (typeof value === 'string' && /^[A-Za-z]{3}$/.test(value)) return value.toUpperCase();
  const fallback = row.context?.currency;
  return typeof fallback === 'string' && /^[A-Za-z]{3}$/.test(fallback) ? fallback.toUpperCase() : null;
}

function textValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function money(value: number | null, code: string | null) {
  return value == null || !code ? '—' : formatMoney(value, code);
}

function signedMoney(value: number | null, code: string | null) {
  return value == null || !code ? '—' : `${value === 0 ? '' : '−'}${formatMoney(Math.abs(value), code)}`;
}

function periodLabel(period: string) {
  const [year, month] = period.split('-').map(Number);
  return formatMonthYearInTimeZone(new Date(Date.UTC(year, month - 1, 1)), 'Europe/London');
}

function shiftPeriod(period: string, delta: number) {
  const [year, month] = period.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

function reconciliationHref(
  query: Props['query'],
  updates: {
    page?: number;
    selected?: string | null;
    currency?: string | null;
    period?: string | null;
    action?: 'close' | null;
    status?: string | null;
    source?: string | null;
  } = {},
) {
  const params = new URLSearchParams();
  const status = updates.status === undefined ? query.status : updates.status;
  const source = updates.source === undefined ? query.source : updates.source;
  if (status && status !== 'open') params.set('status', status);
  if (source) params.set('source', source);
  if (query.search) params.set('search', query.search);
  const selectedCurrency = updates.currency === undefined ? query.currency : updates.currency;
  if (selectedCurrency) params.set('currency', selectedCurrency);
  if (updates.page && updates.page > 1) params.set('page', String(updates.page));
  if (updates.selected) params.set('selected', updates.selected);
  const selectedPeriod = updates.period === undefined ? query.period : updates.period;
  if (selectedPeriod) params.set('period', selectedPeriod);
  const selectedAction = updates.action === undefined ? query.action : updates.action;
  if (selectedAction) params.set('action', selectedAction);
  const suffix = params.toString();
  return suffix ? `/financials/reconciliation?${suffix}` : '/financials/reconciliation';
}

function SideCard({ row, side, code, selectedHref }: { row: ExceptionListRow; side: 'source' | 'ledger'; code: string | null; selectedHref: string }) {
  const sideAmount = amount(row, side);
  const reference = textValue(
    nestedValue(row.context, side, 'record_id') ?? nestedValue(row.context, side, 'reference'),
    side === 'source' ? row.title : 'No ledger record',
  );
  const recordType = textValue(nestedValue(row.context, side, 'record_type'), side === 'source'
    ? (row.source_system ? providerLabel(row.source_system) : 'source unavailable')
    : 'ledger');
  const effectiveAt = textValue(nestedValue(row.context, side, 'effective_at'), row.created_at);
  if (side === 'ledger' && sideAmount == null && nestedValue(row.context, side, 'record_id') == null) {
    return (
      <Link href={selectedHref} style={{ minHeight: 58, borderRadius: 10, boxShadow: 'inset 0 0 0 1.3px rgba(176,67,26,.3)', background: '#fdf7f4', padding: '11px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
        <span style={{ font: "400 11px/1.4 'IBM Plex Mono',monospace", color: '#b0431a' }}>no ledger record · review required</span>
      </Link>
    );
  }
  const exact = amount(row, 'source') != null && amount(row, 'source') === amount(row, 'ledger');
  return (
    <Link href={selectedHref} style={{ minHeight: 58, background: '#fff', borderRadius: 10, boxShadow: `0 1px 2px rgba(28,27,25,.06),0 0 0 1px ${exact ? 'rgba(28,27,25,.05)' : 'rgba(176,67,26,.28)'}`, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "500 12.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{reference}</span>
        <span style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{recordType} · {formatDateMode(effectiveAt, 'recent')}</span>
      </span>
      <span style={{ flex: 'none', textAlign: 'right' }}>
        <span style={{ display: 'block', font: "400 13px/1.2 'IBM Plex Mono',monospace", color: sideAmount == null || !exact ? '#b0431a' : '#1c1f23' }}>{money(sideAmount, currency(row, side) ?? code)}</span>
        {side === 'ledger' ? <span style={{ display: 'block', maxWidth: 190, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 10px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{exact ? 'exact' : row.detail ?? 'needs a decision'}</span> : null}
      </span>
    </Link>
  );
}

function PairRow({ row, code, href }: { row: ExceptionListRow; code: string | null; href: string }) {
  const sourceAmount = amount(row, 'source');
  const ledgerAmount = amount(row, 'ledger');
  const exact = sourceAmount != null && ledgerAmount != null && sourceAmount === ledgerAmount;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 1fr', gap: 0, alignItems: 'center' }}>
      <div style={{ minWidth: 0, paddingRight: 6 }}><SideCard row={row} side="source" code={code} selectedHref={href}/></div>
      <div role="img" aria-label={exact ? 'Exact match' : 'Difference requires review'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ height: 1, flex: 1, background: exact ? '#d9e6dd' : 'rgba(176,67,26,.35)' }}/>
        <span style={{ width: 16, height: 16, flex: 'none', borderRadius: '50%', background: '#fff', boxShadow: `inset 0 0 0 1.2px ${exact ? '#bcd8c6' : 'rgba(176,67,26,.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {exact ? <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#1a6b43" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 3.2"/></svg> : <span style={{ width: 6, height: 1.4, borderRadius: 1, background: '#b0431a' }}/>}
        </span>
        <span style={{ height: 1, flex: 1, background: exact ? '#d9e6dd' : 'rgba(176,67,26,.35)' }}/>
      </div>
      <div style={{ minWidth: 0, paddingLeft: 6 }}><SideCard row={row} side="ledger" code={code} selectedHref={href}/></div>
    </div>
  );
}

export function ReconciliationOperations({ pageResult, aggregate, periodPreview, sourceConnected, canClose, query }: Props) {
  const exceptions = pageResult.rows;
  const period = query.period ?? new Date().toISOString().slice(0, 7);
  const label = periodLabel(period);
  const month = label.split(' ')[0] ?? label;
  const code = query.currency ?? (aggregate.currencies.length === 1 ? aggregate.currencies[0]?.currency ?? null : null);
  const canonicalRow = code ? aggregate.currencies.find((row) => row.currency === code) ?? null : null;
  const confirmedLossKnown = canonicalRow?.knownStates.includes('confirmed_loss') === true;
  const recoveredKnown = canonicalRow?.knownStates.includes('recovered') === true;
  const recordedLossMinor = aggregate.source === 'canonical' && canonicalRow && confirmedLossKnown ? canonicalRow.confirmedLossMinor : null;
  const recoveredMinor = aggregate.source === 'canonical' && canonicalRow && recoveredKnown ? canonicalRow.recoveredMinor : null;
  // The server applies the requested currency scope. An aggregate's currency
  // must not silently hide returned exceptions whose currency is unknown.
  const scopedExceptions = exceptions;
  const exceptionRowsComplete = pageResult.contract === 'canonical' && pageResult.page === 1 && pageResult.totalCount === exceptions.length;
  const allExceptionAmountsKnown = scopedExceptions.every((row) => amount(row, 'source') != null && amount(row, 'ledger') != null);
  const unmatchedTotal = exceptionRowsComplete && allExceptionAmountsKnown
    ? scopedExceptions.reduce((sum, row) => sum + Math.abs((amount(row, 'source') ?? 0) - (amount(row, 'ledger') ?? 0)), 0)
    : null;
  const exactRows = scopedExceptions.filter((row) => amount(row, 'source') != null && amount(row, 'source') === amount(row, 'ledger')).length;
  const settlement = code ? periodPreview.settlements.find((row) => row.currency === code) ?? null : null;
  const settlementCount = periodPreview.settlementState === 'available' || periodPreview.settlementState === 'verified_empty'
    ? settlement?.recordCount ?? 0
    : null;
  const closeHref = reconciliationHref(query, { period, action: 'close', page: 1 });
  const blockers = periodPreview.blockers.map((row) => ({
    id: row.id,
    title: row.title,
    detail: `${row.owner} · opened ${formatDateMode(row.createdAt, 'recent')}. Closing does not resolve it.`,
    amountMinor: null,
  }));

  return (
    <div data-operations-surface="reconciliation" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', color: '#1c1f23', background: '#fff' }}>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 4, borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)' }}>
          <Link aria-label="Previous period" href={reconciliationHref(query, { period: shiftPeriod(period, -1), page: 1, action: null })} style={{ display: 'flex', padding: '0 4px' }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M7.4 2.6 4 6l3.4 3.4"/></svg></Link>
          <span style={{ padding: '0 6px', font: "500 12.5px/1 'Inter',sans-serif", color: '#1c1f23' }}>{label}</span>
          <Link aria-label="Next period" href={reconciliationHref(query, { period: shiftPeriod(period, 1), page: 1, action: null })} style={{ display: 'flex', padding: '0 4px' }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M4.6 2.6 8 6l-3.4 3.4"/></svg></Link>
        </div>
        <Link href={reconciliationHref(query, { source: query.source ? null : query.source, page: 1 })} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', textDecoration: 'none' }}><span style={{ font: "400 12.5px/1 'Inter',sans-serif", color: '#1c1f23' }}>Provider: {query.source ? providerLabel(query.source) : 'all'}</span><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4"/></svg></Link>
        <Link href={reconciliationHref(query, { status: query.status === 'open' ? 'all' : 'open', page: 1 })} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', textDecoration: 'none' }}><span style={{ font: "400 12.5px/1 'Inter',sans-serif", color: '#1c1f23' }}>{query.status === 'open' ? 'Unmatched only' : 'All decisions'}</span><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4"/></svg></Link>
        <span style={{ flex: 1 }}/>
        <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{exactRows ? `${formatNumber(exactRows)} exact in this view · ` : ''}{formatNumber(pageResult.totalCount)} {pageResult.status === 'open' ? 'left for you' : pageResult.status} · {money(unmatchedTotal, code)} unexplained</span>
        <button type="button" disabled title="No standalone adjustment mutation is available" style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#64686d', cursor: 'not-allowed' }}>Post adjustment</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <section aria-label="Operational reconciliation exceptions" style={{ flex: 1, minHeight: 0, padding: '12px 13px', borderRadius: 13, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 1fr', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingRight: 6 }}><span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>SOURCE RECORD</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>operational evidence</span></div>
            <span/>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingLeft: 6 }}><span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>LEDGER RECORD</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>not a bank receipt</span></div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scopedExceptions.length ? scopedExceptions.map((row) => <PairRow key={row.id} row={row} code={code} href={reconciliationHref(query, { page: pageResult.page, selected: row.id })}/>) : (
              <div data-state-id="reconciliation-loading-empty-states" style={{ flex: 1, minHeight: 180, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div><strong style={{ display: 'block', font: "500 12.5px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>No {pageResult.status} differences in this scope</strong><span style={{ display: 'block', marginTop: 4, font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>The query returned a verified empty exception set. Matched settlement context is unavailable.</span></div>
              </div>
            )}
          </div>
          <div style={{ paddingTop: 9, borderTop: '1px solid #e4e3e0', font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>{`${pageResult.from ?? 'all history'} inclusive → ${pageResult.to ?? 'now'} exclusive · Europe/London · ${formatNumber(periodPreview.earlierOutstandingCount ?? 0)} earlier open exceptions shown separately`}{pageResult.limitation ? ` · ${pageResult.limitation}` : ''}</div>
        </section>

        <section aria-label="Period reconciliation summary" style={{ flex: 'none', padding: '13px 16px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', alignItems: 'stretch', gap: 'clamp(8px, 1.5vw, 22px)' }}>
          {[
            ['RECEIVED', settlement?.receivedMinor ?? null, '#1c1f23'],
            ['MATCHED', settlement?.matchedMinor ?? null, '#1a6b43'],
            ['RECONCILED', settlement?.reconciledMinor ?? null, '#1a6b43'],
            ['OPERATIONAL VARIANCE', unmatchedTotal, '#b0431a'],
          ].map(([title, value, color], index) => (
            <div key={String(title)} style={{ display: 'contents' }}>
              {index ? <span style={{ width: 1, flex: 'none', background: '#eae8e5' }}/> : null}
              <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em', color: '#64686d' }}>{title}</span><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: String(color) }}>{title === 'OPERATIONAL VARIANCE' ? signedMoney(value as number | null, code) : money(value as number | null, code)}</span></div>
            </div>
          ))}
          <span style={{ width: 1, flex: 'none', background: '#eae8e5' }}/>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em', color: '#64686d' }}>EVERY PENNY OF THAT VARIANCE, NAMED</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{blockers.slice(0, 4).map((blocker) => <div key={blocker.id} style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}><span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', font: "400 11px/1.45 'Inter',sans-serif", color: '#40454a' }}>{blocker.title}</span><span style={{ font: "400 10px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>{blocker.id.slice(0, 8).toUpperCase()}</span><span style={{ width: 64, textAlign: 'right', font: "400 11px/1.45 'IBM Plex Mono',monospace", color: '#b0431a' }}>{signedMoney(blocker.amountMinor, code)}</span></div>)}{blockers.length === 0 ? <span style={{ font: "400 11px/1.45 'Inter',sans-serif", color: '#1a6b43' }}>No open differences in this scoped query.</span> : null}</div>
          </div>
          <span style={{ width: 1, flex: 'none', background: '#eae8e5' }}/>
          <div style={{ width: 190, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em', color: '#64686d' }}>UNEXPLAINED · SIX MONTHS</span><svg width="148" height="30" viewBox="0 0 148 30" fill="none" aria-label="Six-month history unavailable"><rect x="0" y="27" width="148" height="3" rx="1.5" fill="#e4e3e0"/></svg><span style={{ font: "400 9.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>historical snapshots unavailable</span></div>
          <div style={{ width: 250, flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'space-between' }}><div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{recordedLossMinor == null ? 'Recorded loss is unavailable for this currency scope.' : `${money(recordedLossMinor, code)} is recorded loss; ${money(recoveredMinor, code)} is received and matched credit, not period close.`} {periodPreview.settlementState === 'unavailable' || periodPreview.settlementState === 'partial' ? 'Settlement snapshot is not complete.' : !sourceConnected ? 'Source connection coverage is unavailable.' : ''}</div><Link href={closeHref} style={{ alignSelf: 'flex-start', padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Review and close {month}</Link></div>
        </section>
      </div>

      <Link href="/help/credit-reconciliation" style={{ color: "#9b470d", fontSize: 12, padding: 12 }}>How to match received credit and reconcile it</Link>
      {pageResult.totalPages > 1 ? <nav aria-label="Reconciliation pages" style={{ flex: 'none', display: 'flex', justifyContent: 'center', gap: 12, padding: '8px 12px', fontSize: 12 }}>
        {pageResult.page > 1 ? <Link href={reconciliationHref(query, { page: pageResult.page - 1 })}>Previous</Link> : null}
        <span>Page {pageResult.page} of {pageResult.totalPages}</span>
        {pageResult.page < pageResult.totalPages ? <Link href={reconciliationHref(query, { page: pageResult.page + 1 })}>Next</Link> : null}
      </nav> : null}
      {query.action === 'close' ? <PeriodCloseOverlay period={period} label={label} currency={code} settlementCount={settlementCount} recordedLossMinor={recordedLossMinor} recoveredMinor={recoveredMinor} varianceMinor={unmatchedTotal} blockers={blockers} canClose={canClose} window={{ from: periodPreview.from, to: periodPreview.to, timezone: periodPreview.timezone }} closeBlockedReasons={periodPreview.closeBlockedReasons}/> : null}
    </div>
  );
}
