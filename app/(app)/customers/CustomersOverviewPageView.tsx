import Link from 'next/link';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import CustomersTableClient from '@/components/customers/CustomersTableClient';
import CustomersFilterSheet from '@/components/customers/CustomersFilterSheet';
import { ButtonLink, EmptyState, OperationalState, PageFrame } from '@/components/ui';
import { customersListHref } from '@/app/(app)/customers/customersOverviewPageUtils';
import { formatNumber } from '@/lib/utils/format';

export type CustomerOverviewRow = Parameters<typeof CustomersTableClient>[0]['rows'][number];

export type CustomersOverviewPageViewProps = {
  connectionState: ConnectionState;
  setupState: MerchantSetupState;
  hasData: boolean;
  pageActions: { primary: { label: string; href: string }; subtitle: string };
  sp: Record<string, string | undefined>;
  rows: CustomerOverviewRow[];
  baseCustomerCount: number;
  withOpenCasesCount: number;
  totalCount: number;
  page: number;
  PAGE_SIZE: number;
  totalPages: number;
  noFilters: boolean;
  searchTerm: string;
  riskFilter: string;
  statusFilter: string;
  listCoverage: 'complete' | 'partial' | 'unavailable';
  caseFilterCoverage: 'complete' | 'partial' | 'unavailable';
};

export function CustomersOverviewPageView({
  connectionState,
  setupState,
  hasData,
  pageActions,
  sp,
  rows,
  baseCustomerCount,
  withOpenCasesCount,
  totalCount,
  page,
  PAGE_SIZE,
  totalPages,
  noFilters,
  searchTerm: _searchTerm,
  riskFilter,
  statusFilter,
  listCoverage,
  caseFilterCoverage,
}: CustomersOverviewPageViewProps) {
  const caseFilterUnavailable = Boolean(riskFilter || statusFilter)
    && caseFilterCoverage !== 'complete';
  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customers" pageDescription="The customer directory adds merchant-owned context to loss decisions: order count, case history, and prior outcomes. Missing source coverage is shown as partial or unavailable, never as verified zero." setupState={setupState} hasData={hasData}>
    <PageFrame
      title="Customers"
      subtitle={pageActions.subtitle}
      surfaceId="customers-registry"
      archetype="P5"
      actions={
        <div className="ua-cases-header-actions">
          <span className="uo-date-chip">Last 30 days</span>
        </div>
      }
      breadcrumbs={[{ label: 'Unauth', href: '/overview' }, { label: 'Customers' }]}
      showCurrentBreadcrumb
    >
      <section className="uo-card uo-customers-card" aria-label="Customer directory" data-operations-surface="customers">
        <div className="uo-customer-truth-strip" aria-label="Current customer directory truth">
          <div><span>Directory</span><strong>{formatNumber(baseCustomerCount)} customers</strong><small>With orders in the selected range</small></div>
          <div><span>Needs attention</span><strong>{caseFilterCoverage === 'complete' ? formatNumber(withOpenCasesCount) : `${formatNumber(withOpenCasesCount)} observed · partial`}</strong><small>Customers with open cases</small></div>
          <div data-state="unavailable"><span>Refund comparison</span><strong>Unavailable</strong><small>Refunded value is not in this read model</small></div>
        </div>
        <div className="uo-customer-controls" id="customers-registry-controls">
          <CustomersFilterSheet />
          <span>{formatNumber(totalCount)} result{totalCount === 1 ? '' : 's'}</span>
        </div>
        <div className="uo-customer-views">
          <Link href="/customers" data-active={noFilters ? 'true' : undefined}>All customers · {formatNumber(baseCustomerCount)}</Link>
          <Link href="/customers?status=open_cases" data-active={statusFilter === 'open_cases' ? 'true' : undefined}>With open cases · {formatNumber(withOpenCasesCount)}</Link>
          <span>Preview a row to keep filters, position and return context</span>
        </div>
      {caseFilterUnavailable ? (
        <OperationalState
          kind="unavailable"
          title="Case-derived filter unavailable"
          description="The case read did not complete, so this filter cannot be evaluated without risking a silently broadened or false-empty result."
          action={<ButtonLink href="/customers" variant="secondary" size="sm">Clear filters</ButtonLink>}
        />
      ) : rows.length === 0 && listCoverage === 'unavailable' ? (
        <OperationalState
          kind="error"
          title="Customer directory unavailable"
          description="The primary customer list could not be loaded. No empty directory has been inferred."
          action={<ButtonLink href="/customers" variant="secondary" size="sm">Try again</ButtonLink>}
        />
      ) : rows.length === 0 && noFilters ? (
        <div data-state-id="customers-first-use">
        <EmptyState
          title="No customers yet"
          description={
            connectionState.bothConnected
              ? 'Shopify and your helpdesk are connected. Customers appear here as orders and cases sync.'
              : 'The customer directory is built from your connected merchant sources. Finish setup to see order and case history.'
          }
          action={
            <div className="flex items-center gap-4">
              <Link href={pageActions.primary.href} className="ua-text-label hover:underline" style={{ color: 'var(--uo-route-action-primary)' }}>
                {pageActions.primary.label}
              </Link>
            </div>
          }
        />
        </div>
      ) : rows.length === 0 && !noFilters ? (
        <div data-state-id="customers-no-filter-results">
        <EmptyState
          title="No customers found"
          description={`${formatNumber(baseCustomerCount)} customer records remain in your directory. Adjust or clear the filters to return to the full customer context.`}
          action={
            <Link href="/customers" className="ua-text-label hover:underline" style={{ color: 'var(--uo-route-action-primary)' }}>
              Clear all filters
            </Link>
          }
        />
        </div>
      ) : (
        <CustomersTableClient rows={rows} />
      )}
      {rows.length > 0 ? <footer className="uo-customer-footer">
        <span>Showing {formatNumber(rows.length)} of {formatNumber(totalCount)} customers · — means unavailable, not zero</span>
        <div><span className="uo-customer-legend"><i data-tone="warning" /> Above cohort <i data-tone="info" /> At or below <b /> Cohort median unavailable</span>{totalPages > 1 ? <>{page > 1 ? <ButtonLink href={customersListHref(sp, { page: String(page - 1), pageSize: String(PAGE_SIZE) })} variant="secondary" size="sm">Previous</ButtonLink> : null}{page < totalPages ? <ButtonLink href={customersListHref(sp, { page: String(page + 1), pageSize: String(PAGE_SIZE) })} variant="secondary" size="sm">Next</ButtonLink> : null}</> : null}</div>
      </footer> : null}
      </section>
    </PageFrame>
    </PageConnectionGate>
  );
}
