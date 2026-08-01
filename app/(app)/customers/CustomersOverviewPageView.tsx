import Link from 'next/link';
import { Suspense } from 'react';
import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import CustomersTableClient from '@/components/customers/CustomersTableClient';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { ButtonLink, EmptyState, FilterChip as UiFilterChip, PageFrame, RegistrySurface } from '@/components/ui';
import { FilterChip } from '@/app/(app)/customers/CustomersOverviewFilterChip';
import { buildRemoveHref, customersListHref } from '@/app/(app)/customers/customersOverviewPageUtils';
import { formatNumber } from '@/lib/utils/format';
import { CustomersPageActionBarLeft } from '@/app/(app)/customers/CustomersPageActionBarLeft';

export type CustomerOverviewRow = Parameters<typeof CustomersTableClient>[0]['rows'][number];

export type CustomersOverviewPageViewProps = {
  connectionState: ConnectionState;
  setupState: MerchantSetupState;
  hasData: boolean;
  pageActions: { primary: { label: string; href: string }; subtitle: string };
  sp: Record<string, string | undefined>;
  rows: CustomerOverviewRow[];
  baseCustomerCount: number;
  totalCount: number;
  page: number;
  PAGE_SIZE: number;
  totalPages: number;
  noFilters: boolean;
  q: string;
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
  baseCustomerCount,
  totalCount,
  page,
  PAGE_SIZE,
  totalPages,
  noFilters,
  q,
  hasRefunds,
  hasChargebacks,
  openClaimsOnly,
}: CustomersOverviewPageViewProps) {
  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customers" pageDescription="The customer directory adds merchant-owned context to loss decisions: order count, case history, and prior outcomes. Without both Shopify and your helpdesk connected, case counts may be zero because data is missing — not because the customer has no history." setupState={setupState} hasData={hasData}>
    <PageFrame
      title="Customers"
      subtitle={pageActions.subtitle}
      actions={
        <ButtonLink href={pageActions.primary.href} size="sm">{pageActions.primary.label}</ButtonLink>
      }
    >
      <RegistrySurface
        aria-label="Customer directory"
        toolbar={
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <CustomersPageActionBarLeft />
            <nav className="flex flex-wrap items-center gap-1.5" aria-label="Customer filters">
              {/* match band language belongs on resolved identity evidence, not this registry. */}
              {[
                { label: 'Open payout cases', key: 'openClaims', active: openClaimsOnly, href: openClaimsOnly ? buildRemoveHref(sp, 'openClaims') : '?openClaims=1' },
                { label: 'Has refunds', key: 'hasRefunds', active: hasRefunds },
                { label: 'Has chargebacks', key: 'hasChargebacks', active: hasChargebacks },
              ].map(({ label, key, active, href }) => (
                <UiFilterChip
                  key={key}
                  href={href ?? customersListHref(sp, { [key]: active ? undefined : '1', page: '1' })}
                  active={active}
                  aria-label={key === 'openClaims' ? 'Customers with open cases' : undefined}
                >
                  {label}
                </UiFilterChip>
              ))}
              {!connectionState.helpdesk ? <span className="ml-1 text-xs text-[var(--ua-text-tertiary)]">Case counts reflect connected helpdesk data.</span> : null}
            </nav>
            {!noFilters ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ua-text-secondary)]">
                <span>Active:</span>
                {hasRefunds && <FilterChip label="Has refunds" removeHref={buildRemoveHref(sp, 'hasRefunds')} />}
                {hasChargebacks && <FilterChip label="Has chargebacks" removeHref={buildRemoveHref(sp, 'hasChargebacks')} />}
                {openClaimsOnly && <FilterChip label="Open cases" removeHref={buildRemoveHref(sp, 'openClaims')} />}
                {q && <FilterChip label={`Search: “${q}”`} removeHref={buildRemoveHref(sp, 'q')} />}
                <Link href="/customers" className="font-semibold hover:underline">Clear all</Link>
              </div>
            ) : null}
          </div>
        }
        resultCount={noFilters
          ? `${formatNumber(baseCustomerCount)} customer records`
          : `${formatNumber(totalCount)} matching customers · ${formatNumber(baseCustomerCount)} customer records total`}
        pagination={rows.length > 0 ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs text-[var(--ua-text-secondary)]">
            <Suspense fallback={null}><PageSizeSelect pathname="/customers" pageSize={PAGE_SIZE} /></Suspense>
            {totalPages > 1 ? <div className="flex items-center gap-2"><span>Page {page} of {totalPages}</span>{page > 1 ? <ButtonLink href={customersListHref(sp, { page: String(page - 1), pageSize: String(PAGE_SIZE) })} variant="secondary" size="sm">Previous</ButtonLink> : null}{page < totalPages ? <ButtonLink href={customersListHref(sp, { page: String(page + 1), pageSize: String(PAGE_SIZE) })} variant="secondary" size="sm">Next</ButtonLink> : null}</div> : null}
          </div>
        ) : undefined}
      >
      {rows.length === 0 && noFilters ? (
        <EmptyState
          title="No customers yet"
          description={
            connectionState.bothConnected
              ? 'Shopify and your helpdesk are connected. Customers appear here as orders and cases sync.'
              : 'The customer directory is built from your connected merchant sources. Finish setup to see order and case history.'
          }
          action={
            <div className="flex items-center gap-4">
              <Link href={pageActions.primary.href} className="text-xs font-semibold hover:underline" style={{ color: 'var(--ua-action-primary)' }}>
                {pageActions.primary.label}
              </Link>
            </div>
          }
        />
      ) : rows.length === 0 && !noFilters ? (
        <EmptyState
          title="No customers found"
          description={`${formatNumber(baseCustomerCount)} customer records remain in your directory. Adjust or clear the filters to return to the full customer context.`}
          action={
            <Link href="/customers" className="text-xs font-semibold hover:underline" style={{ color: 'var(--ua-action-primary)' }}>
              Clear all filters
            </Link>
          }
        />
      ) : (
        <CustomersTableClient rows={rows} />
      )}
      </RegistrySurface>
    </PageFrame>
    </PageConnectionGate>
  );
}
