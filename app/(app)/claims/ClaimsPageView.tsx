import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { WorkbenchPage, WorkbenchEmptyState, ButtonLink } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { formatClaimAge, formatFiledDate } from '@/lib/claims/sla';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { StatusPill, SlaPill } from '@/app/(app)/claims/claimsPageUi';
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from '@/app/(app)/claims/claimsPageData';
import { claimNextAction, buildClaimsQueryString } from '@/app/(app)/claims/claimsPageLogic';
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
  return (
    <PageConnectionGate requires="helpdesk" connection={connectionState} pageName="Claims" pageDescription="Claim data comes from your helpdesk integration. Connect Gorgias or Zendesk to see and manage disputes here." hasData={queueCounts.total > 0}>
    <WorkbenchPage
      title="Claims"
      subtitle="Track active claim work and merchant-recorded outcomes"
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="claims"
      kpiItems={[
        { label: 'Active queue', value: queueCounts.active.toLocaleString(), hint: 'Unresolved work' },
        { label: 'New / unread', value: queueCounts.unread.toLocaleString(), hint: 'Not yet opened' },
        { label: 'Overdue', value: queueCounts.overdue.toLocaleString(), hint: '>72h open' },
        { label: 'Resolved', value: queueCounts.resolved.toLocaleString(), hint: 'History' },
        { label: 'Total claims', value: queueCounts.total.toLocaleString(), hint: 'All time' },
        { label: 'Open claim value', value: formatCurrencyNullable(totalAtRisk || null), hint: 'All claims' },
      ]}
      main={
        isEmpty ? (
          <WorkbenchEmptyState
            title="No claims yet"
            description="Claims appear here when filed from a customer profile. Open a customer profile, run a claim review, and it will show up in this list."
            action={
              <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Go to Customers →
              </Link>
            }
          />
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {resultText}
              </p>
              <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rows per page…</span>}>
                <PageSizeSelect pathname="/claims" pageSize={pageSize} />
              </Suspense>
            </div>

            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }} role="tablist" aria-label="Claims queues">
              {filterTabs.map((tab) => (
                <Link
                  key={tab.label}
                  href={tab.href}
                  role="tab"
                  aria-selected={tab.active}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: tab.active ? 'var(--accent)' : 'var(--bg-subtle)',
                    color: tab.active ? 'var(--text-inverse)' : 'var(--text-muted)',
                  }}
                >
                  {tab.label}
                  <span className="font-mono tabular-nums">{tab.count}</span>
                </Link>
              ))}
            </div>

            <div className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
              {queueFilter === 'history'
                ? 'History shows resolved and closed claims with merchant-recorded outcomes.'
                : queueFilter === 'snoozed'
                  ? 'Snoozed claims are hidden from the active queue until follow-up is due.'
                : 'Open/read removes a claim from New / unread but keeps it in Active until resolved. Resolve/close moves it to History.'}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { label: 'Recently updated', href: `/claims${buildClaimsQueryString(sp, { sort: undefined, sla: undefined, page: '1' })}`, active: sort === 'updated' && !slaFilter },
                { label: 'Oldest first', href: `/claims${buildClaimsQueryString(sp, { sort: 'age', sla: undefined, page: '1' })}`, active: sort === 'age' && !slaFilter },
                { label: 'Newest filed', href: `/claims${buildClaimsQueryString(sp, { sort: 'filed_desc', sla: undefined, page: '1' })}`, active: sort === 'filed_desc' && !slaFilter },
                { label: 'Overdue', href: `/claims${buildClaimsQueryString(sp, { sla: 'overdue', sort: 'age', page: '1' })}`, active: slaFilter === 'overdue' },
                { label: 'Approaching SLA', href: `/claims${buildClaimsQueryString(sp, { sla: 'approaching', sort: 'age', page: '1' })}`, active: slaFilter === 'approaching' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-2.5 py-1 rounded-md font-medium"
                  style={{ background: item.active ? 'var(--accent)' : 'var(--bg-subtle)', color: item.active ? 'var(--text-inverse)' : 'var(--text-muted)' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {claims.length === 0 ? (
              <div className="rounded-md border py-12 text-center text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                <p>
                  {listView.kind === 'unread'
                    ? 'No new unread claims right now.'
                    : listView.kind === 'history'
                      ? 'No resolved claims in history yet.'
                      : listView.kind === 'snoozed'
                        ? 'No snoozed claims right now.'
                        : listView.kind === 'assigned_me'
                          ? 'No claims are assigned to you.'
                          : listView.kind === 'unassigned'
                            ? 'No unassigned active claims.'
                            : slaFilter === 'overdue'
                              ? 'No overdue claims in this view.'
                              : 'No claims match this filter.'}
                </p>
                {queueFilter === 'active' && (
                  <Link href="/claims?queue=history" className="mt-2 inline-block font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    View history
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-subtle)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {[
                        { label: 'Order ref', className: '' },
                        { label: 'Customer', className: 'min-w-[160px]' },
                        { label: 'Type', className: '' },
                        { label: 'Status', className: '' },
                        { label: 'Stage', className: '' },
                        { label: 'Owner', className: 'hidden xl:table-cell' },
                        { label: 'Next action', className: 'min-w-[150px]' },
                        { label: 'Merchant decision', className: 'hidden xl:table-cell' },
                        { label: 'Filed', className: 'hidden lg:table-cell' },
                        { label: 'Age', className: 'hidden lg:table-cell' },
                        { label: 'SLA', className: '' },
                        { label: 'Evidence', className: 'hidden xl:table-cell' },
                        { label: 'At risk', className: '' },
                        { label: 'Updated', className: 'hidden lg:table-cell' },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className={`text-left px-4 py-2.5 text-xs font-semibold whitespace-nowrap ${col.className}`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th
                        className="sticky right-0 px-4 py-2.5 text-xs font-semibold text-right whitespace-nowrap"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => {
                      const orderRef = c.shopify_order_id ?? c.id.slice(0, 8);
                      const latestOutcome = latestOutcomeByClaimId.get(c.id) ?? null;
                      const linkedEvidence = evidenceByClaimId.get(c.id) ?? null;
                      const customer = c.customer_id ? customerById.get(c.customer_id) ?? null : null;
                      const customerName = customer?.names?.[0] ?? null;
                      const customerEmail = customer?.primary_email ?? null;
                      const ops = claimNextAction(c, latestOutcome, currentUserId);
                      return (
                        <tr
                          key={c.id}
                          className="group border-t hover:bg-[var(--bg-hover)]"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate" style={{ color: 'var(--text)' }} title={orderRef}>
                            {orderRef}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>
                            {c.customer_id ? (
                              <Link href={`/customers/${c.customer_id}`} className="block min-w-0 hover:underline" style={{ color: 'var(--accent)' }}>
                                <span className="block font-semibold truncate">{customerName ?? 'Unknown customer'}</span>
                                {customerEmail && (
                                  <span className="block truncate text-xs" style={{ color: 'var(--text-muted)' }}>{customerEmail}</span>
                                )}
                                {customer?.risk_level && (
                                  <span className="mt-1 inline-block">
                                    <ConfidenceBadge grade={riskLevelToNewGrade(customer.risk_level)} size="sm" />
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={c.status} />
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {ops.stage}
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {ops.owner}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {ops.next}
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {latestOutcome ? DECISION_LABELS[latestOutcome.decision] ?? latestOutcome.decision : '-'}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatFiledDate(c)}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatClaimAge(c)}
                          </td>
                          <td className="px-4 py-3">
                            <SlaPill claim={c} />
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs max-w-[100px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {linkedEvidence ? (
                              <Link href={`/chargebacks/${linkedEvidence.id}`} className="hover:underline truncate block" style={{ color: 'var(--accent)' }} title={linkedEvidence.reference_number}>
                                {linkedEvidence.reference_number}
                              </Link>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {formatCurrencyNullable(c.amount_at_risk, c.currency ?? undefined)}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {new Date(c.updated_at).toLocaleDateString('en-US')}
                          </td>
                          <td
                            className="sticky right-0 px-4 py-3 text-right whitespace-nowrap group-hover:bg-[var(--bg-hover)]"
                            style={{ background: 'var(--surface-raised)' }}
                          >
                            {c.customer_id ? (
                              <Link
                                href={`/customers/${c.customer_id}/claims?claimId=${c.id}`}
                                className="text-xs font-semibold hover:underline"
                                style={{ color: 'var(--accent)' }}
                              >
                                Review & record
                              </Link>
                            ) : (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Page {page} of {totalPages}</span>
                {page > 1 && (
                  <ButtonLink href={`/claims${buildClaimsQueryString(sp, { page: String(page - 1) })}`} variant="secondary" size="sm">Previous</ButtonLink>
                )}
                {page < totalPages && (
                  <ButtonLink href={`/claims${buildClaimsQueryString(sp, { page: String(page + 1) })}`} variant="secondary" size="sm">Next</ButtonLink>
                )}
              </div>
            )}
          </div>
        )
      }
    />
    </PageConnectionGate>
  );
}
