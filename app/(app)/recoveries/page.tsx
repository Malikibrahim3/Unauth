import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { formatCurrencyNullable, sumSameCurrency } from '@/lib/utils/format';
import { listRecoveryCases } from '@/lib/recoveries/store';
import { RecoveryBoardClient } from '@/app/(app)/recoveries/RecoveryBoardClient';
import type { RecoveryCase } from '@/lib/recoveries/types';

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

export default async function RecoveriesPage() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) redirect('/dashboard');
  const canManage = await hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);

  const rawRecoveries = await listRecoveryCases(serviceClient, ctx.merchantId);
  const recoveries = await enrichRecoveryCases(serviceClient, ctx.merchantId, rawRecoveries);
  const openRecoveries = recoveries.filter((item) => !['paid', 'closed_unrecoverable'].includes(item.status));
  const missingSourceData = recoveries.filter((item) => item.status === 'evidence_needed' || item.evidence_missing.length > 0).length;
  const needsCorrespondence = recoveries.filter((item) => item.status === 'chase_due').length;
  // Sum only rows in the dominant currency; a merchant with mixed-currency
  // recoveries gets a disclosed exclusion instead of a silently-wrong total.
  const recoverableSum = sumSameCurrency(recoveries, (item) => item.estimated_recoverable_max, (item) => item.currency);
  const recoveredSum = sumSameCurrency(recoveries, (item) => item.amount_recovered, (item) => item.currency);
  const estimatedRecoverable = recoverableSum.total;
  const recovered = recoveredSum.total;
  const currency = recoverableSum.currency;
  const mixedHint = recoverableSum.mixedCount > 0 ? ` · ${recoverableSum.mixedCount} case${recoverableSum.mixedCount === 1 ? '' : 's'} in other currencies excluded` : '';

  return (
    <WorkbenchPage
      eyebrow="Operations"
      title="Recovery board"
      subtitle="The losses you can still do something about: what needs evidence, what's ready to submit, what needs chasing, and what came back."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="recoveries"
      kpiItems={[
        { label: 'Open recovery cases', value: openRecoveries.length.toLocaleString(), hint: 'Source-backed active cases' },
        { label: 'Missing source data', value: missingSourceData.toLocaleString(), hint: 'Automatically calculated' },
        { label: 'Needs correspondence', value: needsCorrespondence.toLocaleString(), hint: 'Generated requests only' },
        { label: 'Estimated recovery', value: formatCurrencyNullable(estimatedRecoverable || null, currency) ?? '-', hint: `Source-derived upper estimate${mixedHint}` },
        { label: 'Approved recovery', value: formatCurrencyNullable(recovered || null, currency) ?? '-', hint: `Synced outcome${mixedHint}` },
      ]}
      main={<RecoveryBoardClient recoveries={recoveries} canManage={canManage} />}
      footer={
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Recovery cases are created and updated by connected source data, matched correspondence, and provider status sync. Unavailable evidence is tracked as unavailable, not manually filled.
        </p>
      }
    />
  );
}
