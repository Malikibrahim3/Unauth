'use client';

import Link from '@/components/navigation/AppNavLink';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { customersListHref } from '@/app/(app)/customers/customersOverviewPageUtils';
import { formatCurrencyNullable, formatNumber } from '@/lib/utils/format';

export type CustomerOverviewRow = {
  id: string;
  primary_email: string | null;
  names: string[] | null;
  total_orders: number | null;
  order_coverage: 'complete' | 'partial' | 'unavailable';
  total_spent: number | null;
  total_spent_currency: string | null;
  has_mixed_currency: boolean;
  payout_cases_total: number | null;
  payout_cases_open: number | null;
  claim_value: number | null;
  claim_currency: string | null;
  case_coverage: 'complete' | 'partial' | 'unavailable';
  has_refund_case: boolean | null;
  has_chargeback_case: boolean | null;
  last_order_at: string | null;
};

type MatchGroup = {
  id: string;
  title: string;
  basis: string;
  claimValue: number | null;
  claimCurrency: string | null;
  members: Array<{ id: string; name: string; email: string | null; claims: number | null }>;
};

type CohortSummary = {
  label: string;
  min: number;
  max: number;
  count: number;
  orders: number;
  claimValue: number | null;
  currency: string | null;
};

export type CustomersOverviewPageViewProps = {
  connectionState: ConnectionState;
  setupState: MerchantSetupState;
  hasData: boolean;
  pageActions: { primary: { label: string; href: string }; subtitle: string };
  sp: Record<string, string | undefined>;
  rows: CustomerOverviewRow[];
  baseCustomerCount: number;
  withOpenCasesCount: number;
  totalCount: number;
  page: number;
  PAGE_SIZE: number;
  totalPages: number;
  noFilters: boolean;
  searchTerm: string;
  riskFilter: string;
  statusFilter: string;
  listCoverage: 'complete' | 'partial' | 'unavailable';
  caseFilterCoverage: 'complete' | 'partial' | 'unavailable';
  matchGroups: MatchGroup[];
  cohortSummaries: CohortSummary[];
};

const mono = "'IBM Plex Mono',monospace";
const sans = "'Inter',sans-serif";
const line = '1px solid #eae8e5';
const cardShadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function money(value: number | null, currency: string | null) {
  return value == null || !currency ? '—' : formatCurrencyNullable(value, currency) ?? '—';
}

function initials(value: string) {
  return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '—';
}

