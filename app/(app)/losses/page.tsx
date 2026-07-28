import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage, KeyInsightCallout, SummaryRail } from '@/components/ui';
import { TrendingDown } from 'lucide-react';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { LossLedger, type LossLedgerRow } from '@/components/losses/LossLedger';
import { freshnessFromTimestamp } from '@/components/sources/FreshnessIndicator';
import { formatCurrencyNullable, formatNumber } from '@/lib/utils/format';
import { recoverySoughtAmount } from '@/lib/recoveries/amounts';
import { label } from '@/lib/ui/labels';
import { selectLossContributions } from '@/lib/visualisation/chartSelectors';
import { isLossWrittenOff, lossFinancialDisplay, summarizeKnownLossExposure } from '@/lib/losses/financialDisplay';

export const dynamic = 'force-dynamic';

type LossCaseRow = {
  id: string;
  support_payout_case_id: string | null;
  case_category: string;
  attribution: string | null;
  counterparty_type: string | null;
  counterparty_name: string | null;
  status: string;
  recoverability: string | null;
  financial_state: string;
  prevention_only: boolean;
  written_off_at: string | null;
  estimated_recovery_minor: number | null;
  currency: string | null;
  source_metadata: { origin?: string } | null;
  updated_at: string;
};
type FinancialRow = {
  support_payout_case_id: string;
  currency: string;
  confirmed_loss_minor: number;
  estimated_loss_minor: number;
  recoverable_minor: number;
  recovered_minor: number;
  written_off_minor: number;
  known_states: string[] | null;
};
type OrphanRecoveryRow = {
  id: string;
  support_payout_case_id: string;
  recovery_type: string;
  owner_type: string;
  status: string;
  merchant_loss_amount: number | string;
  eligible_loss_amount: number | string | null;
  estimated_recoverable_max: number | string | null;
  amount_recovered: number | string | null;
  currency: string;
  updated_at: string;
};

