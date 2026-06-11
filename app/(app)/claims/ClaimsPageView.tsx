import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { WorkbenchPage, WorkbenchEmptyState, ButtonLink } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { formatCurrencyNullable } from '@/lib/utils/format';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { AnalyticsDonutChart } from '@/components/analytics/AnalyticsDonutChart';
import { AnalyticsHBarChart } from '@/components/analytics/AnalyticsHBarChart';
import {
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from '@/app/(app)/claims/claimsPageData';
import { buildClaimsQueryString } from '@/app/(app)/claims/claimsPageLogic';
import { ClaimsQueueClient } from '@/app/(app)/claims/ClaimsQueueClient';
import type { ClaimsListView } from '@/lib/claims/claimsQueueUi';

export type ClaimsFilterTab = {
  label: string;
  count: number;
  href: string;
  active: boolean;
};

export type ClaimsPageViewProps = {
  connectionState: ConnectionState;
  queueCounts: {
    total: number;
    active: number;
    unread: number;
    overdue: number;
    resolved: number;
  };
  isEmpty: boolean;
  resultText: string;
  pageSize: number;
  filterTabs: ClaimsFilterTab[];
  queueFilter: string;
  sp: Record<string, string | undefined>;
  sort: string;
  slaFilter: string | null;
  claims: ClaimRow[];
  listView: ClaimsListView;
  latestOutcomeByClaimId: Map<string, { decision: string; outcome: string; updated_at: string }>;
  evidenceByClaimId: Map<string, EvidencePackageRow | null>;
  customerById: Map<string, CustomerProfileSummary>;
  currentUserId: string;
  totalAtRisk: number;
  page: number;
  totalPages: number;
};

export function ClaimsPageView({
  connectionState,
  queueCounts,
  isEmpty,
  resultText,
  pageSize,
  filterTabs,
  queueFilter,
  sp,
  sort,
  slaFilter,
  claims,
  listView,
  latestOutcomeByClaimId,
  evidenceByClaimId,
  customerById,
  currentUserId,
  totalAtRisk,
  page,
  totalPages,
}: ClaimsPageViewProps) {
  const statusDonut = [
    { label: 'Open', value: queueCounts.active, color: 'var(--text-primary)' },
    { label: 'Unread', value: queueCounts.unread, color: 'var(--warning)' },
    { label: 'Overdue', value: queueCounts.overdue, color: 'var(--critical)' },
    { label: 'Resolved', value: queueCounts.resolved, color: 'var(--success)' },
  ].filter((item) => item.value > 0);
  const claimTypeBars = Object.entries(
    claims.reduce<Record<string, number>>((acc, claim) => {
      acc[claim.claim_type] = (acc[claim.claim_type] ?? 0) + 1;
      return acc;
    }, {})
  )
    .slice(0, 5)
    .map(([label, value]) => ({
      label,
      value,
      color: 'var(--neutral)',
    }));

  return (
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Claim Evidence" pageDescription="Claim-linked identity evidence appears here after helpdesk or commerce sync. Connect Gorgias or Zendesk to view claim evidence in Unauth." hasData={queueCounts.total > 0}>
    <WorkbenchPage
      title="Claim Evidence Index"
      subtitle="Identity evidence and recorded merchant responses for claim-linked orders."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="claims"
      kpiItems={[
        { label: 'Claims with evidence', value: queueCounts.active.toLocaleString(), hint: 'Open claims' },
        { label: 'New evidence', value: queueCounts.unread.toLocaleString(), hint: 'Arrived since last visit' },
        { label: 'Ageing claims', value: queueCounts.overdue.toLocaleString(), hint: '>72h open' },
        { label: 'Outcomes recorded', value: queueCounts.resolved.toLocaleString(), hint: 'Merchant trail' },
        { label: 'Claims reviewed', value: queueCounts.total.toLocaleString(), hint: 'All time' },
        { label: 'Open claim value', value: formatCurrencyNullable(totalAtRisk || null), hint: 'All claims' },
      ]}
      footer={
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Support conversations stay in your helpdesk. Unauth shows the identity evidence and merchant response record behind each claim.
        </p>
      }
      main={
        isEmpty ? (
          <WorkbenchEmptyState
            title="No claim records yet"
            description="Unauth will show claim-linked identity evidence here after imports, helpdesk events, or commerce syncs."
            action={
              <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Go to Customers →
              </Link>
            }
          />
        ) : (
          <div>
            <div className="grid gap-4 px-4 pt-4 lg:grid-cols-2">
              <div className="rounded-[10px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Queue health</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Open, unread, overdue, and resolved claim mix
                </p>
                <div className="mt-3">
                  <AnalyticsDonutChart data={statusDonut} height={220} emptyLabel="No claim mix yet" />
                </div>
              </div>
              <div className="rounded-[10px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Current page claim types</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Quick read on what the analyst is looking at right now
                </p>
                <div className="mt-3">
                  <AnalyticsHBarChart data={claimTypeBars} yAxisWidth={110} emptyLabel="No claim type data" />
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border-muted)' }}>
              <div
                className="flex flex-wrap items-center gap-x-1 gap-y-1"
                role="tablist"
                aria-label="Claim review filters"
              >
                {filterTabs.map((tab) => (
                  <Link
                    key={tab.label}
                    href={tab.href}
                    role="tab"
                    aria-selected={tab.active}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs font-medium transition-colors"
                    style={{
                      background: tab.active ? 'var(--accent)' : 'var(--surface-sunken)',
                      color: tab.active ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {tab.label}
                    <span className="font-mono tabular-nums">{tab.count}</span>
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'Updated', href: `/claims${buildClaimsQueryString(sp, { sort: undefined, sla: undefined, page: '1' })}`, active: sort === 'updated' && !slaFilter },
                    { label: 'Oldest', href: `/claims${buildClaimsQueryString(sp, { sort: 'age', sla: undefined, page: '1' })}`, active: sort === 'age' && !slaFilter },
                    { label: 'Ageing first', href: `/claims${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', page: '1' })}`, active: slaFilter === 'overdue' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="px-2.5 py-1 rounded-[6px] text-xs font-medium"
                      style={{
                        background: item.active ? 'var(--surface-sunken)' : 'transparent',
                        color: item.active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        border: item.active ? '1px solid var(--border)' : '1px solid transparent',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Rows…</span>}>
                  <PageSizeSelect pathname="/claims" pageSize={pageSize} />
                </Suspense>
              </div>
            </div>

            {claims.length === 0 ? (
              <div
                className="py-16 text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                <p className="text-sm">
                  {listView.kind === 'unread'
                    ? 'No claims with new evidence right now.'
                    : listView.kind === 'history'
                      ? 'No claims with recorded outcomes yet.'
                      : listView.kind === 'snoozed'
                        ? 'No deferred claim records right now.'
                        : listView.kind === 'assigned_me'
                          ? 'No claim records in this view.'
                          : listView.kind === 'unassigned'
                            ? 'No claims needing review right now.'
                            : slaFilter === 'overdue'
                              ? 'No ageing claims in this view.'
                              : listView.kind === 'status' && listView.status === 'open'
                                ? 'No claims with strong identity links right now.'
                                : listView.kind === 'status' && listView.status === 'pending'
                                  ? 'No claims waiting on source data right now.'
                                  : listView.kind === 'status' && listView.status === 'escalated'
                                    ? 'No claims with high evidence density right now.'
                                    : 'No claim records match this filter.'}
                </p>
                {queueFilter === 'active' && (
                  <Link
                    href="/claims?queue=history"
                    className="mt-2 inline-block text-xs font-semibold hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    View recorded outcomes
                  </Link>
                )}
              </div>
            ) : (
              <ClaimsQueueClient
                claims={claims}
                outcomesRecord={Object.fromEntries(latestOutcomeByClaimId)}
                evidenceRecord={Object.fromEntries(evidenceByClaimId)}
                customersRecord={Object.fromEntries(customerById)}
                currentUserId={currentUserId}
              />
            )}

            {totalPages > 1 && (
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
              >
                <span>{resultText}</span>
                <div className="flex items-center gap-2">
                  <span>Page {page} of {totalPages}</span>
                  {page > 1 && (
                    <ButtonLink href={`/claims${buildClaimsQueryString(sp, { page: String(page - 1) })}`} variant="secondary" size="sm">Previous</ButtonLink>
                  )}
                  {page < totalPages && (
                    <ButtonLink href={`/claims${buildClaimsQueryString(sp, { page: String(page + 1) })}`} variant="secondary" size="sm">Next</ButtonLink>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      }
    />
    </PageConnectionGate>
  );
}
