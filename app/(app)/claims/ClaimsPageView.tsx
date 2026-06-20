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
  LIKELY_OWNER_LABELS,
  LOSS_ATTRIBUTION_DISPLAY,
} from '@/lib/payouts/types';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
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

type RecoveryScorecard = {
  owner: string;
  label: string;
  activeCases: number;
  recoverableCases: number;
  needsEvidenceCases: number;
  value: number;
  currency: string | null;
};

const EXTERNAL_RECOVERY_OWNERS = ['carrier', 'three_pl', 'warehouse', 'supplier'] as const;
const RECOVERY_BOARD_COLUMNS = [
  { key: 'recoverable', label: 'Ready to chase' },
  { key: 'possibly_recoverable', label: 'Check first' },
  { key: 'needs_more_evidence', label: 'Needs evidence' },
] as const;

function recoveryAmount(row: { total_estimated_loss?: number | null; amount_at_risk?: number | null }) {
  return row.total_estimated_loss ?? row.amount_at_risk ?? 0;
}

function buildPartnerScorecards(rows: ClaimsPageViewProps['recoveryMetricRows']): RecoveryScorecard[] {
  return EXTERNAL_RECOVERY_OWNERS.map((owner) => {
    const ownerRows = rows.filter((row) => row.recovery_owner === owner);
    const activeRows = ownerRows.filter((row) =>
      !['closed', 'resolved_refunded', 'resolved_won', 'resolved_lost', 'resolved_denied', 'resolved_exchanged', 'voided', 'stale'].includes(row.status),
    );
    const currency = ownerRows.find((row) => row.currency)?.currency ?? null;
    return {
      owner,
      label: LIKELY_OWNER_LABELS[owner],
      activeCases: activeRows.length,
      recoverableCases: ownerRows.filter((row) => row.recoverability === 'recoverable').length,
      needsEvidenceCases: ownerRows.filter((row) => row.recoverability === 'needs_more_evidence').length,
      value: ownerRows.reduce((sum, row) => sum + recoveryAmount(row), 0),
      currency,
    };
  }).filter((scorecard) => scorecard.activeCases > 0 || scorecard.value > 0);
}

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
  const partnerScorecards = buildPartnerScorecards(recoveryMetricRows);
  const recoveryBoardClaims = claims.filter((claim) =>
    claim.recoverability === 'recoverable' ||
    claim.recoverability === 'possibly_recoverable' ||
    claim.recoverability === 'needs_more_evidence'
  );

  return (
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Payout Control" pageDescription="Connect Gorgias or Zendesk so Unauth can detect support payout moments, assemble evidence, apply merchant rules, and route recoverable losses." hasData={queueCounts.total > 0}>
    <WorkbenchPage
      eyebrow="Support payout control"
      title="Payout Control"
      subtitle="Control refunds, reships, replacements, discounts, and recovery chase-up from one evidence-backed queue."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="claims"
      kpiItems={[
        { label: 'Open payout cases', value: queueCounts.active.toLocaleString(), hint: 'Refunds, reships, replacements' },
        { label: 'New evidence', value: queueCounts.unread.toLocaleString(), hint: 'Arrived since last visit' },
        { label: 'Ageing cases', value: queueCounts.overdue.toLocaleString(), hint: '>72h open' },
        { label: 'Outcomes recorded', value: queueCounts.resolved.toLocaleString(), hint: 'Merchant trail' },
        { label: 'Cases reviewed', value: queueCounts.total.toLocaleString(), hint: 'All time' },
        { label: 'Payout exposure', value: formatCurrencyNullable(totalAtRisk || null), hint: 'All cases' },
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
                  <div key={item.title} className="rounded-[8px] border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface-sunken)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.body}</p>
                  </div>
                ))}
                <Link href="/settings/integrations" className="text-caption font-semibold hover:underline md:col-span-3" style={{ color: 'var(--accent)' }}>
                  Connect support and commerce sources →
                </Link>
              </div>
            }
          />
        ) : (
          <div>
            <div className="grid gap-4 px-4 pt-4 lg:grid-cols-2">
              <div className="rounded-[10px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Queue health</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Open, unread, overdue, and resolved payout case mix
                </p>
                <div className="mt-3">
                  <AnalyticsDonutChart data={statusDonut} height={220} emptyLabel="No payout case mix yet" />
                </div>
              </div>
              <div className="rounded-[10px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Current page request types</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Quick read on the support payout cases in this view
                </p>
                <div className="mt-3">
                  <AnalyticsHBarChart data={claimTypeBars} yAxisWidth={110} emptyLabel="No request type data" />
                </div>
              </div>
            </div>

            <section className="px-4 pt-4">
              <div className="rounded-[10px] border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Recovery opportunity board</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Potential recovery routes from the latest evidence and merchant rule evaluation.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {partnerScorecards.length > 0 ? partnerScorecards.map((scorecard) => (
                      <div
                        key={scorecard.owner}
                        className="rounded-[8px] border px-3 py-2"
                        style={{ borderColor: 'var(--border-muted)', background: 'var(--surface-sunken)', minWidth: 150 }}
                      >
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{scorecard.label}</p>
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {scorecard.activeCases} active · {scorecard.recoverableCases} ready · {formatCurrencyNullable(scorecard.value || null, scorecard.currency ?? undefined) ?? '—'}
                        </p>
                      </div>
                    )) : (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No partner recovery cases scored yet.</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-0 md:grid-cols-3">
                  {RECOVERY_BOARD_COLUMNS.map((column) => {
                    const columnClaims = recoveryBoardClaims.filter((claim) => claim.recoverability === column.key).slice(0, 4);
                    return (
                      <div key={column.key} className="border-b p-4 md:border-b-0 md:border-r last:border-r-0" style={{ borderColor: 'var(--border-muted)' }}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{column.label}</p>
                          <span className="rounded-[6px] px-2 py-0.5 text-[11px] font-mono" style={{ background: 'var(--surface-sunken)', color: 'var(--text-tertiary)' }}>
                            {recoveryBoardClaims.filter((claim) => claim.recoverability === column.key).length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {columnClaims.length > 0 ? columnClaims.map((claim) => (
                            <div key={claim.id} className="rounded-[8px] border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {claim.shopify_order_id ?? claim.id.slice(0, 8)}
                                </p>
                                <span className="shrink-0 text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                                  {formatCurrencyNullable(recoveryAmount(claim) || null, claim.currency ?? undefined) ?? '—'}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                {claim.recovery_owner ? LIKELY_OWNER_LABELS[claim.recovery_owner as keyof typeof LIKELY_OWNER_LABELS] ?? claim.recovery_owner : 'Owner unknown'}
                                {claim.loss_attribution ? ` · ${LOSS_ATTRIBUTION_DISPLAY[claim.loss_attribution as keyof typeof LOSS_ATTRIBUTION_DISPLAY] ?? claim.loss_attribution}` : ''}
                              </p>
                              {claim.recovery_required_evidence && claim.recovery_required_evidence.length > 0 && (
                                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                  Needs {claim.recovery_required_evidence.slice(0, 2).map(humanizeEvidenceKey).join(', ')}
                                </p>
                              )}
                            </div>
                          )) : (
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No cases in this lane.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

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
          </div>
        )
      }
    />
    </PageConnectionGate>
  );
}
