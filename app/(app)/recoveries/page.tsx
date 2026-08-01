import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage, ButtonLink, LeadSummary } from '@/components/ui';
import { formatCurrencyNullable, formatNumber, sumSameCurrency } from '@/lib/utils/format';
import { listRecoveryCases } from '@/lib/recoveries/store';
import { RecoveryBoardClient } from '@/app/(app)/recoveries/RecoveryBoardClient';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RecoveryTrend, type RecoveryTrendPoint } from '@/components/recoveries/RecoveryVisuals';

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
type RecoveryFinancialEntry = {
  recovery_case_id: string | null;
  state: 'recoverable' | 'recovered' | 'written_off';
  amount_minor: number;
  currency: string;
  effective_at: string;
};

function isoWeek(value: string) {
  const date = new Date(value);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / 604800000);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekLabel(value: string) {
  const [year, rawWeek] = value.split('-W');
  return `Week ${Number(rawWeek)}, ${year}`;
}

/** Builds a weekly balance only from dated, append-only financial entries. */
function buildRecoveryTrend(entries: RecoveryFinancialEntry[], currency: string | null): RecoveryTrendPoint[] {
  if (!currency) return [];
  const rows = entries
    .filter((entry) => entry.currency.toUpperCase() === currency.toUpperCase())
    .slice()
    .sort((a, b) => a.effective_at.localeCompare(b.effective_at));
  const buckets = new Map<string, { recoveredMinor: number; outstandingMinor: number; recoveryRate: number | null }>();
  let outstandingMinor = 0;
  let recoveredToDate = 0;
  for (const entry of rows) {
    const amount = Math.max(0, Number(entry.amount_minor));
    if (entry.state === 'recoverable') outstandingMinor += amount;
    if (entry.state === 'recovered') {
      recoveredToDate += amount;
      outstandingMinor -= amount;
    }
    if (entry.state === 'written_off') outstandingMinor -= amount;
    const key = isoWeek(entry.effective_at);
    const existing = buckets.get(key) ?? { recoveredMinor: 0, outstandingMinor: 0, recoveryRate: null };
    existing.recoveredMinor += entry.state === 'recovered' ? amount : 0;
    existing.outstandingMinor = Math.max(0, outstandingMinor);
    existing.recoveryRate = recoveredToDate + outstandingMinor > 0
      ? recoveredToDate / (recoveredToDate + outstandingMinor)
      : null;
    buckets.set(key, existing);
  }
  return Array.from(buckets, ([key, value]) => ({ key, label: weekLabel(key), ...value }));
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
  const recoveryIds = recoveries.map((recovery) => recovery.id);
  const { data: entryRows, error: entryError } = recoveryIds.length
    ? await serviceClient
      .from(TABLES.CASE_FINANCIAL_ENTRIES)
      .select('recovery_case_id,state,amount_minor,currency,effective_at')
      .eq('merchant_id', ctx.merchantId)
      .in('recovery_case_id', recoveryIds)
      .in('state', ['recoverable', 'recovered', 'written_off'])
      .order('effective_at', { ascending: true })
    : { data: [], error: null };
  if (entryError) throw new Error(`Failed to load recovery financial entries: ${entryError.message}`);
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
  const trend = buildRecoveryTrend((entryRows ?? []) as RecoveryFinancialEntry[], currency);

  return (
    <WorkbenchPage
      title="Recovery board"
      subtitle="The losses you can still do something about: what needs evidence, what's ready to submit, what needs chasing, and what came back."
      actions={
        <ButtonLink href="/rules/recovery" variant="secondary" size="sm">
          Partner rulebook
        </ButtonLink>
      }
      kpiStrip={
        <LeadSummary
          aria-label="Recovery summary"
          lead={{
            label: 'Estimated recovery',
            value: formatCurrencyNullable(estimatedRecoverable || null, currency) ?? '—',
            description: `Upper estimate${mixedHint}`,
          }}
          supporting={[
            { label: 'Open cases', value: formatNumber(openRecoveries.length), description: 'Active recovery work' },
            { label: 'Missing data', value: formatNumber(missingSourceData), description: 'Waiting on a source' },
            { label: 'Needs correspondence', value: formatNumber(needsCorrespondence), description: 'Draft chase requests' },
            { label: 'Recovered', value: formatCurrencyNullable(recovered || null, currency) ?? '—', description: `Received or credited${mixedHint}` },
          ]}
        />
      }
      primaryVisual={<RecoveryTrend currency={currency} points={trend} mixedCurrencyCount={recoverableSum.mixedCount} />}
      main={<RecoveryBoardClient recoveries={recoveries} canManage={canManage} />}
      footer={
        <p className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>
          Cases update automatically as your connected tools sync new evidence and status. Missing evidence stays marked as missing until a source provides it.
        </p>
      }
    />
  );
}