function downloadRows(rows: CustomerOverviewRow[]) {
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    ['customer', 'email', 'orders', 'claims', 'claim value', 'currency'],
    ...rows.map((row) => [row.names?.[0] ?? '', row.primary_email ?? '', row.total_orders ?? '', row.payout_cases_total ?? '', row.claim_value ?? '', row.claim_currency ?? '']),
  ].map((record) => record.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'customer-claim-cohort.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CustomersOverviewPageView(props: CustomersOverviewPageViewProps) {
  const {
    connectionState, setupState, hasData, pageActions, sp, rows, baseCustomerCount,
    totalCount, page, PAGE_SIZE, totalPages, noFilters, searchTerm, riskFilter,
    statusFilter, listCoverage, caseFilterCoverage, matchGroups, cohortSummaries,
  } = props;
  void connectionState;
  void setupState;
  void hasData;
  const caseFilterUnavailable = Boolean(riskFilter || statusFilter) && caseFilterCoverage !== 'complete';
  const cohortTotal = cohortSummaries.reduce((sum, cohort) => sum + (cohort.claimValue ?? 0), 0);
  const cohortCurrencies = new Set(cohortSummaries.flatMap((cohort) => cohort.currency ? [cohort.currency] : []));
  const cohortCurrency = cohortCurrencies.size === 1 ? cohortSummaries.find((cohort) => cohort.currency)?.currency ?? null : null;
  const heaviest = cohortSummaries[3];
  const emptyMessage = caseFilterUnavailable
    ? 'Claim concentration is unavailable because the case read did not complete.'
    : listCoverage === 'unavailable'
      ? 'Customer concentration is unavailable because the customer list did not load.'
      : noFilters
        ? pageActions.subtitle
        : `${formatNumber(baseCustomerCount)} customer records remain. Adjust or clear the filters.`;

  return (
    <>
      <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Customers</h1>
      <div style={{ height: 46, flex: 'none', display: 'flex', alignItems: 'stretch', gap: 20, padding: '0 22px', borderBottom: line }}>
        {cohortSummaries.map((cohort) => {
          const selected = cohort.label === 'Three to five';
          const href = customersListHref(sp, { risk: 'case_history', claims: String(cohort.min), page: undefined });
          return <Link key={cohort.label} href={href} style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '0 3px', borderBottom: selected ? '2px solid #1c1f23' : '2px solid transparent', color: selected ? '#1c1f23' : '#64686d', font: `${selected ? 500 : 400} 12.5px/1 ${sans}`, textDecoration: 'none' }}>{cohort.label}<span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>{formatNumber(cohort.count)}</span></Link>;
        })}
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#1c1f23', font: `400 12px/1 ${sans}` }}>12 months<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4" /></svg></span>
          <button type="button" onClick={() => downloadRows(rows)} style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', font: `400 12px/1 ${sans}`, cursor: 'pointer' }}>Export cohort</button>
        </div>
      </div>

      <div data-screen-label="Customers" data-visual-world="supplied-package" data-surface-id="customers-registry" data-archetype="P5" style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ flex: 1, minHeight: 0, borderRadius: 13, background: '#f4f3f1', padding: 11, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 'min(520px,100%)', borderRadius: 10, background: '#fff', boxShadow: cardShadow, padding: 24, textAlign: 'center' }}>
              <strong style={{ display: 'block', font: `500 14px/1.3 ${sans}` }}>{noFilters ? 'No customers yet' : 'No customers found'}</strong>
              <span style={{ display: 'block', marginTop: 7, color: '#64686d', font: `400 11.5px/1.55 ${sans}` }}>{emptyMessage}</span>
              <Link href={noFilters ? pageActions.primary.href : '/customers'} style={{ display: 'inline-block', marginTop: 12, color: '#9f4f08', font: `500 12px/1 ${sans}` }}>{noFilters ? pageActions.primary.label : 'Clear all filters'}</Link>
            </div>
          </div>
        ) : <>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 14 }}>
            <section aria-label="Customer registry" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 2px' }}><strong style={{ flex: 1, color: '#64686d', font: `600 10.5px/1 ${sans}`, letterSpacing: '.09em' }}>FIND A CUSTOMER</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>{searchTerm ? `${formatNumber(totalCount)} matching` : `${formatNumber(totalCount)} customer records`} · open the profile to investigate</span></div>
              <div role="table" aria-label="Customers" aria-rowcount={totalCount} style={{ minHeight: 0, overflowY: 'auto', borderRadius: 10, background: '#fff', boxShadow: cardShadow, padding: '3px 14px 9px' }}>
                <div role="row" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.6fr) 90px 90px 100px 76px', gap: 12, padding: '9px 0', color: '#64686d', font: `600 9.5px/1 ${sans}`, letterSpacing: '.07em' }}><span role="columnheader">CUSTOMER</span><span role="columnheader">ORDERS</span><span role="columnheader">CASES</span><span role="columnheader" style={{ textAlign: 'right' }}>CASE VALUE</span><span role="columnheader"><span className="sr-only">Action</span></span></div>
                {rows.map((row) => {
                  const name = row.names?.[0] ?? row.primary_email ?? 'Guest customer';
                  const orderCount = row.order_coverage === 'complete' ? formatNumber(row.total_orders ?? 0) : row.total_orders == null ? 'unavailable' : `${formatNumber(row.total_orders)} observed`;
                  const caseCount = row.case_coverage === 'complete' ? formatNumber(row.payout_cases_total ?? 0) : row.payout_cases_total == null ? 'unavailable' : `${formatNumber(row.payout_cases_total)} observed`;
                  return <div role="row" key={row.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.6fr) 90px 90px 100px 76px', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f4f2ef' }}><span role="cell" style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 9 }}><span aria-hidden="true" style={{ width: 26, height: 26, flex: 'none', borderRadius: '50%', background: '#f2f0ed', color: '#40454a', textAlign: 'center', font: `500 9px/26px ${mono}` }}>{initials(name)}</span><span style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: `500 12px/1.35 ${sans}` }}>{name}</strong><small style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 10px/1.35 ${mono}` }}>{row.primary_email ?? 'contact unavailable'} · {row.id.slice(0, 8)}</small></span></span><span role="cell" style={{ color: '#40454a', font: `400 10.5px/1.4 ${mono}` }}>{orderCount}</span><span role="cell" style={{ color: row.payout_cases_open ? '#7a5310' : '#40454a', font: `400 10.5px/1.4 ${mono}` }}>{caseCount}{row.payout_cases_open ? ` · ${row.payout_cases_open} open` : ''}</span><span role="cell" style={{ textAlign: 'right', color: '#1c1f23', font: `400 11px/1 ${mono}` }}>{money(row.claim_value, row.claim_currency)}</span><span role="cell" style={{ textAlign: 'right' }}><Link href={`/customers/${row.id}`} aria-label={`Open ${name}`} style={{ color: '#9f4f08', font: `500 11px/1 ${sans}`, textDecoration: 'none' }}>Open profile</Link></span></div>;
                })}
              </div>
            </section>

            <section aria-label="Possible identity relationships" style={{ width: 352, flex: '0 0 352px', minHeight: 0, overflow: 'hidden', borderRadius: 13, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8, background: '#f4f3f1' }}>
              <div style={{ display: 'flex', padding: '0 1px 2px' }}><strong style={{ flex: 1, color: '#64686d', font: `600 10.5px/1 ${sans}`, letterSpacing: '.09em' }}>POSSIBLE RELATIONSHIPS</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>{matchGroups.length} observed sets</span></div>
              <p style={{ margin: 0, color: '#64686d', font: `400 10.5px/1.45 ${sans}` }}>Identifier matches are review hypotheses, not a merged identity or fraud conclusion.</p>
              <div style={{ minHeight: 0, overflowY: 'auto' }}>{matchGroups.length ? matchGroups.map((group) => <article key={group.id} style={{ padding: '10px 0', borderTop: '1px solid #e4e3e0' }}><div style={{ color: '#1c1f23', font: `500 12px/1.35 ${sans}` }}>{group.title}</div><div style={{ marginTop: 3, color: '#64686d', font: `400 10px/1.45 ${mono}` }}>{group.basis} · {group.members.length} observed accounts</div><Link href={`/customers/${group.id}?tab=identity`} style={{ display: 'inline-block', marginTop: 7, color: '#9f4f08', font: `500 10.5px/1.4 ${sans}`, textDecoration: 'none' }}>Review identity evidence</Link></article>) : <div style={{ padding: '12px 0', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>No possible account relationship currently needs review.</div>}</div>
              <span style={{ flex: 1 }} /><div style={{ borderTop: '1px solid #e4e3e0', paddingTop: 10, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Customer lookup remains primary. Relationships never change a profile without a separate supported merchant action.</div>
            </section>
          </div>

          <section aria-label="Where claim value sits" style={{ flex: 'none', position: 'relative', borderRadius: 10, background: '#fff', boxShadow: cardShadow, padding: '14px 16px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}><strong style={{ color: '#64686d', font: `600 10.5px/1 ${sans}`, letterSpacing: '.09em' }}>WHERE CLAIM VALUE SITS</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>{cohortCurrency ? `${money(cohortTotal, cohortCurrency)} claimed in 12 months` : 'mixed or unavailable claim value'}</span></div><div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>{cohortSummaries.map((cohort, index) => <div key={cohort.label} style={{ width: `${cohortTotal > 0 && cohort.claimValue != null ? Math.max(8, (cohort.claimValue / cohortTotal) * 100) : 25}%`, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}><div style={{ height: 22, borderRadius: 3, background: ['#d8d3cc', '#c4bcb1', '#c98a1a', '#b0431a'][index] }} /><strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: `500 11px/1.3 ${sans}` }}>{cohort.label}</strong><span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>{money(cohort.claimValue, cohort.currency)} · {formatNumber(cohort.count)} accounts</span></div>)}</div></div>
            <div style={{ width: 280, flex: 'none', borderLeft: line, paddingLeft: 16, color: '#64686d', font: `400 11.5px/1.55 ${sans}` }}>{heaviest?.count ? `The ${formatNumber(heaviest.count)} heaviest accounts represent ${money(heaviest.claimValue, heaviest.currency)} across ${formatNumber(heaviest.orders)} orders. That trade is a judgement, not a rule.` : 'No six-or-more-claim cohort is currently observed. Missing values remain unavailable, not zero.'}</div>
          </section>
        </>}
        <footer style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}><span>{searchTerm ? `${formatNumber(totalCount)} matching` : `${formatNumber(totalCount)} accounts`} · — means unavailable, not zero</span><span style={{ flex: 1 }} />{totalPages > 1 && page > 1 ? <Link href={customersListHref(sp, { page: String(page - 1), pageSize: String(PAGE_SIZE) })} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#64686d', textDecoration: 'none' }}>Previous</Link> : null}{totalPages > 1 && page < totalPages ? <Link href={customersListHref(sp, { page: String(page + 1), pageSize: String(PAGE_SIZE) })} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#1c1f23', textDecoration: 'none' }}>Next</Link> : null}</footer>
      </div>
    </>
  );
}
