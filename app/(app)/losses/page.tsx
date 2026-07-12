import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { LossLedger, type LossLedgerRow } from '@/components/losses/LossLedger';
import { freshnessFromTimestamp } from '@/components/sources/FreshnessIndicator';
import { formatCurrencyNullable, sumSameCurrency } from '@/lib/utils/format';

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

  const rows: LossLedgerRow[] = raw.map((row) => ({
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
    amountMinor: row.estimated_recovery_minor,
    currency: row.currency,
    source: row.source_metadata?.origin ?? null,
    freshness: freshnessFromTimestamp(row.updated_at, nowMs),
  }));

  // Sum exposure in the dominant currency; disclose any excluded mixed-currency rows.
  const exposure = sumSameCurrency(
    rows.filter((r) => !r.writtenOff),
    (r) => (r.amountMinor == null ? null : r.amountMinor / 100),
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
        { label: 'Loss records', value: rows.length.toLocaleString(), hint: 'Canonical loss_cases' },
        { label: 'Open exposure', value: formatCurrencyNullable(exposure.total || null, exposure.currency) ?? '-', hint: `Excludes written-off${mixedHint}` },
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
