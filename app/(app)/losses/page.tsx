import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { LossLedger, type LossLedgerRow } from '@/components/losses/LossLedger';
import { freshnessFromTimestamp } from '@/components/sources/FreshnessIndicator';
import { formatCurrencyNullable, sumSameCurrency } from '@/lib/utils/format';
import { recoverySoughtAmount } from '@/lib/recoveries/amounts';

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
type FinancialRow = { support_payout_case_id: string; currency: string; confirmed_loss_minor: number; estimated_loss_minor: number; recoverable_minor: number; recovered_minor: number; written_off_minor: number };
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
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) redirect('/dashboard');

  const nowMs = Date.now();
  const { data } = await serviceClient
    .from(TABLES.LOSS_CASES)
    .select('id,support_payout_case_id,case_category,attribution,counterparty_type,counterparty_name,status,recoverability,financial_state,prevention_only,written_off_at,estimated_recovery_minor,currency,source_metadata,updated_at')
    .eq('merchant_id', ctx.merchantId)
    .order('updated_at', { ascending: false })
    .limit(500);
  const raw = (data ?? []) as LossCaseRow[];
  const { data: orphanRecoveryData } = await serviceClient
    .from(TABLES.RECOVERY_CASES)
    .select('id,support_payout_case_id,recovery_type,owner_type,status,merchant_loss_amount,eligible_loss_amount,estimated_recoverable_max,amount_recovered,currency,updated_at')
    .eq('merchant_id', ctx.merchantId)
    .is('loss_case_id', null)
    .eq('prevention_only', false)
    .gt('merchant_loss_amount', 0)
    .limit(500);
  const orphanRecoveries = (orphanRecoveryData ?? []) as OrphanRecoveryRow[];
  const caseIds = raw.flatMap((row) => row.support_payout_case_id ? [row.support_payout_case_id] : []);
  const { data: financialRows } = caseIds.length
    ? await serviceClient.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('support_payout_case_id,currency,confirmed_loss_minor,estimated_loss_minor,recoverable_minor,recovered_minor,written_off_minor').eq('merchant_id', ctx.merchantId).in('support_payout_case_id', caseIds)
    : { data: [] };
  const financialByCase = new Map(((financialRows ?? []) as FinancialRow[]).map((row) => [row.support_payout_case_id, row]));

  const canonicalRows: LossLedgerRow[] = raw.map((row) => ({
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
    writtenOff: row.written_off_at != null,
    realisedLossMinor: row.support_payout_case_id ? financialByCase.get(row.support_payout_case_id)?.confirmed_loss_minor ?? null : null,
    estimatedLossMinor: row.support_payout_case_id ? financialByCase.get(row.support_payout_case_id)?.estimated_loss_minor ?? null : null,
    recoverableMinor: row.support_payout_case_id ? financialByCase.get(row.support_payout_case_id)?.recoverable_minor ?? row.estimated_recovery_minor : row.estimated_recovery_minor,
    recoveredMinor: row.support_payout_case_id ? financialByCase.get(row.support_payout_case_id)?.recovered_minor ?? null : null,
    currency: row.support_payout_case_id ? financialByCase.get(row.support_payout_case_id)?.currency ?? row.currency : row.currency,
    source: row.source_metadata?.origin ?? null,
    freshness: freshnessFromTimestamp(row.updated_at, nowMs),
  }));
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

  const exposure = sumSameCurrency(
    rows.filter((r) => !r.writtenOff),
    (r) => ((r.realisedLossMinor ?? r.estimatedLossMinor) == null ? null : (r.realisedLossMinor ?? r.estimatedLossMinor)! / 100),
    (r) => r.currency,
  );
  const mixedHint = exposure.mixedCount > 0
    ? ` · ${exposure.mixedCount} in other currencies excluded`
    : '';

  const recoverable = rows.filter((r) => r.recoverability === 'recoverable' || r.recoverability === 'eligible_to_chase').length;
  const prevented = rows.filter((r) => r.preventionOnly).length;
  const writtenOff = rows.filter((r) => r.writtenOff).length;

  return (
    <WorkbenchPage
      eyebrow="Operations"
      title="Losses"
      subtitle="The canonical loss ledger: what's confirmed, what's estimated, what's recoverable, what was prevented, and what's been written off — with attribution and source."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="losses"
      kpiItems={[
        { label: 'Loss records', value: rows.length.toLocaleString(), hint: derivedRows.length ? `${canonicalRows.length} canonical · ${derivedRows.length} awaiting reconciliation` : 'Canonical loss_cases' },
        { label: 'Realised / estimated loss', value: formatCurrencyNullable(exposure.total || null, exposure.currency) ?? '-', hint: `Ledger-derived; excludes written-off${mixedHint}` },
        { label: 'Recoverable', value: recoverable.toLocaleString(), hint: 'Eligible to chase' },
        { label: 'Prevented', value: prevented.toLocaleString(), hint: 'Prevention-only outcomes' },
        { label: 'Written off', value: writtenOff.toLocaleString(), hint: 'Closed unrecoverable' },
      ]}
      main={<LossLedger rows={rows} />}
      footer={
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Loss records are classified by the accountability workflow. Alternate attributions are retained as candidates without double-counting the loss.
        </p>
      }
    />
  );
}
