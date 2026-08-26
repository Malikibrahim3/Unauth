import Link from 'next/link';
import { MoneyValue, OperationalState, StatusBadge } from '@/components/ui';
import { RECOVERY_OWNER_LABELS } from '@/lib/recoveries/types';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import {
  RECOVERY_BOARD_STAGES,
  type RecoveryBoardStage,
  type RecoveryPageResult,
} from '@/lib/recoveries/store';
import { formatDateMode, formatNumber } from '@/lib/utils/format';
import { shortRef } from '@/lib/ui/displayRef';
import type { CanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';

const STAGE_LABELS: Record<RecoveryBoardStage, string> = {
  all: 'All',
  ready_to_file: 'Ready to file',
  filed: 'Filed',
  partner_responded: 'Partner responded',
  received: 'Received, unreconciled',
  reconciled: 'Reconciled',
  closed: 'Closed',
};

function boardHref(input: {
  stage: RecoveryBoardStage;
  currency: string | null;
  search?: string | null;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.stage !== 'all') params.set('stage', input.stage);
  if (input.currency) params.set('currency', input.currency);
  if (input.search?.trim()) params.set('search', input.search.trim());
  if (input.page && input.page > 1) params.set('page', String(input.page));
  const query = params.toString();
  return query ? `/financials/recovery?${query}` : '/financials/recovery';
}

export function RecoveryBoardOperations({
  result,
  search = null,
  aggregate,
}: {
  result: RecoveryPageResult;
  search?: string | null;
  aggregate: CanonicalFinancialAggregate;
}) {
  const shownFrom = result.totalCount === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const shownTo = Math.min(result.totalCount, result.page * result.pageSize);
  const aggregateCurrency = result.currency ?? (aggregate.currencies.length === 1 ? aggregate.currencies[0]?.currency ?? null : null);
  const aggregateRow = aggregateCurrency ? aggregate.currencies.find((row) => row.currency === aggregateCurrency) ?? null : null;
  const metric = (state: string, amount: number | undefined) => aggregateRow?.knownStates.includes(state) && amount != null
    ? <MoneyValue minorUnits={amount} currency={aggregateRow.currency} />
    : <span>Unavailable</span>;
  return (
    <div className="uo-page-stack" data-operations-surface="recovery-board" data-paging-contract={result.source}>
      {result.limitation ? (
        <div className="ua-text-body rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-warning-bg)] p-3 text-[var(--uo-route-text-secondary)]" role="status">
          {result.limitation} No missing stage total has been treated as zero.
        </div>
      ) : null}

      <section className="uo-card">
        <header className="uo-card-header uo-card-header--split">
          <div><h2>Recovery stages</h2><p>Provider position, received credit, match, and reconciliation remain separate.</p></div>
          <small>{result.stableOrder.replaceAll('_', ' ')}</small>
        </header>
        <nav className="flex flex-wrap gap-2 p-4" aria-label="Recovery stage">
          {RECOVERY_BOARD_STAGES.map((stage) => {
            const count = stage === 'all'
              ? Object.values(result.stageCounts).reduce((sum, value) => sum + (value ?? 0), 0) || (result.stage === 'all' ? result.totalCount : 0)
              : result.stageCounts[stage];
            return (
              <Link
                key={stage}
                href={boardHref({ stage, currency: result.currency, search })}
                aria-current={result.stage === stage ? 'page' : undefined}
                className="ua-text-label rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] px-3 py-2 data-[active=true]:bg-[var(--uo-route-accent-soft)]"
                data-active={result.stage === stage}
              >
                {STAGE_LABELS[stage]}{count == null ? '' : ` · ${formatNumber(count)}`}
              </Link>
            );
          })}
        </nav>
      </section>

      {result.availableCurrencies.length > 1 ? (
        <section className="uo-card p-4" aria-label="Recovery currency scope">
          <strong className="ua-text-working-title">Currencies are separated</strong>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={boardHref({ stage: result.stage, currency: null, search })} aria-current={!result.currency ? 'page' : undefined}>All currencies — no combined total</Link>
            {result.availableCurrencies.map((currency) => <Link key={currency} href={boardHref({ stage: result.stage, currency, search })} aria-current={result.currency === currency ? 'page' : undefined}>{currency}</Link>)}
          </div>
        </section>
      ) : null}

      <section className="uo-card uo-claims-board">
        <header className="uo-card-header uo-card-header--split">
          <div><h2>Next recovery work · {STAGE_LABELS[result.stage]}</h2><p>Provider position, amount sought, received credit and deadline remain separate. Showing {formatNumber(shownFrom)}–{formatNumber(shownTo)} of {formatNumber(result.totalCount)}.</p></div>
          <span>{result.currency ?? 'Currencies separated per row'}</span>
        </header>
        {result.rows.length === 0 ? (
          <OperationalState kind="filtered-empty" title="No recoveries in this scope" description="Choose another stage or currency. No missing amount has been represented as zero." />
        ) : (
          <div className="divide-y divide-[var(--uo-route-border-subtle)]">
            {result.rows.map((row) => (
              <article key={row.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <Link href={`/financials/recovery/${row.id}`} className="ua-text-working-title text-[var(--uo-route-action-primary)] underline underline-offset-2">
                    {shortRef(row.support_payout_case?.order_number ?? row.support_payout_case?.ticket_external_id, row.support_payout_case_id)}
                  </Link>
                  <p className="ua-text-caption-role mt-1">{RECOVERY_TYPE_LABELS[row.recovery_type]} · {row.partner?.name ?? RECOVERY_OWNER_LABELS[row.owner_type]}</p>
                </div>
                <div><span className="ua-text-metadata block">Provider position</span><StatusBadge family="recoveryStatus" value={row.status} size="sm" /></div>
                <dl className="grid grid-cols-2 gap-3">
                  <div><dt className="ua-text-metadata">Sought</dt><dd><MoneyValue minorUnits={row.amount_sought_minor} currency={row.currency} /></dd></div>
                  <div><dt className="ua-text-metadata">Received</dt><dd>{row.amount_recovered_minor > 0 ? <MoneyValue minorUnits={row.amount_recovered_minor} currency={row.currency} /> : <span className="ua-text-dense">Not observed</span>}</dd></div>
                </dl>
                <div className="ua-text-caption-role lg:text-right">{row.deadline_at ? `Deadline ${formatDateMode(row.deadline_at, 'recent')}` : 'Deadline unavailable'}</div>
              </article>
            ))}
          </div>
        )}
        <footer className="flex items-center justify-between gap-3 border-t border-[var(--uo-route-border-subtle)] p-4">
          {result.page > 1 ? <Link href={boardHref({ stage: result.stage, currency: result.currency, search, page: result.page - 1 })}>Previous page</Link> : <span />}
          <span className="ua-text-metadata">Page {formatNumber(result.page)} of {formatNumber(result.totalPages)}</span>
          {result.page < result.totalPages ? <Link href={boardHref({ stage: result.stage, currency: result.currency, search, page: result.page + 1 })}>Next page</Link> : <span />}
        </footer>
      </section>

      <details className="uo-card uo-secondary-analysis">
        <summary>
          <span><strong>Review 30-day recovery outcomes</strong><small>Canonical totals · received credit remains distinct from provider position</small></span>
          <span>Show totals</span>
        </summary>
        <div className="uo-kpi-grid p-4" aria-label="Canonical 30-day financial scope">
          <section className="uo-kpi"><span>Recovered cash</span><strong>{metric('recovered', aggregateRow?.recoveredMinor)}</strong><small>Matched provider credits received</small></section>
          <section className="uo-kpi"><span>Outstanding recovery</span><strong>{metric('recoverable', aggregateRow?.outstandingMinor)}</strong><small>Recoverable less received and written off</small></section>
          <section className="uo-kpi"><span>Final net loss</span><strong>{metric('confirmed_loss', aggregateRow?.finalNetLossMinor)}</strong><small>Confirmed loss less received recovery</small></section>
          <section className="uo-kpi"><span>Scope</span><strong>{aggregateCurrency ?? 'Currencies separated'}</strong><small>{aggregate.source === 'canonical' ? `${aggregate.definitionVersion} · case submitted at` : 'Canonical aggregate unavailable'}</small></section>
        </div>
      </details>
    </div>
  );
}
