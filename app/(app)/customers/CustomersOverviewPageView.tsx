import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import CustomersTableClient from '@/components/customers/CustomersTableClient';
import { CustomersPageWorkbench } from '@/app/(app)/customers/CustomersPageWorkbench';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { ButtonLink, WorkbenchEmptyState } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { GRADE_LABELS } from '@/lib/utils/confidenceStyles';
import type { ConfidenceGrade } from '@/lib/engine/weights';
import { STATUS_LABELS } from '@/lib/utils/investigationStatus';
import GradeDistBar from '@/components/charts/GradeDistBar';
import type { GradeDistEntry } from '@/components/charts/GradeDistBar';
import { AnalyticsDonutChart } from '@/components/analytics/AnalyticsDonutChart';
import { AnalyticsHBarChart } from '@/components/analytics/AnalyticsHBarChart';
import { FilterChip } from '@/app/(app)/customers/CustomersOverviewFilterChip';
import { buildRemoveHref, customersListHref } from '@/app/(app)/customers/customersOverviewPageUtils';

export type CustomerOverviewRow = Parameters<typeof CustomersTableClient>[0]['rows'][number];

export type CustomersOverviewPageViewProps = {
  connectionState: ConnectionState;
  setupState: MerchantSetupState;
  hasData: boolean;
  pageActions: { primary: { label: string; href: string }; subtitle: string };
  sp: Record<string, string | undefined>;
  rows: CustomerOverviewRow[];
  totalCount: number;
  page: number;
  PAGE_SIZE: number;
  totalPages: number;
  from: number;
  to: number;
  noFilters: boolean;
  q: string;
  riskFilter: string;
  statusFilter: string;
  hasRefunds: boolean;
  hasChargebacks: boolean;
  openClaimsOnly: boolean;
};

