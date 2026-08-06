import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { PageFrame, RegistrySurface, EmptyState, ButtonLink, FilterChip, SegmentedControl } from '@/components/ui';
import { dominantCurrency, formatCurrencyNullable, formatNumber } from '@/lib/utils/format';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import {
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from './claimsPageData';
import { buildClaimsQueryString } from './claimsPageLogic';
import { ClaimsQueueClient } from './ClaimsQueueClient';
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
  basePath: '/cases';
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
  basePath,
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
    <PageFrame
      title="Cases"
      subtitle={`${formatNumber(queueCounts.active)} active · ${formatNumber(queueCounts.unread)} with new evidence · ${formatNumber(queueCounts.readyForDecision)} ready for decision · ${formatCurrencyNullable(totalAtRisk, displayCurrency)} at issue`}
      footer={
        <p className="ua-text-caption-role" style={{ color: 'var(--ua-text-tertiary)' }}>
          Support conversations stay in your helpdesk. Unauth reconciles the records, keeps customer action separate from responsibility, and routes supported recovery work to the right partner.
        </p>
      }
    >
      {isEmpty ? (
          <EmptyState
            title="No cases yet"
            description="Connect a support source to create cases from customer conversations."
            action={<ButtonLink href="/sources/connected" size="md">Connect support source</ButtonLink>}
          />
      ) : (
          <RegistrySurface
            aria-label="Cases registry and selected preview"
            className="ua-case-registry"
            toolbar={
              <div className="ua-case-registry-tools">
                <div className="ua-case-registry-tools__primary">
                  <form method="get" action={basePath} role="search" aria-label="Search cases" className="ua-case-registry-tools__search">
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
                      className="ua-text-body h-9 min-w-0 flex-1 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 text-[var(--ua-text-primary)]"
                    />
                    {/* Secondary, not primary violet (C2) — the registry's primary
                     * action is reviewing a case, not running a search. */}
                    <button type="submit" className="ua-text-label h-9 shrink-0 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]">
                      Search
                    </button>
                    {searchTerm ? (
                      <Link href={`${basePath}${buildClaimsQueryString(sp, { search: undefined, page: '1', focus: undefined })}`} className="ua-text-label shrink-0 text-[var(--ua-text-secondary)] underline underline-offset-2">
                        Clear
                      </Link>
                    ) : null}
                  </form>
                  <div className="ua-case-registry-tools__sort">
                    <SegmentedControl
                      aria-label="Sort cases"
                      value={slaFilter === 'overdue' ? 'ageing' : sort === 'age' ? 'oldest' : sort === 'value' ? 'value' : 'updated'}
                      items={[
                        { value: 'updated', label: 'Updated', href: `${basePath}${buildClaimsQueryString(sp, { sort: undefined, sla: undefined, page: '1' })}` },
                        { value: 'oldest', label: 'Oldest', href: `${basePath}${buildClaimsQueryString(sp, { sort: 'age', sla: undefined, page: '1' })}` },
                        { value: 'ageing', label: 'Ageing first', href: `${basePath}${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', page: '1' })}` },
                        { value: 'value', label: 'Highest value', href: `${basePath}${buildClaimsQueryString(sp, { sort: 'value', sla: undefined, page: '1' })}` },
                      ]}
                    />
                  </div>
                </div>
                <div className="ua-case-registry-tools__filters">
                  <span className="ua-case-registry-tools__label">Workflow</span>
                  <nav className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Case filters">
                    {/* A workflow with nothing in it right now isn't a real choice (C3) —
                     * omit it rather than rendering a chip that reads "0" at full weight,
                     * unless it's the view the operator is already looking at. */}
                    {filterTabs
                      .filter((tab) => tab.count > 0 || tab.active)
                      .map((tab) => (
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
                  <p className="ml-auto text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]" role="status" aria-live="polite">
                    {resultText}
                  </p>
                </div>
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
            {claims.length === 0 ? (
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
                    style={{ color: 'var(--ua-action-primary)' }}
                  >
                    View recorded outcomes
                  </Link>
                ) : (
                  <Link
                    href={`${basePath}?queue=active`}
                    className="ua-text-label mt-2 inline-block hover:underline"
                    style={{ color: 'var(--ua-action-primary)' }}
                  >
                    View active cases
                  </Link>
                )}
              />
            ) : (
              <ClaimsQueueClient
                claims={claims}
                outcomesRecord={Object.fromEntries(latestOutcomeByClaimId)}
                evidenceRecord={Object.fromEntries(evidenceByClaimId)}
                customersRecord={Object.fromEntries(customerById)}
                currentUserId={currentUserId}
                initialFocusClaimId={initialFocusClaimId}
                basePath={basePath}
              />
            )}
          </RegistrySurface>
      )}
    </PageFrame>
    </PageConnectionGate>
  );
}
