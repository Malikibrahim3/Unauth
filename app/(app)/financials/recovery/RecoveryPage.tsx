import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { ButtonLink, PageFrame } from '@/components/ui';
import {
  listRecoveryCasesPage,
  RECOVERY_BOARD_STAGES,
  type RecoveryBoardStage,
} from '@/lib/recoveries/store';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RecoveryBoardOperations } from '@/components/recoveries/RecoveryBoardOperations';
import ExportMenu from '@/components/reports/ExportMenu';
import { loadCanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';

export const dynamic = 'force-dynamic';

type PayoutRow = {
  id: string;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  total_estimated_loss: number | null;
  currency: string | null;
  source_order_id: string | null;
  source_ticket_id: string | null;
};

type OrderRow = { id: string; order_number: string | null };
type TicketRow = { id: string; external_id: string | null };
type RecoverySearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function enrichRecoveryCases(
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId: string,
  recoveries: RecoveryCase[],
): Promise<RecoveryCase[]> {
  const caseIds = Array.from(new Set(recoveries.map((item) => item.support_payout_case_id)));
  if (caseIds.length === 0) return recoveries;

  const { data: payoutRows } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, claim_type, status, amount_at_risk, total_estimated_loss, currency, source_order_id, source_ticket_id')
    .eq('merchant_id', merchantId)
    .in('id', caseIds);
  const payouts = (payoutRows ?? []) as PayoutRow[];
  const payoutById = new Map(payouts.map((row) => [row.id, row]));
  const orderIds = Array.from(new Set(payouts.flatMap((row: PayoutRow) => row.source_order_id ? [row.source_order_id] : [])));
  const ticketIds = Array.from(new Set(payouts.flatMap((row: PayoutRow) => row.source_ticket_id ? [row.source_ticket_id] : [])));

  const orderById = new Map<string, { order_number: string | null }>();
  if (orderIds.length > 0) {
    const { data: orders } = await serviceClient
      .from('source_orders')
      .select('id, order_number')
      .eq('merchant_id', merchantId)
      .in('id', orderIds);
    for (const order of (orders ?? []) as OrderRow[]) orderById.set(order.id, { order_number: order.order_number });
  }

  const ticketById = new Map<string, { external_id: string | null }>();
  if (ticketIds.length > 0) {
    const { data: tickets } = await serviceClient
      .from('source_tickets')
      .select('id, external_id')
      .eq('merchant_id', merchantId)
      .in('id', ticketIds);
    for (const ticket of (tickets ?? []) as TicketRow[]) ticketById.set(ticket.id, { external_id: ticket.external_id });
  }

  return recoveries.map((recovery) => {
    const payout = payoutById.get(recovery.support_payout_case_id);
    if (!payout) return recovery;
    const order = payout.source_order_id ? orderById.get(payout.source_order_id) : null;
    const ticket = payout.source_ticket_id ? ticketById.get(payout.source_ticket_id) : null;
    return {
      ...recovery,
      support_payout_case: {
        ...payout,
        order_number: order?.order_number ?? null,
        ticket_external_id: ticket?.external_id ?? null,
      },
    };
  });
}

export default async function RecoveriesPage({
  searchParams,
}: {
  searchParams?: Promise<RecoverySearchParams>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');
  const params = searchParams ? await searchParams : {};
  const requestedCurrency = one(params.currency)?.toUpperCase() ?? null;
  const requestedStage = one(params.stage);
  const stage: RecoveryBoardStage = RECOVERY_BOARD_STAGES.includes(requestedStage as RecoveryBoardStage)
    ? requestedStage as RecoveryBoardStage
    : 'all';
  const pageValue = Number(one(params.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const search = one(params.search)?.slice(0, 100) ?? null;
  const asOf = new Date();
  const [result, aggregate] = await Promise.all([
    listRecoveryCasesPage(serviceClient, ctx.merchantId, {
      stage,
      currency: requestedCurrency,
      search,
      page,
      pageSize: 25,
    }),
    loadCanonicalFinancialAggregate(serviceClient, ctx.merchantId, {
      from: new Date(asOf.getTime() - 30 * 86_400_000).toISOString(),
      to: asOf.toISOString(),
      currency: requestedCurrency && /^[A-Z]{3}$/.test(requestedCurrency) ? requestedCurrency : null,
    }),
  ]);
  result.rows = await enrichRecoveryCases(serviceClient, ctx.merchantId, result.rows);

  return (
    <PageFrame
      title="Recovery board"
      surfaceId="recovery-board"
      archetype="operations-recovery-board"
      breadcrumbs={[{ label: 'Unauth', href: '/overview' }, { label: 'Recovery board' }]}
      actions={
        <div className="uo-header-actions">
          <span>Last 30 days</span>
          <ExportMenu range="30d" currency={result.currency} />
          <ButtonLink href="/cases?status=decision_recorded" size="sm">Review recovery-ready cases</ButtonLink>
        </div>
      }
    >
      <RecoveryBoardOperations result={result} search={search} aggregate={aggregate} />
    </PageFrame>
  );
}
