import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { WorkbenchPage, EmptyState, ButtonLink, FilterChip, SegmentedControl } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { dominantCurrency, formatCurrencyNullable, formatNumber } from '@/lib/utils/format';
import PageSizeSelect from '@/components/common/PageSizeSelect';
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
    awaitingEvidence: number;
    awaitingCarrier: number;
    awaiting3pl: number;
    awaitingSupplier: number;
    readyForDecision: number;
    manualReview: number;
    closed: number;
  };
  isEmpty: boolean;
  resultText: string;
  pageSize: number;
  filterTabs: ClaimsFilterTab[];
  queueFilter: string;
  sp: Record<string, string | undefined>;
  searchTerm: string;
  sort: string;
  slaFilter: string | null;
  claims: ClaimRow[];
  listView: ClaimsListView;
  latestOutcomeByClaimId: Map<string, { decision: string; outcome: string; updated_at: string }>;
  evidenceByClaimId: Map<string, EvidencePackageRow | null>;
  customerById: Map<string, CustomerProfileSummary>;
  currentUserId: string;
  initialFocusClaimId?: string | null;
  totalAtRisk: number;
  recoveryMetricRows: Array<{
    status: string;
    total_estimated_loss: number | null;
    amount_at_risk: number | null;
    currency: string | null;
    recoverability: string | null;
    recovery_owner: string | null;
  }>;
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
  searchTerm,
  sort,
  slaFilter,
  claims,
  listView,
  latestOutcomeByClaimId,
  evidenceByClaimId,
  customerById,
  currentUserId,
  initialFocusClaimId,
  totalAtRisk,
  recoveryMetricRows,
  page,
  totalPages,
}: ClaimsPageViewProps) {
  // Display currency for aggregate KPIs: the most common case currency on record.
  const displayCurrency = dominantCurrency(recoveryMetricRows.length > 0 ? recoveryMetricRows : claims);
  const emptyDescription = searchTerm
    ? `No cases match “${searchTerm}”.`
    : listView.kind === 'unread'
    ? 'No cases with new evidence right now.'
    : listView.kind === 'workflow' && listView.workflow === 'needs_evidence'
      ? 'No cases needing evidence right now.'
      : listView.kind === 'workflow' && listView.workflow === 'awaiting_carrier'
        ? 'No cases awaiting carrier clarification right now.'
        : listView.kind === 'workflow' && listView.workflow === 'awaiting_3pl'
          ? 'No cases awaiting 3PL clarification right now.'
          : listView.kind === 'workflow' && listView.workflow === 'awaiting_supplier'
            ? 'No cases awaiting supplier clarification right now.'
            : listView.kind === 'workflow' && listView.workflow === 'ready_for_decision'
              ? 'No cases ready for decision right now.'
              : listView.kind === 'workflow' && listView.workflow === 'manual_review'
                ? 'No cases in manual review right now.'
                : listView.kind === 'workflow' && listView.workflow === 'closed'
                  ? 'No closed cases yet.'
                  : listView.kind === 'history'
                    ? 'No cases with recorded outcomes yet.'
                    : listView.kind === 'snoozed'
                      ? 'No deferred cases right now.'
                      : listView.kind === 'assigned_me'
                        ? 'No assigned cases right now.'
                        : listView.kind === 'unassigned'
                          ? 'No cases needing review right now.'
                          : slaFilter === 'overdue'
                            ? 'No ageing cases in this view.'
                            : listView.kind === 'status' && listView.status === 'open'
                              ? 'No cases with a policy match right now.'
                              : listView.kind === 'status' && listView.status === 'pending'
                                ? 'No cases waiting on source data right now.'
                                : listView.kind === 'status' && listView.status === 'escalated'
                                  ? 'No cases with strong identity evidence right now.'
                                  : 'No cases match this filter.';

  return (
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Cases" pageDescription="Connect Gorgias or Zendesk so Unauth can match the customer, order, item, parcel, and evidence before you act." hasData={queueCounts.total > 0}>
    <WorkbenchPage
      title="Cases"
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="claims"
      kpiItems={[
        { label: 'Open cases', value: formatNumber(queueCounts.active), hint: 'Refunds, reships, replacements' },
        { label: 'New evidence', value: formatNumber(queueCounts.unread), hint: 'Arrived since last visit' },
        { label: 'Ready for decision', value: formatNumber(queueCounts.readyForDecision), hint: 'Evidence complete' },
        { label: 'Value at issue', value: formatCurrencyNullable(totalAtRisk || null, displayCurrency), hint: 'All cases' },
      ]}
      footer={
        <p className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>
          Support conversations stay in your helpdesk. Unauth reconciles the records, keeps customer action separate from responsibility, and routes supported recovery work to the right partner.
        </p>
      }
      main={
        isEmpty ? (
          <EmptyState
            title="No cases yet"
            description="Connect a support source to create cases from customer conversations."
            action={<ButtonLink href="/settings/integrations" size="md">Connect support source</ButtonLink>}
          />
        ) : (
          <div>
            {/* Toolbar */}
            <div className="space-y-3 px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--ua-border-subtle)' }}>
              <form method="get" action="/claims" role="search" aria-label="Search cases" className="flex w-full items-center gap-2">
                {Object.entries(sp)
                  .filter(([key, value]) => key !== 'search' && key !== 'page' && key !== 'focus' && value)
                  .map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={value} />
                  ))}
                <label htmlFor="cases-search" className="sr-only">Search customer, order, ticket or case reference</label>
                <input
                  id="cases-search"
                  data-testid="cases-search"
                  name="search"
                  type="search"
                  defaultValue={searchTerm}
                  placeholder="Search customer, order, ticket or case reference"
                  className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)', color: 'var(--ua-text-primary)' }}
                />
                <button type="submit" className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold" style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-action-primary-fg)' }}>
                  Search
                </button>
                {searchTerm ? (
                  <Link href={`/claims${buildClaimsQueryString(sp, { search: undefined, page: '1', focus: undefined })}`} className="shrink-0 text-xs font-semibold underline underline-offset-2" style={{ color: 'var(--ua-text-secondary)' }}>
                    Clear
                  </Link>
                ) : null}
              </form>
              <nav
                className="flex flex-wrap items-center gap-x-1 gap-y-1"
                aria-label="Case filters"
              >
                {filterTabs.map((tab) => (
                  <FilterChip
                    key={tab.label}
                    href={tab.href}
                    active={tab.active}
                    count={tab.count}
                  >
                    {tab.label}
                  </FilterChip>
                ))}
              </nav>
              <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:justify-start">
                <SegmentedControl
                  aria-label="Sort cases"
                  value={slaFilter === 'overdue' ? 'ageing' : sort === 'age' ? 'oldest' : sort === 'value' ? 'value' : 'updated'}
                  items={[
                    { value: 'updated', label: 'Updated', href: `/claims${buildClaimsQueryString(sp, { sort: undefined, sla: undefined, page: '1' })}` },
                    { value: 'oldest', label: 'Oldest', href: `/claims${buildClaimsQueryString(sp, { sort: 'age', sla: undefined, page: '1' })}` },
                    { value: 'ageing', label: 'Ageing first', href: `/claims${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', page: '1' })}` },
                    { value: 'value', label: 'Highest value', href: `/claims${buildClaimsQueryString(sp, { sort: 'value', sla: undefined, page: '1' })}` },
                  ]}
                />
                <Suspense fallback={<span className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>Rows…</span>}>
                  <PageSizeSelect pathname="/claims" pageSize={pageSize} />
                </Suspense>
              </div>
            </div>

            {claims.length === 0 ? (
              <EmptyState
                variant="compact"
                title={emptyDescription}
                action={queueFilter === 'active' ? (
                  <Link
                    href="/claims?queue=history"
                    className="mt-2 inline-block text-xs font-semibold hover:underline"
                    style={{ color: 'var(--ua-action-primary)' }}
                  >
                    View recorded outcomes
                  </Link>
                ) : undefined}
              />
            ) : (
              <ClaimsQueueClient
                claims={claims}
                outcomesRecord={Object.fromEntries(latestOutcomeByClaimId)}
                evidenceRecord={Object.fromEntries(evidenceByClaimId)}
                customersRecord={Object.fromEntries(customerById)}
                currentUserId={currentUserId}
                initialFocusClaimId={initialFocusClaimId}
              />
            )}

            {totalPages > 1 && (
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs"
                style={{ borderColor: 'var(--ua-border-subtle)', color: 'var(--ua-text-secondary)' }}
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
