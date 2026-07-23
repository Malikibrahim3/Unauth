import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { WorkbenchPage, EmptyState, ButtonLink, Card, DataTableServer, FilterChip, SegmentedControl, KeyInsightCallout, SummaryRail } from '@/components/ui';
import { Clock, AlertTriangle } from 'lucide-react';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { dominantCurrency, formatCurrencyNullable, formatNumber } from '@/lib/utils/format';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import {
  CLAIM_TYPE_LABELS,
  humanizeEnumValue,
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
  const claimTypeRows = Object.entries(
    claims.reduce<Record<string, number>>((acc, claim) => {
      acc[claim.claim_type] = (acc[claim.claim_type] ?? 0) + 1;
      return acc;
    }, {})
  )
    .slice(0, 5)
    .map(([claimType, value]) => ({
      label: CLAIM_TYPE_LABELS[claimType] ?? humanizeEnumValue(claimType),
      value,
    }));
  const waitingCount = queueCounts.awaitingCarrier + queueCounts.awaiting3pl + queueCounts.awaitingSupplier;
  const classifiedActive = queueCounts.awaitingEvidence + waitingCount + queueCounts.readyForDecision + queueCounts.manualReview;
  const decisionTone = queueCounts.overdue > 0 ? 'warning' : queueCounts.readyForDecision > 0 ? 'info' : 'neutral';
  // Display currency for aggregate KPIs: the most common case currency on record.
  const displayCurrency = dominantCurrency(recoveryMetricRows.length > 0 ? recoveryMetricRows : claims);
  const emptyDescription = listView.kind === 'unread'
    ? 'No payout cases with new evidence right now.'
    : listView.kind === 'workflow' && listView.workflow === 'needs_evidence'
      ? 'No payout cases needing evidence right now.'
      : listView.kind === 'workflow' && listView.workflow === 'awaiting_carrier'
        ? 'No payout cases awaiting carrier clarification right now.'
        : listView.kind === 'workflow' && listView.workflow === 'awaiting_3pl'
          ? 'No payout cases awaiting 3PL clarification right now.'
          : listView.kind === 'workflow' && listView.workflow === 'awaiting_supplier'
            ? 'No payout cases awaiting supplier clarification right now.'
            : listView.kind === 'workflow' && listView.workflow === 'ready_for_decision'
              ? 'No payout cases ready for decision right now.'
              : listView.kind === 'workflow' && listView.workflow === 'manual_review'
                ? 'No payout cases in manual review right now.'
                : listView.kind === 'workflow' && listView.workflow === 'closed'
                  ? 'No closed payout cases yet.'
                  : listView.kind === 'history'
                    ? 'No payout cases with recorded outcomes yet.'
                    : listView.kind === 'snoozed'
                      ? 'No deferred payout cases right now.'
                      : listView.kind === 'assigned_me'
                        ? 'No assigned payout cases right now.'
                        : listView.kind === 'unassigned'
                          ? 'No payout cases needing review right now.'
                          : slaFilter === 'overdue'
                            ? 'No ageing payout cases in this view.'
                            : listView.kind === 'status' && listView.status === 'open'
                              ? 'No payout cases with a policy match right now.'
                              : listView.kind === 'status' && listView.status === 'pending'
                                ? 'No payout cases waiting on source data right now.'
                                : listView.kind === 'status' && listView.status === 'escalated'
                                  ? 'No payout cases with strong identity evidence right now.'
                                  : 'No payout cases match this filter.';

  return (
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Payout Control" pageDescription="Connect Gorgias or Zendesk so Unauth can create payout cases, assemble evidence, and apply your rules." hasData={queueCounts.total > 0}>
    <WorkbenchPage
      title="Payout Control"
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="claims"
      kpiItems={[
        { label: 'Open payout cases', value: formatNumber(queueCounts.active), hint: 'Refunds, reships, replacements' },
        { label: 'New evidence', value: formatNumber(queueCounts.unread), hint: 'Arrived since last visit' },
        { label: 'Ready for decision', value: formatNumber(queueCounts.readyForDecision), hint: 'Evidence complete' },
        { label: 'Payout exposure', value: formatCurrencyNullable(totalAtRisk || null, displayCurrency), hint: 'All cases' },
      ]}
      primaryVisual={
        <KeyInsightCallout
          eyebrow="Payout Control"
          tone={decisionTone}
          icon={decisionTone === 'warning' ? <AlertTriangle size={16} /> : <Clock size={16} />}
        >
          <strong>{formatNumber(queueCounts.active)}</strong> open cases holding{' '}
          <strong>{formatCurrencyNullable(totalAtRisk || null, displayCurrency)}</strong> in exposure —{' '}
          <strong>{formatNumber(queueCounts.readyForDecision)}</strong> ready to decide now.
        </KeyInsightCallout>
      }
      rail={
        <SummaryRail
          sections={[
            {
              title: 'Decision states',
              rows: [
                { label: 'Needs evidence', value: formatNumber(queueCounts.awaitingEvidence), tone: 'danger', bar: queueCounts.active ? queueCounts.awaitingEvidence / queueCounts.active : 0 },
                { label: 'Partner wait', value: formatNumber(waitingCount), tone: 'warning', bar: queueCounts.active ? waitingCount / queueCounts.active : 0 },
                { label: 'Ready for decision', value: formatNumber(queueCounts.readyForDecision), tone: 'info', bar: queueCounts.active ? queueCounts.readyForDecision / queueCounts.active : 0 },
                { label: 'Manual review', value: formatNumber(queueCounts.manualReview), tone: 'neutral', bar: queueCounts.active ? queueCounts.manualReview / queueCounts.active : 0 },
                { label: 'Other active', value: formatNumber(Math.max(0, queueCounts.active - classifiedActive)), tone: 'neutral', bar: queueCounts.active ? Math.max(0, queueCounts.active - classifiedActive) / queueCounts.active : 0 },
              ],
              footnote: 'The active payout queue grouped by the next evidence or decision step.',
            },
          ]}
        />
      }
      footer={
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Support conversations stay in your helpdesk. Unauth controls the payout decision moment, logs the loss, and routes recoverable cases to the right partner.
        </p>
      }
      main={
        isEmpty ? (
          <EmptyState
            title="No payout cases yet"
            description="Connect a support source to create payout cases from customer conversations."
            action={<ButtonLink href="/settings/integrations" size="md">Connect support source</ButtonLink>}
          />
        ) : (
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border-muted)' }}>
              <nav
                className="flex flex-wrap items-center gap-x-1 gap-y-1"
                aria-label="Payout case filters"
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
              <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
                <SegmentedControl
                  aria-label="Sort payout cases"
                  value={slaFilter === 'overdue' ? 'ageing' : sort === 'age' ? 'oldest' : 'updated'}
                  items={[
                    { value: 'updated', label: 'Updated', href: `/claims${buildClaimsQueryString(sp, { sort: undefined, sla: undefined, page: '1' })}` },
                    { value: 'oldest', label: 'Oldest', href: `/claims${buildClaimsQueryString(sp, { sort: 'age', sla: undefined, page: '1' })}` },
                    { value: 'ageing', label: 'Ageing first', href: `/claims${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', page: '1' })}` },
                  ]}
                />
                <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Rows…</span>}>
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
                    style={{ color: 'var(--accent)' }}
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

            <div className="grid gap-4 px-4 py-4 border-t lg:grid-cols-2" style={{ borderColor: 'var(--border-muted)' }}>
              <Card unstyled as="section" variant="flat" className="p-4" aria-labelledby="queue-health-title">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p id="queue-health-title" className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Queue health</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>Open work, new evidence, ageing and decisions.</p>
                  </div>
                  <Link href="/work" className="text-xs font-semibold hover:underline" style={{ color: 'var(--text-link)' }}>Open work queue</Link>
                </div>
                <dl className="mt-3 divide-y" style={{ borderColor: 'var(--border-muted)' }}>
                  {[
                    { label: 'Open cases', value: queueCounts.active, href: '/claims' },
                    { label: 'New evidence', value: queueCounts.unread, href: '/claims?viewed=unread' },
                    { label: 'Ageing', value: queueCounts.overdue, href: '/claims?sla=overdue&sort=age' },
                    { label: 'Ready for decision', value: queueCounts.readyForDecision, href: '/claims?workflow=ready_for_decision' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                      <dt className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</dt>
                      <dd className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                        <Link href={item.href} className="text-xs font-semibold hover:underline" style={{ color: 'var(--text-link)' }}>Review</Link>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Card unstyled as="section" variant="flat" className="p-4" aria-labelledby="request-mix-title">
                <p id="request-mix-title" className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Request types</p>
                {claimTypeRows.length > 0 ? (
                  <DataTableServer
                    className="mt-3 border-0"
                    rows={claimTypeRows}
                    getRowKey={(item) => item.label}
                    density="compact"
                    columns={[
                      { key: 'type', header: 'Request type', render: (item) => <span className="font-medium text-[var(--text-secondary)]">{item.label}</span> },
                      { key: 'cases', header: 'Cases', align: 'right' as const, render: (item) => <span className="font-semibold tabular-nums">{item.value}</span> },
                      { key: 'share', header: 'Share', align: 'right' as const, render: (item) => <span className="tabular-nums text-[var(--text-tertiary)]">{claims.length > 0 ? `${Math.round((item.value / claims.length) * 100)}%` : '—'}</span> },
                    ]}
                  />
                ) : <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>No classified payout requests in this page.</p>}
              </Card>
            </div>
          </div>
        )
      }
    />
    </PageConnectionGate>
  );
}
