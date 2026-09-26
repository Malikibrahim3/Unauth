import { redirect } from 'next/navigation';
import { ExceptionQueue } from '@/components/exceptions/ExceptionQueue';
import { listReconciliationPage } from '@/lib/exceptions/store';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getCachedConnectionState } from '@/lib/connections/getConnectionState';
import { ReconciliationOperations } from '@/components/reconciliation/ReconciliationOperations';
import { loadCanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';
import { financialPeriodBounds, financialPeriodForInstant } from '@/lib/financial/periods';
import { loadFinancialPeriodPreview } from '@/lib/reconciliation/periodReadModel';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { formatMonthYearInTimeZone } from '@/lib/utils/format';
import {
  acceptanceVariantFromHeaders,
  delayForAcceptanceScenario,
  throwForAcceptanceScenario,
} from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams?: Promise<{
    selected?: string;
    page?: string;
    status?: 'open' | 'resolved' | 'dismissed' | 'all';
    source?: string;
    currency?: string;
    search?: string;
    period?: string;
    action?: string;
  }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');
  const acceptanceVariant = await acceptanceVariantFromHeaders(
    'reconciliation-loading-empty-states',
    ['loading', 'empty'] as const,
  );
  if (acceptanceVariant === 'loading') {
    await delayForAcceptanceScenario('reconciliation-loading-empty-states');
  }
  await throwForAcceptanceScenario('reconciliation-error');

  const resolvedSearch = searchParams ? await searchParams : {};
  const page = Math.max(1, Number.parseInt(resolvedSearch.page ?? '1', 10) || 1);
  const status = ['open', 'resolved', 'dismissed', 'all'].includes(resolvedSearch.status ?? '')
    ? resolvedSearch.status as 'open' | 'resolved' | 'dismissed' | 'all'
    : 'open';
  const currency = resolvedSearch.currency && /^[A-Za-z]{3}$/.test(resolvedSearch.currency)
    ? resolvedSearch.currency.toUpperCase()
    : null;
  const period = resolvedSearch.period && /^\d{4}-(0[1-9]|1[0-2])$/.test(resolvedSearch.period)
    ? resolvedSearch.period
    : null;
  const activePeriod = period ?? financialPeriodForInstant();
  const bounds = financialPeriodBounds(activePeriod);
  if (!bounds) throw new Error('reconciliation_period_invalid');
  const action = resolvedSearch.action === 'close' ? 'close' : null;
  const [reconciliation, connectionState, aggregate, periodPreview, canClose] = await Promise.all([
    listReconciliationPage(service, ctx.merchantId, {
      status,
      source: resolvedSearch.source ?? null,
      currency,
      search: resolvedSearch.search ?? null,
      page,
      pageSize: 25,
      from: bounds.start.toISOString(),
      to: bounds.end.toISOString(),
    }),
    getCachedConnectionState(ctx.merchantId),
    loadCanonicalFinancialAggregate(service, ctx.merchantId, {
      from: bounds.start.toISOString(),
      to: bounds.end.toISOString(),
      currency,
    }),
    loadFinancialPeriodPreview(service, ctx.merchantId, bounds),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const sourceConnected = connectionState.orderSourceConnected || connectionState.helpdesk;
  const [periodYear, periodMonth] = activePeriod.split('-').map(Number);
  const periodLabel = formatMonthYearInTimeZone(new Date(Date.UTC(periodYear, periodMonth - 1, 1)), 'Europe/London');

  return (
    <section data-screen-label="Reconciliation" data-visual-world="supplied-package" data-surface-id="reconciliation-exception-workspace" data-archetype="operations-reconciliation" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <SetBreadcrumbLabel label={periodLabel} detail={`${reconciliation.totalCount} unmatched · currencies remain separate`}/>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>Reconciliation</h1>
      <ReconciliationOperations
        pageResult={reconciliation}
        aggregate={aggregate}
        periodPreview={periodPreview}
        sourceConnected={sourceConnected}
        canClose={canClose}
        query={{ status, source: resolvedSearch.source ?? null, currency, search: resolvedSearch.search ?? null, period: activePeriod, action }}
      />
      {resolvedSearch.selected ? <section aria-label="Resolve selected reconciliation exception"><ExceptionQueue /></section> : null}
    </section>
  );
}
