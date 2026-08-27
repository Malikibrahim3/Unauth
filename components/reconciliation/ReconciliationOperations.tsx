import Link from 'next/link';
import type { ExceptionListRow, ReconciliationPageResult } from '@/lib/exceptions/store';
import type { CanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';
import type { PaymentAuthorityReadModel } from '@/lib/financial/paymentAuthority';
import { formatDateMode, formatMoney, formatNumber } from '@/lib/utils/format';
import { providerLabel } from '@/lib/ui/merchantCopy';

type Props = {
  pageResult: ReconciliationPageResult;
  aggregate: CanonicalFinancialAggregate;
  paymentAuthority: PaymentAuthorityReadModel;
  sourceConnected: boolean;
  query: { status: string; source: string | null; currency: string | null; search: string | null };
};

function nestedValue(context: Record<string, unknown> | null, side: 'source' | 'ledger', key: string): unknown {
  if (!context) return null;
  const camel = key.replace(/(^|_)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
  for (const direct of [`${side}_${key}`, `${side}Record${camel}`]) {
    if (context[direct] != null) return context[direct];
  }
  for (const nestedKey of [side, `${side}_record`]) {
    const nested = context[nestedKey];
    if (nested && typeof nested === 'object' && (nested as Record<string, unknown>)[key] != null) return (nested as Record<string, unknown>)[key];
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

function money(value: number | null, code: string | null) {
  return value == null || !code ? '—' : formatMoney(value, code);
}

function reconciliationHref(
  query: Props['query'],
  updates: { page?: number; selected?: string | null; currency?: string | null } = {},
) {
  const params = new URLSearchParams();
  if (query.status !== 'open') params.set('status', query.status);
  if (query.source) params.set('source', query.source);
  if (query.search) params.set('search', query.search);
  const selectedCurrency = updates.currency === undefined ? query.currency : updates.currency;
  if (selectedCurrency) params.set('currency', selectedCurrency);
  if (updates.page && updates.page > 1) params.set('page', String(updates.page));
  if (updates.selected) params.set('selected', updates.selected);
  const suffix = params.toString();
  return suffix ? `/financials/reconciliation?${suffix}` : '/financials/reconciliation';
}

export function ReconciliationOperations({ pageResult, aggregate, paymentAuthority, sourceConnected, query }: Props) {
  const exceptions = pageResult.rows;
  const code = query.currency ?? (aggregate.currencies.length === 1 ? aggregate.currencies[0]?.currency ?? null : null);
  const canonicalRow = code ? aggregate.currencies.find((row) => row.currency === code) ?? null : null;
  const confirmedLossKnown = canonicalRow?.knownStates.includes('confirmed_loss') === true;
  const ledgerTotal = aggregate.source === 'canonical' && canonicalRow && confirmedLossKnown ? canonicalRow.confirmedLossMinor : null;
  const confirmedCount = aggregate.source === 'canonical' && canonicalRow && confirmedLossKnown
    ? canonicalRow.caseCountsByState.confirmed_loss ?? null
    : null;
  const openCount = pageResult.status === 'open' && pageResult.contract === 'canonical' ? pageResult.totalCount : null;
  const scopedExceptions = code
    ? exceptions.filter((row) => (currency(row, 'source') ?? currency(row, 'ledger')) === code)
    : exceptions;
  const exceptionRowsComplete = pageResult.contract === 'canonical'
    && pageResult.page === 1
    && pageResult.totalCount === exceptions.length;
  const allExceptionAmountsKnown = scopedExceptions.every((row) => amount(row, 'source') != null && amount(row, 'ledger') != null);
  const unmatchedTotal = exceptionRowsComplete && allExceptionAmountsKnown
    ? scopedExceptions.reduce((sum, row) => sum + Math.abs((amount(row, 'source') ?? 0) - (amount(row, 'ledger') ?? 0)), 0)
    : null;
  const sourceTotal = ledgerTotal != null && unmatchedTotal != null ? ledgerTotal + unmatchedTotal : null;
  const matchedByValue = sourceTotal != null && sourceTotal > 0 && ledgerTotal != null ? ledgerTotal / sourceTotal : null;
  const entriesInScope = confirmedCount != null && openCount != null ? confirmedCount + openCount : null;
  const matchedByCount = entriesInScope && confirmedCount != null ? confirmedCount / entriesInScope : null;
  const maxVariance = Math.max(...scopedExceptions.map((row) => Math.abs((amount(row, 'source') ?? 0) - (amount(row, 'ledger') ?? 0))), 1);
  const sources = new Map<string, ExceptionListRow[]>();
  for (const row of exceptions) {
    const name = row.source_system ? providerLabel(row.source_system) : 'Source unavailable';
    sources.set(name, [...(sources.get(name) ?? []), row]);
  }

  const kpis = [
    { label: 'Entries in scope', value: entriesInScope == null ? '—' : formatNumber(entriesInScope), sub: sourceConnected ? 'confirmed entries plus open source exceptions' : 'Source coverage unavailable', tone: 'default' },
    { label: 'Matched by count', value: matchedByCount == null ? '—' : `${(matchedByCount * 100).toFixed(1)}%`, sub: matchedByCount == null ? 'A complete source count is unavailable' : `${formatNumber(confirmedCount)} of ${formatNumber(entriesInScope)} entries`, tone: 'positive' },
    { label: 'Matched by value', value: matchedByValue == null ? '—' : `${(matchedByValue * 100).toFixed(1)}%`, sub: matchedByValue == null ? 'A complete same-currency bridge is unavailable' : `${money(ledgerTotal, code)} of ${money(sourceTotal, code)}`, tone: 'positive' },
    { label: 'Unmatched value', value: money(unmatchedTotal, code), sub: `${openCount == null ? '—' : formatNumber(openCount)} open exceptions${aggregate.currencies.length > 1 && !query.currency ? ' · select one currency to value' : ''}`, tone: 'warning' },
  ];

  return (
    <div className="uo-page-stack" data-operations-surface="reconciliation">
      <section className="uo-card" aria-label="Reconciliation scope and provider coverage">
        <header className="uo-card-header uo-card-header--split"><div><h2>Financial scope</h2><p>{aggregate.source === 'canonical' ? `${aggregate.definitionVersion} · ${aggregate.timeBasis.replaceAll('_', ' ')} · unknown values withheld` : 'Canonical financial totals unavailable'}</p></div><strong>{pageResult.totalCount ? `${formatNumber(pageResult.totalCount)} ${pageResult.status}` : `No ${pageResult.status} rows`}</strong></header>
        <div className="uo-filter-tabs" aria-label="Currency scope">
          <Link href={reconciliationHref(query, { currency: null, page: 1 })} data-active={!query.currency}>All currencies</Link>
          {aggregate.currencies.map((row) => <Link key={row.currency} href={reconciliationHref(query, { currency: row.currency, page: 1 })} data-active={query.currency === row.currency}>{row.currency}</Link>)}
        </div>
        <div className="uo-evidence-grid">
          {paymentAuthority.coverage.map((family) => <div key={family.family}><span>{family.family.replaceAll('_', ' ')}</span><strong data-tone={family.state === 'available' ? 'positive' : 'warning'}>{family.state === 'available' ? `${formatNumber(family.recordCount)} source facts` : family.state === 'partial' ? `${formatNumber(family.recordCount)}+ source facts · partial` : 'Unavailable'}</strong><small>{family.state === 'available' && family.latestObservedAt ? `Observed ${formatDateMode(family.latestObservedAt, 'recent')}` : family.reason}</small></div>)}
        </div>
        {pageResult.limitation ? <p className="uo-inline-warning">{pageResult.limitation}</p> : null}
      </section>

      <section className="uo-card uo-open-exceptions" aria-label="Reconciliation exceptions requiring review">
        <header className="uo-card-header uo-card-header--split">
          <div>
            <h2>{pageResult.status === 'open' ? 'Exceptions requiring review' : `${pageResult.status[0]?.toUpperCase()}${pageResult.status.slice(1)} exceptions`}</h2>
            <p>Compare source and ledger amounts before opening the unchanged resolution workbench.</p>
          </div>
          <strong>{formatNumber(pageResult.totalCount)} total</strong>
        </header>
        <div>
          {exceptions.length ? exceptions.map((row) => {
            const sourceAmount = amount(row, 'source');
            const ledgerAmount = amount(row, 'ledger');
            const rowCode = currency(row, 'source') ?? currency(row, 'ledger') ?? code;
            const delta = sourceAmount != null && ledgerAmount != null ? Math.abs(sourceAmount - ledgerAmount) : null;
            return (
              <div className="uo-exception-row" key={row.id}>
                <div>
                  <strong>{row.title}</strong>
                  <p>{row.source_system ? providerLabel(row.source_system) : 'Source unavailable'} · flagged {formatDateMode(row.created_at, 'recent')}</p>
                  <footer><span>Source <b>{money(sourceAmount, rowCode)}</b></span><span>Ledger <b>{money(ledgerAmount, rowCode)}</b></span><span>Difference {money(delta, rowCode)}</span></footer>
                </div>
                <Link href={reconciliationHref(query, { page: pageResult.page, selected: row.id })}>Review and resolve</Link>
              </div>
            );
          }) : <div className="uo-empty"><strong>No {pageResult.status} exceptions</strong><span>No source or ledger decision is waiting in this scope.</span></div>}
        </div>
        <footer>
          <span>{pageResult.totalCount === 0 ? '0 rows' : `${formatNumber((pageResult.page - 1) * pageResult.pageSize + 1)}–${formatNumber(Math.min(pageResult.page * pageResult.pageSize, pageResult.totalCount))} of ${formatNumber(pageResult.totalCount)}`}</span>
          <span className="uo-pagination">{pageResult.page > 1 ? <Link href={reconciliationHref(query, { page: pageResult.page - 1 })}>Previous</Link> : <span>Previous</span>}{pageResult.page < pageResult.totalPages ? <Link href={reconciliationHref(query, { page: pageResult.page + 1 })}>Next</Link> : <span>Next</span>}</span>
        </footer>
      </section>

      <div className="uo-kpi-grid" aria-label="Current reconciliation outcomes">{kpis.map((kpi) => <section className="uo-kpi" key={kpi.label}><span>{kpi.label}</span><strong data-tone={kpi.tone}>{kpi.value}</strong><small>{kpi.sub}</small></section>)}</div>

      <details className="uo-card uo-secondary-analysis">
        <summary><span><strong>Analyse match quality and source variance</strong><small>Secondary diagnostics · current scope remains unchanged</small></span><span>Show analysis</span></summary>
        <div className="uo-page-stack p-4">
      <section className="uo-card uo-match-trend">
        <div className="uo-match-chart">
          <header className="uo-card-header uo-card-header--split"><div><h2>Matched rate by value</h2><p>Daily, last 30 days · the axis starts at 90% so real movement is visible</p></div><div className="uo-legend"><span><i data-tone="positive" />Matched by value</span><span><i data-tone="prior" />Target 99%</span></div></header>
          <div className="uo-match-plot"><svg viewBox="0 0 700 150" width="100%" aria-label="Matched-rate history unavailable"><line x1="42" x2="694" y1="14" y2="14" className="uo-chart-grid" /><line x1="42" x2="694" y1="67" y2="67" className="uo-chart-grid" /><line x1="42" x2="694" y1="120" y2="120" className="uo-chart-grid" /><line x1="42" x2="694" y1="25" y2="25" className="uo-target-line" /><text x="32" y="18" textAnchor="end">100%</text><text x="32" y="71" textAnchor="end">95%</text><text x="32" y="124" textAnchor="end">90%</text><text x="368" y="76" textAnchor="middle" className="uo-chart-unavailable">Daily value history unavailable</text></svg></div>
        </div>
        <aside className="uo-match-stats"><div><span>Today</span><strong data-tone={matchedByValue != null && matchedByValue >= .99 ? 'positive' : 'warning'}>{matchedByValue == null ? '—' : `${(matchedByValue * 100).toFixed(1)}%`}</strong><small>{unmatchedTotal == null ? 'Unmatched value unavailable' : `${money(unmatchedTotal, code)} unmatched`}</small></div><div><span>30-day average</span><strong>—</strong><small>Historical value snapshots are not recorded</small></div><div><span>Longest clean run</span><strong>—</strong><small>Cannot be inferred from exception state</small></div></aside>
      </section>

      <section className="uo-card uo-bridge">
        <aside><span>Source total</span><strong>{money(sourceTotal, code)}</strong><div><span><small>Ledger total</small><b>{money(ledgerTotal, code)}</b></span><i>Δ {money(unmatchedTotal, code)}</i></div><p>Every difference is itemised and attributed to a source. Nothing is inferred, netted off, or auto-closed.</p></aside>
        <div><header className="uo-card-header uo-card-header--split"><h2>Source to ledger bridge</h2><div className="uo-legend"><span><i data-tone="positive" />Matched by value</span><span><i data-tone="critical" />Unmatched</span></div></header><div className="uo-bridge-bar"><span style={{ width: `${matchedByValue == null ? 0 : matchedByValue * 100}%` }}>{matchedByValue == null ? 'Matched share unavailable' : `${(matchedByValue * 100).toFixed(1)}% matched by value · ${money(ledgerTotal, code)}`}</span><i /></div><div className="uo-variance-heading"><span>{unmatchedTotal == null ? 'Variance unavailable, itemised where recorded' : `The ${sourceTotal ? ((unmatchedTotal / sourceTotal) * 100).toFixed(2) : '0.00'}% variance, itemised`}</span><i /></div><div className="uo-variance-list">{scopedExceptions.length ? scopedExceptions.map((row) => { const delta = amount(row, 'source') != null && amount(row, 'ledger') != null ? Math.abs((amount(row, 'source') ?? 0) - (amount(row, 'ledger') ?? 0)) : null; return <div key={row.id}><span title={row.title}>{row.source_system ? `${providerLabel(row.source_system)} · ` : ''}{row.title}</span><i><b style={{ width: `${delta == null ? 0 : (delta / maxVariance) * 100}%` }} /></i><strong>{money(delta, code)}</strong><small>{delta == null ? 'Amounts unavailable' : 'Awaiting decision'}</small></div>; }) : <div className="uo-empty"><strong>No open variance items</strong><span>The exception queue has no open rows.</span></div>}</div><footer><span>Total variance</span><strong>{money(unmatchedTotal, code)}</strong><small>{sourceTotal && unmatchedTotal != null ? `${((unmatchedTotal / sourceTotal) * 100).toFixed(2)}% of source` : 'Share unavailable'}</small></footer></div>
      </section>

      <section className="uo-card uo-source-ledger"><header className="uo-card-header"><h2>Source vs ledger</h2><p>Matched share is by value, this range</p></header><div>{sources.size ? [...sources.entries()].map(([name, rows]) => { const sourceValue = rows.every((row) => amount(row, 'source') != null) ? rows.reduce((sum, row) => sum + (amount(row, 'source') ?? 0), 0) : null; const ledgerValue = rows.every((row) => amount(row, 'ledger') != null) ? rows.reduce((sum, row) => sum + (amount(row, 'ledger') ?? 0), 0) : null; const share = sourceValue && ledgerValue != null ? ledgerValue / sourceValue : null; return <div className="uo-source-row" key={name}><header><i data-state={rows.length ? 'issue' : 'ok'} /><strong>{name}</strong><span>{formatNumber(rows.length)} unmatched</span></header><div><i><b style={{ width: `${share == null ? 0 : share * 100}%` }} /></i><strong>{share == null ? '—' : `${(share * 100).toFixed(1)}%`}</strong></div><footer><span>Source <b>{money(sourceValue, code)}</b></span><span>Ledger <b>{money(ledgerValue, code)}</b></span><span>Difference {money(sourceValue != null && ledgerValue != null ? Math.abs(sourceValue - ledgerValue) : null, code)}</span></footer></div>; }) : <div className="uo-empty"><strong>No source exceptions</strong><span>Per-source matched shares need complete source totals.</span></div>}</div><footer><span>All sources <b>{money(sourceTotal, code)}</b></span><span>Ledger <b>{money(ledgerTotal, code)}</b></span><span>Difference {money(unmatchedTotal, code)}</span></footer></section>
        </div>
      </details>

    </div>
  );
}