export default async function LossesPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/dashboard');

  const nowMs = Date.now();
  const [{ data }, { data: orphanRecoveryData }] = await Promise.all([
    serviceClient
      .from(TABLES.LOSS_CASES)
      .select('id,support_payout_case_id,case_category,attribution,counterparty_type,counterparty_name,status,recoverability,financial_state,prevention_only,written_off_at,estimated_recovery_minor,currency,source_metadata,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .order('updated_at', { ascending: false })
      .limit(500),
    serviceClient
      .from(TABLES.RECOVERY_CASES)
      .select('id,support_payout_case_id,recovery_type,owner_type,status,merchant_loss_amount,eligible_loss_amount,estimated_recoverable_max,amount_recovered,currency,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .is('loss_case_id', null)
      .eq('prevention_only', false)
      .gt('merchant_loss_amount', 0)
      .limit(500),
  ]);
  const raw = (data ?? []) as LossCaseRow[];
  const orphanRecoveries = (orphanRecoveryData ?? []) as OrphanRecoveryRow[];
  const caseIds = raw.flatMap((row) => row.support_payout_case_id ? [row.support_payout_case_id] : []);
  const { data: financialRows } = caseIds.length
    ? await serviceClient.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('support_payout_case_id,currency,confirmed_loss_minor,estimated_loss_minor,recoverable_minor,recovered_minor,written_off_minor,known_states').eq('merchant_id', ctx.merchantId).in('support_payout_case_id', caseIds)
    : { data: [] };
  const financialByCase = new Map(((financialRows ?? []) as FinancialRow[]).map((row) => [row.support_payout_case_id, row]));

  const canonicalRows: LossLedgerRow[] = raw.map((row) => {
    const summary = row.support_payout_case_id
      ? financialByCase.get(row.support_payout_case_id)
      : undefined;
    const display = lossFinancialDisplay(summary, row.estimated_recovery_minor);
    return {
      id: row.id,
      supportPayoutCaseId: row.support_payout_case_id,
      category: row.case_category,
      attribution: row.attribution,
      counterpartyType: row.counterparty_type,
      counterpartyName: row.counterparty_name,
      status: row.status,
      recoverability: row.recoverability,
      financialState: row.financial_state,
      preventionOnly: row.prevention_only,
      writtenOff: isLossWrittenOff(row.status, row.written_off_at),
      ...display,
      currency: summary?.currency ?? row.currency,
      source: row.source_metadata?.origin ?? null,
      freshness: freshnessFromTimestamp(row.updated_at, nowMs),
    };
  });
  const derivedRows: LossLedgerRow[] = orphanRecoveries.map((recovery) => {
    const amounts = {
      merchant_loss_amount: Number(recovery.merchant_loss_amount),
      eligible_loss_amount: recovery.eligible_loss_amount == null ? null : Number(recovery.eligible_loss_amount),
      estimated_recoverable_max: recovery.estimated_recoverable_max == null ? null : Number(recovery.estimated_recoverable_max),
    };
    return {
      id: `recovery:${recovery.id}`,
      detailHref: `/recoveries/${recovery.id}`,
      derived: true,
      supportPayoutCaseId: recovery.support_payout_case_id,
      category: recovery.recovery_type === 'carrier_claim' ? 'delivery_loss' : 'unknown_post_purchase_loss',
      attribution: recovery.recovery_type,
      counterpartyType: recovery.owner_type,
      counterpartyName: null,
      status: recovery.status,
      recoverability: 'recoverable',
      financialState: 'confirmed',
      preventionOnly: false,
      writtenOff: recovery.status === 'closed_unrecoverable',
      realisedLossMinor: Math.round(amounts.merchant_loss_amount * 100),
      estimatedLossMinor: null,
      recoverableMinor: Math.round(recoverySoughtAmount(amounts) * 100),
      recoveredMinor: recovery.amount_recovered == null ? null : Math.round(Number(recovery.amount_recovered) * 100),
      currency: recovery.currency,
      source: 'recovery_case',
      freshness: freshnessFromTimestamp(recovery.updated_at, nowMs),
    };
  });
  const rows = [...canonicalRows, ...derivedRows];

  const exposure = summarizeKnownLossExposure(rows);
  const mixedHint = exposure.mixedCount > 0
    ? ` · ${exposure.mixedCount} in other currencies excluded`
    : '';

  const recoverable = rows.filter((r) => r.recoverability === 'recoverable' || r.recoverability === 'eligible_to_chase').length;
  const prevented = rows.filter((r) => r.preventionOnly).length;
  const writtenOff = rows.filter((r) => r.writtenOff).length;
  const contributions = selectLossContributions(rows.map((row) => {
    const key = row.attribution ?? row.category ?? 'unattributed';
    return {
      key,
      label: row.attribution ? label('attribution', key) : label('lossCategory', key),
      amountMinor: row.realisedLossMinor ?? row.estimatedLossMinor,
      currency: row.currency,
      writtenOff: row.writtenOff,
    };
  }), exposure.currency);
  const topContributions = contributions.slice(0, 5);
  const topLoss = topContributions[0];
  const topLossPct = topLoss && exposure.total ? Math.round((topLoss.valueMajor / exposure.total) * 100) : null;

  return (
    <WorkbenchPage
      title="Losses"
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="losses"
      kpiItems={[
        { label: 'Loss records', value: formatNumber(rows.length), hint: derivedRows.length ? `${canonicalRows.length} recorded · ${derivedRows.length} awaiting reconciliation` : 'All recorded losses' },
        { label: 'Realised / estimated loss', value: exposure.known ? formatCurrencyNullable(exposure.total, exposure.currency) : '—', hint: `Excludes written-off${mixedHint}` },
        { label: 'Recoverable', value: formatNumber(recoverable), hint: 'Eligible to chase' },
        { label: 'Prevented', value: formatNumber(prevented), hint: 'Prevention-only outcomes' },
        { label: 'Written off', value: formatNumber(writtenOff), hint: 'Closed unrecoverable' },
      ]}
      primaryVisual={
        topLoss ? (
          <KeyInsightCallout eyebrow="Loss contribution" icon={<TrendingDown size={16} />}>
            <strong>{topLoss.label}</strong> is the largest loss driver
            {topLossPct != null ? <> at <strong>{topLossPct}%</strong> of current loss</> : null}
            {' '}(<strong>{exposure.known ? formatCurrencyNullable(exposure.total, exposure.currency) : '—'}</strong> total).
          </KeyInsightCallout>
        ) : undefined
      }
      rail={
        topContributions.length === 0 ? undefined : (
          <SummaryRail
            sections={[
              {
                title: 'Loss contribution',
                rows: topContributions.map((item) => ({
                  label: item.label,
                  value: formatCurrencyNullable(item.valueMajor, exposure.currency) ?? '—',
                  bar: topContributions.length > 1 && exposure.total
                    ? item.valueMajor / exposure.total
                    : undefined,
                  href: `/losses?attribution=${encodeURIComponent(item.key)}`,
                })),
                footnote: `Ranked attribution of current loss in ${exposure.currency ?? 'the available currency'}. Written-off and incompatible-currency rows excluded.${mixedHint}`,
              },
            ]}
          />
        )
      }
      main={<LossLedger rows={rows} />}
      footer={
        <p className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>
          Each loss is attributed to one recovery owner. Other possible owners are kept as candidates so the loss is never counted twice.
        </p>
      }
    />
  );
}
