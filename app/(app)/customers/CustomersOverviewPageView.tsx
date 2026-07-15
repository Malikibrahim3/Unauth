import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import CustomersTableClient from '@/components/customers/CustomersTableClient';
import { CustomersPageWorkbench } from '@/app/(app)/customers/CustomersPageWorkbench';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { Badge, ButtonLink, Card, WorkbenchEmptyState } from '@/components/ui';
import { FilterChip } from '@/app/(app)/customers/CustomersOverviewFilterChip';
import { buildRemoveHref, customersListHref } from '@/app/(app)/customers/customersOverviewPageUtils';
import { formatNumber } from '@/lib/utils/format';

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
  hasRefunds: boolean;
  hasChargebacks: boolean;
  openClaimsOnly: boolean;
  kpis: {
    totalCustomers: number;
    openCaseCustomers: number;
    pastCaseCustomers: number;
    totalOrders: number;
  };
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
  hasRefunds,
  hasChargebacks,
  openClaimsOnly,
  kpis,
}: CustomersOverviewPageViewProps) {
  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customers" pageDescription="The customer directory adds merchant-owned context to loss-case decisions: order count, payout case history, and prior outcomes. Without an order source and helpdesk connected, counts may be zero because data is missing—not because the customer has no history." setupState={setupState} hasData={hasData}>
    <CustomersPageWorkbench
      title="Customers"
      subtitle={pageActions.subtitle}
      actions={
        <>
          <ButtonLink href={pageActions.primary.href} size="sm">{pageActions.primary.label}</ButtonLink>
        </>
      }
      kpiItems={[
        { label: 'Total customers', value: formatNumber(kpis.totalCustomers), hint: noFilters ? 'Customers with orders or payout cases' : 'With current filters applied' },
        { label: 'Open payout cases', value: formatNumber(kpis.openCaseCustomers), hint: 'Customers with open cases' },
        { label: 'Past payout cases', value: formatNumber(kpis.pastCaseCustomers), hint: 'Customers with any case history' },
        { label: 'Total orders', value: formatNumber(kpis.totalOrders), hint: 'Across listed customers' },
      ]}
      main={
        <div className="p-4 space-y-4">

      {/* match band copy belongs on customer scoring surfaces, not risk labels. */}
      {/* ── Compact filter bar ─────────────────────────────────────── */}
      {totalCount > 0 && (
        <Card unstyled variant="flat" className="flex h-auto min-h-10 flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-xs font-medium mr-1" style={{ color: 'var(--text-tertiary)' }}>Filters</span>
          {[
            { label: 'Open payout cases', href: '?openClaims=1', highlight: openClaimsOnly },
            { label: 'Has refunds', href: '?hasRefunds=1', highlight: hasRefunds },
            { label: 'Has chargebacks', href: '?hasChargebacks=1', highlight: hasChargebacks },
          ].map(({ label, href, highlight }) => (
            <Link
              key={label}
              href={href}
              className="transition-opacity hover:opacity-80"
            >
              <Badge tone={highlight ? 'warning' : 'neutral'} size="sm" dot={highlight}>
                {label}
              </Badge>
            </Link>
          ))}
          {!connectionState.helpdesk && (
            <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Payout case counts include connected helpdesk data only.
            </span>
          )}
        </Card>
      )}

      {/* ── Active filter chips ───────────────────────────────────── */}
      {!noFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Active filters:</span>
          {hasRefunds && <FilterChip label="Has refunds" removeHref={buildRemoveHref(sp, 'hasRefunds')} />}
          {hasChargebacks && <FilterChip label="Has chargebacks" removeHref={buildRemoveHref(sp, 'hasChargebacks')} />}
          {openClaimsOnly && <FilterChip label="Open payout cases" removeHref={buildRemoveHref(sp, 'openClaims')} />}
          {q && <FilterChip label={`Search: "${q}"`} removeHref={buildRemoveHref(sp, 'q')} />}
          <Link href="/customers" className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>Clear all</Link>
        </div>
      )}

      {rows.length === 0 && noFilters ? (
        <WorkbenchEmptyState
          title="No customers yet"
          description={
            connectionState.bothConnected
              ? 'Your order source and helpdesk are connected. Customers appear here as orders and payout cases sync.'
              : 'The customer directory is built from your connected merchant sources. Finish setup to see order, claim, and payout history.'
          }
          action={
            <div className="flex items-center gap-4">
              <Link href={pageActions.primary.href} className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                {pageActions.primary.label}
              </Link>
            </div>
          }
        />
      ) : rows.length === 0 && !noFilters ? (
        <WorkbenchEmptyState
          title="No customers found"
          description="No customers meet the filters you've applied. Adjust or clear them to see more."
          action={
            <Link href="/customers" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Clear all filters
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {`Showing ${from}–${to} of ${formatNumber(totalCount)} customers`}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
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