export function CustomersOverviewPageView({
  connectionState,
  setupState,
  hasData,
  pageActions,
  sp,
  rows,
  totalCount,
  page,
  PAGE_SIZE,
  totalPages,
  from,
  to,
  noFilters,
  q,
  riskFilter,
  statusFilter,
  hasRefunds,
  hasChargebacks,
  openClaimsOnly,
}: CustomersOverviewPageViewProps) {
  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customer intelligence" pageDescription="Customer profiles show order patterns, identity confidence, and claim history. Without both Shopify and your helpdesk connected, claim counts may be zero because data is missing — not because the customer has no history." setupState={setupState} hasData={hasData}>
    <CustomersPageWorkbench
      title="Customer intelligence"
      subtitle={pageActions.subtitle}
      navItems={WORKBENCH_NAV_ITEMS}
      actions={
        <>
          <ButtonLink href={pageActions.primary.href} size="sm">{pageActions.primary.label}</ButtonLink>
        </>
      }
      kpiItems={[
        { label: 'Matching profiles', value: totalCount.toLocaleString(), hint: noFilters ? 'All customers' : 'Match current filters' },
        { label: 'New status', value: rows.filter((r) => r.investigation_status === 'new').length.toLocaleString(), hint: 'Shown on page' },
        { label: 'Has refund claims', value: rows.filter((r) => r.total_refund_claims > 0).length.toLocaleString(), hint: 'Shown on page' },
        { label: 'Seen at 2+ stores', value: rows.filter((r) => r.total_merchants_seen_at >= 2).length.toLocaleString(), hint: 'Shown on page' },
      ]}
      main={
        <div className="p-4 space-y-4">

      {/* ── Risk overview row ──────────────────────────────────────── */}
      {rows.length > 0 && (() => {
        const gradeCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
        for (const r of rows) {
          const lvl = r.risk_level?.toLowerCase() ?? '';
          if (lvl === 'critical' || lvl === 'high') gradeCounts.high += 1;
          else if (lvl === 'medium') gradeCounts.medium += 1;
          else gradeCounts.low += 1;
        }
        const gradeDist: GradeDistEntry[] = [
          { key: 'high', label: 'Strong match band', count: gradeCounts.high, color: 'var(--success)' },
          { key: 'medium', label: 'Moderate match band', count: gradeCounts.medium, color: 'var(--warning)' },
          { key: 'low', label: 'Light match band', count: gradeCounts.low, color: 'var(--neutral)' },
        ];
        const multiMerchant = rows.filter((r) => r.total_merchants_seen_at >= 2).length;
        const statusBars = Object.entries(
          rows.reduce<Record<string, number>>((acc, row) => {
            const key = row.investigation_status ?? 'new';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {})
        )
          .slice(0, 4)
          .map(([key, value]) => ({
            label: STATUS_LABELS[key as keyof typeof STATUS_LABELS] ?? key,
            value,
            color: 'var(--neutral)',
          }));
        const networkDonut = [
          { label: '2+ stores', value: multiMerchant, color: 'var(--network)' },
          { label: 'Single store', value: Math.max(rows.length - multiMerchant, 0), color: 'var(--border)' },
        ];
        return (
          <div
            className="rounded-[10px] border p-4"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Context profile - {noFilters ? 'all customers' : 'current page'}
              </p>
              <div className="flex items-center gap-4">
                {multiMerchant > 0 && (
                  <span className="text-xs" style={{ color: 'var(--network)' }}>
                    {multiMerchant} seen at 2+ stores
                  </span>
                )}
                {!connectionState.helpdesk && (
                  <span className="text-xs" style={{ color: 'var(--warning)' }}>
                    Claim counts incomplete - helpdesk not connected
                  </span>
                )}
              </div>
            </div>
            <GradeDistBar grades={gradeDist} />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Investigation status
                </p>
                <AnalyticsHBarChart
                  data={statusBars}
                  yAxisWidth={110}
                  maxBarWidth={14}
                  emptyLabel="No status data"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Network density
                </p>
                <AnalyticsDonutChart
                  data={networkDonut}
                  height={180}
                  emptyLabel="No network data"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Compact filter bar ─────────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="flex h-auto min-h-10 flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <span className="text-xs font-medium mr-1" style={{ color: 'var(--text-tertiary)' }}>Filters</span>
          {[
            { label: 'Open claims for review', href: '?openClaims=1', highlight: openClaimsOnly },
            { label: 'New', href: '?risk=high&status=new', highlight: !openClaimsOnly },
            { label: 'Has refunds', href: '?hasRefunds=1' },
            { label: 'Has chargebacks', href: '?hasChargebacks=1' },
          ].map(({ label, href, highlight }) => (
            <Link
              key={label}
              href={href}
              className="rounded-[4px] border px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: highlight ? 'var(--accent-soft)' : 'var(--surface-sunken)',
                borderColor: highlight ? 'var(--accent-border)' : 'var(--border)',
                color: highlight ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* ── Saved views strip ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Saved views</span>
        {[
          { label: 'Customers with open claims', href: '?openClaims=1' },
          { label: 'High confidence · new', href: '?risk=high&status=new' },
          { label: 'Most refund claims', href: '?hasRefunds=1&sort=refundRate' },
          { label: 'Linked identities', href: '?merchantsMin=2' },
          { label: 'Fastest claims', href: '?fastestClaimMax=3' },
        ].map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="text-xs font-medium rounded-[4px] border px-2.5 py-1 transition-colors hover:bg-[var(--surface-sunken)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Active filter chips ───────────────────────────────────── */}
      {!noFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Active filters:</span>
          {riskFilter && <FilterChip label={`Match confidence: ${GRADE_LABELS[riskFilter as ConfidenceGrade] ?? riskFilter}`} removeHref={buildRemoveHref(sp, 'risk')} />}
          {statusFilter && <FilterChip label={`Status: ${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS] ?? statusFilter}`} removeHref={buildRemoveHref(sp, 'status')} />}
          {hasRefunds && <FilterChip label="Has refunds" removeHref={buildRemoveHref(sp, 'hasRefunds')} />}
          {hasChargebacks && <FilterChip label="Has chargebacks" removeHref={buildRemoveHref(sp, 'hasChargebacks')} />}
          {openClaimsOnly && <FilterChip label="Open claims for review" removeHref={buildRemoveHref(sp, 'openClaims')} />}
          {q && <FilterChip label={`Search: "${q}"`} removeHref={buildRemoveHref(sp, 'q')} />}
          <Link href="/customers" className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>Clear all</Link>
        </div>
      )}

      {rows.length === 0 && noFilters ? (
        <WorkbenchEmptyState
          title="No customer profiles yet"
          description={
            connectionState.bothConnected
              ? 'Shopify and your helpdesk are connected. Customer profiles appear here as orders and claims sync.'
              : 'Customer profiles are built from your connected sources. Finish setup to start monitoring customers.'
          }
          action={
            <div className="flex items-center gap-4">
              <Link href={pageActions.primary.href} className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                {pageActions.primary.label} →
              </Link>
            </div>
          }
        />
      ) : rows.length === 0 && !noFilters ? (
        <WorkbenchEmptyState
          title="No customers match filters"
          description="No customer profiles match the filters you've applied. Adjust or clear them to see more."
          action={
            <Link href="/customers" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Clear all filters →
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {`Showing ${from}–${to} of ${totalCount.toLocaleString()} customers`}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Suspense fallback={null}>
                <PageSizeSelect pathname="/customers" pageSize={PAGE_SIZE} />
              </Suspense>
              {totalPages > 1 && (
                <>
                  <span>Page {page} of {totalPages}</span>
                  {page > 1 && (
                    <ButtonLink href={customersListHref(sp, { page: String(page - 1), pageSize: String(PAGE_SIZE) })} variant="secondary" size="sm">Prev</ButtonLink>
                  )}
                  {page < totalPages && (
                    <ButtonLink href={customersListHref(sp, { page: String(page + 1), pageSize: String(PAGE_SIZE) })} variant="secondary" size="sm">Next</ButtonLink>
                  )}
                </>
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <CustomersTableClient rows={rows} />
          )}
        </>
      )}
        </div>
      }
    />
    </PageConnectionGate>
  );
}
