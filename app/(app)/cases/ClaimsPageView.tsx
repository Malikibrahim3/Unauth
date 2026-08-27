import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { PageFrame, RegistrySurface, EmptyState, ButtonLink, OperationalState, SegmentedControl } from '@/components/ui';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import {
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from './claimsPageData';
import { buildClaimsQueryString, coverageForClaimsListView, type CasesSummary } from './claimsPageLogic';
import { ClaimsQueueClient } from './ClaimsQueueClient';
import type { ClaimsListView } from '@/lib/claims/claimsQueueUi';
import type { ClaimMetricCoverage, ClaimQueueCounts } from '@/lib/claims/queueCounts';
import { CasesCompactFilters } from './CasesCompactFilters';
import { CasesFlow, CasesMetrics } from './CasesOverview';
import type { CasesFlowSnapshot } from './casesFlow';

export type ClaimsFilterTab = {
  label: string;
  count: number;
  coverage: ClaimMetricCoverage;
  href: string;
  active: boolean;
};

export type ClaimsPageViewProps = {
  connectionState: ConnectionState;
  queueCounts: ClaimQueueCounts;
  coverageByMetric: Record<keyof ClaimQueueCounts, ClaimMetricCoverage>;
  aggregateCoverage: ClaimMetricCoverage;
  casesSummary: CasesSummary;
  casesFlow: CasesFlowSnapshot | null;
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
  initialSelectedCaseId?: string | null;
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
  basePath: '/cases';
};

export function ClaimsPageView({
  connectionState,
  queueCounts,
  coverageByMetric,
  casesSummary,
  casesFlow,
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
  initialSelectedCaseId,
  recoveryMetricRows,
  page,
  totalPages,
  basePath,
}: ClaimsPageViewProps) {
  void recoveryMetricRows;
  const currentViewCoverage = coverageForClaimsListView(listView, coverageByMetric);
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
  const sortValue = slaFilter === 'overdue' ? 'ageing' : sort === 'age' ? 'oldest' : sort === 'value' ? 'value' : 'updated';
  const sortItems = [
    { value: 'updated', label: 'Updated', href: `${basePath}${buildClaimsQueryString(sp, { sort: undefined, sla: undefined, page: '1' })}` },
    { value: 'oldest', label: 'Oldest', href: `${basePath}${buildClaimsQueryString(sp, { sort: 'age', sla: undefined, page: '1' })}` },
    { value: 'ageing', label: 'Ageing first', href: `${basePath}${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', page: '1' })}` },
    { value: 'value', label: 'Highest value', href: `${basePath}${buildClaimsQueryString(sp, { sort: 'value', sla: undefined, page: '1' })}` },
  ];
  const scopeLabel = filterTabs.find((tab) => tab.active)?.label ?? 'All cases';
  const filterKeys = ['queue', 'owner', 'viewed', 'status', 'evidence_posture', 'responsibility', 'claim_readiness', 'deadline'] as const;
  const activeFilters = filterKeys
    .filter((key) => sp[key])
    .map((key) => ({ key, value: sp[key]! }));
  const activeFilterCount = activeFilters.length;
  const nextCase = claims[0] ?? null;
  const activeFilterLabels: Record<string, string> = {
    me: 'Assigned to me', unassigned: 'Unassigned', unread: 'New evidence', viewed: 'Viewed',
    history: 'Recorded outcomes', snoozed: 'Deferred', strong: 'Strong evidence', contestable: 'Contestable evidence',
    insufficient: 'Insufficient evidence', unavailable: 'Unavailable', ready_to_submit: 'Ready to submit',
    waiting_on_provider: 'Waiting on provider', credited_unreconciled: 'Credited · unreconciled', reconciled: 'Reconciled',
    courier: 'Courier', three_pl: '3PL', merchant: 'Merchant', unresolved: 'Unresolved', due: 'Deadline due', expired: 'Deadline expired',
  };

  return (
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Cases" pageDescription="Connect Gorgias or Zendesk so Unauth can match the customer, order, item, parcel, and evidence before you act." hasData={claims.length > 0 || (coverageByMetric.total === 'complete' && queueCounts.total > 0)}>
    <PageFrame
      surfaceId="cases-registry"
      archetype="P5"
      title="Cases"
      subtitle="Review each case by evidence readiness, deadline and the next permitted action."
      breadcrumbs={[{ label: 'Unauth', href: '/overview' }, { label: 'Cases' }]}
      showCurrentBreadcrumb
      actions={
        <div className="ua-cases-header-actions">
          {nextCase ? <ButtonLink href={`${basePath}?selected=${encodeURIComponent(nextCase.id)}`} size="sm">Review next case</ButtonLink> : null}
        </div>
      }
      footer={
        <p className="ua-text-caption-role" style={{ color: 'var(--uo-route-text-tertiary)' }}>
          Support conversations stay in your helpdesk. Unauth reconciles the records, keeps customer action separate from responsibility, and routes supported recovery work to the right partner.
        </p>
      }
    >
      {isEmpty ? (
        <div data-state-id="cases-first-use">
          <EmptyState
            title="No cases yet"
            description="Connect a support source to create cases from customer conversations."
            action={<ButtonLink href="/sources/connected" size="md">Connect support source</ButtonLink>}
          />
        </div>
      ) : (
        <>
          <section className="ua-cases-truth-strip" aria-label="Current case queue truth">
            <div><span>Current view</span><strong>{scopeLabel}</strong><small>{resultText}</small></div>
            <div data-state={casesSummary.active.state}><span>Active cases</span><strong>{casesSummary.active.label}</strong><small>Current work, not recorded outcomes</small></div>
            <div data-state={casesSummary.readyForDecision.state}><span>Ready for decision</span><strong>{casesSummary.readyForDecision.label}</strong><small>Evidence state only; no decision inferred</small></div>
            <div data-state={casesSummary.atRisk.state}><span>Value at risk</span><strong>{casesSummary.atRisk.label}</strong><small>Currencies remain separate</small></div>
          </section>
          <RegistrySurface
            aria-label="Cases registry and selected preview"
            className="ua-case-registry"
            toolbar={
              <div className="ua-case-registry-tools" id="cases-registry-controls">
                <div className="ua-case-registry-tools__primary">
                  <form method="get" action={basePath} role="search" aria-label="Search cases" className="ua-case-registry-tools__search">
                    {Object.entries(sp)
                      .filter(([key, value]) => key !== 'search' && key !== 'page' && key !== 'selected' && value)
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
                      className="ua-text-body h-9 min-w-0 flex-1 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] px-3 text-[var(--uo-route-text-primary)]"
                    />
                    {/* Secondary, not primary violet (C2) — the registry's primary
                     * action is reviewing a case, not running a search. */}
                    <button type="submit" className="ua-text-label h-9 shrink-0 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] px-3 text-[var(--uo-route-text-primary)] hover:bg-[var(--uo-route-surface-hover)]">
                      Search
                    </button>
                    {searchTerm ? (
                      <Link href={`${basePath}${buildClaimsQueryString(sp, { search: undefined, page: '1', selected: undefined })}`} className="ua-text-label shrink-0 text-[var(--uo-route-text-secondary)] underline underline-offset-2">
                        Clear
                      </Link>
                    ) : null}
                  </form>
                  <div className="ua-case-registry-tools__sort">
                    <SegmentedControl
                      aria-label="Sort cases"
                      value={sortValue}
                      items={sortItems}
                    />
                  </div>
                  <CasesCompactFilters
                    scopeLabel={scopeLabel}
                    resultText={resultText}
                    filterTabs={filterTabs}
                    sp={sp}
                    basePath={basePath}
                    activeFilterCount={activeFilterCount}
                  />
                </div>
              </div>
            }
            resultCount={resultText}
            appliedSummary={
              <div className="ua-case-applied-summary">
                <span><strong>{scopeLabel}</strong> · {sortItems.find((item) => item.value === sortValue)?.label ?? 'Updated'}</span>
                {activeFilters.map(({ key, value }) => (
                  <Link key={key} href={`${basePath}${buildClaimsQueryString(sp, { [key]: undefined, page: '1', selected: undefined })}`}>
                    {activeFilterLabels[value] ?? value.replaceAll('_', ' ')} <span aria-hidden="true">×</span>
                  </Link>
                ))}
                {activeFilterCount ? <Link href={basePath} className="ua-case-applied-summary__clear">Clear all</Link> : null}
              </div>
            }
            pagination={
              <>
                {/* Page size lives with the rest of pagination (C2), not beside sort. */}
                <Suspense fallback={<span className="ua-text-caption-role">Rows…</span>}>
                  <PageSizeSelect pathname={basePath} pageSize={pageSize} />
                </Suspense>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-3">
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex items-center gap-2">
                      {page > 1 && (
                        <ButtonLink href={`${basePath}${buildClaimsQueryString(sp, { page: String(page - 1) })}`} variant="secondary" size="sm">Previous</ButtonLink>
                      )}
                      {page < totalPages && (
                        <ButtonLink href={`${basePath}${buildClaimsQueryString(sp, { page: String(page + 1) })}`} variant="secondary" size="sm">Next</ButtonLink>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            }
          >
            {claims.length === 0 && currentViewCoverage !== 'complete' ? (
              <OperationalState
                kind="unavailable"
                title="Case count unavailable"
                description="The available case rows are shown, but this queue could not be evaluated completely. No zero or empty result has been inferred."
                action={<ButtonLink href="/sources/connected" variant="secondary" size="sm">Review connected sources</ButtonLink>}
              />
            ) : claims.length === 0 ? (
              <div data-state-id="cases-no-filter-results">
              <EmptyState
                variant="compact"
                title={emptyDescription}
                description={queueFilter === 'active'
                  ? 'Recorded outcomes may still contain the case you need.'
                  : 'Return to active work to review cases that still need attention.'}
                action={queueFilter === 'active' ? (
                  <Link
                    href={`${basePath}?queue=history`}
                    className="ua-text-label mt-2 inline-block hover:underline"
                    style={{ color: 'var(--uo-route-action-primary)' }}
                  >
                    View recorded outcomes
                  </Link>
                ) : (
                  <Link
                    href={`${basePath}?queue=active`}
                    className="ua-text-label mt-2 inline-block hover:underline"
                    style={{ color: 'var(--uo-route-action-primary)' }}
                  >
                    View active cases
                  </Link>
                )}
              />
              </div>
            ) : (
              <ClaimsQueueClient
                claims={claims}
                outcomesRecord={Object.fromEntries(latestOutcomeByClaimId)}
                evidenceRecord={Object.fromEntries(evidenceByClaimId)}
                customersRecord={Object.fromEntries(customerById)}
                currentUserId={currentUserId}
                initialSelectedCaseId={initialSelectedCaseId}
                basePath={basePath}
              />
            )}
          </RegistrySurface>
          <details className="ua-cases-analytics">
            <summary><span>Queue analytics</span><small>Secondary context · does not change the selected work</small></summary>
            <div className="ua-cases-analytics__body">
              <CasesMetrics counts={queueCounts} summary={casesSummary} flow={casesFlow} />
              <CasesFlow counts={queueCounts} flow={casesFlow} />
            </div>
          </details>
        </>
      )}
    </PageFrame>
    </PageConnectionGate>
  );
}
