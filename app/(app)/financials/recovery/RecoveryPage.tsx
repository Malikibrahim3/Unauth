import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import Link from 'next/link';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import {
  listRecoveryCasesPage,
  RECOVERY_BOARD_STAGES,
  type RecoveryBoardStage,
} from '@/lib/recoveries/store';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RecoveryBoardOperations } from '@/components/recoveries/RecoveryBoardOperations';
import { loadCanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

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
  await throwForAcceptanceScenario('recovery-board-error');
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
  const [result, aggregate, canManage] = await Promise.all([
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
    hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
  ]);
  result.rows = await enrichRecoveryCases(serviceClient, ctx.merchantId, result.rows);

  const stageLabel = stage === 'all' ? 'all' : stage.replaceAll('_', ' ');
  const stageOptions: Array<[RecoveryBoardStage, string]> = [
    ['all', 'All routes'],
    ['ready_to_file', 'Ready to file'],
    ['filed', 'Filed'],
    ['partner_responded', 'Partner responded'],
    ['received', 'Received'],
    ['reconciled', 'Reconciled'],
    ['closed', 'Closed'],
  ];
  const stageHref = (nextStage: RecoveryBoardStage) => {
    const query = new URLSearchParams();
    if (nextStage !== 'all') query.set('stage', nextStage);
    if (requestedCurrency) query.set('currency', requestedCurrency);
    if (search) query.set('search', search);
    return query.size ? `/financials/recovery?${query}` : '/financials/recovery';
  };

  return (
    <section data-screen-label="Recovery board" data-visual-world="supplied-package" data-surface-id="recovery-board" data-archetype="operations-recovery-board" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <SetBreadcrumbLabel label="Open routes" detail={result.currency ? `${result.currency} only · other currencies excluded` : 'currencies remain separate'} />
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Recovery board</h1>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <details style={{ position: 'relative' }}>
          <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#1c1f23', font: "400 12.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>Stage: {stageLabel}<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4"/></svg></summary>
          <div style={{ position: 'absolute', zIndex: 20, top: 34, left: 0, width: 176, padding: 5, borderRadius: 10, background: '#fff', boxShadow: '0 10px 30px rgba(28,22,14,.18),0 0 0 1px rgba(28,27,25,.08)', display: 'flex', flexDirection: 'column' }}>{stageOptions.map(([value, label]) => <Link key={value} href={stageHref(value)} style={{ padding: '7px 9px', borderRadius: 7, background: value === stage ? '#f4f3f1' : '#fff', font: "400 11.5px/1.3 'Inter',sans-serif", color: '#1c1f23', textDecoration: 'none' }}>{label}</Link>)}</div>
        </details>
        <button type="button" disabled title="Partner filtering is not available in the canonical recovery query" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#64686d', font: "400 12.5px/1 'Inter',sans-serif" }}>Partner: all<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4"/></svg></button>
        <button type="button" disabled title="Owner filtering is not available in the canonical recovery query" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#64686d', font: "400 12.5px/1 'Inter',sans-serif" }}>Owner: anyone<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4"/></svg></button>
        <span style={{ flex: 1 }}/><span style={{ color: '#64686d', font: "400 11px/1 'IBM Plex Mono',monospace" }}>{result.totalCount} routes · {result.currency ? `${result.currency} only` : 'currencies separate'}</span>
        {result.totalCount === 0 && requestedCurrency ? <Link href="/financials/recovery" style={{ color: '#9f4f08', font: "500 11.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Clear recovery scope</Link> : null}
        {canManage ? <Link href="/cases?status=decision_recorded" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>New route</Link> : <span title="Read-only access" style={{ padding: '6px 11px', borderRadius: 9, background: '#d8d4cf', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif" }}>New route</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 22px 20px' }}><RecoveryBoardOperations result={result} search={search} aggregate={aggregate}/></div>
    </section>
  );
}
