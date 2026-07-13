import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { WorkbenchPage, WorkbenchEmptyState, ButtonLink, PanelCard } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { dominantCurrency, formatCurrencyNullable } from '@/lib/utils/format';
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
  // Display currency for aggregate KPIs: the most common case currency on record.
  const displayCurrency = dominantCurrency(recoveryMetricRows.length > 0 ? recoveryMetricRows : claims);

  return (
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Payout Control" pageDescription="Connect Gorgias or Zendesk so Unauth can detect support payout moments, assemble evidence, apply merchant rules, and route recoverable losses." hasData={queueCounts.total > 0}>
    <WorkbenchPage
      eyebrow="Support payout control"
      title="Payout Control"
      subtitle="Review support payout cases, check evidence, and record decisions — one queue."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="claims"
      kpiItems={[
        { label: 'Open payout cases', value: queueCounts.active.toLocaleString(), hint: 'Refunds, reships, replacements' },
        { label: 'New evidence', value: queueCounts.unread.toLocaleString(), hint: 'Arrived since last visit' },
        { label: 'Ready for decision', value: queueCounts.readyForDecision.toLocaleString(), hint: 'Evidence complete' },
        { label: 'Payout exposure', value: formatCurrencyNullable(totalAtRisk || null, displayCurrency), hint: 'All cases' },
      ]}
      footer={
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Support conversations stay in your helpdesk. Unauth controls the payout decision moment, logs the loss, and routes recoverable cases to the right partner.
        </p>
      }
      main={
        isEmpty ? (
          <WorkbenchEmptyState
            title="No payout cases yet"
            description="Once support tickets or commerce events arrive, this workspace will show payout exposure, merchant-rule outcomes, attribution, recoverability, and partner chase-up lanes."
            action={
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { title: 'Payout detected', body: 'Refund, reship, replacement, discount, or store-credit request.' },
                  { title: 'Evidence checked', body: 'Order, tracking, customer history, policy, and rule context.' },
                  { title: 'Recovery routed', body: 'Carrier, 3PL, warehouse, supplier, merchant, or unknown owner.' },
                ].map((item) => (
                  <PanelCard key={item.title} variant="appInset" className="p-3">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.body}</p>
                  </PanelCard>
                ))}
                <Link href="/settings/integrations" className="text-caption font-semibold hover:underline md:col-span-3" style={{ color: 'var(--accent)' }}>
                  Connect support and commerce sources →
                </Link>
              </div>
            }
          />
        ) : (
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border-muted)' }}>
              <div
                className="flex flex-wrap items-center gap-x-1 gap-y-1"
                role="tablist"
                aria-label="Payout case filters"
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
              <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
                <div className="flex flex-wrap items-center gap-1.5">
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
                          ? 'No payout cases in this view.'
                          : listView.kind === 'unassigned'
                            ? 'No payout cases needing review right now.'
                            : slaFilter === 'overdue'
                              ? 'No ageing payout cases in this view.'
                              : listView.kind === 'status' && listView.status === 'open'
                                ? 'No payout cases with a policy match right now.'
                                : listView.kind === 'status' && listView.status === 'pending'
                                  ? 'No payout cases waiting on source data right now.'
                                  : listView.kind === 'status' && listView.status === 'escalated'
                                    ? 'No payout cases with high evidence density right now.'
                                    : 'No payout cases match this filter.'}
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
              <PanelCard as="section" variant="app" className="p-4" aria-labelledby="queue-health-title">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p id="queue-health-title" className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Queue health</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>Counts stay actionable; no decorative chart or mixed denominator.</p>
                  </div>
                  <Link href="/work" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Open work queue →</Link>
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
                        <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                        <Link href={item.href} className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Review</Link>
                      </dd>
                    </div>
                  ))}
                </dl>
              </PanelCard>
              <PanelCard as="section" variant="app" className="p-4" aria-labelledby="request-mix-title">
                <p id="request-mix-title" className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Request types in this page</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>A compact table preserves exact values and works with assistive technology.</p>
                {claimTypeRows.length > 0 ? (
                  <table className="mt-3 w-full text-xs">
                    <caption className="sr-only">Payout request types on the current page</caption>
                    <thead className="sr-only"><tr><th scope="col">Request type</th><th scope="col">Cases</th><th scope="col">Share</th></tr></thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
                      {claimTypeRows.map((item) => (
                        <tr key={item.label}>
                          <th scope="row" className="py-2.5 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</th>
                          <td className="py-2.5 text-right font-mono font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{item.value}</td>
                          <td className="py-2.5 pl-4 text-right font-mono tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{claims.length > 0 ? `${Math.round((item.value / claims.length) * 100)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>No classified payout requests in this page.</p>}
              </PanelCard>
            </div>
          </div>
        )
      }
    />
    </PageConnectionGate>
  );
}
