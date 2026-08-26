import { redirect } from 'next/navigation';
import { PageFrame } from '@/components/ui';
import { ExceptionQueue } from '@/components/exceptions/ExceptionQueue';
import { listReconciliationPage } from '@/lib/exceptions/store';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getCachedConnectionState } from '@/lib/connections/getConnectionState';
import { ReconciliationOperations } from '@/components/reconciliation/ReconciliationOperations';
import ExportMenu from '@/components/reports/ExportMenu';
import { loadCanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';
import { loadShopifyPaymentsReadModel } from '@/lib/financial/paymentAuthority';

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
  }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');

  const resolvedSearch = searchParams ? await searchParams : {};
  const page = Math.max(1, Number.parseInt(resolvedSearch.page ?? '1', 10) || 1);
  const status = ['open', 'resolved', 'dismissed', 'all'].includes(resolvedSearch.status ?? '')
    ? resolvedSearch.status as 'open' | 'resolved' | 'dismissed' | 'all'
    : 'open';
  const currency = resolvedSearch.currency && /^[A-Za-z]{3}$/.test(resolvedSearch.currency)
    ? resolvedSearch.currency.toUpperCase()
    : null;
  const [reconciliation, connectionState, aggregate, paymentAuthority] = await Promise.all([
    listReconciliationPage(service, ctx.merchantId, {
      status,
      source: resolvedSearch.source ?? null,
      currency,
      search: resolvedSearch.search ?? null,
      page,
      pageSize: 25,
    }),
    getCachedConnectionState(ctx.merchantId),
    loadCanonicalFinancialAggregate(service, ctx.merchantId, { currency }),
    loadShopifyPaymentsReadModel(service, ctx.merchantId),
  ]);
  const sourceConnected = connectionState.orderSourceConnected || connectionState.helpdesk;

  return (
    <PageFrame
      title="Reconciliation"
      surfaceId="reconciliation-exception-workspace"
      archetype="operations-reconciliation"
      breadcrumbs={[{ label: 'Unauth', href: '/overview' }, { label: 'Reconciliation' }]}
      actions={<div className="uo-header-actions"><span>Last 30 days</span><ExportMenu range="30d" triggerLabel="Export scope" /></div>}
    >
      <ReconciliationOperations
        pageResult={reconciliation}
        aggregate={aggregate}
        paymentAuthority={paymentAuthority}
        sourceConnected={sourceConnected}
        query={{ status, source: resolvedSearch.source ?? null, currency, search: resolvedSearch.search ?? null }}
      />
      {resolvedSearch.selected ? <section className="uo-resolution-workspace" aria-label="Resolve selected reconciliation exception"><ExceptionQueue /></section> : null}
    </PageFrame>
  );
}
