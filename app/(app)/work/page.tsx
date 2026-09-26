import { redirect } from 'next/navigation';
import { ExactWorkQueueOperations } from '@/components/work/ExactWorkQueueOperations';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { now } from '@/lib/time/clock';
import { loadWorkOwnerDirectory } from '@/lib/work/owners';
import { loadWorkQueuePage } from '@/lib/work/store';
import { TABLES } from '@/lib/supabase/tables';
import { toMinorUnits } from '@/lib/canonical/money';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';
import {
  normaliseWorkPriority,
  normaliseWorkSort,
  normaliseWorkState,
  normaliseWorkView,
} from '@/lib/work/types';
import { delayForAcceptanceScenario, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

type WorkSearchParams = {
  view?: string;
  page?: string;
  search?: string;
  q?: string;
  priority?: string;
  state?: string;
  assignee?: string;
  sort?: string;
  savedView?: string;
  selected?: string;
};

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<WorkSearchParams>;
}) {
  await delayForAcceptanceScenario('operational-list-board-loading-skeleton', 5_000);
  await throwForAcceptanceScenario('work-error');
  const [user, ctx] = await Promise.all([
    getRequestUser(),
    requirePagePermission(PERMISSIONS.VIEW_INBOX),
  ]);
  if (!user) redirect('/login');
  if (!ctx) redirect('/overview');

  const serviceClient = getRequestServiceClient();
  const params = await searchParams;
  const referenceTime = now();
  const filters = {
    view: normaliseWorkView(params.view),
    search: (params.search ?? params.q ?? '').trim().slice(0, 160),
    priority: normaliseWorkPriority(params.priority),
    state: normaliseWorkState(params.state),
    assignee: params.assignee?.trim().slice(0, 80) || null,
    sort: normaliseWorkSort(params.sort),
    page: Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1),
    pageSize: 10,
  };
  const [canManage, ownerDirectory] = await Promise.all([
    hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_WORK),
    loadWorkOwnerDirectory(serviceClient, ctx.merchantId),
  ]);
  const canManageAnyAssignment = ctx.role === 'owner' || ctx.role === 'admin';
  const result = await loadWorkQueuePage({
    client: serviceClient,
    merchantId: ctx.merchantId,
    currentUserId: user.id,
    canManage,
    canManageAnyAssignment,
    filters,
    asOf: referenceTime,
  });
  const caseIds = [...new Set(result.items.flatMap((item) => item.supportPayoutCaseId ? [item.supportPayoutCaseId] : []))];
  const financialResult = caseIds.length ? await serviceClient.from(TABLES.MERCHANT_CLAIMS)
    .select('id,amount_at_risk,currency,source_order_id').eq('merchant_id', ctx.merchantId).in('id', caseIds)
    : {data: [], error: null};
  type FinancialRow = { id: string; amount_at_risk: number | string | null; currency: string | null; source_order_id: string | null };
  const financialRows = (financialResult.error ? [] : financialResult.data ?? []) as FinancialRow[];
  const financialByCase = new Map(financialRows.map((row) => [row.id, row]));
  const orderIds = [...new Set([...financialByCase.values()].flatMap((row) => row.source_order_id ? [row.source_order_id] : []))];
  const orderResult = orderIds.length ? await serviceClient.from(TABLES.SOURCE_ORDERS)
    .select('id,order_number,customer_name').eq('merchant_id', ctx.merchantId).in('id', orderIds)
    : {data: [], error: null};
  type OrderRow = { id: string; order_number: string | null; customer_name: string | null };
  const orderRows = (orderResult.error ? [] : orderResult.data ?? []) as OrderRow[];
  const orderById = new Map(orderRows.map((row) => [row.id, row]));
  const items = result.items.map((item) => {
    const owner = item.ownerUserId ? ownerDirectory.get(item.ownerUserId) : null;
    const financial = item.supportPayoutCaseId ? financialByCase.get(item.supportPayoutCaseId) : null;
    const order = financial?.source_order_id ? orderById.get(financial.source_order_id) : null;
    const amount = financial?.amount_at_risk == null ? null : Number(financial.amount_at_risk);
    const currency = financial?.currency?.toUpperCase() ?? null;
    const minor = amount != null && Number.isFinite(amount) && currency ? toMinorUnits(amount, currency) : null;
    return {
      ...item,
      sourceMetadata: {
        ...item.sourceMetadata,
        ...(financial ? {amount_minor: minor, currency, amount_display: formatMinorCurrencyNullable(minor, currency)} : {}),
        ...(order ? {order_ref: order.order_number, customer_name: order.customer_name} : {}),
      },
      ownerName: owner?.name ?? null,
      ownerInitials: owner?.initials ?? null,
      ownerRole: owner?.role ?? item.ownerRole,
    };
  });

  return <ExactWorkQueueOperations
          items={items}
          total={result.total}
          viewCounts={result.viewCounts}
          page={result.page}
          pageSize={result.pageSize}
          asOf={referenceTime.toISOString()}
          currentUserId={user.id}
          canManage={canManage}
          sourceNotice={[result.notice, financialResult.error ? 'Work item amounts are unavailable from the case source.' : null, orderResult.error ? 'Order identities are unavailable from the source.' : null].filter(Boolean).join(' ') || null}
        />;
}
