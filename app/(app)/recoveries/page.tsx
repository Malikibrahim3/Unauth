import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage, SummaryRail, ButtonLink } from '@/components/ui';
import { TickMeterRow } from '@/components/charts/authenticated';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { formatCurrencyNullable, formatNumber, sumSameCurrency } from '@/lib/utils/format';
import { listRecoveryCases } from '@/lib/recoveries/store';
import { RECOVERY_BOARD_COLUMNS } from '@/lib/recoveries/status';
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
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/dashboard');
  const [canManage, rawRecoveries] = await Promise.all([
    hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
    listRecoveryCases(serviceClient, ctx.merchantId),
  ]);
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
  /*
   * The rail must reconcile with the board it sits beside. Both now derive from
   * RECOVERY_BOARD_COLUMNS, so every case lands in exactly one stage and the two
   * totals agree by construction. The previous reducer used its own four buckets
   * plus an `evidence_missing` override, which reclassified cases the board had
   * already placed elsewhere — the board summed to 8 while the rail summed to 10.
   */
  const stageRows = RECOVERY_BOARD_COLUMNS.map((column) => ({
    key: column.key,
    label: column.label,
    count: recoveries.filter((item) => column.statuses.includes(item.status)).length,
  })).filter((row) => row.count > 0);
  const stageTotal = stageRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <WorkbenchPage
      title="Recovery board"
      subtitle="The losses you can still do something about: what needs evidence, what's ready to submit, what needs chasing, and what came back."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="recoveries"
      actions={
        <ButtonLink href="/partners" variant="secondary" size="sm">
          Partner rulebook
        </ButtonLink>
      }
      kpiItems={[
        { label: 'Open recovery cases', value: formatNumber(openRecoveries.length), hint: 'Active cases' },
        { label: 'Missing source data', value: formatNumber(missingSourceData), hint: 'Waiting on a connected source' },
        { label: 'Needs correspondence', value: formatNumber(needsCorrespondence), hint: 'Draft chase requests' },
        { label: 'Estimated recovery', value: formatCurrencyNullable(estimatedRecoverable || null, currency) ?? '—', hint: `Upper estimate${mixedHint}` },
        { label: 'Recovered value', value: formatCurrencyNullable(recovered || null, currency) ?? '—', hint: `Received or credited${mixedHint}` },
      ]}
      rail={
        <SummaryRail
          sections={[
            ...(estimatedRecoverable > 0
              ? [{
                  title: 'Recovery progress',
                  children: (
                    <TickMeterRow
                      label="Recovered"
                      percent={(recovered / estimatedRecoverable) * 100}
                      displayValue={`${Math.round((recovered / estimatedRecoverable) * 100)}%`}
                      tone="positive"
                      caption={
                        recovered / estimatedRecoverable >= 0.5
                          ? 'Most recoverable value has come back'
                          : 'Most recoverable value is still in flight'
                      }
                    />
                  ),
                  footnote: `${formatCurrencyNullable(recovered || null, currency) ?? '—'} of ${formatCurrencyNullable(estimatedRecoverable, currency) ?? '—'} recoverable${mixedHint}`,
                }]
              : []),
            {
              title: 'Stage volume',
              /*
               * A distribution, not a severity scale — the bars stay neutral so
               * the rail does not read as five competing alarms (§3.1: colour
               * explains status, it does not decorate).
               */
              /*
               * No href: `?stage=` was never read by any code, so the previous
               * rows linked to a parameter that navigated nowhere. This is a
               * distribution readout; the board beside it is the navigation.
               */
              rows: stageRows.map((row) => ({
                label: row.label,
                value: formatNumber(row.count),
                tone: 'neutral' as const,
                bar: stageRows.length > 1 && stageTotal ? row.count / stageTotal : undefined,
              })),
              footnote: `${formatNumber(stageTotal)} recovery case${stageTotal === 1 ? '' : 's'} grouped by the board stage they sit in.`,
            },
          ]}
        />
      }
      main={<RecoveryBoardClient recoveries={recoveries} canManage={canManage} />}
      footer={
        <p className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>
          Cases update automatically as your connected tools sync new evidence and status. Missing evidence stays marked as missing until a source provides it.
        </p>
      }
    />
  );
}
