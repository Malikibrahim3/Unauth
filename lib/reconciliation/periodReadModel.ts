import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type PeriodSettlement = {
  currency: string;
  recordCount: number;
  receivedMinor: number;
  matchedMinor: number;
  receivedUnreconciledMinor: number;
  reconciledMinor: number;
};

export type PeriodBlocker = {
  id: string;
  title: string;
  owner: string;
  createdAt: string;
};

export type FinancialPeriodPreview = {
  from: string;
  to: string;
  timezone: 'Europe/London';
  boundary: 'start_inclusive_end_exclusive';
  blockers: PeriodBlocker[];
  blockerCount: number | null;
  blockersState: 'available' | 'partial' | 'unavailable';
  earlierOutstandingCount: number | null;
  settlements: PeriodSettlement[];
  settlementState: 'available' | 'verified_empty' | 'partial' | 'unavailable';
  observationAuthority: 'source_or_receipt_backed_only';
  source: 'canonical' | 'compatibility';
  closeBlockedReasons: string[];
};

function integer(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

function settlement(row: Record<string, unknown>): PeriodSettlement | null {
  const currency = typeof row.currency === 'string' ? row.currency.toUpperCase() : '';
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  return {
    currency,
    recordCount: integer(row.record_count ?? row.recordCount),
    receivedMinor: integer(row.received_minor ?? row.receivedMinor ?? row.observed_minor),
    matchedMinor: integer(row.matched_minor ?? row.matchedMinor),
    receivedUnreconciledMinor: integer(row.received_unreconciled_minor ?? row.receivedUnreconciledMinor),
    reconciledMinor: integer(row.reconciled_minor ?? row.reconciledMinor),
  };
}

function closeReasons(
  blockersState: FinancialPeriodPreview['blockersState'],
  settlementState: FinancialPeriodPreview['settlementState'],
): string[] {
  const reasons: string[] = [];
  if (blockersState === 'unavailable') reasons.push('The exact current-period blocker population is unavailable.');
  if (blockersState === 'partial') reasons.push('The current period has more than 500 open blockers; acknowledge them from an uncapped review before closing.');
  if (settlementState === 'unavailable') reasons.push('The source/receipt-backed settlement snapshot is unavailable.');
  if (settlementState === 'partial') reasons.push('The source/receipt-backed settlement snapshot is partial.');
  return reasons;
}

export async function loadFinancialPeriodPreview(
  client: SupabaseClient,
  merchantId: string,
  bounds: { start: Date; end: Date },
): Promise<FinancialPeriodPreview> {
  const from = bounds.start.toISOString();
  const to = bounds.end.toISOString();
  const rpc = await (client as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
  }).rpc('financial_period_preview_v1', { p_merchant_id: merchantId, p_from: from, p_to: to });
  if (!rpc.error && rpc.data && typeof rpc.data === 'object') {
    const payload = rpc.data as Record<string, unknown>;
    const rawBlockers = Array.isArray(payload.blockers) ? payload.blockers : [];
    const rawSettlements = Array.isArray(payload.settlements) ? payload.settlements : [];
    const blockersState = payload.blockers_complete === false ? 'partial' : 'available';
    const settlements = rawSettlements
      .map((row) => settlement(row as Record<string, unknown>))
      .filter((row): row is PeriodSettlement => row != null);
    const settlementState = settlements.length ? 'available' : 'verified_empty';
    return {
      from,
      to,
      timezone: 'Europe/London',
      boundary: 'start_inclusive_end_exclusive',
      blockers: rawBlockers.slice(0, 500).map((row) => {
        const value = row as Record<string, unknown>;
        return {
          id: String(value.id),
          title: String(value.title ?? 'Open reconciliation exception'),
          owner: typeof value.assigned_to === 'string' ? value.assigned_to : 'Unassigned',
          createdAt: String(value.created_at),
        };
      }),
      blockerCount: integer(payload.blocker_count),
      blockersState,
      earlierOutstandingCount: integer(payload.earlier_outstanding_count),
      settlements,
      settlementState,
      observationAuthority: 'source_or_receipt_backed_only',
      source: 'canonical',
      closeBlockedReasons: closeReasons(blockersState, settlementState),
    };
  }
  if (!rpc.error || !/financial_period_preview_v1|schema cache|function .*does not exist/i.test(rpc.error.message ?? '')) {
    return {
      from, to, timezone: 'Europe/London', boundary: 'start_inclusive_end_exclusive',
      blockers: [], blockerCount: null, blockersState: 'unavailable', earlierOutstandingCount: null,
      settlements: [], settlementState: 'unavailable', observationAuthority: 'source_or_receipt_backed_only',
      source: 'compatibility', closeBlockedReasons: closeReasons('unavailable', 'unavailable'),
    };
  }

  const [blockerResult, earlierResult, creditResult] = await Promise.all([
    client.from(TABLES.CASE_EXCEPTIONS)
      .select('id,title,assigned_to,created_at', { count: 'exact' })
      .eq('merchant_id', merchantId).eq('status', 'open')
      .gte('created_at', from).lt('created_at', to)
      .order('created_at', { ascending: true }).limit(501),
    client.from(TABLES.CASE_EXCEPTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId).eq('status', 'open').lt('created_at', from),
    client.from(TABLES.PROVIDER_CREDIT_RECORDS)
      .select('currency,amount_minor,credit_type,match_status,reconciliation_status,observed_at,occurred_at,ingested_at')
      .eq('merchant_id', merchantId)
      .in('observation_authority', ['source_observed', 'receipt_backed_manual'])
      .gte('observed_at', from)
      .lt('observed_at', to)
      .limit(10_001),
  ]);
  const blockersState = blockerResult.error ? 'unavailable' : (blockerResult.count ?? 0) > 500 ? 'partial' : 'available';
  const scopedCredits = creditResult.error ? [] : (creditResult.data ?? []);
  const settlementState = creditResult.error
    ? 'unavailable'
    : (creditResult.data?.length ?? 0) > 10_000
      ? 'partial'
      : scopedCredits.length
        ? 'available'
        : 'verified_empty';
  const byCurrency = new Map<string, PeriodSettlement>();
  for (const row of scopedCredits) {
    const currency = String(row.currency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) continue;
    const current = byCurrency.get(currency) ?? { currency, recordCount: 0, receivedMinor: 0, matchedMinor: 0, receivedUnreconciledMinor: 0, reconciledMinor: 0 };
    const amount = integer(row.amount_minor) * (row.credit_type === 'reversal' ? -1 : 1);
    current.recordCount += 1;
    current.receivedMinor += amount;
    if (row.match_status === 'matched') current.matchedMinor += amount;
    if (row.reconciliation_status === 'received_unreconciled') current.receivedUnreconciledMinor += amount;
    if (row.reconciliation_status === 'reconciled') current.reconciledMinor += amount;
    byCurrency.set(currency, current);
  }
  return {
    from, to, timezone: 'Europe/London', boundary: 'start_inclusive_end_exclusive',
    blockers: blockerResult.error ? [] : (blockerResult.data ?? []).slice(0, 500).map((row) => ({
      id: row.id, title: row.title, owner: row.assigned_to ?? 'Unassigned', createdAt: row.created_at,
    })),
    blockerCount: blockerResult.error ? null : blockerResult.count ?? 0,
    blockersState,
    earlierOutstandingCount: earlierResult.error ? null : earlierResult.count ?? 0,
    settlements: [...byCurrency.values()].sort((left, right) => left.currency.localeCompare(right.currency)),
    settlementState,
    observationAuthority: 'source_or_receipt_backed_only', source: 'compatibility',
    closeBlockedReasons: closeReasons(blockersState, settlementState),
  };
}
