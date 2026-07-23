import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage, KeyInsightCallout, SummaryRail, ButtonLink } from '@/components/ui';
import { TrendingUp } from 'lucide-react';
import { TickMeterRow } from '@/components/charts/authenticated';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { formatCurrencyNullable, formatNumber, sumSameCurrency } from '@/lib/utils/format';
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
  const recoveryDistribution = recoveries.reduce(
    (counts, item) => {
      if (['paid', 'closed_unrecoverable'].includes(item.status)) counts.closed += 1;
      else if (item.status === 'evidence_needed' || item.evidence_missing.length > 0) counts.evidence += 1;
      else if (item.status === 'chase_due') counts.chase += 1;
      else counts.ready += 1;
      return counts;
    },
    { evidence: 0, chase: 0, ready: 0, closed: 0 },
  );
  const stageTotal = recoveryDistribution.evidence + recoveryDistribution.ready + recoveryDistribution.chase + recoveryDistribution.closed;
  const recoveredPct = estimatedRecoverable > 0 ? Math.round((recovered / estimatedRecoverable) * 100) : null;

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
        { label: 'Approved recovery', value: formatCurrencyNullable(recovered || null, currency) ?? '—', hint: `Confirmed to date${mixedHint}` },
      ]}
      primaryVisual={
        <KeyInsightCallout
          eyebrow="Recovery"
          tone={recoveredPct != null && recoveredPct >= 50 ? 'success' : 'info'}
          icon={<TrendingUp size={16} />}
        >
          <strong>{formatCurrencyNullable(recovered || null, currency) ?? '—'}</strong> recovered
          {estimatedRecoverable > 0 ? <> of <strong>{formatCurrencyNullable(estimatedRecoverable, currency) ?? '—'}</strong> recoverable ({recoveredPct}%)</> : null}
          {' '}· <strong>{formatNumber(needsCorrespondence)}</strong> awaiting a chase.
        </KeyInsightCallout>
      }
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
                      tone="green"
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
              rows: [
                { label: 'Needs evidence', value: formatNumber(recoveryDistribution.evidence), tone: 'danger', bar: stageTotal ? recoveryDistribution.evidence / stageTotal : 0, href: '/recoveries?stage=evidence' },
                { label: 'Ready / active', value: formatNumber(recoveryDistribution.ready), tone: 'info', bar: stageTotal ? recoveryDistribution.ready / stageTotal : 0, href: '/recoveries?stage=ready' },
                { label: 'Chase due', value: formatNumber(recoveryDistribution.chase), tone: 'warning', bar: stageTotal ? recoveryDistribution.chase / stageTotal : 0, href: '/recoveries?stage=chase' },
                { label: 'Closed', value: formatNumber(recoveryDistribution.closed), tone: 'success', bar: stageTotal ? recoveryDistribution.closed / stageTotal : 0, href: '/recoveries?stage=closed' },
              ],
              footnote: 'Current case counts by operational stage.',
            },
          ]}
        />
      }
      main={<RecoveryBoardClient recoveries={recoveries} canManage={canManage} />}
      footer={
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Cases update automatically as your connected tools sync new evidence and status. Missing evidence stays marked as missing until a source provides it.
        </p>
      }
    />
  );
}
